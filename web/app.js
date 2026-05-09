const state = { notes: [], current: null, zoom: 1, panX: 0, panY: 0 };

async function init() {
  const res = await fetch('/api/notes');
  const data = await res.json();
  state.notes = data.notes || [];
  renderLists();
  drawGraph();
}

function renderList(el, items, labelFn, onClick) {
  el.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = labelFn(item);
    li.onclick = () => onClick(item);
    el.appendChild(li);
  });
}

function renderLists() {
  const byType = Object.entries(state.notes.reduce((acc, n) => ((acc[n.type] = (acc[n.type] || 0) + 1), acc), {}));
  renderList(document.getElementById('typeList'), byType, ([k, v]) => `${k} (${v})`, ([type]) => {
    const first = state.notes.find((n) => n.type === type); if (first) showNote(first);
  });

  const byDir = Object.entries(state.notes.reduce((acc, n) => ((acc[n.directory || '/'] = (acc[n.directory || '/'] || 0) + 1), acc), {}));
  renderList(document.getElementById('dirList'), byDir, ([k, v]) => `${k} (${v})`, ([dir]) => {
    const first = state.notes.find((n) => (n.directory || '/') === dir); if (first) showNote(first);
  });

  const isolated = state.notes.filter((n) => n.outgoingLinks.length === 0 && n.incomingLinks.length === 0);
  renderList(document.getElementById('isolatedList'), isolated, (n) => n.title, showNote);

  const recent = [...state.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 20);
  renderList(document.getElementById('recentList'), recent, (n) => `${n.title} (${n.updatedAt.slice(0, 10)})`, showNote);
}

function showNote(note) {
  state.current = note;
  document.getElementById('noteTitle').textContent = note.title;
  document.getElementById('noteMeta').textContent = `${note.filePath} / type:${note.type} / 更新:${note.updatedAt}`;
  const related = [...new Set([...note.outgoingLinks, ...note.incomingLinks])];
  renderList(document.getElementById('related'), related, (r) => r, (r) => {
    const t = state.notes.find((n) => n.id === r || n.title === r); if (t) showNote(t);
  });

  const images = document.getElementById('images');
  images.innerHTML = '';
  note.images.forEach((imgPath) => {
    const img = document.createElement('img');
    img.src = `/api/asset?path=${encodeURIComponent(imgPath)}`;
    images.appendChild(img);
  });

  const btn = document.getElementById('openObsidian');
  btn.disabled = false;
  btn.onclick = () => window.open(`obsidian://open?path=${encodeURIComponent(note.filePath)}`);
  drawGraph();
}

function drawGraph() {
  const canvas = document.getElementById('graph');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const n = state.notes.length;
  if (!n) return;

  const radius = 150 * state.zoom;
  const cx = canvas.width / 2 + state.panX;
  const cy = canvas.height / 2 + state.panY;
  const positions = new Map();

  state.notes.forEach((note, i) => {
    const a = (Math.PI * 2 * i) / n;
    positions.set(note.id, { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) });
  });

  ctx.strokeStyle = '#444';
  state.notes.forEach((note) => {
    const from = positions.get(note.id);
    note.outgoingLinks.forEach((link) => {
      const target = state.notes.find((x) => x.title === link || x.id === link);
      if (!target) return;
      const to = positions.get(target.id);
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    });
  });

  state.notes.forEach((note) => {
    const p = positions.get(note.id);
    const active = state.current && state.current.id === note.id;
    ctx.fillStyle = active ? '#ff922b' : '#4dabf7';
    ctx.beginPath(); ctx.arc(p.x, p.y, active ? 7 : 4, 0, Math.PI * 2); ctx.fill();
  });
}

const canvas = document.getElementById('graph');
canvas?.addEventListener('wheel', (e) => { e.preventDefault(); state.zoom = Math.max(0.4, Math.min(2.5, state.zoom + (e.deltaY < 0 ? 0.1 : -0.1))); drawGraph(); });
let dragging = false; let lastX = 0; let lastY = 0;
canvas?.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('mousemove', (e) => { if (!dragging) return; state.panX += e.clientX - lastX; state.panY += e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; drawGraph(); });

init();
