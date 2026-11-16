/* NovaDock — masaüstü evcil hayvanı */
const api = window.nova.pet;
const root = document.getElementById('pet');
const holder = document.getElementById('holder');
const fx = document.getElementById('fx');
const bubbleEl = document.getElementById('bubble');

const PALETTES = {
  cat: {
    orange: { main: '#f4a259', light: '#fde6cc', dark: '#d9782f', inner: '#ffb3c0', nose: '#f08a9b', stripes: 1 },
    gray: { main: '#9aa4ae', light: '#e6eaee', dark: '#717b86', inner: '#ffc2cc', nose: '#f08a9b', stripes: 1 },
    black: { main: '#3a3a42', light: '#5b5b66', dark: '#26262c', inner: '#c98a97', nose: '#d97a8d', stripes: 0 },
    white: { main: '#f6f3ee', light: '#ffffff', dark: '#ddd6cb', inner: '#ffc2cc', nose: '#f08a9b', stripes: 0 }
  },
  dog: {
    brown: { main: '#c88b55', light: '#f4dfc4', dark: '#8f5b33', inner: '#000', nose: '#2b2320', patch: 0 },
    golden: { main: '#e6b468', light: '#fcecd0', dark: '#c48b3c', inner: '#000', nose: '#2b2320', patch: 0 },
    spotted: { main: '#f7f4ef', light: '#ffffff', dark: '#3b3533', inner: '#000', nose: '#2b2320', patch: 1 },
    black: { main: '#3d3a3a', light: '#c9a27a', dark: '#2a2727', inner: '#000', nose: '#1a1616', patch: 0 }
  }
};

const LINES = {
  cat: { click: ['Miyav!', 'Mrrr?', 'Miyuuv ♥', 'Mırr!'], pet: ['Mrrrr… ♥', 'Purrr…', 'Mırr mırr ♥'], drag: ['Miyav?!', 'Hop!'], wake: ['Miyaaav…'] },
  dog: { click: ['Hav!', 'Hav hav!', 'Oyun mu? ♥', 'Hav! ♥'], pet: ['Ohh… ♥', 'Daha daha! ♥', 'Mutluyum ♥'], drag: ['Wuu?!', 'Hav?!'], wake: ['Hav… *esneme*'] }
};

const eye = (x, y) => `
  <g transform="translate(${x} ${y})"><g class="lid"><g class="look">
    <ellipse class="pupil" rx="5.6" ry="7.4"/><circle class="glint" cx="1.9" cy="-2.6" r="1.9"/>
  </g></g></g>`;

const CAT = (p) => `
<svg viewBox="0 0 160 160" class="pet-svg">
  <ellipse class="shadow" cx="80" cy="152" rx="40" ry="6"/>
  <g class="tail-wrap"><path class="main" d="M106 140 C 140 138, 146 106, 130 90 C 125 85, 117 89, 121 96 C 131 112, 124 128, 100 128 Z"/></g>
  <g class="body-g">
    <ellipse class="main" cx="80" cy="120" rx="35" ry="31"/>
    <ellipse class="light" cx="80" cy="128" rx="19" ry="21"/>
    <ellipse class="main paw" cx="66" cy="148" rx="10.5" ry="6.5"/>
    <ellipse class="main paw" cx="94" cy="148" rx="10.5" ry="6.5"/>
  </g>
  <g class="head-g">
    <path class="main ear ear-l" d="M48 58 L46 20 L78 42 Z"/>
    <path class="main ear ear-r" d="M112 58 L114 20 L82 42 Z"/>
    <path class="inner-ear" d="M53 51 L52 31 L69 43 Z"/>
    <path class="inner-ear" d="M107 51 L108 31 L91 43 Z"/>
    <ellipse class="main" cx="80" cy="68" rx="38" ry="32"/>
    ${p.stripes ? '<g class="stripes"><path d="M80 38 v10 M69 40 l2.5 8 M91 40 l-2.5 8"/></g>' : ''}
    <ellipse class="light" cx="80" cy="83" rx="16" ry="11"/>
    <circle class="blush" cx="57" cy="81" r="6"/><circle class="blush" cx="103" cy="81" r="6"/>
    <g class="eyes open">${eye(65, 68)}${eye(95, 68)}</g>
    <g class="eyes closed"><path d="M58 68 q7 6 14 0 M88 68 q7 6 14 0"/></g>
    <g class="eyes happy"><path d="M58 71 q7 -8 14 0 M88 71 q7 -8 14 0"/></g>
    <path class="nose" d="M76 77 h8 l-4 4.5 z"/>
    <path class="mouth" d="M80 81.5 v2.5 M80 84 q-4 4.5 -8.5 1 M80 84 q4 4.5 8.5 1"/>
    <path class="tongue" d="M77 86 q3 6 6 0 z"/>
    <g class="whiskers"><path d="M55 82 l-19 -4 M55 86.5 l-18 3 M105 82 l19 -4 M105 86.5 l18 3"/></g>
  </g>
</svg>`;

