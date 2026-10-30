'use strict';

/* ================= KONFIGURASI ================= */
// Isi dengan OAuth Client ID dari Google Cloud Console (tipe: Web application)
const GOOGLE_CLIENT_ID = '';

/* ================= UTILITAS ================= */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem('vf_' + k)); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('vf_' + k, JSON.stringify(v)); } catch { /* abaikan */ } }
};
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('on'), 2600);
}
function countUp(el, to) {
  const s = performance.now();
  const tick = (t) => {
    const k = Math.min((t - s) / 700, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + '%';
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
const swatch = (c) => `<div class="pair"><i class="sw" style="background:${esc(c[1])}"></i><b>${esc(c[0])}</b></div>`;

/* ================= DATA WARNA ================= */
const PRESETS = [
  { id: 'navy',  name: 'Navy',        hex: '#1F3A5F', score: 95, label: 'Perfect Match',
    pants: { name: 'Chino Cream', hex: '#EFE6D2' }, outer: { name: 'Camel Coat', hex: '#C19A6B' }, access: { name: 'Leather Brown', hex: '#7B4B2A' } },
  { id: 'sage',  name: 'Sage Green',  hex: '#9CAF88', score: 92, label: 'Great Match',
    pants: { name: 'Off White', hex: '#F4F1E8' }, outer: { name: 'Earth Brown', hex: '#8B6B4A' }, access: { name: 'Terracotta', hex: '#C8745A' } },
  { id: 'brown', name: 'Earth Brown', hex: '#8B6B4A', score: 90, label: 'Great Match',
    pants: { name: 'Beige Linen', hex: '#D9C7A6' }, outer: { name: 'Olive Jacket', hex: '#6B7048' }, access: { name: 'Teal Scarf', hex: '#3E8E8A' } },
  { id: 'black', name: 'Black',       hex: '#1A1D20', score: 97, label: 'Perfect Match',
    pants: { name: 'Light Denim', hex: '#9DB4CE' }, outer: { name: 'Charcoal Blazer', hex: '#3C4043' }, access: { name: 'Gold Detail', hex: '#C9A24B' } },
  { id: 'beige', name: 'Beige',       hex: '#D8C7A8', score: 93, label: 'Great Match',
    pants: { name: 'Dark Brown', hex: '#5A4331' }, outer: { name: 'Navy Blazer', hex: '#1F3A5F' }, access: { name: 'Silver Watch', hex: '#B8BEC4' } },
  { id: 'white', name: 'White',       hex: '#FFFFFF', score: 96, label: 'Perfect Match',
    pants: { name: 'Navy Trousers', hex: '#1F3A5F' }, outer: { name: 'Sage Cardigan', hex: '#9CAF88' }, access: { name: 'Tan Leather', hex: '#B07D4F' } }
];

const hexToHsl = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0, s = 0; const l = (max + min) / 2;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: s * 100, l: l * 100 };
};
const hslToHex = (h, s, l) => {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (k) => { const x = (k + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(x - 3, 9 - x, 1)))); };
  return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
};
const nameFor = (h, s, l) => {
  if (l > 88) return 'Putih'; if (l < 14) return 'Hitam';
  if (s < 12) return l > 60 ? 'Abu Muda' : 'Abu Tua';
  return ['Merah', 'Oranye', 'Kuning', 'Hijau', 'Teal', 'Biru', 'Ungu', 'Pink'][Math.round(h / 45) % 8];
};

/* Simulasi AI untuk warna kustom: netral + komplementer + analogus */
function matchCustom(hex) {
  const { h, s, l } = hexToHsl(hex);
  const neutral = s < 12 || l > 88 || l < 14;
  const score = Math.max(84, Math.min(96, Math.round(90 + (neutral ? 5 : 2) - Math.abs(s - 45) / 25)));
  return {
    name: `${nameFor(h, s, l)} Kustom`, hex: hex.toUpperCase(), score, label: score >= 94 ? 'Perfect Match' : 'Great Match',
    pants:  { name: 'Neutral Tone',  hex: l > 55 ? hslToHex(h, 18, 28) : hslToHex(h + 20, 25, 85) },
    outer:  { name: 'Complementary', hex: neutral ? hslToHex(h + 200, 25, 40) : hslToHex(h + 180, Math.min(s, 45), 45) },
    access: { name: 'Analogous Pop', hex: hslToHex(h + 30, 55, 42) }
  };
}

