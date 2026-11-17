// Sağ tık menüsü verileri: son dosyalar, uygulamaya özel görevler, okunaklı uygulama adı.
// Windows'un kendi "En Son" listesini okumanın resmi bir yolu yok; bunun yerine
// %APPDATA%\Microsoft\Windows\Recent klasöründeki kısayollar okunup, dosya türünün
// varsayılan uygulaması bu uygulama olanlar gösterilir.

const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { shell } = require('electron');
const win32 = require('../win32');

const TASKS = {
  'chrome.exe': [['new', 'Yeni pencere', ['--new-window']], ['private', 'Yeni Gizli pencere', ['--incognito']]],
  'msedge.exe': [['new', 'Yeni pencere', ['--new-window']], ['private', 'Yeni InPrivate pencere', ['--inprivate']]],
  'brave.exe': [['new', 'Yeni pencere', ['--new-window']], ['private', 'Yeni Gizli pencere', ['--incognito']]],
  'opera.exe': [['new', 'Yeni pencere', ['--new-window']], ['private', 'Yeni gizli pencere', ['--private']]],
  'firefox.exe': [['new', 'Yeni pencere', ['-new-window']], ['private', 'Yeni gizli pencere', ['-private-window']]],
  'code.exe': [['new', 'Yeni pencere', ['--new-window']]],
  'explorer.exe': [['new', 'Yeni pencere', []]]
};

const KNOWN_NAMES = {
  'chrome.exe': 'Google Chrome', 'msedge.exe': 'Microsoft Edge', 'firefox.exe': 'Firefox', 'brave.exe': 'Brave',
  'explorer.exe': 'Dosya Gezgini', 'code.exe': 'Visual Studio Code', 'spotify.exe': 'Spotify', 'whatsapp.exe': 'WhatsApp',
  'discord.exe': 'Discord', 'chatgpt.exe': 'ChatGPT', 'claude.exe': 'Claude', 'notepad.exe': 'Not Defteri'
};

const base = exe => path.basename(exe || '').toLowerCase();
const tasksFor = exe => (TASKS[base(exe)] || []).map(([id, label]) => ({ id, label }));

// ---------- Uygulama adı ----------
const nameCache = new Map();
function friendlyName(exe) {
  const b = base(exe);
  if (KNOWN_NAMES[b]) return Promise.resolve(KNOWN_NAMES[b]);
  if (nameCache.has(exe)) return Promise.resolve(nameCache.get(exe));
  const fallback = path.basename(exe || '', '.exe').replace(/^./, c => c.toUpperCase());
  if (process.platform !== 'win32' || !exe) return Promise.resolve(fallback);
  return new Promise(resolve => {
    const lit = exe.replace(/'/g, "''");
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `[Console]::OutputEncoding=[Text.Encoding]::UTF8; (Get-Item -LiteralPath '${lit}').VersionInfo.FileDescription`],
      { windowsHide: true, timeout: 5000 }, (err, out) => {
        const n = (!err && String(out).trim()) || fallback;
        nameCache.set(exe, n);
        resolve(n);
      });
  });
}

// ---------- Son dosyalar ----------
let recentCache = { at: 0, items: [] };
const assocCache = new Map();

function recentItems() {
  if (Date.now() - recentCache.at < 20000) return recentCache.items;
  const dir = path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Recent');
  let files = [];
  try {
    files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.lnk'))
      .map(f => { const p = path.join(dir, f); try { return { p, m: fs.statSync(p).mtimeMs }; } catch { return null; } })
      .filter(Boolean).sort((a, b) => b.m - a.m).slice(0, 150);
  } catch {}
  const items = [];
  const seen = new Set();
  for (const f of files) {
    let target;
    try { target = shell.readShortcutLink(f.p).target; } catch { continue; }
    if (!target || seen.has(target.toLowerCase())) continue;
    let st;
    try { st = fs.statSync(target); } catch { continue; }
    seen.add(target.toLowerCase());
    items.push({ path: target, name: path.basename(target) || target, dir: st.isDirectory(), ext: path.extname(target).toLowerCase(), time: f.m });
  }
  recentCache = { at: Date.now(), items };
  return items;
}

function handlerOf(ext) {
  if (!ext) return null;
  if (!assocCache.has(ext)) {
    let h = null;
    try { h = win32.assocExe(ext); } catch {}
    assocCache.set(ext, h ? h.toLowerCase() : null);
  }
  return assocCache.get(ext);
}

/** Bu uygulamayla açılan son dosyalar (Dosya Gezgini için son klasörler) */
function recentFor(exe, limit = 10) {
  if (process.platform !== 'win32' || !exe) return [];
  const e = exe.toLowerCase();
  const isExplorer = base(e) === 'explorer.exe';
  const out = [];
  for (const it of recentItems()) {
    if (isExplorer ? it.dir : (!it.dir && handlerOf(it.ext) === e)) out.push(it);
    if (out.length >= limit) break;
  }
  return out;
}

function runTask(exe, id) {
  const t = (TASKS[base(exe)] || []).find(x => x[0] === id);
  if (!t) return false;
  launch(exe, t[2]);
  return true;
}

function launch(exe, args = []) {
  try {
    const p = spawn(exe, args, { detached: true, stdio: 'ignore', windowsHide: false });
    p.on('error', () => shell.openPath(exe));
    p.unref();
  } catch { shell.openPath(exe); }
}

module.exports = { tasksFor, friendlyName, recentFor, runTask, launch };
