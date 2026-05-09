#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const HOST = '127.0.0.1';
const PORT = 3690;
const WEB_ROOT = path.join(__dirname, 'web');
const CONFIG_PATH = path.join(__dirname, 'vault.config.json');
const DEFAULT_VAULT_PATH = '/Users/hondod20/ドキュメント/Obsidian/ace-vault/';
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']);

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return { vaultPath: DEFAULT_VAULT_PATH };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return { vaultPath: parsed.vaultPath || DEFAULT_VAULT_PATH };
  } catch (e) {
    console.warn('Invalid vault.config.json. Falling back to default path.', e.message);
    return { vaultPath: DEFAULT_VAULT_PATH };
  }
}

function normalizeVault(vaultPath) {
  return path.resolve(vaultPath);
}

function safeRel(absPath, vaultAbsPath) {
  const rel = path.relative(vaultAbsPath, absPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel;
}

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return {};
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return {};
  const fmBody = text.slice(4, end);
  const lines = fmBody.split('\n');
  const out = {};
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    out[key] = val;
  }
  return out;
}

function parseWikiLinks(text) {
  const all = [...text.matchAll(/!?\[\[([^\]]+)\]\]/g)];
  const outgoing = [];
  const images = [];
  for (const m of all) {
    const full = m[0];
    const inner = m[1].split('|')[0].trim();
    if (!inner) continue;
    if (full.startsWith('!')) images.push(inner);
    else outgoing.push(inner);
  }
  return { outgoing, images };
}

function walkMarkdown(vaultAbsPath) {
  const mdFiles = [];
  const stack = [vaultAbsPath];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(p);
      } else if (entry.isFile() && p.toLowerCase().endsWith('.md')) {
        mdFiles.push(p);
      }
    }
  }
  return mdFiles;
}

function resolveImagePath(vaultAbsPath, noteDir, imageTarget) {
  const trimmed = imageTarget.trim();
  if (!trimmed) return null;

  const candidates = [
    path.resolve(noteDir, trimmed),
    path.resolve(vaultAbsPath, trimmed),
    path.resolve(vaultAbsPath, 'attachments', path.basename(trimmed))
  ];

  for (const candidate of candidates) {
    const rel = safeRel(candidate, vaultAbsPath);
    if (!rel) continue;
    const ext = path.extname(candidate).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return rel;
    }
  }
  return null;
}

function buildNotes(vaultAbsPath) {
  const files = walkMarkdown(vaultAbsPath);
  const notes = [];
  const titleMap = new Map();

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const frontmatter = parseFrontmatter(raw);
    const relPath = safeRel(filePath, vaultAbsPath);
    if (!relPath) continue;
    const links = parseWikiLinks(raw);
    const stat = fs.statSync(filePath);
    const noteDir = path.dirname(filePath);
    const resolvedImages = links.images
      .map((img) => resolveImagePath(vaultAbsPath, noteDir, img))
      .filter(Boolean);

    const note = {
      id: relPath,
      title: path.basename(filePath, '.md'),
      type: frontmatter.type || 'unknown',
      filePath: relPath,
      directory: path.dirname(relPath) === '.' ? '' : path.dirname(relPath),
      updatedAt: stat.mtime.toISOString(),
      outgoingLinks: links.outgoing,
      incomingLinks: [],
      images: resolvedImages
    };
    notes.push(note);
    titleMap.set(note.title.toLowerCase(), note.id);
    titleMap.set(note.filePath.toLowerCase(), note.id);
  }

  const incomingMap = new Map(notes.map((n) => [n.id, []]));
  for (const note of notes) {
    for (const link of note.outgoingLinks) {
      const normalized = link.replace(/\.md$/i, '').toLowerCase();
      const targetId = titleMap.get(normalized) || titleMap.get(`${normalized}.md`);
      if (targetId && incomingMap.has(targetId)) incomingMap.get(targetId).push(note.id);
    }
  }
  for (const note of notes) note.incomingLinks = incomingMap.get(note.id) || [];

  return notes;
}

function sendJson(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function serveStatic(reqPath, res) {
  const target = reqPath === '/' ? '/index.html' : reqPath;
  const abs = path.resolve(WEB_ROOT, `.${target}`);
  if (!abs.startsWith(WEB_ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const ext = path.extname(abs);
  const mime = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.js' ? 'application/javascript; charset=utf-8' : ext === '.css' ? 'text/css; charset=utf-8' : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(abs).pipe(res);
}

function serveAsset(urlObj, res) {
  const { vaultPath } = readConfig();
  const vaultAbsPath = normalizeVault(vaultPath);
  const requested = urlObj.searchParams.get('path');
  if (!requested) return sendJson(res, 400, { error: 'path is required' });
  const candidate = path.resolve(vaultAbsPath, requested);
  const rel = safeRel(candidate, vaultAbsPath);
  if (!rel) return sendJson(res, 403, { error: 'outside vault' });
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) return sendJson(res, 404, { error: 'asset not found' });

  const ext = path.extname(candidate).toLowerCase();
  const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.bmp': 'image/bmp' };
  const mime = mimeMap[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(candidate).pipe(res);
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${HOST}:${PORT}`);

  if (urlObj.pathname === '/api/notes') {
    const { vaultPath } = readConfig();
    const vaultAbsPath = normalizeVault(vaultPath);
    if (!fs.existsSync(vaultAbsPath)) {
      return sendJson(res, 500, { error: `Vault path not found: ${vaultAbsPath}` });
    }
    try {
      const notes = buildNotes(vaultAbsPath);
      return sendJson(res, 200, { vaultPath: vaultAbsPath, notes });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (urlObj.pathname === '/api/asset') {
    return serveAsset(urlObj, res);
  }

  return serveStatic(urlObj.pathname, res);
});

server.listen(PORT, HOST, () => {
  console.log(`ACE Vault viewer running at http://${HOST}:${PORT}`);
});