/* ---- Warna kulit (berdasar analisis warna musiman: undertone + kedalaman kulit) ---- */
const SKINS = [
  { id: 'cerah',   name: 'Putih Cerah',    hex: '#F5D6C0', depth: 'light'  },
  { id: 'langsat', name: 'Kuning Langsat', hex: '#E8BF98', depth: 'light'  },
  { id: 'sawo',    name: 'Sawo Matang',    hex: '#C48E62', depth: 'medium' },
  { id: 'sawotua', name: 'Sawo Tua',       hex: '#92613F', depth: 'deep'   },
  { id: 'gelap',   name: 'Cokelat Gelap',  hex: '#5E3B26', depth: 'deep'   }
];
const UNDER = {
  warm: { label: 'Hangat', tip: 'Undertone hangat umumnya serasi dengan warna bumi dan nuansa keemasan.',
    best: [['Terracotta', '#C8745A'], ['Olive', '#6B7048'], ['Mustard', '#D4A62A'], ['Camel', '#C19A6B'], ['Cream', '#F3EAD3'], ['Coral', '#F08A6C']],
    avoid: [['Icy Blue', '#BFE3F2'], ['Fuchsia', '#C2185B']] },
  cool: { label: 'Dingin', tip: 'Undertone dingin umumnya serasi dengan warna berbasis biru dan jewel tone.',
    best: [['Navy', '#1F3A5F'], ['Emerald', '#1E8A5C'], ['Burgundy', '#7A1F3D'], ['Lavender', '#A99BD1'], ['Royal Blue', '#2F5BD0'], ['Putih Bersih', '#FFFFFF']],
    avoid: [['Oranye', '#E67E22'], ['Mustard', '#D4A62A']] },
  neutral: { label: 'Netral', tip: 'Undertone netral lebih fleksibel; warna hangat maupun dingin sama-sama bisa dicoba.',
    best: [['Teal', '#2A8C8C'], ['Dusty Rose', '#C98B93'], ['Taupe', '#8B7D72'], ['Jade', '#4FA58A'], ['Soft White', '#F4F1E8'], ['Navy', '#1F3A5F']],
    avoid: [] }
};
const DEPTH = {
  light:  { tip: 'Warna yang terlalu pucat dan dekat dengan warna kulit bisa membuat wajah tampak pudar; pilih warna dengan kedalaman sedang.', avoid: ['Nude Pucat', '#F1DCC9'] },
  medium: { tip: 'Kulitmu fleksibel: warna sedang hingga pekat tampil kaya, dan kontras dengan putih juga terlihat segar.', avoid: ['Beige Sewarna Kulit', '#C9A27E'] },
  deep:   { tip: 'Warna cerah, jewel tone, dan putih bersih memberi kontras tegas; hindari warna kusam yang mendekati warna kulit.', avoid: ['Cokelat Kusam', '#6E4B3A'] }
};
const SOURCES = [
  'Jackson, C. (1980). <i>Color Me Beautiful</i>: dasar analisis warna musiman (undertone hangat/dingin).',
  '<a href="https://skintone.google" target="_blank" rel="noopener">Monk Skin Tone Scale</a> (Google &amp; Dr. Ellis Monk): skala 10 tingkat warna kulit.',
  'Fitzpatrick, T. B. (1988). Skala fototipe kulit (dermatologi).',
  'Itten, J. <i>The Art of Color</i>: teori kontras dan harmoni warna.'
];

const STYLES = [
  { name: 'Casual Chic', a: '#f3e6d3', b: '#d9b99b', use: 'beige', tip: 'Padukan atasan netral dengan denim, lalu tambah satu aksesori cokelat.',
    cols: [['Beige', '#D8C7A8'], ['Putih', '#FFFFFF'], ['Denim', '#6F8FB5']] },
  { name: 'Formal Navy', a: '#c9d6e8', b: '#3d5a80', use: 'navy', tip: 'Navy dengan krem dan sentuhan cokelat kulit terlihat rapi untuk acara resmi.',
    cols: [['Navy', '#1F3A5F'], ['Cream', '#EFE6D2'], ['Leather', '#7B4B2A']] },
  { name: 'Summer Vibe', a: '#fff1c9', b: '#f2b880', use: 'white', tip: 'Putih sebagai dasar, lalu masukkan sage dan kuning lembut agar tampak segar.',
    cols: [['Putih', '#FFFFFF'], ['Sage', '#9CAF88'], ['Kuning Pastel', '#F6D887']] }
];
const CATS = ['Atasan', 'Celana', 'Outer', 'Sepatu', 'Aksesori'];
const BGS = [['Krem', '#FAF9F6'], ['Mint', '#E8F5F2'], ['Langit', '#EAF4FB'], ['Lavender', '#F1ECFA'], ['Peach', '#FDF0E8'], ['Abu', '#F0F1F3']];