const DOG = (p) => `
<svg viewBox="0 0 160 160" class="pet-svg">
  <ellipse class="shadow" cx="80" cy="152" rx="40" ry="6"/>
  <g class="tail-wrap"><path class="main" d="M108 126 C 124 120, 132 102, 127 92 C 124 86, 116 89, 119 96 C 122 106, 116 116, 103 118 Z"/></g>
  <g class="body-g">
    <ellipse class="main" cx="80" cy="120" rx="35" ry="31"/>
    <ellipse class="light" cx="80" cy="128" rx="19" ry="21"/>
    ${p.patch ? '<ellipse class="dark" cx="99" cy="110" rx="11" ry="9" opacity=".9"/>' : ''}
    <ellipse class="main paw" cx="66" cy="148" rx="10.5" ry="6.5"/>
    <ellipse class="main paw" cx="94" cy="148" rx="10.5" ry="6.5"/>
  </g>
  <g class="head-g">
    <ellipse class="main" cx="80" cy="67" rx="36" ry="31"/>
    ${p.patch ? '<ellipse class="dark" cx="96" cy="64" rx="12" ry="11"/>' : ''}
    <path class="dark ear ear-l" d="M50 44 C 34 44, 30 66, 36 86 C 40 96, 52 92, 54 80 C 56 66, 58 50, 50 44 Z"/>
    <path class="dark ear ear-r" d="M110 44 C 126 44, 130 66, 124 86 C 120 96, 108 92, 106 80 C 104 66, 102 50, 110 44 Z"/>
    <ellipse class="light" cx="80" cy="84" rx="18" ry="13.5"/>
    <circle class="blush" cx="58" cy="82" r="6"/><circle class="blush" cx="102" cy="82" r="6"/>
    <g class="eyes open">${eye(66, 65)}${eye(94, 65)}</g>
    <g class="eyes closed"><path d="M59 65 q7 6 14 0 M87 65 q7 6 14 0"/></g>
    <g class="eyes happy"><path d="M59 68 q7 -8 14 0 M87 68 q7 -8 14 0"/></g>
    <ellipse class="nose" cx="80" cy="78" rx="6.5" ry="4.8"/>
    <path class="mouth" d="M80 83 v3.5 M80 86.5 q-5 4.5 -10 0.5 M80 86.5 q5 4.5 10 0.5"/>
    <path class="tongue" d="M75.5 88.5 q4.5 12 9 0 z"/>
  </g>
</svg>`;

let cfg = null;
let lastInteraction = Date.now();
let pettingTimer = null;
let press = null;
let ignoring = true;

// ---------------- Çizim ----------------
function render(c) {
  cfg = c;
  const type = c.type === 'dog' ? 'dog' : 'cat';
  const pal = PALETTES[type][c.color] || Object.values(PALETTES[type])[0];
  root.className = type;
  for (const [k, v] of Object.entries(pal)) if (typeof v === 'string') root.style.setProperty('--' + k, v);
  holder.innerHTML = type === 'dog' ? DOG(pal) : CAT(pal);
}

const lines = (kind) => {
  const l = LINES[cfg && cfg.type === 'dog' ? 'dog' : 'cat'][kind];
  return l[Math.floor(Math.random() * l.length)];
};

let bubbleTimer = null;
function say(text, ms = 1500) {
  bubbleEl.textContent = text;
  bubbleEl.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubbleEl.classList.remove('show'), ms);
}

function heart() {
  const h = document.createElement('span');
  h.className = 'heart';
  h.textContent = '♥';
  h.style.left = (70 + Math.random() * 30) + 'px';
  h.style.top = '60px';
  h.style.setProperty('--dx', (Math.random() * 50 - 25) + 'px');
  h.style.fontSize = (14 + Math.random() * 10) + 'px';
  fx.appendChild(h);
  setTimeout(() => h.remove(), 1400);
}

// ---------------- Durumlar ----------------
function flag(name, ms) {
  root.classList.remove(name);
  void root.offsetWidth; // animasyonu yeniden başlat
  root.classList.add(name);
  if (ms) setTimeout(() => root.classList.remove(name), ms);
}

