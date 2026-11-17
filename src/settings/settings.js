/* NovaDock — kontrol paneli */
const api = window.nova;
let S = null;

const WIDGET_META = {
  start: { name: 'Başlat', desc: 'Başlat menüsü ve Windows hızlı ayarlar düğmeleri', ic: '⊞' },
  quick: { name: 'Wi-Fi ve ses', desc: 'Ağ durumu, ses seviyesi ve sessize alma', ic: '📶' },
  apps: { name: 'Uygulamalar', desc: 'Sabitlenmiş uygulama simgeleri', ic: '⬚' },
  spotify: { name: 'Spotify', desc: 'Çalan şarkı ve oynatma kontrolleri', ic: '♫' },
  ai: { name: 'AI Kullanımı', desc: 'Claude Code token penceresi, API harcaması', ic: '✦' },
  timer: { name: 'Odak zamanlayıcı', desc: 'Pomodoro; bitince bildirim', ic: '⏱' },
  system: { name: 'Sistem', desc: 'CPU, RAM ve pil', ic: '▤' },
  clock: { name: 'Saat ve takvim', desc: 'Tıklayınca aylık takvim açılır', ic: '◷' },
  power: { name: 'Güç', desc: 'Kapat, yeniden başlat, uyku, kilitle', ic: '⏻' }
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const patchFor = (p, v) => p.split('.').reverse().reduce((acc, k) => ({ [k]: acc }), v);

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2200);
}

async function update(patch) {
  S = await api.settings.update(patch);
  render();
}

// ---------------- Gezinme ----------------
function show(section) {
  if (!document.querySelector(`section[data-s="${section}"]`)) section = 'general';
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.s === section));
  document.querySelectorAll('section').forEach(s => s.classList.toggle('on', s.dataset.s === section));
  if (section === 'apps') renderApps();
}
document.querySelectorAll('#nav a').forEach(a => a.onclick = () => show(a.dataset.s));
api.settings.onSection(show);

// ---------------- Bağlamalar ----------------
function bindAll() {
  document.querySelectorAll('[data-bind]').forEach(el => {
    const p = el.dataset.bind;
    if (el.classList.contains('seg') || el.classList.contains('styles')) {
      el.querySelectorAll('button').forEach(b => b.onclick = () => {
        const patch = patchFor(p, b.dataset.v);
        if (p === 'pet.type' && PET_COLORS[b.dataset.v] && !PET_COLORS[b.dataset.v].some(c => c[0] === (S.pet || {}).color)) {
          patch.pet.color = PET_COLORS[b.dataset.v][0][0];
        }
        update(patch);
      });
    } else if (el.type === 'checkbox') {
      el.onchange = () => update(patchFor(p, el.checked));
    } else if (el.type === 'range') {
      el.oninput = () => { const o = outFor(p); if (o) o.textContent = el.value; };
      el.onchange = () => update(patchFor(p, +el.value));
    } else if (el.type === 'number') {
      el.onchange = () => update(patchFor(p, Math.max(0, +el.value || 0)));
    }
  });

  document.querySelectorAll('[data-save-secret]').forEach(b => b.onclick = async () => {
    const key = b.dataset.saveSecret;
    const input = document.querySelector(`[data-secret="${key}"]`);
    const v = input.value.trim();
    S = await api.settings.setSecret(key, v || null);
    input.value = '';
    toast(v ? 'Anahtar kaydedildi' : 'Anahtar silindi');
    render();
  });

  document.querySelectorAll('[data-url]').forEach(a => a.onclick = e => { e.preventDefault(); api.openUrl(a.dataset.url); });
}

const outFor = p => ({ height: document.getElementById('h-out'), 'ai.warnAt': document.getElementById('warn-out') })[p];

