/* NovaDock — dock arayüzü */
const api = window.nova;
const bar = document.getElementById('bar');
const popLayer = document.getElementById('popovers');

let settings = null;
let openPop = null; // { id, el }
const timers = [];

// ---------------- İkonlar ----------------
const I = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 6.2v11.6a1 1 0 0 0 1.55.83L15 13v4.5a1 1 0 0 0 2 0v-11a1 1 0 0 0-2 0V11L6.55 5.37A1 1 0 0 0 5 6.2z"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.2v11.6a1 1 0 0 1-1.55.83L9 13v4.5a1 1 0 0 1-2 0v-11a1 1 0 0 1 2 0V11l8.45-5.63A1 1 0 0 1 19 6.2z"/></svg>',
  note: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 18.5a3 3 0 1 1-2-2.83V6.6a1.5 1.5 0 0 1 1.13-1.45l9-2.25A1.5 1.5 0 0 1 19 4.35V15.5a3 3 0 1 1-2-2.83V8.3l-8 2V18.5z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" opacity=".6"/></svg>',
  winlogo: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8.2" height="8.2" rx="1.6"/><rect x="12.8" y="3" width="8.2" height="8.2" rx="1.6"/><rect x="3" y="12.8" width="8.2" height="8.2" rx="1.6"/><rect x="12.8" y="12.8" width="8.2" height="8.2" rx="1.6"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
  ethernet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="13" rx="2"/><path d="M7 16v4M12 16v4M17 16v4M7 8h10M7 12h10"/></svg>',
  wifiOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 8.8a15 15 0 0 1 20 0M5.3 12.4a10 10 0 0 1 13.4 0M8.6 15.9a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/><path d="M3 3l18 18" stroke="var(--red)"/></svg>',
  power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
  restart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>'
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTokens = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n);
const fmtUsd = n => '$' + (n || 0).toFixed(2);
const fmtDur = ms => {
  const m = Math.max(0, Math.round(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}s ${m % 60}dk` : `${m}dk`;
};
const levelColor = (pct, warnAt = 80) =>
  pct == null ? 'var(--accent)' : pct >= warnAt ? 'var(--red)' : pct >= warnAt * 0.7 ? 'var(--amber)' : 'var(--green)';

function ring(pct, color, text) {
  const r = 13, c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, Math.max(0, pct || 0)) / 100);
  return `<div class="ring"><svg viewBox="0 0 32 32">
    <circle class="track" cx="16" cy="16" r="${r}" fill="none" stroke-width="3.5"/>
    <circle class="fill" cx="16" cy="16" r="${r}" fill="none" stroke-width="3.5" stroke-linecap="round"
      stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg><span>${esc(text)}</span></div>`;
}

// ---------------- Fare geçirgenliği ----------------
// Pencere, paneller için şeffaf alan içeriyor. Şeffaf kısımlarda tıklamalar masaüstüne geçer.
let ignoring = true;
function setIgnore(v) {
  if (v === ignoring) return;
  ignoring = v;
  api.dock.setIgnoreMouse(v);
}
document.addEventListener('mousemove', e => {
  setIgnore(!e.target.closest('.bar, .popover'));
});
document.addEventListener('mouseleave', () => setIgnore(true));

// ---------------- Popover ----------------
function closePop() {
  if (!openPop) return;
  openPop.el.remove();
  document.querySelectorAll('.w.active, .app.active').forEach(w => w.classList.remove('active'));
  openPop = null;
}

function togglePop(id, anchor, render, width = 300) {
  if (openPop && openPop.id === id) return closePop();
  closePop();
  const el = document.createElement('div');
  el.className = 'popover';
  el.style.width = width + 'px';
  popLayer.appendChild(el);
  const rect = anchor.getBoundingClientRect();
  const layerRect = popLayer.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - width / 2 - layerRect.left;
  left = Math.max(8, Math.min(layerRect.width - width - 8, left));
  el.style.left = left + 'px';
  anchor.classList.add('active');
  openPop = { id, el, render };
  render(el);
}

function refreshPop(id) {
  if (openPop && openPop.id === id) openPop.render(openPop.el);
}

document.addEventListener('mousedown', e => {
  if (openPop && !e.target.closest('.popover') && !e.target.closest('.w.active')) closePop();
});
window.addEventListener('blur', () => setTimeout(() => { if (!document.hasFocus()) closePop(); }, 100));

// ---------------- Tooltip ----------------
let tipEl = null;
function showTip(target, text) {
  hideTip();
  tipEl = document.createElement('div');
  tipEl.className = 'tip';
  tipEl.textContent = text;
  document.body.appendChild(tipEl);
  const r = target.getBoundingClientRect();
  const top = settings.position === 'top' ? r.bottom + 10 : r.top - tipEl.offsetHeight - 10;
  tipEl.style.left = r.left + r.width / 2 + 'px';
  tipEl.style.top = top + 'px';
}
function hideTip() { if (tipEl) { tipEl.remove(); tipEl = null; } }

// ================= WIDGET'LAR =================
const widgets = {};

// ---------- Uygulamalar ----------
// Sabitlenmiş uygulamalar + açık pencereler (Windows görev çubuğu gibi)
widgets.apps = {
  pinned: [], sig: '',
  async mount(el) {
    el.className = 'w w-apps';
    this.pinned = await api.apps.list();
    this.sig = '';
    await this.update(el);
    timers.push(setInterval(() => this.update(el), 1500));
  },
  async update(el) {
    let wins = [];
    try { wins = await api.windows.list(); } catch {}
    const groups = [];
    for (const p of this.pinned) {
      { const pw = wins.filter(w => w.exe && w.exe === p.exe); groups.push({ key: 'p:' + p.path, pinned: p, name: p.name, icon: (pw[0] && pw[0].icon) || p.icon, wins: pw }); }
    }
    const used = new Set(groups.flatMap(g => g.wins.map(w => w.hwnd)));
    const byExe = new Map();
    for (const w of wins) {
      if (used.has(w.hwnd)) continue;
      const key = 'w:' + (w.exe || w.hwnd);
      if (!byExe.has(key)) byExe.set(key, { key, name: w.title, icon: w.icon, wins: [] });
      byExe.get(key).wins.push(w);
    }
    const running = [...byExe.values()];
    this.groups = [...groups, ...running];

    const sig = JSON.stringify(this.groups.map(g => [g.key, g.icon ? 1 : 0, g.wins.map(w => [w.hwnd, w.active, w.title])]));
    if (sig === this.sig) return;
    this.sig = sig;

    el.innerHTML = '';
    if (!this.groups.length) {
      const d = document.createElement('div');
      d.className = 'app add';
      d.innerHTML = I.plus;
      d.onmouseenter = () => showTip(d, 'Uygulama ekle');
      d.onmouseleave = hideTip;
      d.onclick = () => api.openSettings('apps');
      el.appendChild(d);
      return;
    }
    this.groups.forEach((g, i) => {
      if (i === groups.length && groups.length && running.length) {
        const sep = document.createElement('div'); sep.className = 'sep'; el.appendChild(sep);
      }
      const d = document.createElement('div');
      const active = g.wins.some(w => w.active);
      d.className = 'app' + (g.wins.length ? ' running' : '') + (active ? ' focused' : '');
      const n = g.wins.length;
      d.innerHTML = (g.icon ? `<img src="${g.icon}" alt="">` : `<div class="fallback">${esc((g.name || '?')[0].toUpperCase())}</div>`)
        + (n ? `<span class="dots">${'<i></i>'.repeat(Math.min(n, 3))}</span>` : '')
        + (n > 1 ? `<span class="count">${n}</span>` : '');
      d.onmouseenter = () => { if (n) preview.hoverIn(d, g); else showTip(d, g.name); };
      d.onmouseleave = () => { hideTip(); preview.hoverOut(); };
      d.onclick = () => { hideTip(); preview.cancel(); this.click(g); setTimeout(() => this.update(el), 300); };
      d.oncontextmenu = e => { e.preventDefault(); hideTip(); preview.cancel(); jump.open(d, g, () => this.update(el)); };
      el.appendChild(d);
    });
  },
  click(g) {
    if (!g.wins.length) return api.apps.launch(g.pinned.path);
    const idx = g.wins.findIndex(w => w.active);
    // Birden çok pencere varsa sıradakine geç, tek pencereyse öne getir / küçült
    const target = g.wins.length > 1 && idx >= 0 ? g.wins[(idx + 1) % g.wins.length] : g.wins[0];
    api.windows.activate(target.hwnd);
  }
};

// ---------- Sağ tık menüsü (jump list) ----------
const jump = {
  open(anchor, g, refresh) {
    const exe = g.pinned ? g.pinned.exe : (g.wins[0] && g.wins[0].exe);
    togglePop('ctx:' + g.key, anchor, pop => this.render(pop, g, exe, null, refresh), 290);
    if (!exe) return;
    const pop = openPop.el;
    api.apps.context(exe).then(ctx => {
      if (!openPop || openPop.el !== pop) return;
      this.render(pop, g, exe, ctx || {}, refresh);
    });
  },
  render(pop, g, exe, ctx, refresh) {
    const n = g.wins.length;
    const name = (g.pinned && g.pinned.name) || (ctx && ctx.name) || g.name;
    const pinned = g.pinned || (ctx && ctx.pinned);
    const docIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>';
    const pinIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l-1 5 3 3v2H7v-2l3-3z"/><path d="M12 14v6"/></svg>';
    const closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    let html = '';
    if (!ctx) {
      html += `<div class="jl-loading"><div class="spin"></div></div>`;
    } else {
      if (ctx.recent && ctx.recent.length) {
        html += `<div class="jl-title">En Son</div><div class="menu jl">` + ctx.recent.map((r, i) =>
          `<button data-r="${i}" title="${esc(r.path)}">${r.icon ? `<img src="${r.icon}" alt="">` : docIcon}<span>${esc(r.name)}</span></button>`).join('') + `</div>`;
      }
      if (ctx.tasks && ctx.tasks.length) {
        html += `<div class="jl-title">Görevler</div><div class="menu jl">` + ctx.tasks.map(t =>
          `<button data-t="${t.id}">${g.icon ? `<img src="${g.icon}" alt="">` : '<i class="jl-gap"></i>'}<span>${esc(t.label)}</span></button>`).join('') + `</div>`;
      }
    }
    html += `<div class="jl-sep"></div><div class="menu jl">
      <button data-a="launch">${g.icon ? `<img src="${g.icon}" alt="">` : '<i class="jl-gap"></i>'}<span>${esc(name)}</span></button>
      ${exe || g.pinned ? `<button data-a="pin">${pinIcon}<span>${pinned ? "Dock'tan kaldır" : "Dock'a sabitle"}</span></button>` : ''}
      ${n ? `<button data-a="close">${closeIcon}<span>${n > 1 ? `Tüm pencereleri kapat (${n})` : 'Pencereyi kapat'}</span></button>` : ''}
    </div>`;
    pop.innerHTML = html;
    pop.classList.add('jumplist');
    const done = () => { closePop(); setTimeout(refresh, 400); };
    pop.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { api.apps.openRecent(ctx.recent[+b.dataset.r].path); done(); });
    pop.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { api.apps.task(exe, b.dataset.t); done(); });
    const act = pop.querySelectorAll('[data-a]');
    act.forEach(b => b.onclick = async () => {
      const a = b.dataset.a;
      if (a === 'launch') {
        if (g.pinned) api.apps.launch(g.pinned.path); else api.apps.launchExe(exe);
      } else if (a === 'pin') {
        if (pinned) await api.apps.unpin(g.pinned ? g.pinned.path : exe);
        else await api.apps.pinExe(exe);
      } else if (a === 'close') {
        for (const w of g.wins) api.windows.close(w.hwnd);
      }
      done();
    });
  }
};

// ---------- Pencere önizlemesi ----------
const preview = {
  timer: null, closeTimer: null,
  isOpen() { return openPop && openPop.id.startsWith('preview:'); },
  hoverIn(anchor, g) {
    clearTimeout(this.closeTimer);
    if (openPop && openPop.id === 'preview:' + g.key) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.open(anchor, g), this.isOpen() ? 60 : 450);
  },
  hoverOut() {
    clearTimeout(this.timer);
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => { if (this.isOpen()) closePop(); }, 280);
  },
  cancel() {
    clearTimeout(this.timer); clearTimeout(this.closeTimer);
    if (this.isOpen()) closePop();
  },
  open(anchor, g) {
    hideTip();
    if (openPop) closePop();
    const cols = Math.min(g.wins.length, 4);
    togglePop('preview:' + g.key, anchor, pop => this.render(pop, g), cols * 208 + 16);
    const pop = openPop.el;
    pop.classList.add('preview');
    pop.onmouseenter = () => clearTimeout(this.closeTimer);
    pop.onmouseleave = () => this.hoverOut();
    api.windows.thumbs(g.wins.map(w => w.hwnd)).then(map => {
      if (!openPop || openPop.el !== pop) return;
      for (const card of pop.querySelectorAll('.pv-card')) {
        const url = map[card.dataset.h];
        const t = card.querySelector('.thumb');
        t.innerHTML = url ? `<img src="${url}" alt="">` : `<span class="muted">${card.dataset.min === '1' ? 'Simge durumunda' : 'Önizleme yok'}</span>`;
      }
    });
  },
  render(pop, g) {
    pop.innerHTML = `<div class="pv-grid" style="grid-template-columns:repeat(${Math.min(g.wins.length, 4)},200px)">${g.wins.map(w => `
      <div class="pv-card ${w.active ? 'on' : ''}" data-h="${w.hwnd}" data-min="${w.minimized ? 1 : 0}">
        <div class="pv-head">${g.icon ? `<img src="${g.icon}" alt="">` : ''}<span>${esc(w.title)}</span><button class="pv-x" title="Pencereyi kapat">×</button></div>
        <div class="thumb"><div class="spin"></div></div>
      </div>`).join('')}</div>`;
    pop.querySelectorAll('.pv-card').forEach(c => {
      const h = Number(c.dataset.h);
      c.onclick = e => {
        if (e.target.closest('.pv-x')) return;
        closePop();
        api.windows.activate(h, false);
      };
      c.querySelector('.pv-x').onclick = e => {
        e.stopPropagation();
        api.windows.close(h);
        c.classList.add('closing');
        setTimeout(() => { c.remove(); if (!pop.querySelector('.pv-card')) closePop(); }, 350);
      };
    });
  }
};

// ---------- Spotify ----------
widgets.spotify = {
  state: null,
  mount(el) {
    el.className = 'w w-spotify';
    el.innerHTML = `
      <div class="art">${I.note}</div>
      <div class="stack"><div class="value">Spotify</div><div class="label">Bağlanıyor…</div><div class="progress" hidden><i></i></div></div>
      <div class="controls">
        <button class="icon-btn" data-a="prev" title="Önceki">${I.prev}</button>
        <button class="icon-btn big" data-a="toggle" title="Oynat / Duraklat">${I.play}</button>
        <button class="icon-btn" data-a="next" title="Sonraki">${I.next}</button>
      </div>`;
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = async ev => {
      ev.stopPropagation();
      let a = b.dataset.a;
      if (a === 'toggle' && this.state && this.state.mode === 'api') a = this.state.playing ? 'pause' : 'play';
      // İyimser güncelleme
      if (this.state && (a === 'toggle' || a === 'play' || a === 'pause')) {
        this.state.playing = !this.state.playing;
        this.render(el);
      }
      await api.spotify.control(a);
      setTimeout(() => this.update(el), 700);
    });
    this.update(el);
    timers.push(setInterval(() => this.update(el), 1500));
  },
  async update(el) {
    try { this.state = await api.spotify.now(); } catch { this.state = null; }
    this.render(el);
  },
  render(el) {
    const s = this.state || {};
    const art = el.querySelector('.art');
    const title = el.querySelector('.value');
    const sub = el.querySelector('.label');
    const toggle = el.querySelector('[data-a="toggle"]');
    const prog = el.querySelector('.progress');
    art.classList.toggle('playing', !!s.playing);
    const artKey = s.art || 'none';
    if (art._key !== artKey) { art._key = artKey; art.innerHTML = s.art ? `<img src="${esc(s.art)}" alt="">` : I.note; }
    toggle.innerHTML = s.playing ? I.pause : I.play;
    if (!s.running) {
      title.textContent = 'Spotify';
      sub.textContent = 'Çalışmıyor';
    } else if (s.track) {
      title.textContent = s.track;
      sub.textContent = s.artist || '';
      el.title = `${s.track} — ${s.artist || ''}`;
    } else {
      title.textContent = 'Spotify';
      sub.textContent = 'Duraklatıldı';
    }
    if (s.duration) {
      prog.hidden = false;
      prog.firstElementChild.style.width = Math.round((s.progress / s.duration) * 100) + '%';
    } else prog.hidden = true;
  }
};

// ---------- AI kullanımı ----------
widgets.ai = {
  data: null,
  mount(el) {
    el.className = 'w w-ai clickable';
    el.innerHTML = `<div class="ai-logo">${I.spark}</div><div class="stack"><div class="value">AI</div><div class="label">Yükleniyor…</div></div>`;
    el.onclick = () => togglePop('ai', el, pop => this.renderPop(pop), 320);
    this.update(el);
    timers.push(setInterval(() => this.update(el), 60000));
  },
  async update(el, force) {
    try { this.data = await api.ai.usage(force); } catch { this.data = null; }
    this.render(el);
    refreshPop('ai');
  },
  render(el) {
    const d = this.data || {};
    const warnAt = d.warnAt || 80;
    const cc = d.claudeCode;
    const ap = d.api;
    let head = '', value = 'AI', label = 'Ayar gerekli';

    if (cc && cc.available) {
      if (cc.active) {
        value = fmtTokens(cc.tokens) + ' token';
        label = 'Sıfırlanma ' + fmtDur(cc.resetsAt - Date.now());
        head = cc.percent != null ? ring(cc.percent, levelColor(cc.percent, warnAt), cc.percent + '%') : `<div class="ai-logo">${I.spark}</div>`;
      } else {
        value = 'Claude Code';
        label = 'Aktif pencere yok';
        head = `<div class="ai-logo">${I.spark}</div>`;
      }
    }
    if (ap && (!cc || !cc.available || !cc.active)) {
      value = fmtUsd(ap.total) + (ap.budget ? ` / $${ap.budget}` : '');
      label = 'Bu ay API harcaması';
      head = ap.percent != null ? ring(ap.percent, levelColor(ap.percent, warnAt), ap.percent + '%') : `<div class="ai-logo">${I.spark}</div>`;
    }
    if (!head) head = `<div class="ai-logo">${I.spark}</div>`;
    el.innerHTML = `${head}<div class="stack"><div class="value">${esc(value)}</div><div class="label">${esc(label)}</div></div>`;
  },
  renderPop(pop) {
    const d = this.data || {};
    const warnAt = d.warnAt || 80;
    const cc = d.claudeCode;
    const ap = d.api;
    let html = `<div class="pop-title">AI Kullanımı <button id="ai-refresh">Yenile</button></div>`;

    if (cc) {
      if (!cc.available) {
        html += `<div class="card"><div class="row"><span class="k">Claude Code</span></div><div class="muted">Bu bilgisayarda Claude Code kaydı bulunamadı.</div></div>`;
      } else {
        const pct = cc.percent;
        html += `<div class="card">
          <div class="row"><span class="k">Claude Code · 5 saatlik pencere</span></div>
          <div class="big-num">${cc.active ? fmtTokens(cc.tokens) : '0'} <span class="muted">token</span></div>
          ${pct != null ? `<div class="hbar"><i style="width:${pct}%;background:${levelColor(pct, warnAt)}"></i></div>
            <div class="muted">Limitin %${pct}'i (${fmtTokens(cc.limit)})</div>` : ''}
          <div class="row" style="margin-top:8px"><span class="k">Sıfırlanma</span><span class="v">${cc.active ? fmtDur(cc.resetsAt - Date.now()) : '—'}</span></div>
          <div class="row"><span class="k">Mesaj</span><span class="v">${cc.messages}</span></div>
          <div class="row"><span class="k">Bugün toplam</span><span class="v">${fmtTokens(cc.today)}</span></div>
        </div>`;
      }
    }
    if (ap) {
      const pct = ap.percent;
      html += `<div class="card">
        <div class="row"><span class="k">API harcaması · bu ay</span></div>
        <div class="big-num">${fmtUsd(ap.total)} ${ap.budget ? `<span class="muted">/ $${ap.budget}</span>` : ''}</div>
        ${pct != null ? `<div class="hbar"><i style="width:${pct}%;background:${levelColor(pct, warnAt)}"></i></div>` : ''}
        ${ap.anthropic ? `<div class="row" style="margin-top:8px"><span class="k">Anthropic</span>${ap.anthropic.error ? `<span class="err">${esc(ap.anthropic.error)}</span>` : `<span class="v">${fmtUsd(ap.anthropic.usd)}</span>`}</div>` : ''}
        ${ap.openai ? `<div class="row"><span class="k">OpenAI</span>${ap.openai.error ? `<span class="err">${esc(ap.openai.error)}</span>` : `<span class="v">${fmtUsd(ap.openai.usd)}</span>`}</div>` : ''}
      </div>`;
    }
    if (!cc && !ap) html += `<div class="muted">Kontrol panelinden bir AI kaynağı aç.</div>`;
    html += `<div class="pop-title" style="margin:10px 0 0"><span></span><button id="ai-settings">Ayarlar →</button></div>`;
    pop.innerHTML = html;
    pop.querySelector('#ai-refresh').onclick = () => this.update(bar.querySelector('.w-ai'), true);
    pop.querySelector('#ai-settings').onclick = () => { closePop(); api.openSettings('ai'); };
  }
};

// ---------- Zamanlayıcı (Pomodoro) ----------
widgets.timer = {
  total: 25 * 60, left: 25 * 60, running: false, endAt: 0,
  mount(el) {
    this.total = this.left = (settings.timerMinutes || 25) * 60;
    el.className = 'w w-timer clickable';
    el.onclick = () => this.toggle(el);
    el.oncontextmenu = e => { e.preventDefault(); togglePop('timer', el, pop => this.renderPop(pop, el), 240); };
    el.title = 'Tıkla: başlat/duraklat · Sağ tık: süre seç';
    this.render(el);
    timers.push(setInterval(() => this.tick(el), 500));
  },
  toggle(el) {
    if (this.running) { this.left = Math.max(0, Math.round((this.endAt - Date.now()) / 1000)); this.running = false; }
    else { if (this.left <= 0) this.left = this.total; this.endAt = Date.now() + this.left * 1000; this.running = true; }
    this.render(el);
  },
  tick(el) {
    if (!this.running) return;
    this.left = Math.max(0, Math.round((this.endAt - Date.now()) / 1000));
    if (this.left === 0) {
      this.running = false;
      api.notify('Süre doldu ⏰', `${Math.round(this.total / 60)} dakikalık odak süresi bitti. Kısa bir mola ver!`);
    }
    this.render(el);
  },
  render(el) {
    const m = Math.floor(this.left / 60), s = this.left % 60;
    el.classList.toggle('running', this.running);
    el.innerHTML = `${I.timer}<div class="value">${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</div>`;
  },
  renderPop(pop, el) {
    const opts = [5, 15, 25, 45, 60, 90];
    pop.innerHTML = `<div class="pop-title">Odak süresi</div>
      <div class="chips">${opts.map(o => `<button class="chip ${o * 60 === this.total ? 'on' : ''}" data-m="${o}">${o} dk</button>`).join('')}</div>
      <div class="pop-title" style="margin:12px 0 0"><span></span><button id="t-reset">Sıfırla</button></div>`;
    pop.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      this.total = this.left = +b.dataset.m * 60; this.running = false;
      api.settings.update({ timerMinutes: +b.dataset.m });
      this.render(el); closePop();
    });
    pop.querySelector('#t-reset').onclick = () => { this.left = this.total; this.running = false; this.render(el); closePop(); };
  }
};

// ---------- Sistem ----------
widgets.system = {
  battery: null,
  async mount(el) {
    el.className = 'w w-system';
    el.innerHTML = `<div class="meters">
        <div class="meter"><span>CPU</span><div class="bar-mini"><i data-k="cpu"></i></div><b data-v="cpu">–</b></div>
        <div class="meter"><span>RAM</span><div class="bar-mini"><i data-k="ram"></i></div><b data-v="ram">–</b></div>
      </div><div class="battery" hidden></div>`;
    try {
      if (navigator.getBattery) {
        this.battery = await navigator.getBattery();
        const upd = () => this.renderBattery(el);
        this.battery.addEventListener('levelchange', upd);
        this.battery.addEventListener('chargingchange', upd);
        upd();
      }
    } catch {}
    this.update(el);
    timers.push(setInterval(() => this.update(el), 2000));
  },
  async update(el) {
    let s;
    try { s = await api.system.stats(); } catch { return; }
    for (const k of ['cpu', 'ram']) {
      const v = s[k];
      const i = el.querySelector(`[data-k="${k}"]`);
      i.style.width = v + '%';
      i.style.background = v >= 90 ? 'var(--red)' : v >= 70 ? 'var(--amber)' : 'var(--accent)';
      el.querySelector(`[data-v="${k}"]`).textContent = v + '%';
    }
    el.title = `RAM: ${s.ramUsedGb} / ${s.ramTotalGb} GB`;
  },
  renderBattery(el) {
    const b = this.battery;
    const box = el.querySelector('.battery');
    // Masaüstü bilgisayarlarda pil yok: level 1 + şarjda + süre 0
    if (!b || (b.charging && b.level === 1 && b.chargingTime === 0)) { box.hidden = true; return; }
    const pct = Math.round(b.level * 100);
    const color = pct <= 15 && !b.charging ? 'var(--red)' : pct <= 30 && !b.charging ? 'var(--amber)' : 'var(--green)';
    box.hidden = false;
    box.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="18" height="10" rx="2.5" stroke="currentColor" stroke-width="1.6"/>
      <rect x="4" y="9" width="${Math.max(1, 14 * b.level)}" height="6" rx="1.2" fill="${color}"/><path d="M22 10.5v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      ${b.charging ? `<span style="color:var(--green);display:flex">${I.bolt.replace('<svg', '<svg width="12" height="12"')}</span>` : ''}${pct}%`;
  }
};

// ---------- Saat ve takvim ----------
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DOW = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
widgets.clock = {
  viewMonth: null,
  mount(el) {
    el.className = 'w w-clock clickable';
    el.onclick = () => { this.viewMonth = new Date(); togglePop('clock', el, pop => this.renderPop(pop), 280); };
    this.render(el);
    timers.push(setInterval(() => this.render(el), 1000));
  },
  render(el) {
    const d = new Date();
    const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
    const html = `<div class="stack"><div class="value">${time}</div><div class="label">${date}</div></div>`;
    if (el._last !== html) { el.innerHTML = html; el._last = html; }
  },
  renderPop(pop) {
    const v = this.viewMonth;
    const y = v.getFullYear(), m = v.getMonth();
    const first = new Date(y, m, 1);
    const startOffset = (first.getDay() + 6) % 7; // Pazartesi başlangıç
    const today = new Date();
    let cells = DOW.map(d => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < 42; i++) {
      const day = new Date(y, m, 1 - startOffset + i);
      const cls = ['d'];
      if (day.getMonth() !== m) cls.push('other');
      if (day.toDateString() === today.toDateString()) cls.push('today');
      cells += `<div class="${cls.join(' ')}">${day.getDate()}</div>`;
    }
    pop.innerHTML = `<div class="cal-head">
        <button class="icon-btn" id="cal-prev">${I.prev}</button>
        <b>${MONTHS[m]} ${y}</b>
        <button class="icon-btn" id="cal-next">${I.next}</button>
      </div><div class="cal">${cells}</div>`;
    pop.querySelector('#cal-prev').onclick = () => { this.viewMonth = new Date(y, m - 1, 1); this.renderPop(pop); };
    pop.querySelector('#cal-next').onclick = () => { this.viewMonth = new Date(y, m + 1, 1); this.renderPop(pop); };
  }
};

// ---------- Başlat ----------
widgets.start = {
  mount(el) {
    el.className = 'w w-start';
    el.style.padding = '0 4px';
    el.innerHTML = `
      <button class="icon-btn big start-btn" data-k="start" title="Başlat">${I.winlogo}</button>
      <button class="icon-btn" data-k="quick" title="Hızlı ayarlar (Wi-Fi, Bluetooth, parlaklık…)">${I.sliders}</button>
      <button class="icon-btn" data-k="notifications" title="Bildirimler ve takvim">${I.bell}</button>`;
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { closePop(); api.shortcut(b.dataset.k); });
  }
};

