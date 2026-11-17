// Basit JSON ayar deposu. API anahtarları Windows DPAPI (safeStorage) ile şifrelenir
// ve arayüze (renderer) asla gönderilmez.
const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  position: 'bottom',          // 'bottom' | 'top'
  layout: 'pill',              // 'pill' | 'full'
  style: 'glass',              // 'glass' | 'midnight' | 'white' | 'black'
  height: 56,
  reserveSpace: true,          // Ekranda taskbar gibi yer ayır (pencereler altına girmez)
  taskbarMode: 'hide',     // Windows görev çubuğu: 'none' | 'autohide' | 'hide'
  launchAtStartup: false,
  widgets: [
    { id: 'start', enabled: true },
    { id: 'apps', enabled: true },
    { id: 'spotify', enabled: true },
    { id: 'ai', enabled: true },
    { id: 'timer', enabled: true },
    { id: 'quick', enabled: true },
    { id: 'system', enabled: true },
    { id: 'clock', enabled: true },
    { id: 'power', enabled: true }
  ],
  pinnedApps: [],              // [{ name, path }]
  showOpenWindows: true,       // Açık pencereleri de dock'ta göster
  spotify: { mode: 'local', clientId: '' },   // 'local' | 'api'
  ai: {
    claudeCode: true,          // ~/.claude altındaki yerel Claude Code kayıtları
    claudeCodeTokenLimit: 0,   // 5 saatlik pencere için kendi belirlediğin token limiti (0 = kapalı)
    anthropic: false,
    openai: false,
    monthlyBudget: 50,         // USD, API harcaması için
    warnAt: 80                 // % — bu orana gelince uyarı ver
  },
  timerMinutes: 25,
  pet: { type: 'cat', color: 'orange', x: null, y: null }
};

const SECRET_KEYS = ['anthropicAdminKey', 'openaiAdminKey', 'spotifyTokens'];

let file;
let data = null;

function load() {
  file = path.join(app.getPath('userData'), 'settings.json');
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    data = deepMerge(structuredClone(DEFAULTS), raw);
    // Sonradan eklenen widget'ları eski ayar dosyalarına da ekle
    // Sonradan eklenen widget'ları varsayılan sıradaki yerlerine yerleştir
    DEFAULTS.widgets.forEach((w, i) => {
      if (!data.widgets.find(x => x.id === w.id)) {
        const prev = DEFAULTS.widgets[i - 1];
        const at = prev ? data.widgets.findIndex(x => x.id === prev.id) + 1 : 0;
        data.widgets.splice(at > 0 || !prev ? at : data.widgets.length, 0, { ...w });
      }
    });
  } catch {
    data = structuredClone(DEFAULTS);
  }
  data.secrets = data.secrets || {};
  return data;
}

function save() {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function get() { return data || load(); }

// Arayüze gidecek güvenli kopya: sırlar yerine sadece "ayarlı mı" bilgisi
function publicSettings() {
  const { secrets, ...rest } = get();
  const has = {};
  for (const k of SECRET_KEYS) has[k] = !!(secrets && secrets[k]);
  return { ...structuredClone(rest), has };
}

function update(patch) {
  delete patch.secrets;
  delete patch.has;
  data = deepMerge(get(), patch);
  save();
  return publicSettings();
}

function setSecret(key, value) {
  if (!SECRET_KEYS.includes(key)) throw new Error('Bilinmeyen anahtar');
  const s = get().secrets;
  if (value === null || value === '') {
    delete s[key];
  } else {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    s[key] = safeStorage.isEncryptionAvailable()
      ? 'enc:' + safeStorage.encryptString(str).toString('base64')
      : 'raw:' + Buffer.from(str).toString('base64');
  }
  save();
}

function getSecret(key, asJson = false) {
  const v = get().secrets[key];
  if (!v) return null;
  try {
    const buf = Buffer.from(v.slice(4), 'base64');
    const str = v.startsWith('enc:') ? safeStorage.decryptString(buf) : buf.toString();
    return asJson ? JSON.parse(str) : str;
  } catch {
    return null;
  }
}

function deepMerge(target, src) {
  for (const [k, v] of Object.entries(src || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      deepMerge(target[k], v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

module.exports = { load, get, update, publicSettings, setSecret, getSecret, DEFAULTS };
