const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, shell, dialog, Notification, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const store = require('./store');
const win32 = require('./win32');
const spotify = require('./services/spotify');
const ai = require('./services/ai');
const system = require('./services/system');
const media = require('./services/media');
const audio = require('./services/audio');
const network = require('./services/network');
const jumplist = require('./services/jumplist');
const { execFile } = require('child_process');

const POPOVER_SPACE = 480; // Dock'un üstünde/altında açılan paneller için şeffaf alan (DIP)

let dock = null;
let settingsWin = null;
let tray = null;
let pet = null;
let dockVisible = true;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => openSettings());
}

app.setAppUserModelId('app.novadock');

// ---------------- Dock penceresi ----------------
function createDock() {
  dock = new BrowserWindow({
    width: 800,
    height: 100,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });
  dock.setAlwaysOnTop(true, 'pop-up-menu');
  dock.setIgnoreMouseEvents(true, { forward: true });
  dock.loadFile(path.join(__dirname, 'dock', 'index.html'));
  dock.once('ready-to-show', () => {
    layoutDock();
    dock.showInactive();
  });
  dock.on('closed', () => { dock = null; });
}

function layoutDock() {
  if (!dock) return;
  const s = store.get();
  const display = screen.getPrimaryDisplay();
  const margin = s.layout === 'pill' ? 8 : 0;
  const reserveH = s.height + margin * 2;

  let rect = null;
  if (s.reserveSpace && win32.isWin) {
    try {
      rect = win32.reserve(dock, display, s.position, reserveH, onFullscreen);
    } catch (e) {
      console.error('[appbar]', e);
    }
  } else {
    win32.release();
  }
  if (!rect) {
    const b = display.bounds;
    rect = { x: b.x, y: s.position === 'top' ? b.y : b.y + b.height - reserveH, width: b.width, height: reserveH };
  }

  const totalH = reserveH + POPOVER_SPACE;
  const bounds = {
    x: rect.x,
    y: s.position === 'top' ? rect.y : rect.y + rect.height - totalH,
    width: rect.width,
    height: totalH
  };
  dock.setBounds(bounds);
  dock.webContents.send('dock:layout', {
    position: s.position, layout: s.layout, style: s.style,
    height: s.height, margin, popover: POPOVER_SPACE
  });
}

function onFullscreen(isFullscreen) {
  if (!dock || !dockVisible) return;
  if (isFullscreen) dock.hide();
  else dock.showInactive();
}

function toggleDock(force) {
  if (!dock) return;
  dockVisible = typeof force === 'boolean' ? force : !dockVisible;
  if (dockVisible) { dock.showInactive(); applyTaskbar(); layoutDock(); }
  else { dock.hide(); win32.release(); restoreTaskbar(); }
  createPet();
  buildTrayMenu();
}

// ---------------- Evcil hayvan ----------------
const PET_W = 170, PET_H = 200;

function petDefaultPos() {
  const wa = screen.getPrimaryDisplay().workArea;
  return { x: wa.x + wa.width - PET_W - 60, y: wa.y + wa.height - PET_H + 6 };
}

function clampToScreen(x, y) {
  const d = screen.getDisplayNearestPoint({ x: x + PET_W / 2, y: y + PET_H / 2 });
  const b = d.bounds;
  return {
    x: Math.max(b.x - 40, Math.min(b.x + b.width - PET_W + 40, x)),
    y: Math.max(b.y - 40, Math.min(b.y + b.height - PET_H + 10, y))
  };
}