// ---------- Wi-Fi ve ses ----------
function wifiIcon(signal) {
  const lvl = signal == null ? 4 : signal >= 75 ? 4 : signal >= 50 ? 3 : signal >= 25 ? 2 : 1;
  const on = n => lvl >= n ? 'currentColor' : 'var(--fg-faint)';
  return `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round">
    <path d="M2 8.8a15 15 0 0 1 20 0" stroke="${on(4)}"/><path d="M5.3 12.4a10 10 0 0 1 13.4 0" stroke="${on(3)}"/>
    <path d="M8.6 15.9a5 5 0 0 1 6.8 0" stroke="${on(2)}"/><circle cx="12" cy="19.5" r="1.4" fill="${on(1)}" stroke="none"/></svg>`;
}
function volIcon(v, muted) {
  const body = '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/>';
  if (muted || v === 0) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${body}<path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>`;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${body}
    <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" ${v < 1 ? 'opacity=".3"' : ''}/>${v > 33 ? '<path d="M18 7a7 7 0 0 1 0 10"/>' : ''}${v > 66 ? '<path d="M20.5 4.5a10.5 10.5 0 0 1 0 15"/>' : ''}</svg>`;
}

widgets.quick = {
  net: null, vol: null, wheelTimer: null,
  mount(el) {
    el.className = 'w w-quick';
    el.style.padding = '0 4px';
    el.innerHTML = `
      <button class="icon-btn q-net" title="Ağ"></button>
      <button class="icon-btn q-vol" title="Ses"></button><span class="q-pct value"></span>`;
    const netBtn = el.querySelector('.q-net'), volBtn = el.querySelector('.q-vol');
    netBtn.onclick = () => togglePop('net', netBtn, pop => this.renderNet(pop), 270);
    volBtn.onclick = () => togglePop('vol', volBtn, pop => this.renderVol(pop), 270);
    el.querySelector('.q-pct').onclick = () => volBtn.click();
    // Fare tekerleğiyle ses
    const onWheel = e => {
      if (!this.vol) return;
      e.preventDefault();
      const v = Math.max(0, Math.min(100, this.vol.volume + (e.deltaY < 0 ? 2 : -2)));
      this.vol = { volume: v, muted: false };
      this.render(el);
      refreshPop('vol');
      clearTimeout(this.wheelTimer);
      this.wheelTimer = setTimeout(() => api.audio.set(v), 60);
    };
    volBtn.addEventListener('wheel', onWheel, { passive: false });
    el.querySelector('.q-pct').addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('online', () => this.updateNet(el, true));
    window.addEventListener('offline', () => this.updateNet(el, true));
    this.updateNet(el); this.updateVol(el);
    timers.push(setInterval(() => this.updateNet(el), 15000));
    timers.push(setInterval(() => this.updateVol(el), 2500));
  },
  async updateNet(el, force) {
    try { this.net = await api.net.status(force); } catch {}
    if (!navigator.onLine && this.net) this.net = { ...this.net, offline: true };
    this.render(el); refreshPop('net');
  },
  async updateVol(el) {
    if (openPop && openPop.id === 'vol' && openPop.dragging) return;
    try { const v = await api.audio.get(); if (v) this.vol = v; } catch {}
    this.render(el); refreshPop('vol');
  },
  render(el) {
    const n = this.net || {};
    const netBtn = el.querySelector('.q-net');
    netBtn.innerHTML = n.type === 'wifi' ? wifiIcon(n.signal) : n.type === 'ethernet' ? I.ethernet : I.wifiOff;
    netBtn.title = n.type === 'wifi' ? `${n.ssid || 'Wi-Fi'}${n.signal != null ? ` · %${n.signal}` : ''}` : n.type === 'ethernet' ? 'Kablolu bağlantı' : 'Bağlı değil';
    const v = this.vol;
    el.querySelector('.q-vol').innerHTML = volIcon(v ? v.volume : 50, v && v.muted);
    el.querySelector('.q-pct').textContent = v ? (v.muted ? 'Sessiz' : v.volume + '%') : '';
  },
  renderNet(pop) {
    const n = this.net || {};
    let body;
    if (n.type === 'wifi') {
      body = `<div class="card"><div class="row"><span class="k">Wi-Fi</span><span class="v ok">Bağlı</span></div>
        <div class="big-num" style="font-size:18px;margin-top:4px">${esc(n.ssid || 'Kablosuz ağ')}</div>
        ${n.signal != null ? `<div class="hbar"><i style="width:${n.signal}%;background:${n.signal >= 50 ? 'var(--green)' : n.signal >= 25 ? 'var(--amber)' : 'var(--red)'}"></i></div><div class="muted">Sinyal gücü %${n.signal}</div>` : ''}</div>`;
    } else if (n.type === 'ethernet') {
      body = `<div class="card"><div class="row"><span class="k">Ethernet</span><span class="v ok">Bağlı</span></div><div class="big-num" style="font-size:18px;margin-top:4px">${esc(n.name || 'Kablolu ağ')}</div></div>`;
    } else {
      body = `<div class="card"><div class="row"><span class="k">Ağ</span><span class="err">Bağlı değil</span></div><div class="muted" style="margin-top:6px">Bir Wi-Fi ağına bağlanmak için aşağıdaki düğmeyi kullan.</div></div>`;
    }
    pop.innerHTML = `<div class="pop-title">Ağ</div>${body}
      <div class="menu" style="margin:6px -6px -6px">
        <button data-o="ms-availablenetworks:">${wifiIcon(null)}<span>Wi-Fi ağlarını göster</span></button>
        <button data-o="ms-settings:network-status">${I.gear}<span>Ağ ayarları</span></button>
        <button data-s="quick">${I.sliders}<span>Hızlı ayarlar</span></button>
      </div>`;
    pop.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { closePop(); api.openMs(b.dataset.o); });
    pop.querySelector('[data-s]').onclick = () => { closePop(); api.shortcut('quick'); };
  },
  renderVol(pop) {
    const v = this.vol || { volume: 0, muted: false };
    if (pop.querySelector('.vol-range')) {
      // Kaydırma sırasında yeniden çizme, sadece değerleri güncelle
      if (!openPop.dragging) pop.querySelector('.vol-range').value = v.volume;
      pop.querySelector('.vol-num').textContent = v.muted ? 'Sessiz' : v.volume + '%';
      pop.querySelector('.vol-mute').innerHTML = volIcon(v.volume, v.muted);
      pop.querySelector('.vol-range').style.setProperty('--p', v.volume + '%');
      return;
    }
    pop.innerHTML = `<div class="pop-title">Ses <span class="vol-num" style="text-transform:none;color:var(--fg)">${v.muted ? 'Sessiz' : v.volume + '%'}</span></div>
      <div class="vol-row">
        <button class="icon-btn big vol-mute" title="Sessize al / aç">${volIcon(v.volume, v.muted)}</button>
        <input type="range" class="vol-range" min="0" max="100" step="1" value="${v.volume}" style="--p:${v.volume}%">
      </div>
      <div class="menu" style="margin:10px -6px -6px">
        <button data-o="ms-settings:sound">${I.gear}<span>Ses ayarları</span></button>
        <button data-o="ms-settings:apps-volume">${I.sliders}<span>Ses karıştırıcı</span></button>
      </div>`;
    const range = pop.querySelector('.vol-range');
    let t = null;
    range.oninput = () => {
      openPop.dragging = true;
      const val = Number(range.value);
      this.vol = { volume: val, muted: false };
      range.style.setProperty('--p', val + '%');
      pop.querySelector('.vol-num').textContent = val + '%';
      pop.querySelector('.vol-mute').innerHTML = volIcon(val, false);
      this.render(bar.querySelector('.w-quick'));
      clearTimeout(t);
      t = setTimeout(() => api.audio.set(val), 40);
    };
    range.onchange = () => { if (openPop) openPop.dragging = false; };
    pop.querySelector('.vol-mute').onclick = async () => {
      const r = await api.audio.mute(!(this.vol && this.vol.muted));
      if (r) this.vol = r;
      this.render(bar.querySelector('.w-quick')); this.renderVol(pop);
    };
    pop.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { closePop(); api.openMs(b.dataset.o); });
  }
};