/* ================= STATE ================= */
let mode = 'match', anchor = 'Atasan';
let selected = { type: 'preset', id: 'navy' };
let skin = 'sawo', under = 'neutral';
let user = store.get('user', null);
const MODES = {
  match: 'Pilih warna pakaian utama, lalu biarkan AI mencarikan pasangannya.',
  anchor: 'Pilih satu item andalan beserta warnanya, lalu lengkapi outfit di sekitarnya.',
  skin: 'Pilih warna kulit dan undertone untuk melihat warna outfit yang serasi.'
};

/* ================= NAVIGASI ================= */
function show(view) {
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== 'v-' + view; });
  document.querySelectorAll('.bottom-nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === view));
  if (view !== 'camera') stopCam();
  if (view === 'wardrobe') renderWardrobe();
  if (view === 'profile') renderProfile();
  $('screenEl').scrollTo(0, 0); window.scrollTo(0, 0);
}
document.querySelectorAll('.bottom-nav a').forEach((a) =>
  a.addEventListener('click', (e) => { e.preventDefault(); show(a.dataset.view); }));
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]');
  if (g) { e.preventDefault(); show(g.dataset.go); }
  if (e.target.closest('[data-soon]')) toast('Subscription segera hadir 💎');
});
$('bell').addEventListener('click', () => toast('Belum ada notifikasi baru'));

/* ================= MODE ANALISIS ================= */
const ctaText = () => (mode === 'skin' ? '✨ Cari Warna Outfit' : '✨ Mulai Analisis');
function setMode(m) {
  mode = m;
  $('modeDesc').textContent = MODES[m];
  $('p-color').hidden = m === 'skin';
  $('p-skin').hidden = m !== 'skin';
  $('anchorChips').hidden = m !== 'anchor';
  $('result').hidden = true;
  $('analyzeBtn').textContent = ctaText();
  document.querySelectorAll('.type').forEach((c) => c.classList.toggle('on', c.dataset.mode === m));
}
document.querySelectorAll('.type').forEach((c) => c.addEventListener('click', () => {
  setMode(c.dataset.mode); show('home'); $('v-home').querySelector('.hero').scrollIntoView({ behavior: 'smooth', block: 'start' });
}));

/* ---- Preset & chip ---- */
function checkGroup(container, test) {
  container.querySelectorAll('[role=radio]').forEach((el) => el.setAttribute('aria-checked', test(el)));
}
function select(type, id) {
  selected = { type, id };
  checkGroup($('presets'), (el) => type === 'preset' && el.dataset.id === id);
}
PRESETS.forEach((p) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'preset'; b.dataset.id = p.id;
  b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', p.id === selected.id);
  b.innerHTML = `<i class="sw" style="background:${p.hex}"></i>${p.name}`;
  b.addEventListener('click', () => select('preset', p.id));
  $('presets').appendChild(b);
});
$('customColor').addEventListener('input', (e) => select('custom', e.target.value));

function makeChips(container, items, isOn, onPick, withSw) {
  container.replaceChildren();
  items.forEach(([key, label, hex]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.dataset.k = key;
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', isOn(key));
    b.innerHTML = (withSw ? `<i class="sw" style="background:${hex};width:16px;height:16px"></i>` : '') + esc(label);
    b.addEventListener('click', () => { onPick(key); checkGroup(container, (el) => el.dataset.k === key); });
    container.appendChild(b);
  });
}
makeChips($('anchorChips'), CATS.map((c) => [c, c]), (k) => k === anchor, (k) => { anchor = k; });
makeChips($('undertones'), Object.entries(UNDER).map(([k, v]) => [k, v.label]), (k) => k === under, (k) => { under = k; });