function touch() {
  lastInteraction = Date.now();
  if (root.classList.contains('sleep')) {
    root.classList.remove('sleep');
    fx.querySelectorAll('.zzz').forEach(z => z.remove());
    say(lines('wake'), 1300);
  }
}

function happy() {
  touch();
  flag('happy', 1400);
  say(lines('click'));
  for (let i = 0; i < 3; i++) setTimeout(heart, i * 160);
}

function startPetting() {
  touch();
  root.classList.add('petting');
  say(lines('pet'), 2200);
  heart();
  pettingTimer = setInterval(() => { heart(); lastInteraction = Date.now(); }, 420);
}

function stopPetting() {
  if (!root.classList.contains('petting')) return false;
  root.classList.remove('petting');
  clearInterval(pettingTimer);
  return true;
}

function sleep() {
  if (root.classList.contains('sleep') || press) return;
  root.classList.add('sleep');
  for (let i = 0; i < 3; i++) {
    const z = document.createElement('span');
    z.className = 'zzz';
    z.textContent = 'z';
    z.style.left = '100px';
    z.style.top = '58px';
    z.style.fontSize = (12 + i * 4) + 'px';
    z.style.animationDelay = (i * 0.8) + 's';
    fx.appendChild(z);
  }
}

// Rastgele göz kırpma ve kulak oynatma
(function blinkLoop() {
  setTimeout(() => {
    if (!root.classList.contains('sleep')) flag('blink', 140);
    blinkLoop();
  }, 2200 + Math.random() * 4000);
})();
(function twitchLoop() {
  setTimeout(() => {
    if (!root.classList.contains('sleep')) flag('twitch', 220);
    twitchLoop();
  }, 6000 + Math.random() * 9000);
})();
setInterval(() => { if (Date.now() - lastInteraction > 90000) sleep(); }, 5000);

// ---------------- Fare: gözlerle takip, tıklama geçirgenliği ----------------
function setIgnore(v) {
  if (v === ignoring) return;
  ignoring = v;
  api.setIgnore(v);
}

document.addEventListener('mousemove', e => {
  const over = !!e.target.closest('.pet-svg');
  setIgnore(!over && !press);
  if (root.classList.contains('sleep') || root.classList.contains('happy') || root.classList.contains('petting')) return;
  for (const g of holder.querySelectorAll('.look')) {
    const r = g.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1;
    const m = Math.min(2.6, d / 20);
    g.style.transform = `translate(${(dx / d) * m}px, ${(dy / d) * m}px)`;
  }
});
document.addEventListener('mouseleave', () => {
  if (!press) setIgnore(true);
  for (const g of holder.querySelectorAll('.look')) g.style.transform = '';
});

// ---------------- Sürükleme / tıklama / sevme ----------------
let moveFrame = null, pending = null, lastX = 0;

holder.addEventListener('pointerdown', e => {
  if (!e.target.closest('.pet-svg') || e.button !== 0) return;
  e.preventDefault();
  holder.setPointerCapture(e.pointerId);
  setIgnore(false);
  touch();
  press = { sx: e.screenX, sy: e.screenY, wx: window.screenX, wy: window.screenY, moved: false };
  lastX = e.screenX;
  press.hold = setTimeout(() => { if (press && !press.moved) startPetting(); }, 380);
});

holder.addEventListener('pointermove', e => {
  if (!press) return;
  const dx = e.screenX - press.sx, dy = e.screenY - press.sy;
  if (!press.moved && Math.hypot(dx, dy) > 6) {
    press.moved = true;
    clearTimeout(press.hold);
    stopPetting();
    root.classList.add('dragging');
    say(lines('drag'), 900);
  }
  if (!press.moved) return;
  const tilt = Math.max(-28, Math.min(28, (e.screenX - lastX) * 2.2));
  lastX = e.screenX;
  root.style.setProperty('--tilt', tilt + 'deg');
  pending = [press.wx + dx, press.wy + dy];
  if (!moveFrame) moveFrame = requestAnimationFrame(() => {
    moveFrame = null;
    if (pending) api.move(Math.round(pending[0]), Math.round(pending[1]));
  });
});

function endPress() {
  if (!press) return;
  clearTimeout(press.hold);
  if (press.moved) {
    root.classList.remove('dragging');
    root.style.setProperty('--tilt', '0deg');
    flag('land', 420);
    api.save();
  } else if (!stopPetting()) {
    happy();
  }
  press = null;
}
holder.addEventListener('pointerup', endPress);
holder.addEventListener('pointercancel', endPress);

// ---------------- Başlat ----------------
(async () => {
  render(await api.config());
  api.onConfig(render);
  setTimeout(() => say(lines('click'), 1400), 600);
})();