function createPet() {
  const cfg = store.get().pet || {};
  if (!cfg.type || cfg.type === 'none' || !dockVisible) {
    if (pet) { pet.destroy(); pet = null; }
    return;
  }
  const pos = cfg.x == null || cfg.y == null ? petDefaultPos() : clampToScreen(cfg.x, cfg.y);
  if (pet) {
    pet.setPosition(pos.x, pos.y);
    pet.webContents.send('pet:config', cfg);
    return;
  }
  pet = new BrowserWindow({
    width: PET_W, height: PET_H, x: pos.x, y: pos.y,
    frame: false, transparent: true, resizable: false, movable: true,
    minimizable: false, maximizable: false, skipTaskbar: true, hasShadow: false,
    alwaysOnTop: true, focusable: false, show: false, backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  pet.setAlwaysOnTop(true, 'pop-up-menu');
  pet.setIgnoreMouseEvents(true, { forward: true });
  pet.loadFile(path.join(__dirname, 'pet', 'index.html'));
  pet.once('ready-to-show', () => pet && pet.showInactive());
  pet.on('closed', () => { pet = null; });
}

// ---------------- Windows görev çubuğu ----------------
function applyTaskbar() {
  const s = store.get();
  if (!win32.isWin) return;
  if (s._taskbarOriginal == null) {
    const st = win32.getTaskbarState();
    if (st != null) store.update({ _taskbarOriginal: st });
  }
  try { win32.applyTaskbarMode(s.taskbarMode, store.get()._taskbarOriginal); } catch (e) { console.error(e); }
}

function restoreTaskbar() {
  if (!win32.isWin) return;
  try { win32.restoreTaskbar(store.get()._taskbarOriginal); } catch {}
}

// ---------------- Ayarlar penceresi ----------------
function openSettings(section) {
  if (settingsWin) {
    settingsWin.show(); settingsWin.focus();
    if (section) settingsWin.webContents.send('settings:section', section);
    return;
  }
  settingsWin = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 760,
    minHeight: 520,
    title: 'NovaDock — Kontrol Paneli',
    backgroundColor: '#0b0b0f',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  settingsWin.loadFile(path.join(__dirname, 'settings', 'index.html'), section ? { hash: section } : undefined);
  settingsWin.on('closed', () => { settingsWin = null; });
}

// ---------------- Tray ----------------
function buildTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Kontrol Paneli', click: () => openSettings() },
    { label: dockVisible ? "Dock'u gizle" : "Dock'u göster", click: () => toggleDock() },
    { label: 'Yeniden yükle', click: () => { dock && dock.reload(); layoutDock(); } },
    { type: 'separator' },
    { label: 'Çıkış', click: () => app.quit() }
  ]));
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'tray.png'));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('NovaDock');
  tray.on('click', () => openSettings());
  buildTrayMenu();
}

// ---------------- Yayın ----------------
function broadcast(channel, payload) {
  for (const w of [dock, settingsWin]) if (w && !w.isDestroyed()) w.webContents.send(channel, payload);
}

// ---------------- Uygulamalar ----------------
const iconCache = new Map();
const expandEnv = p => (p || '').replace(/%([^%]+)%/g, (m, v) => process.env[v] || process.env[v.toUpperCase()] || m);
const WINDIR = process.env.SystemRoot || process.env.windir || 'C:\\Windows';
const isExplorerLink = p => /(file explorer|dosya gezgini|explorer)\.lnk$/i.test(p);

// Kısayolun gerçek hedefini ve simgesini çöz (ortam değişkenleri, Dosya Gezgini gibi özel kısayollar)
function resolveShortcut(p) {
  const out = { target: null, icon: null };
  if (process.platform !== 'win32' || !p.toLowerCase().endsWith('.lnk')) return out;
  try {
    const link = shell.readShortcutLink(p);
    const target = expandEnv(link.target);
    const icon = expandEnv(link.icon);
    if (target && fs.existsSync(target)) out.target = target;
    if (icon && fs.existsSync(icon)) out.icon = icon;
  } catch {}
  if (!out.target && isExplorerLink(p)) out.target = path.join(WINDIR, 'explorer.exe');
  return out;
}

async function iconFor(p) {
  if (iconCache.has(p)) return iconCache.get(p);
  let target = p;
  if (process.platform === 'win32' && p.toLowerCase().endsWith('.lnk')) {
    const r = resolveShortcut(p);
    target = r.icon || r.target || p;
  }
  let url = null;
  for (const t of [target, p]) {
    try {
      const img = await app.getFileIcon(t, { size: 'large' });
      if (!img.isEmpty()) { url = img.toDataURL(); break; }
    } catch {}
  }
  iconCache.set(p, url);
  return url;
}