SKINS.forEach((s) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'skin'; b.dataset.id = s.id;
  b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', s.id === skin);
  b.innerHTML = `<i class="sw" style="background:${s.hex}"></i>${s.name}`;
  b.addEventListener('click', () => { skin = s.id; checkGroup($('skins'), (el) => el.dataset.id === s.id); });
  $('skins').appendChild(b);
});

/* ================= ANALISIS ================= */
function analyze() {
  const btn = $('analyzeBtn');
  btn.disabled = true; btn.textContent = 'Menganalisis…';
  setTimeout(() => {
    mode === 'skin' ? renderSkin() : renderMatch();
    btn.disabled = false; btn.textContent = ctaText();
    const r = $('result'); r.hidden = false; r.classList.remove('show'); void r.offsetWidth; r.classList.add('show');
    r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 600);
}
$('analyzeBtn').addEventListener('click', analyze);

function renderMatch() {
  const m = selected.type === 'preset' ? PRESETS.find((p) => p.id === selected.id) : matchCustom(selected.id);
  const cat = mode === 'anchor' ? anchor : 'Atasan';
  const labels = mode === 'anchor'
    ? ['Atasan', 'Celana', 'Outer', 'Aksesori'].filter((l) => l !== anchor).slice(0, 3)
    : ['Celana', 'Outer', 'Aksesori'];
  const cols = [m.pants, m.outer, m.access];
  const main = `${cat} ${m.name}`;

  $('result').innerHTML = `
    <div class="score"><div class="score-num" id="scoreNum">0%</div><div class="score-label">${m.label}</div></div>
    <div class="pairs">${labels.map((l, i) => `<div class="pair"><i class="sw" style="background:${cols[i].hex}"></i><b>${l}</b><small>${esc(cols[i].name)}</small></div>`).join('')}</div>
    <p class="tip">Padukan <strong>${esc(main)}</strong> dengan ${labels.map((l, i) => `<strong>${esc(cols[i].name)}</strong> (${l.toLowerCase()})`).join(', ')}.</p>
    <button class="ghost" id="saveBtn">＋ Simpan ke Lemari Digital</button>`;
  countUp($('scoreNum'), m.score);
  $('saveBtn').onclick = () => { addItem({ name: main, cat, hex: m.hex }); toast('Disimpan ke Lemari Digital'); };
  addHistory(`${main} • ${m.score}%`, labels.map((l, i) => `${l}: ${cols[i].name}`).join(', '));
}

function renderSkin() {
  const sk = SKINS.find((s) => s.id === skin), u = UNDER[under], d = DEPTH[sk.depth];
  const avoid = [...u.avoid, d.avoid];
  $('result').innerHTML = `
    <h3 class="rt">${esc(sk.name)} • undertone ${u.label.toLowerCase()}</h3>
    <p class="lbl">Warna yang cocok</p>
    <div class="pairs wrap">${u.best.map(swatch).join('')}</div>
    <p class="lbl">Sebaiknya dihindari</p>
    <div class="pairs wrap">${avoid.map(swatch).join('')}</div>
    <p class="tip">${esc(u.tip)} ${esc(d.tip)}</p>
    <details class="src"><summary>Sumber rujukan</summary>
      <ul>${SOURCES.map((s) => `<li>${s}</li>`).join('')}</ul>
      <p>Ini panduan gaya berbasis teori warna, bukan diagnosis. Preferensi dan kenyamananmu tetap yang utama.</p>
    </details>`;
  addHistory(`Warna kulit: ${sk.name} (${u.label})`, 'Cocok: ' + u.best.slice(0, 3).map((c) => c[0]).join(', '));
}

/* ================= INSPIRASI ================= */
STYLES.forEach((s) => {
  const b = document.createElement('button');
  b.className = 'card insp'; b.style.setProperty('--a', s.a); b.style.setProperty('--b', s.b);
  b.innerHTML = `<h3>${s.name}</h3><p>Ketuk untuk lihat palet</p>`;
  b.addEventListener('click', () => openSheet(s));
  $('styles').appendChild(b);
});
function openSheet(s) {
  $('sheetBody').innerHTML = `<h3>${s.name}</h3>
    <div class="pairs">${s.cols.map(swatch).join('')}</div>
    <p class="tip">${esc(s.tip)}</p>
    <button class="cta" id="useStyle">Pakai di Analisis</button>`;
  $('sheet').hidden = false;
  $('useStyle').onclick = () => {
    closeSheet(); setMode('match'); select('preset', s.use); show('home'); analyze();
  };
}
function closeSheet() { $('sheet').hidden = true; }
$('sheetClose').addEventListener('click', closeSheet);
$('sheet').addEventListener('click', (e) => { if (e.target === $('sheet')) closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

/* ================= KAMERA ================= */
let stream = null, pickedHex = '';
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

async function startCam() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    $('cam').srcObject = stream; await $('cam').play();
    $('cam').hidden = false; $('shot').hidden = true; $('picked').hidden = true; $('outfitBox').hidden = true;
    $('shotBtn').hidden = false; $('camBtn').hidden = true;
    $('camMsg').textContent = 'Arahkan kamera ke pakaian, lalu ambil foto.';
  } catch {
    $('camMsg').textContent = 'Kamera tidak bisa dibuka. Izinkan akses kamera (butuh https atau localhost), atau unggah foto.';
  }
}
function stopCam() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null; $('cam').hidden = true; $('shotBtn').hidden = true; $('camBtn').hidden = false;
}

