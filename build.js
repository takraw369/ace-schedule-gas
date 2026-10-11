#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const VAULT_PATH = process.env.ACE_VAULT_PATH || path.join(process.env.HOME || '', 'ドキュメント/Obsidian/ace-vault');
const OUTPUT = path.join(__dirname, 'vault-view.html');

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { meta: {}, body: content };
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { meta: {}, body: content };
  const yaml = content.slice(4, end);
  const body = content.slice(end + 4).trimStart();
  const meta = {};
  for (const line of yaml.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (!key) continue;
    // arrays: "- item" style (multiline) already collapsed — handle inline [a,b]
    if (val.startsWith('[') && val.endsWith(']')) {
      meta[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      meta[key] = val.replace(/^["']|["']$/g, '');
    }
  }
  // handle block-style tag arrays
  const tagMatch = yaml.match(/tags:\s*\n((?:\s+-\s+.+\n?)+)/);
  if (tagMatch) {
    meta.tags = tagMatch[1].split('\n').map(l => l.replace(/^\s+-\s+/, '').trim()).filter(Boolean);
  }
  return { meta, body };
}

function extractLinks(body) {
  const links = new Set();
  const re = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    links.add(m[1].trim());
  }
  return [...links];
}

// Keep images in the original vault. No image is copied or embedded.
function extractImages(body, filePath) {
  const foundImages = [], seen = new Set();
  for (const m of body.matchAll(/!\[\[([^\]]+)\]\]/g)) {
    const ref = m[1].split('|')[0].split('#')[0].trim();
    if (!/\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(ref) || seen.has(ref)) continue;
    seen.add(ref);
    const paths = [
      path.resolve(path.dirname(filePath), ref),
      path.resolve(VAULT_PATH, 'attachments', ref),
      path.resolve(VAULT_PATH, 'attachments', path.basename(ref)),
      path.resolve(VAULT_PATH, ref)
    ];
    const resolved = paths.find(p => {
      if (!(p === VAULT_PATH || p.startsWith(VAULT_PATH + path.sep))) return false;
      try { return fs.statSync(p).isFile(); } catch { return false; }
    });
    foundImages.push({ source: ref, url: resolved ? pathToFileURL(resolved).href : null });
  }
  return foundImages;
}

function walkDir(dir, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(full, results);
    else if (e.name.endsWith('.md')) results.push(full);
  }
  return results;
}

const VALID_TYPES = new Set(['mondai', 'genri', 'taiken', 'concept', 'output', 'product']);
function normalizeType(t) { return (t && VALID_TYPES.has(t)) ? t : null; }

// Build node list
const files = walkDir(VAULT_PATH);
const nodes = [];
const titleToId = new Map();

for (let i = 0; i < files.length; i++) {
  const filePath = files[i];
  const relPath = path.relative(VAULT_PATH, filePath);
  const title = path.basename(filePath, '.md');
  const dir = path.dirname(relPath) === '.' ? '(root)' : path.dirname(relPath).split(path.sep)[0];
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch { content = ''; }
  const stat = fs.statSync(filePath);
  const { meta, body } = parseFrontmatter(content);
  const now = Date.now();
  const mtime = stat.mtimeMs;
  const daysAgo = Math.floor((now - mtime) / 86400000);
  const isTriage = title.startsWith('_triage') || (Array.isArray(meta.tags) && meta.tags.some(t => /triage/i.test(t)));
  const wordCount = body.replace(/\s+/g, ' ').length;
  const excerpt = body.replace(/\n+/g, ' ').replace(/#+\s/g, '').slice(0, 200);
  const type = normalizeType(meta.type);
  const tags = Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []);
  const linkTargets = extractLinks(body.replace(/!\[\[[^\]]+\]\]/g, ''));
  const images = extractImages(body, filePath);
  const preview = body.slice(0, 5000);

  const node = { id: i, title, relPath, dir, type, tags, linkTargets, links: [], backlinks: [], excerpt, preview, images, mtimeMs: mtime, daysAgo, isTriage, wordCount };
  nodes.push(node);
  titleToId.set(title.toLowerCase(), i);
  // also register without extension variants
  titleToId.set(title, i);
}