// ---------------- Çizim ----------------
function render() {
  document.querySelectorAll('[data-bind]').forEach(el => {
    const v = getPath(S, el.dataset.bind);
    if (el.classList.contains('seg') || el.classList.contains('styles')) {
      el.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === String(v)));
    } else if (el.type === 'checkbox') el.checked = !!v;
    else if (el.type === 'range') { el.value = v; const o = outFor(el.dataset.bind); if (o) o.textContent = v; }
    else if (el.type === 'number' && document.activeElement !== el) el.value = v || 0;
  });
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !getPath(S, el.dataset.show); });
  document.querySelectorAll('[data-has]').forEach(el => {
    const ok = S.has[el.dataset.has];
    el.textContent = ok ? '✓ Kaydedildi (şifreli)' : 'Kaydedilmedi';
    el.style.color = ok ? 'var(--green)' : '';
  });
  renderWidgets();
  renderSpotify();
  renderPet();
}

const PET_COLORS = {
  cat: [['orange', 'Turuncu tekir', 'linear-gradient(135deg,#f4a259,#d9782f)'], ['gray', 'Gri', 'linear-gradient(135deg,#9aa4ae,#717b86)'],
        ['black', 'Kara', 'linear-gradient(135deg,#4a4a52,#26262c)'], ['white', 'Beyaz', 'linear-gradient(135deg,#ffffff,#ddd6cb)']],
  dog: [['brown', 'Kahverengi', 'linear-gradient(135deg,#c88b55,#8f5b33)'], ['golden', 'Golden', 'linear-gradient(135deg,#e6b468,#c48b3c)'],
        ['spotted', 'Benekli', 'linear-gradient(135deg,#f7f4ef 55%,#3b3533 55%)'], ['black', 'Siyah', 'linear-gradient(135deg,#3d3a3a 60%,#c9a27a 60%)']]
};

function renderPet() {
  const p = S.pet || {};
  const item = document.querySelector('[data-show="pet.type"]');
  item.hidden = !p.type || p.type === 'none';
  if (item.hidden) return;
  const list = PET_COLORS[p.type] || [];
  const cur = list.find(c => c[0] === p.color) || list[0];
  document.getElementById('pet-color-name').textContent = cur ? cur[1] : '';
  const box = document.getElementById('pet-colors');
  box.innerHTML = list.map(([k, name, bg]) => `<button data-c="${k}" title="${name}" class="${cur && cur[0] === k ? 'on' : ''}" style="background:${bg}"></button>`).join('');
  box.querySelectorAll('[data-c]').forEach(b => b.onclick = () => update({ pet: { color: b.dataset.c } }));
}

document.getElementById('pet-reset').onclick = async () => { await update({ pet: { x: null, y: null } }); toast('Konum sıfırlandı'); };

function renderWidgets() {
  const box = document.getElementById('widget-list');
  const list = S.widgets;
  box.innerHTML = list.map((w, i) => {
    const m = WIDGET_META[w.id] || { name: w.id, desc: '', ic: '•' };
    return `<div class="list-row">
      <div class="ic">${m.ic}</div>
      <div class="meta"><b>${m.name}</b><span>${m.desc}</span></div>
      <div class="ord"><button data-up="${i}" ${i === 0 ? 'disabled' : ''}>▲</button><button data-down="${i}" ${i === list.length - 1 ? 'disabled' : ''}>▼</button></div>
      <label class="sw"><input type="checkbox" data-w="${i}" ${w.enabled ? 'checked' : ''}><i></i></label>
    </div>`;
  }).join('');
  const save = l => update({ widgets: l });
  box.querySelectorAll('[data-w]').forEach(c => c.onchange = () => {
    const l = structuredClone(list); l[+c.dataset.w].enabled = c.checked; save(l);
  });
  box.querySelectorAll('[data-up]').forEach(b => b.onclick = () => {
    const i = +b.dataset.up, l = structuredClone(list); [l[i - 1], l[i]] = [l[i], l[i - 1]]; save(l);
  });
  box.querySelectorAll('[data-down]').forEach(b => b.onclick = () => {
    const i = +b.dataset.down, l = structuredClone(list); [l[i + 1], l[i]] = [l[i], l[i + 1]]; save(l);
  });
}