/* Warna dominan di area tengah foto (asumsi: pakaian berada di tengah) */
function dominantColor(c) {
  const w = c.width, h = c.height;
  const x0 = Math.floor(w * 0.2), y0 = Math.floor(h * 0.2);
  const cw = Math.max(1, Math.floor(w * 0.6)), ch = Math.max(1, Math.floor(h * 0.6));
  const d = c.getContext('2d').getImageData(x0, y0, cw, ch).data, bins = {};
  for (let i = 0; i < d.length; i += 16) {
    const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    const b = bins[k] || (bins[k] = { n: 0, r: 0, g: 0, b: 0 });
    b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2];
  }
  const top = Object.values(bins).sort((a, b) => b.n - a.n)[0];
  return toHex(top.r / top.n, top.g / top.n, top.b / top.n);
}

function drawShot(src, w, h) {
  const c = $('shot'), k = Math.min(1, 480 / Math.max(w, h));
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  c.hidden = false;
  $('camMsg').textContent = 'Warna dominan terdeteksi otomatis. Ketuk bagian pakaian pada foto untuk mengoreksi.';
  setPicked(dominantColor(c));
}
function setPicked(hex) {
  pickedHex = hex;
  $('pickSw').style.background = hex; $('pickHex').textContent = 'Warna pakaian: ' + hex;
  $('picked').hidden = false;
  showOutfit(hex);
}

$('camBtn').addEventListener('click', startCam);
$('shotBtn').addEventListener('click', () => { const v = $('cam'); drawShot(v, v.videoWidth, v.videoHeight); stopCam(); });
$('fileIn').addEventListener('change', (e) => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => { stopCam(); drawShot(img, img.width, img.height); URL.revokeObjectURL(img.src); };
  img.onerror = () => toast('File gambar tidak bisa dibaca');
  img.src = URL.createObjectURL(f); e.target.value = '';
});
$('shot').addEventListener('click', (e) => {
  const c = $('shot'), r = c.getBoundingClientRect();
  const x = Math.max(2, Math.min(c.width - 3, Math.round((e.clientX - r.left) * c.width / r.width)));
  const y = Math.max(2, Math.min(c.height - 3, Math.round((e.clientY - r.top) * c.height / r.height)));
  const d = c.getContext('2d').getImageData(x - 2, y - 2, 5, 5).data;
  let R = 0, G = 0, B = 0; const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; }
  setPicked(toHex(R / n, G / n, B / n));
});