// ---------- Güç ----------
widgets.power = {
  mount(el) {
    el.className = 'w w-power';
    el.style.padding = '0 2px';
    el.innerHTML = `<button class="icon-btn" title="Güç">${I.power}</button>`;
    el.firstChild.onclick = () => togglePop('power', el, pop => this.renderPop(pop), 220);
  },
  renderPop(pop, confirm) {
    const items = [
      ['lock', 'Kilitle', I.lock], ['sleep', 'Uyku', I.moon],
      ['logoff', 'Oturumu kapat', I.logout], ['restart', 'Yeniden başlat', I.restart], ['shutdown', 'Bilgisayarı kapat', I.power]
    ];
    const needsConfirm = { shutdown: 1, restart: 1, logoff: 1 };
    pop.innerHTML = `<div class="menu">${items.map(([a, label, ic]) =>
      `<button data-p="${a}" class="${a === 'shutdown' ? 'danger' : ''} ${confirm === a ? 'confirm' : ''}">${ic}<span>${confirm === a ? 'Emin misin? Tekrar tıkla' : label}</span></button>`).join('')}</div>`;
    pop.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
      const a = b.dataset.p;
      if (needsConfirm[a] && confirm !== a) return this.renderPop(pop, a);
      closePop();
      api.power(a);
    });
  }
};