function targetExe(p) {
  if (process.platform === 'win32' && p.toLowerCase().endsWith('.lnk')) {
    const t = resolveShortcut(p).target;
    if (t) return t.toLowerCase();
  }
  return p.toLowerCase();
}

async function pinnedWithIcons() {
  const list = store.get().pinnedApps || [];
  return Promise.all(list.map(async a => ({ ...a, exe: targetExe(a.path), icon: await iconFor(a.path) })));
}

// Microsoft Store uygulamaları (WindowsApps) için paket logosunu bul
function packagedLogo(exe) {
  if (!exe || !/\\windowsapps\\/i.test(exe)) return null;
  let dir = path.dirname(exe);
  for (let i = 0; i < 4; i++, dir = path.dirname(dir)) {
    const manifest = path.join(dir, 'AppxManifest.xml');
    if (!fs.existsSync(manifest)) continue;
    try {
      const xml = fs.readFileSync(manifest, 'utf8');
      const m = xml.match(/Square44x44Logo="([^"]+)"/) || xml.match(/Square150x150Logo="([^"]+)"/) || xml.match(/<Logo>([^<]+)<\/Logo>/);
      if (!m) return null;
      const rel = m[1].replace(/\//g, '\\');
      const assetDir = path.join(dir, path.dirname(rel));
      const base = path.basename(rel, path.extname(rel)).toLowerCase();
      const files = fs.readdirSync(assetDir).filter(f => f.toLowerCase().startsWith(base) && f.toLowerCase().endsWith('.png'));
      const score = f => {
        const s = f.toLowerCase();
        let v = 0;
        if (s.includes('targetsize-48') || s.includes('targetsize-64')) v += 50;
        if (s.includes('altform-unplated')) v += 20;
        if (s.includes('scale-200')) v += 10;
        if (s.includes('contrast')) v -= 100;
        if (s.includes('lightunplated')) v -= 5;
        return v;
      };
      files.sort((a, b) => score(b) - score(a));
      if (!files.length) return null;
      return 'data:image/png;base64,' + fs.readFileSync(path.join(assetDir, files[0])).toString('base64');
    } catch { return null; }
  }
  return null;
}

async function iconForWindow(w) {
  const key = w.exe ? 'exe:' + w.exe.toLowerCase() : 'hwnd:' + w.hwnd;
  if (iconCache.has(key) && iconCache.get(key)) return iconCache.get(key);
  let url = packagedLogo(w.exe);
  if (!url) {
    try {
      const bmp = win32.windowIcon(w.hwnd);
      if (bmp) {
        const img = nativeImage.createFromBitmap(bmp.buffer, { width: bmp.width, height: bmp.height });
        if (!img.isEmpty()) url = img.toDataURL();
      }
    } catch (e) { console.error('[icon]', e.message); }
  }
  if (!url && w.exe) url = await iconFor(w.exe);
  if (url) iconCache.set(key, url);
  return url;
}

let lastWindowIds = new Set();
let lastWindowExes = new Set();
let lastRecent = new Set();

function allowedExe(exe) {
  if (!exe) return false;
  const e = exe.toLowerCase();
  if (lastWindowExes.has(e)) return true;
  return (store.get().pinnedApps || []).some(a => targetExe(a.path) === e);
}

async function smallIcon(key, p) {
  if (iconCache.has(key)) return iconCache.get(key);
  let url = null;
  try { const img = await app.getFileIcon(p, { size: 'small' }); if (!img.isEmpty()) url = img.toDataURL(); } catch {}
  iconCache.set(key, url);
  return url;
}
async function openWindows() {
  if (!store.get().showOpenWindows) return [];
  let wins = [];
  try { wins = win32.listWindows(); } catch (e) { console.error('[windows]', e); }
  lastWindowIds = new Set(wins.map(w => w.hwnd));
  lastWindowExes = new Set(wins.filter(w => w.exe).map(w => w.exe.toLowerCase()));
  return Promise.all(wins.map(async w => ({ ...w, icon: await iconForWindow(w), exe: w.exe ? w.exe.toLowerCase() : null })));
}

function nameFromPath(p) {
  return path.basename(p).replace(/\.(lnk|exe|url)$/i, '');
}

function addApps(paths) {
  const list = store.get().pinnedApps || [];
  for (const p of paths) if (!list.find(a => a.path === p)) list.push({ name: nameFromPath(p), path: p });
  store.update({ pinnedApps: list });
}

function taskbarPinnedFolder() {
  return path.join(process.env.APPDATA || '', 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned', 'TaskBar');
}

// ---------------- AI uyarıları ----------------
const notified = new Set();

async function checkAiWarnings() {
  try {
    const u = await ai.usage();
    const warnAt = u.warnAt || 80;
    if (u.api && u.api.percent != null && u.api.percent >= warnAt) {
      const key = `api:${new Date().getMonth()}:${u.api.percent >= 100 ? 100 : warnAt}`;
      if (!notified.has(key)) {
        notified.add(key);
        notify('AI bütçesi uyarısı', `Bu ay API harcaman $${u.api.total.toFixed(2)} — bütçenin %${u.api.percent}'i.`);
      }
    }
    const cc = u.claudeCode;
    if (cc && cc.active && cc.percent != null && cc.percent >= warnAt) {
      const key = `cc:${cc.resetsAt}:${cc.percent >= 100 ? 100 : warnAt}`;
      if (!notified.has(key)) {
        notified.add(key);
        const mins = Math.max(0, Math.round((cc.resetsAt - Date.now()) / 60000));
        notify('Claude Code limiti yaklaşıyor', `5 saatlik pencerenin %${cc.percent}'i kullanıldı. Sıfırlanmaya ${Math.floor(mins / 60)}s ${mins % 60}dk.`);
      }
    }
  } catch {}
}

function notify(title, body) {
  if (Notification.isSupported()) new Notification({ title, body, icon: path.join(__dirname, '..', 'assets', 'icon.png') }).show();
}

// ---------------- IPC ----------------
function registerIpc() {
  ipcMain.handle('settings:get', () => store.publicSettings());

  ipcMain.handle('settings:update', (_e, patch) => {
    const before = store.get();
    const prev = { taskbarMode: before.taskbarMode, launch: before.launchAtStartup };
    const next = store.update(patch);
    if (patch.launchAtStartup !== undefined && patch.launchAtStartup !== prev.launch) {
      app.setLoginItemSettings({ openAtLogin: !!patch.launchAtStartup });
    }
    if (patch.taskbarMode !== undefined && patch.taskbarMode !== prev.taskbarMode && dockVisible) {
      if (patch.taskbarMode === 'none') restoreTaskbar(); else applyTaskbar();
    }
    layoutDock();
    if (patch.pet) createPet();
    broadcast('settings:changed', next);
    return next;
  });

  // Evcil hayvan
  ipcMain.handle('pet:config', () => store.get().pet);
  ipcMain.handle('pet:setIgnore', (_e, v) => { if (pet) pet.setIgnoreMouseEvents(!!v, { forward: true }); });
  ipcMain.handle('pet:move', (_e, x, y) => {
    if (!pet) return;
    const p = clampToScreen(Math.round(x), Math.round(y));
    pet.setPosition(p.x, p.y);
  });
  ipcMain.handle('pet:save', () => {
    if (!pet) return;
    const [x, y] = pet.getPosition();
    store.update({ pet: { x, y } });
  });

  ipcMain.handle('settings:setSecret', (_e, key, value) => {
    store.setSecret(key, value);
    const next = store.publicSettings();
    broadcast('settings:changed', next);
    return next;
  });

  ipcMain.handle('dock:setIgnoreMouse', (_e, ignore) => {
    if (dock) dock.setIgnoreMouseEvents(!!ignore, { forward: true });
  });

  ipcMain.handle('app:quit', () => app.quit());

  // Ses, ağ, Windows kısayolları
  ipcMain.handle('audio:get', () => audio.get());
  ipcMain.handle('audio:set', (_e, pct) => audio.setVolume(Number(pct) || 0));
  ipcMain.handle('audio:mute', (_e, m) => audio.setMute(!!m));
  ipcMain.handle('net:status', (_e, force) => network.status(!!force));
  ipcMain.handle('sys:shortcut', (_e, name) => win32.shortcut(String(name)));
  const MS_URIS = new Set(['ms-availablenetworks:', 'ms-settings:network-wifi', 'ms-settings:network-status', 'ms-settings:sound', 'ms-settings:apps-volume', 'ms-settings:bluetooth']);
  ipcMain.handle('open:ms', (_e, uri) => { if (MS_URIS.has(uri)) shell.openExternal(uri); });
  ipcMain.handle('power:action', (_e, action) => {
    if (process.platform !== 'win32') return false;
    const run = (cmd, args) => execFile(cmd, args, { windowsHide: true }, () => {});
    switch (action) {
      case 'lock': run('rundll32.exe', ['user32.dll,LockWorkStation']); break;
      case 'sleep': run('powershell.exe', ['-NoProfile', '-Command', "Add-Type -AssemblyName System.Windows.Forms; [void][System.Windows.Forms.Application]::SetSuspendState('Suspend', $false, $false)"]); break;
      case 'shutdown': cleanup(); run('shutdown.exe', ['/s', '/t', '0']); break;
      case 'restart': cleanup(); run('shutdown.exe', ['/r', '/t', '0']); break;
      case 'logoff': cleanup(); run('shutdown.exe', ['/l']); break;
      default: return false;
    }
    return true;
  });
  ipcMain.handle('open:settings', (_e, section) => openSettings(section));
  ipcMain.handle('open:url', (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });

  // Spotify
  ipcMain.handle('spotify:now', () => spotify.nowPlaying());
  ipcMain.handle('spotify:control', (_e, action) => spotify.control(action));
  ipcMain.handle('spotify:connect', async () => {
    const id = store.get().spotify.clientId;
    await spotify.connect(id);
    store.update({ spotify: { mode: 'api' } });
    const next = store.publicSettings();
    broadcast('settings:changed', next);
    return next;
  });
  ipcMain.handle('spotify:disconnect', () => {
    spotify.disconnect();
    store.update({ spotify: { mode: 'local' } });
    const next = store.publicSettings();
    broadcast('settings:changed', next);
    return next;
  });
  ipcMain.handle('spotify:redirectUri', () => spotify.REDIRECT_URI);

  // AI
  ipcMain.handle('ai:usage', (_e, force) => ai.usage(!!force));

  // Sistem
  ipcMain.handle('system:stats', () => system.stats());

  // Uygulamalar
  ipcMain.handle('apps:list', () => pinnedWithIcons());
  ipcMain.handle('apps:launch', (_e, p) => {
    const list = store.get().pinnedApps || [];
    if (!list.find(a => a.path === p)) return false; // sadece sabitlenmiş uygulamalar açılabilir
    shell.openPath(p);
    return true;
  });
  ipcMain.handle('windows:list', () => openWindows());
  ipcMain.handle('windows:activate', (_e, hwnd, toggle = true) => {
    if (!lastWindowIds.has(hwnd)) return false; // sadece listelenen pencereler
    win32.activateWindow(hwnd, toggle !== false);
    return true;
  });
  ipcMain.handle('windows:close', (_e, hwnd) => {
    if (!lastWindowIds.has(hwnd)) return false;
    win32.closeWindow(hwnd);
    return true;
  });
  // Pencere önizlemeleri: { hwnd: dataURL }
  ipcMain.handle('windows:thumbs', async (_e, hwnds) => {
    const want = new Set((hwnds || []).filter(h => lastWindowIds.has(h)));
    if (!want.size) return {};
    try {
      const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 360, height: 220 }, fetchWindowIcons: false });
      const out = {};
      for (const src of sources) {
        const m = /^window:(\d+):/.exec(src.id);
        if (!m) continue;
        const h = Number(m[1]);
        if (want.has(h) && !src.thumbnail.isEmpty()) out[h] = 'data:image/jpeg;base64,' + src.thumbnail.toJPEG(82).toString('base64');
      }
      return out;
    } catch (e) {
      console.error('[thumbs]', e.message);
      return {};
    }
  });
  // Sağ tık menüsü
  ipcMain.handle('apps:context', async (_e, exe) => {
    if (!allowedExe(exe)) return null;
    const recent = jumplist.recentFor(exe);
    lastRecent = new Set(recent.map(r => r.path));
    const pinned = (store.get().pinnedApps || []).some(a => targetExe(a.path) === exe.toLowerCase());
    return {
      name: await jumplist.friendlyName(exe),
      tasks: jumplist.tasksFor(exe),
      pinned,
      recent: await Promise.all(recent.map(async r => ({
        path: r.path, name: r.name, dir: r.dir,
        icon: await smallIcon(r.dir ? 'small:dir' : 'small:' + (r.ext || r.path), r.path)
      })))
    };
  });
  ipcMain.handle('apps:task', (_e, exe, id) => allowedExe(exe) && jumplist.runTask(exe, String(id)));
  ipcMain.handle('apps:launchExe', (_e, exe) => { if (allowedExe(exe)) { jumplist.launch(exe); return true; } return false; });
  ipcMain.handle('apps:openRecent', (_e, p) => { if (lastRecent.has(p)) { shell.openPath(p); return true; } return false; });
  ipcMain.handle('apps:pinExe', async (_e, exe) => {
    if (!allowedExe(exe)) return false;
    const list = store.get().pinnedApps || [];
    if (!list.some(a => targetExe(a.path) === exe.toLowerCase())) {
      list.push({ name: await jumplist.friendlyName(exe), path: exe });
      store.update({ pinnedApps: list });
      broadcast('settings:changed', store.publicSettings());
    }
    return true;
  });
  ipcMain.handle('apps:unpin', (_e, p) => {
    const list = (store.get().pinnedApps || []).filter(a => a.path !== p);
    store.update({ pinnedApps: list });
    broadcast('settings:changed', store.publicSettings());
    return true;
  });
  ipcMain.handle('apps:add', async () => {
    const r = await dialog.showOpenDialog(settingsWin || undefined, {
      title: 'Uygulama ekle',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Uygulamalar', extensions: ['exe', 'lnk', 'url'] }]
    });
    if (!r.canceled) addApps(r.filePaths);
    const next = store.publicSettings();
    broadcast('settings:changed', next);
    return pinnedWithIcons();
  });
  ipcMain.handle('apps:importTaskbar', () => {
    const dir = taskbarPinnedFolder();
    let files = [];
    try { files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.lnk')).map(f => path.join(dir, f)); } catch {}
    addApps(files);
    broadcast('settings:changed', store.publicSettings());
    return { count: files.length };
  });
  ipcMain.handle('apps:set', (_e, list) => {
    const clean = (list || []).map(a => ({ name: String(a.name || ''), path: String(a.path || '') })).filter(a => a.path);
    store.update({ pinnedApps: clean });
    broadcast('settings:changed', store.publicSettings());
    return pinnedWithIcons();
  });

  ipcMain.handle('notify', (_e, title, body) => notify(String(title), String(body)));
}

// ---------------- Yaşam döngüsü ----------------
app.whenReady().then(() => {
  store.load();
  registerIpc();
  applyTaskbar();
  createDock();
  createTray();
  createPet();
  screen.on('display-metrics-changed', () => layoutDock());
  screen.on('display-added', () => layoutDock());
  screen.on('display-removed', () => { layoutDock(); createPet(); });
  setInterval(checkAiWarnings, 2 * 60 * 1000);
  // "Tamamen gizle" modunda Windows görev çubuğunu gizli tut
  setInterval(() => {
    if (dockVisible && store.get().taskbarMode === 'hide') { try { win32.enforceHidden(); } catch {} }
  }, 1200);
  setTimeout(checkAiWarnings, 15000);
  // İlk açılışta kontrol panelini göster
  if (!store.get()._welcomed) { store.update({ _welcomed: true }); openSettings('general'); }
});

app.on('window-all-closed', e => e.preventDefault()); // tray'de çalışmaya devam et

function cleanup() {
  try { media.stop(); } catch {}
  try { audio.stop(); } catch {}
  try { win32.release(); } catch {}
  restoreTaskbar();
}
app.on('before-quit', cleanup);
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { cleanup(); process.exit(0); });