/* ---- Gambar outfit (SVG) ---- */
function outfitSVG(top, m, skinHex) {
  const p = m.pants.hex, o = m.outer.hex, a = m.access.hex;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 400" width="240" height="400" role="img" aria-label="Ilustrasi outfit yang disarankan">
  <rect width="240" height="400" rx="20" fill="#F3F1EA"/>
  <ellipse cx="120" cy="372" rx="62" ry="7" fill="#000" opacity=".08"/>
  <path d="M86 205H154L160 350H127L120 250L113 350H80Z" fill="${p}"/>
  <rect x="74" y="346" width="44" height="17" rx="8" fill="${a}"/>
  <rect x="122" y="346" width="44" height="17" rx="8" fill="${a}"/>
  <rect x="112" y="84" width="16" height="18" fill="${skinHex}"/>
  <rect x="112" y="84" width="16" height="18" fill="#000" opacity=".12"/>
  <rect x="84" y="98" width="72" height="116" rx="14" fill="${top}"/>
  <rect x="84" y="206" width="72" height="9" fill="${a}"/>
  <circle cx="66" cy="214" r="9" fill="${skinHex}"/>
  <circle cx="174" cy="214" r="9" fill="${skinHex}"/>
  <path d="M88 102L56 196L78 206L98 130Z" fill="${o}"/>
  <path d="M152 102L184 196L162 206L142 130Z" fill="${o}"/>
  <path d="M84 98H110L106 226H80Z" fill="${o}"/>
  <path d="M156 98H130L134 226H160Z" fill="${o}"/>
  <circle cx="120" cy="58" r="28" fill="${skinHex}"/>
  <path d="M92 58A28 28 0 0 1 148 58Q138 44 120 44Q102 44 92 58Z" fill="#2B2320"/>
</svg>`;
}

function showOutfit(hex) {
  const m = matchCustom(hex), sk = SKINS.find((s) => s.id === skin) || SKINS[2];
  const parts = [['Atasan', hex], ['Celana', m.pants.hex], ['Outer', m.outer.hex], ['Aksesori', m.access.hex]];
  const box = $('outfitBox');
  box.innerHTML = `
    <h3 class="rt">Outfit yang disarankan</h3>
    <div class="figure" id="figure">${outfitSVG(hex, m, sk.hex)}</div>
    <div class="pairs">${parts.map(([l, h]) => `<div class="pair"><i class="sw" style="background:${h}"></i><b>${l}</b><small>${h}</small></div>`).join('')}</div>
    <p class="tip">Atasan <strong>${hex}</strong> dipadukan dengan celana netral, outer komplementer, dan aksesori analogus. Warna kulit pada gambar mengikuti pilihanmu di mode Warna Kulit (${esc(sk.name)}).</p>
    <button class="cta" id="dlBtn">⬇ Unduh Gambar</button>
    <button class="ghost" id="saveOutfit">＋ Simpan Atasan ke Lemari Digital</button>
    <button class="ghost" id="fullBtn">Lihat Analisis Lengkap</button>`;
  box.hidden = false;
  $('dlBtn').onclick = downloadOutfit;
  $('saveOutfit').onclick = () => { addItem({ name: 'Atasan dari foto', cat: 'Atasan', hex }); toast('Disimpan ke Lemari Digital'); };
  $('fullBtn').onclick = () => {
    $('customColor').value = hex.toLowerCase();
    setMode('match'); select('custom', hex.toLowerCase()); show('home'); analyze();
  };
}

function downloadOutfit() {
  const svg = $('figure').querySelector('svg');
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }));
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = 720; c.height = 1200;
    c.getContext('2d').drawImage(img, 0, 0, 720, 1200);
    URL.revokeObjectURL(url);
    c.toBlob((b) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = 'vibefit-outfit.png'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  };
  img.onerror = () => toast('Gagal membuat gambar');
  img.src = url;
}

/* ================= LEMARI DIGITAL ================= */
CATS.forEach((c) => $('wCat').add(new Option(c, c)));
function addItem(it) { const w = store.get('wardrobe', []); w.unshift({ id: Date.now() + Math.random(), ...it }); store.set('wardrobe', w); }
function renderWardrobe() {
  const w = store.get('wardrobe', []);
  $('wList').innerHTML = w.length
    ? w.map((i) => `<li><i class="sw" style="background:${esc(i.hex)}"></i><div><b>${esc(i.name)}</b><small>${esc(i.cat)}</small></div>
        <button data-m="${i.id}">Cocokkan</button><button data-d="${i.id}" aria-label="Hapus item">✕</button></li>`).join('')
    : '<li class="empty">Lemari masih kosong. Tambahkan item pertamamu di atas.</li>';
}
$('wAdd').addEventListener('click', () => {
  const name = $('wName').value.trim();
  if (!name) { toast('Isi nama item dulu'); return; }
  addItem({ name, cat: $('wCat').value, hex: $('wColor').value });
  $('wName').value = ''; renderWardrobe(); toast('Item ditambahkan');
});
$('wList').addEventListener('click', (e) => {
  const w = store.get('wardrobe', []);
  const d = e.target.closest('[data-d]'), m = e.target.closest('[data-m]');
  if (d) { store.set('wardrobe', w.filter((i) => String(i.id) !== d.dataset.d)); renderWardrobe(); }
  if (m) {
    const it = w.find((i) => String(i.id) === m.dataset.m); if (!it) return;
    $('customColor').value = it.hex; anchor = it.cat;
    makeChips($('anchorChips'), CATS.map((c) => [c, c]), (k) => k === anchor, (k) => { anchor = k; });
    setMode('anchor'); select('custom', it.hex); show('home'); analyze();
  }
});

/* ================= RIWAYAT ================= */
function addHistory(title, detail) {
  const h = store.get('history', []); h.unshift({ t: Date.now(), title, detail }); store.set('history', h.slice(0, 30));
}
$('clearHist').addEventListener('click', () => { store.set('history', []); renderProfile(); toast('Riwayat dihapus'); });

/* ================= PROFIL, LATAR & LOGIN ================= */
const applyBg = (hex) => document.documentElement.style.setProperty('--bg', hex);
function setBg(hex) { applyBg(hex); store.set('bg', hex); $('bgCustom').value = hex; checkGroup($('bgs'), (el) => el.dataset.k === hex); }
makeChips($('bgs'), BGS.map(([n, h]) => [h, n, h]), (k) => k === store.get('bg', '#FAF9F6'), setBg, true);
$('bgCustom').addEventListener('input', (e) => setBg(e.target.value));
applyBg(store.get('bg', '#FAF9F6')); $('bgCustom').value = store.get('bg', '#FAF9F6');

function setAvatar(el) {
  el.replaceChildren();
  if (user && user.picture) {
    const i = new Image(); i.src = user.picture; i.alt = ''; i.referrerPolicy = 'no-referrer'; el.append(i);
  } else el.textContent = (user ? user.name : 'Sarah').charAt(0).toUpperCase();
}
function renderUser() {
  $('hello').textContent = 'Halo, ' + (user ? user.name.split(' ')[0] : 'Sarah') + '!';
  setAvatar($('hAvatar')); setAvatar($('pAvatar'));
  $('pName').textContent = user ? user.name : 'Belum masuk';
  $('pMail').textContent = user ? user.email : 'Masuk untuk menyimpan profilmu';
  $('loginBox').hidden = !!user; $('logoutBtn').hidden = !user;
}
function renderProfile() {
  renderUser();
  const h = store.get('history', []);
  $('hist').innerHTML = h.length
    ? h.map((i) => `<li><div><b>${esc(i.title)}</b><small>${esc(i.detail)} · ${new Date(i.t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</small></div></li>`).join('')
    : '<li class="empty">Belum ada riwayat analisis.</li>';
}

function onCredential(res) {
  try {
    const b64 = res.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))));
    user = { name: p.name || 'Pengguna', email: p.email || '', picture: p.picture || '' };
    store.set('user', user); renderProfile(); toast('Berhasil masuk dengan Google');
  } catch { toast('Login gagal, coba lagi.'); }
}
function initGoogle() {
  const box = $('gBtn'); box.replaceChildren();
  if (GOOGLE_CLIENT_ID && window.google && google.accounts) {
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onCredential });
    google.accounts.id.renderButton(box, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 260 });
  } else {
    const b = document.createElement('button');
    b.className = 'gfake'; b.textContent = 'Masuk dengan Google';
    b.onclick = () => toast(GOOGLE_CLIENT_ID ? 'Google belum termuat, periksa koneksi.' : 'Isi GOOGLE_CLIENT_ID di script.js dulu.');
    box.append(b);
  }
}
$('logoutBtn').addEventListener('click', () => {
  user = null; store.set('user', null);
  if (window.google && google.accounts) google.accounts.id.disableAutoSelect();
  renderProfile(); toast('Kamu sudah keluar');
});
window.addEventListener('load', initGoogle);

/* ================= INIT ================= */
setMode('match'); renderUser();