// ---------- Ayarlar düğmesi (her zaman sonda) ----------
function settingsButton() {
  const el = document.createElement('div');
  el.className = 'w w-gear';
  el.style.padding = '0 2px';
  el.innerHTML = `<button class="icon-btn" title="Kontrol Paneli · Sağ tık: menü">${I.gear}</button>`;
  el.firstChild.onclick = () => { closePop(); api.openSettings(); };
  el.oncontextmenu = e => {
    e.preventDefault();
    togglePop('menu', el, pop => {
      pop.innerHTML = `<div class="menu">
        <button data-m="settings">Kontrol Paneli</button>
        <button data-m="quit" class="danger">NovaDock'tan çık</button></div>`;
      pop.querySelector('[data-m="settings"]').onclick = () => { closePop(); api.openSettings(); };
      pop.querySelector('[data-m="quit"]').onclick = () => api.quit();
    }, 200);
  };
  return el;
}

// ================= Kurulum =================
function applyLayout(l) {
  document.body.dataset.style = l.style;
  document.body.dataset.position = l.position;
  document.body.dataset.layout = l.layout;
  document.documentElement.style.setProperty('--h', l.height + 'px');
  document.documentElement.style.setProperty('--m', l.margin + 'px');
}

function build() {
  timers.splice(0).forEach(clearInterval);
  closePop();
  bar.innerHTML = '';
  const enabled = settings.widgets.filter(w => w.enabled && widgets[w.id]);
  for (const w of enabled) {
    const el = document.createElement('div');
    bar.appendChild(el);
    widgets[w.id].mount(el);
  }
  bar.appendChild(settingsButton());
}

async function init() {
  settings = await api.settings.get();
  applyLayout({ ...settings, margin: settings.layout === 'pill' ? 8 : 0 });
  build();
  api.dock.onLayout(applyLayout);
  api.settings.onChange(s => {
    const rebuild = JSON.stringify([s.widgets, s.pinnedApps, s.spotify, s.ai]) !== JSON.stringify([settings.widgets, settings.pinnedApps, settings.spotify, settings.ai]);
    settings = s;
    if (rebuild) build();
  });
}

init();