// Resolve links → ids and build backlinks
for (const node of nodes) {
  for (const target of node.linkTargets) {
    const tid = titleToId.get(target) ?? titleToId.get(target.toLowerCase());
    if (tid !== undefined && tid !== node.id) {
      if (!node.links.includes(tid)) node.links.push(tid);
      if (!nodes[tid].backlinks.includes(node.id)) nodes[tid].backlinks.push(node.id);
    }
  }
  delete node.linkTargets;
}

// Serialize
const data = JSON.stringify(nodes).replace(/</g, '\\u003c');

// HTML template
const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ACE Vault — リゾームビュー</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;background:#1a1a18;color:#e8e6e0;height:100vh;display:flex;flex-direction:column;overflow:hidden}
#toolbar{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#222220;border-bottom:1px solid #333;flex-wrap:wrap;flex-shrink:0}
#search{background:#2a2a28;border:1px solid #444;color:#e8e6e0;padding:6px 10px;border-radius:6px;font-size:13px;width:200px;outline:none}
#search:focus{border-color:#7F77DD}
.filter-group{display:flex;gap:4px;flex-wrap:wrap}
button{background:#2a2a28;border:1px solid #444;color:#aaa;padding:5px 10px;border-radius:5px;font-size:12px;cursor:pointer;transition:all .15s}
button:hover{background:#333;color:#e8e6e0}
button.active{color:#fff;border-color:currentColor}
button[data-type="mondai"].active{color:#D4537E;border-color:#D4537E;background:#2a1520}
button[data-type="genri"].active{color:#7F77DD;border-color:#7F77DD;background:#1a1a28}
button[data-type="taiken"].active{color:#1D9E75;border-color:#1D9E75;background:#0d1f18}
button[data-type="concept"].active{color:#378ADD;border-color:#378ADD;background:#101a28}
button[data-type="output"].active{color:#EF9F27;border-color:#EF9F27;background:#221900}
button[data-type="product"].active{color:#D85A30;border-color:#D85A30;background:#221008}
button[data-type="null"].active{color:#888780;border-color:#888780;background:#1f1f1d}
button[data-mode].active{color:#fff;border-color:#888;background:#333}
#isolate-btn.active{color:#ff6b6b;border-color:#ff6b6b;background:#220d0d;animation:none}
#shake-btn{margin-left:auto}
#main{display:flex;flex:1;min-height:0;overflow-x:auto;overflow-y:hidden}
#sidebar{width:240px;flex:0 0 240px;background:#20201e;border-right:1px solid #333;overflow-y:auto;padding:12px 10px}
#canvas-wrap{width:50vw;flex:0 0 50vw;min-width:460px;position:relative;overflow:hidden}
svg{width:100%;height:100%;display:block}
.node circle{cursor:pointer;transition:opacity .2s}
.node text{pointer-events:none;font-size:10px;fill:#ccc;text-anchor:middle;dominant-baseline:central;user-select:none}
.link{stroke:#555;stroke-opacity:0.4;stroke-width:0.6}
.link.highlight{stroke:#fff;stroke-opacity:0.9;stroke-width:1.2}
.node.isolated circle{animation:blink 1.2s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}
.node.dimmed circle{opacity:0.15}
.node.highlighted circle{stroke:#fff;stroke-width:2}
#detail{min-width:320px;flex:1 0 320px;background:#1e1e1c;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
#detail h2{font-size:15px;font-weight:600;color:#e8e6e0;line-height:1.4}
.meta-row{font-size:11px;color:#777;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.type-badge{display:inline-block;padding:2px 7px;border-radius:3px;font-size:11px;font-weight:600;color:#fff}
.detail-section{font-size:12px;color:#aaa;line-height:1.6}
.detail-section h3{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
.link-item{padding:4px 6px;border-radius:4px;cursor:pointer;background:#252523;margin-bottom:3px;font-size:12px;color:#ccc;border:1px solid transparent}
.link-item:hover{background:#2e2e2c;border-color:#444}
.link-item .link-dir{font-size:10px;color:#555;margin-right:4px}
#open-obsidian{background:#2a2a28;border:1px solid #555;color:#aaa;padding:6px 12px;border-radius:5px;font-size:12px;cursor:pointer;width:100%;text-align:center}
#open-obsidian:hover{background:#333;color:#e8e6e0}
#stats{font-size:11px;color:#555;padding:6px 14px;background:#1a1a18;border-top:1px solid #222;flex-shrink:0}
#detail-empty{color:#555;font-size:13px;text-align:center;margin-top:40px}
.excerpt{font-size:12px;color:#888;line-height:1.6;white-space:pre-wrap;word-break:break-all}

#sidebar h2{font-size:14px;color:#e8e6e0;margin-bottom:10px}
#sidebar h3{font-size:11px;color:#999;margin:16px 4px 5px}
#sidebar details{border-top:1px solid #30302e;padding:4px 0}
#sidebar summary{font-size:12px;color:#ccc;cursor:pointer;padding:5px 4px;overflow-wrap:anywhere}
.side-item{display:block;width:100%;min-height:32px;text-align:left;padding:6px 8px;margin:2px 0;border:0;border-radius:4px;color:#c5c4be;background:transparent;font-size:12px;white-space:normal;overflow-wrap:anywhere}
.side-item:hover,.side-item.selected{background:#373734;color:#fff}
.side-note{font-size:11px;color:#777;padding:4px 8px}
.note-preview{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65;max-height:420px;overflow:auto;font-size:12px}
.note-image{max-width:100%;height:auto;border-radius:6px;margin-top:7px}
.note-path,.missing-image{font-size:11px;color:#8d8a80;overflow-wrap:anywhere}
.missing-image{color:#b68d66;margin:6px 0}
#detail h2{overflow-wrap:anywhere}
@media(max-width:720px){#toolbar{padding:8px}#search{width:160px}#canvas-wrap{min-width:340px;flex-basis:80vw}#detail{min-width:300px}}
</style>
</head>
<body>
<div id="toolbar">
  <input id="search" type="text" placeholder="検索 (タイトル / タグ / 本文)">
  <div class="filter-group" id="type-filters">
    <button data-type="mondai" title="問い">mondai</button>
    <button data-type="genri" title="原理">genri</button>
    <button data-type="taiken" title="体験">taiken</button>
    <button data-type="concept" title="概念">concept</button>
    <button data-type="output" title="出力">output</button>
    <button data-type="product" title="プロダクト">product</button>
    <button data-type="null" title="type未設定">未分類</button>
  </div>
  <div class="filter-group">
    <button data-mode="recent30" title="最近30日">最近30日</button>
    <button data-mode="triage" title="_triageのみ">_triage</button>
  </div>
  <button id="isolate-btn" title="リンクなしノードを点滅">孤立強調</button>
  <button id="shake-btn">↺ 揺らす</button>
</div>
<div id="main">
  <aside id="sidebar" aria-label="Vaultナビゲーション"><h2>Vault ナビゲーション</h2><div id="sidebar-content"></div></aside>
  <main id="detail"><div id="detail-empty">左の一覧か右のグラフからノートを選択</div></main>
  <div id="canvas-wrap"><svg id="svg" aria-label="ノート関係グラフ"><g id="viewport"><g id="links-g"></g><g id="nodes-g"></g></g></svg></div>
</div>
<div id="stats">ロード中…</div>

<script>
const RAW = ${data};

const TYPE_COLOR = {
  mondai:  '#D4537E',
  genri:   '#7F77DD',
  taiken:  '#1D9E75',
  concept: '#378ADD',
  output:  '#EF9F27',
  product: '#D85A30',
  null:    '#888780',
};

function typeColor(t){ return TYPE_COLOR[t] || TYPE_COLOR['null']; }

// --- State ---
let nodes = RAW.map(n => ({ ...n, x: 0, y: 0, vx: 0, vy: 0, visible: true }));
let activeTypes = new Set(); // empty = all
let activeMode = null; // 'recent30' | 'triage' | null
let isolateMode = false;
let searchQ = '';
let selectedId = null;
let highlightSet = new Set(); // ids to highlight on selection

// positions init
const svg = document.getElementById('svg');
const viewportG = document.getElementById('viewport');
const nodesG = document.getElementById('nodes-g');
const linksG = document.getElementById('links-g');

function svgW(){ return svg.clientWidth || 800; }
function svgH(){ return svg.clientHeight || 600; }

function scatter() {
  const w = svgW(), h = svgH();
  for (const n of nodes) {
    n.x = w * 0.1 + Math.random() * w * 0.8;
    n.y = h * 0.1 + Math.random() * h * 0.8;
    n.vx = 0; n.vy = 0;
  }
}
scatter();

// The force simulation stays in world coordinates; pan/zoom only transforms the viewport.
const camera = { x:0, y:0, scale:1 };
function updateCamera() {
  viewportG.setAttribute('transform', 'translate(' + camera.x + ' ' + camera.y + ') scale(' + camera.scale + ')');
}
function screenPoint(e) {
  const r = svg.getBoundingClientRect();
  return { x:(e.clientX-r.left)*svgW()/(r.width||1), y:(e.clientY-r.top)*svgH()/(r.height||1) };
}
function screenToWorld(e) {
  const p = screenPoint(e);
  return { x:(p.x-camera.x)/camera.scale, y:(p.y-camera.y)/camera.scale };
}
let panning = null;
svg.addEventListener('mousedown', e => {
  if (e.button !== 0 || e.target.closest('.node')) return;
  const p=screenPoint(e);
  panning={px:p.x,py:p.y,x:camera.x,y:camera.y};
  e.preventDefault();
});
window.addEventListener('mousemove', e => {
  if (!panning) return;
  const p=screenPoint(e);
  camera.x=panning.x+p.x-panning.px;
  camera.y=panning.y+p.y-panning.py;
  updateCamera();
});
window.addEventListener('mouseup', () => { panning=null; });
svg.addEventListener('wheel', e => {
  e.preventDefault();
  const p=screenPoint(e);
  const next=Math.max(0.3, Math.min(3.0, camera.scale*Math.exp(-e.deltaY*0.0015)));
  const wx=(p.x-camera.x)/camera.scale, wy=(p.y-camera.y)/camera.scale;
  camera.x=p.x-wx*next; camera.y=p.y-wy*next; camera.scale=next;
  updateCamera();
}, {passive:false});
svg.addEventListener('dblclick', e => {
  e.preventDefault();
  camera.x=0; camera.y=0; camera.scale=1;
  updateCamera();
});
updateCamera();

// --- Visibility ---
function computeVisible() {
  for (const n of nodes) {
    let show = true;
    if (activeTypes.size > 0) {
      const key = n.type === null ? 'null' : n.type;
      if (!activeTypes.has(key)) show = false;
    }
    if (activeMode === 'recent30' && n.daysAgo > 30) show = false;
    if (activeMode === 'triage' && !n.isTriage) show = false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      const hit = n.title.toLowerCase().includes(q)
        || n.excerpt.toLowerCase().includes(q)
        || (n.tags && n.tags.some(t => t.toLowerCase().includes(q)));
      if (!hit) show = false;
    }
    n.visible = show;
  }
  if (selectedId !== null && nodes[selectedId]) nodes[selectedId].visible = true;
}

// --- Simulation ---
const REPEL = 120, LINK_DIST = 80, CENTER = 0.015, DAMP = 0.82, ALPHA_START = 1.0;
let alpha = ALPHA_START;
let rafId = null;

function nodeRadius(n) {
  const linkCount = n.links.length + n.backlinks.length;
  const freshness = Math.max(0, 1 - n.daysAgo / 60);
  return 7 + Math.min(8, linkCount * 0.7 + freshness * 3);
}

function tick() {
  if (alpha < 0.002) { rafId = null; return; }
  alpha *= 0.98;
  const w = svgW(), h = svgH();
  const vis = nodes.filter(n => n.visible);

  for (const a of vis) {
    // center attraction
    a.vx += (w / 2 - a.x) * CENTER;
    a.vy += (h / 2 - a.y) * CENTER;

    // repulsion
    for (const b of vis) {
      if (a.id >= b.id) continue;
      const dx = a.x - b.x, dy = a.y - b.y;
      const dist2 = dx * dx + dy * dy + 1;
      const dist = Math.sqrt(dist2);
      if (dist < REPEL) {
        const force = (REPEL - dist) / dist * 0.4;
        a.vx += dx * force; a.vy += dy * force;
        b.vx -= dx * force; b.vy -= dy * force;
      }
    }
  }

  // link attraction
  for (const a of vis) {
    for (const bid of a.links) {
      const b = nodes[bid];
      if (!b.visible) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const diff = (dist - LINK_DIST) / dist * 0.06;
      a.vx += dx * diff; a.vy += dy * diff;
      b.vx -= dx * diff; b.vy -= dy * diff;
    }
  }

  for (const n of vis) {
    n.vx *= DAMP; n.vy *= DAMP;
    n.x = Math.max(12, Math.min(w - 12, n.x + n.vx));
    n.y = Math.max(12, Math.min(h - 12, n.y + n.vy));
  }

  render();
  rafId = requestAnimationFrame(tick);
}

function startSim(a = ALPHA_START) {
  alpha = a;
  if (!rafId) rafId = requestAnimationFrame(tick);
}

// --- Render ---
let nodeEls = {}; // id -> {g, circle, text}
let linkEls = {}; // 'a-b' -> line

function render() {
  const vis = new Set(nodes.filter(n => n.visible).map(n => n.id));
  const isolated = new Set(nodes.filter(n => n.visible && n.links.length === 0 && n.backlinks.length === 0).map(n => n.id));

  // links
  for (const n of nodes) {
    if (!vis.has(n.id)) continue;
    for (const bid of n.links) {
      if (!vis.has(bid)) continue;
      const key = Math.min(n.id, bid) + '-' + Math.max(n.id, bid);
      let line = linkEls[key];
      if (!line) {
        line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.classList.add('link');
        linksG.appendChild(line);
        linkEls[key] = line;
      }
      const a = nodes[Math.min(n.id, bid)], b = nodes[Math.max(n.id, bid)];
      line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
      line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
      line.style.display = '';
      const hl = highlightSet.has(n.id) && highlightSet.has(bid);
      line.classList.toggle('highlight', hl);
    }
  }
  // hide invisible links
  for (const [key, line] of Object.entries(linkEls)) {
    const [a, b] = key.split('-').map(Number);
    if (!vis.has(a) || !vis.has(b)) line.style.display = 'none';
  }

  // nodes
  for (const n of nodes) {
    let el = nodeEls[n.id];
    if (!el) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('node');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      g.appendChild(circle);
      g.appendChild(text);
      nodesG.appendChild(g);
      el = nodeEls[n.id] = { g, circle, text };

      g.addEventListener('click', () => selectNode(n.id));
      // Node drag uses inverse camera transform, so it cannot trigger background pan.
      let dragging=false, ox=0, oy=0;
      g.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        const p=screenToWorld(e);
        dragging=true; ox=p.x-n.x; oy=p.y-n.y;
        e.stopPropagation(); e.preventDefault();
      });
      window.addEventListener('mousemove', e => {
        if (!dragging) return;
        const p=screenToWorld(e);
        n.x=p.x-ox; n.y=p.y-oy;
        n.vx=0; n.vy=0;
        render();
      });
      window.addEventListener('mouseup', () => { dragging=false; });
    }
    const { g, circle, text } = el;
    if (!vis.has(n.id)) { g.style.display = 'none'; continue; }
    g.style.display = '';
    const r = nodeRadius(n);
    const color = typeColor(n.type);
    const opacity = n.daysAgo > 14 ? 0.45 : 1;
    circle.setAttribute('r', r);
    circle.setAttribute('cx', n.x); circle.setAttribute('cy', n.y);
    circle.setAttribute('fill', color);
    circle.setAttribute('fill-opacity', opacity);
    circle.setAttribute('stroke', selectedId === n.id ? '#fff' : 'none');
    circle.setAttribute('stroke-width', 2);

    // label for larger nodes or hovered
    const label = n.title.length > 14 ? n.title.slice(0, 13) + '…' : n.title;
    if (r >= 10 || selectedId === n.id) {
      text.setAttribute('x', n.x); text.setAttribute('y', n.y + r + 9);
      text.textContent = label;
      text.style.display = '';
    } else {
      text.style.display = 'none';
    }

    // isolated blink
    g.classList.toggle('isolated', isolateMode && isolated.has(n.id));

    // dim non-highlighted when selection active
    if (selectedId !== null && highlightSet.size > 0) {
      g.classList.toggle('dimmed', !highlightSet.has(n.id));
      g.classList.toggle('highlighted', n.id === selectedId);
    } else {
      g.classList.remove('dimmed', 'highlighted');
    }
  }

  updateStats(vis, isolated);
}

function updateStats(vis, isolated) {
  const total = nodes.length;
  const showing = vis.size;
  const iso = [...isolated].filter(id => vis.has(id)).length;
  const triage = nodes.filter(n => n.isTriage && vis.has(n.id)).length;
  document.getElementById('stats').textContent =
    \`全 \${total} ノード ｜ 表示中 \${showing} ｜ _triage \${triage} ｜ 孤立 \${iso}\`;
}

// --- Detail pane ---
function selectNode(id) {
  if (!nodes[id]) return;
  selectedId = id;
  const n = nodes[id];
  n.visible = true;
  highlightSet = new Set([id, ...n.links, ...n.backlinks]);
  const detail = document.getElementById('detail');
  const color = typeColor(n.type);
  const updated = new Date(n.mtimeMs).toLocaleString('ja-JP');
  const obsUrl = 'obsidian://open?vault=ace-vault&file=' + encodeURIComponent(n.relPath.replace(/\.md$/, ''));
  const allLinks = [...n.links.map(id => ({id,dir:'→'})), ...n.backlinks.map(id => ({id,dir:'←'}))];
  detail.innerHTML = \`
    <div>
      <h2>\${esc(n.title)}</h2>
      <div class="meta-row" style="margin-top:6px">
        <span class="type-badge" style="background:\${color}">\${esc(n.type || '未分類')}</span>
        <span>🕐 更新 \${esc(updated)}</span>
        <span>📝 \${n.wordCount}文字</span>
      </div>
      <div class="note-path">📁 \${esc(n.relPath)}</div>
      \${n.tags && n.tags.length ? \`<div class="meta-row" style="margin-top:4px">\${n.tags.map(t => \`<span>#\${esc(t)}</span>\`).join(' ')}</div>\` : ''}
    </div>
    <div class="detail-section"><h3>本文プレビュー（最大5000文字）</h3><div class="note-preview">\${esc(n.preview || '(本文なし)')}</div></div>
    \${n.images && n.images.length ? \`<div class="detail-section"><h3>画像（\${n.images.length}）</h3>\${n.images.map(img => img.url
      ? \`<div><img class="note-image" loading="lazy" src="\${esc(img.url)}" alt="\${esc(img.source)}"></div>\`
      : \`<div class="missing-image">画像が見つかりません: \${esc(img.source)}</div>\`).join('')}</div>\` : ''}
    <div class="detail-section">
      <h3>関連リンク（\${allLinks.length}）</h3>
      \${allLinks.length === 0 ? '<span style="color:#777">リンクなし</span>' :
        allLinks.map(({id,dir}) => \`<button class="link-item" data-link="\${id}"><span class="link-dir">\${dir}</span>\${esc(nodes[id].title)}</button>\`).join('')}
    </div>
    <button id="open-obsidian">Obsidianで開く ↗</button>
  \`;
  detail.querySelectorAll('[data-link]').forEach(el => el.addEventListener('click', () => selectNode(+el.dataset.link)));
  detail.querySelector('#open-obsidian').addEventListener('click', () => window.open(obsUrl, '_self'));
  document.querySelectorAll('.side-item[data-select]').forEach(el => el.classList.toggle('selected', +el.dataset.select === id));
  render();
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function renderSidebar() {
  const host = document.getElementById('sidebar-content');
  const sorted = list => [...list].sort((a,b) => a.title.localeCompare(b.title,'ja'));
  const item = n => \`<button class="side-item" data-select="\${n.id}" title="\${esc(n.relPath)}">\${esc(n.title)}</button>\`;
  const section = (title, groups, open=false) =>
    \`<h3>\${esc(title)}</h3>\` + groups.map(([label,list]) =>
      \`<details \${open?'open':''}><summary>\${esc(label)}（\${list.length}）</summary>\${list.length?sorted(list).map(item).join(''):'<div class="side-note">ノートなし</div>'}</details>\`).join('');
  const types=['mondai','genri','taiken','concept','output','product',null];
  const typeGroups=types.map(t => [t || 'typeなし', nodes.filter(n => n.type === t)]);
  const dirs=[...new Set(nodes.map(n => n.dir))].sort((a,b)=>a.localeCompare(b,'ja'));
  const dirGroups=dirs.map(d => [d,nodes.filter(n => n.dir === d)]);
  const weak=nodes.filter(n => n.links.length === 0 || n.backlinks.length === 0);
  const recent=[...nodes].sort((a,b)=>b.mtimeMs-a.mtimeMs).slice(0,10);
  host.innerHTML = section('Type別一覧',typeGroups) + section('ディレクトリ',dirGroups)
    + section('孤立・片方向ノード',[['リンク不足',weak]])
    + section('最近触ったノート',[['更新順 上位10件',recent]],true);
  host.addEventListener('click', e => {
    const btn=e.target.closest('[data-select]');
    if (btn) selectNode(+btn.dataset.select);
  });
}

// --- Filters ---
document.querySelectorAll('[data-type]').forEach(btn => {
  btn.addEventListener('click', () => {
    const t = btn.dataset.type;
    if (activeTypes.has(t)) { activeTypes.delete(t); btn.classList.remove('active'); }
    else { activeTypes.add(t); btn.classList.add('active'); }
    computeVisible();
    startSim(0.5);
  });
});

document.querySelectorAll('[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    const m = btn.dataset.mode;
    if (activeMode === m) { activeMode = null; btn.classList.remove('active'); }
    else {
      document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
      activeMode = m; btn.classList.add('active');
    }
    computeVisible();
    startSim(0.5);
  });
});

document.getElementById('isolate-btn').addEventListener('click', function() {
  isolateMode = !isolateMode;
  this.classList.toggle('active', isolateMode);
  render();
});

document.getElementById('shake-btn').addEventListener('click', () => {
  for (const n of nodes) { n.vx += (Math.random() - 0.5) * 60; n.vy += (Math.random() - 0.5) * 60; }
  startSim(0.6);
});

document.getElementById('search').addEventListener('input', e => {
  searchQ = e.target.value.trim();
  computeVisible();
  startSim(0.3);
});

// --- Init ---
renderSidebar();
computeVisible();
startSim();
</script>
</body>
</html>`;

fs.writeFileSync(OUTPUT, html, 'utf8');
console.log('Generated:', OUTPUT, '(' + nodes.length + ' nodes)');