async function renderApps(list) {
  const box = document.getElementById('app-list');
  list = list || await api.apps.list();
  if (!list.length) {
    box.innerHTML = `<div class="empty">Henüz uygulama yok. “Uygulama ekle” ile .exe veya kısayol seç ya da görev çubuğundakileri içe aktar.</div>`;
    return;
  }
  box.innerHTML = list.map((a, i) => `<div class="list-row">
      <div class="ic">${a.icon ? `<img src="${a.icon}" alt="">` : esc((a.name || '?')[0])}</div>
      <div class="meta"><b>${esc(a.name)}</b><span>${esc(a.path)}</span></div>
      <div class="ord"><button data-up="${i}" ${i === 0 ? 'disabled' : ''}>▲</button><button data-down="${i}" ${i === list.length - 1 ? 'disabled' : ''}>▼</button></div>
      <button class="btn danger" data-rm="${i}">Kaldır</button>
    </div>`).join('');
  const plain = list.map(a => ({ name: a.name, path: a.path }));
  const save = async l => renderApps(await api.apps.set(l));
  box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const l = [...plain]; l.splice(+b.dataset.rm, 1); save(l); });
  box.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const i = +b.dataset.up, l = [...plain]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; save(l); });
  box.querySelectorAll('[data-down]').forEach(b => b.onclick = () => { const i = +b.dataset.down, l = [...plain]; [l[i + 1], l[i]] = [l[i], l[i + 1]]; save(l); });
}

document.getElementById('app-add').onclick = async () => renderApps(await api.apps.add());
document.getElementById('app-import').onclick = async () => {
  const r = await api.apps.importTaskbar();
  toast(r.count ? `${r.count} uygulama içe aktarıldı` : 'Görev çubuğunda sabitlenmiş uygulama bulunamadı');
  renderApps();
};

// ---------------- Spotify ----------------
function renderSpotify() {
  const input = document.getElementById('sp-client');
  if (document.activeElement !== input) input.value = S.spotify.clientId || '';
  const connected = S.has.spotifyTokens && S.spotify.mode === 'api';
  document.getElementById('sp-status').textContent = connected ? '✓ Bağlı: gelişmiş mod aktif' : 'Bağlı değil: basit mod kullanılıyor';
  document.getElementById('sp-status').style.color = connected ? 'var(--green)' : '';
  document.getElementById('sp-connect').hidden = connected;
  document.getElementById('sp-disconnect').hidden = !connected;
}

document.getElementById('sp-client').onchange = e => update({ spotify: { clientId: e.target.value.trim() } });
document.getElementById('sp-connect').onclick = async () => {
  const id = document.getElementById('sp-client').value.trim();
  if (!id) return toast('Önce Client ID gir');
  await update({ spotify: { clientId: id } });
  toast('Tarayıcıda Spotify girişini tamamla…');
  try { S = await api.spotify.connect(); render(); toast('Spotify bağlandı'); }
  catch (e) { toast('Bağlanamadı: ' + (e.message || e).toString().replace(/^Error invoking remote method[^:]*: (Error: )?/, '')); }
};
document.getElementById('sp-disconnect').onclick = async () => { S = await api.spotify.disconnect(); render(); toast('Bağlantı kesildi'); };
document.getElementById('copy-uri').onclick = () => {
  navigator.clipboard.writeText(document.getElementById('redirect-uri').textContent);
  toast('Kopyalandı');
};

// ---------------- Başlat ----------------
(async () => {
  S = await api.settings.get();
  document.getElementById('redirect-uri').textContent = await api.spotify.redirectUri();
  bindAll();
  render();
  show(location.hash.slice(1) || 'general');
  api.settings.onChange(s => { S = s; render(); });
})();
