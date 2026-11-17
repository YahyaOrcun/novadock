// Windows API köprüsü (koffi ile, derleme gerektirmez).
// - AppBar: dock'a ekranda taskbar gibi yer ayırır, böylece büyütülmüş pencereler altına girmez
// - Windows görev çubuğunu otomatik gizler / geri getirir
// - Medya tuşları gönderir (Spotify dahil her oynatıcıyı kontrol eder)
// Windows dışında her fonksiyon sessizce hiçbir şey yapmaz.

const isWin = process.platform === 'win32';
let k = null;

const ABM_NEW = 0, ABM_REMOVE = 1, ABM_QUERYPOS = 2, ABM_SETPOS = 3, ABM_GETSTATE = 4, ABM_SETSTATE = 10;
const ABE_TOP = 1, ABE_BOTTOM = 3;
const ABS_AUTOHIDE = 1, ABS_ALWAYSONTOP = 2;
const SW_HIDE = 0, SW_SHOW = 5;
const KEYEVENTF_KEYUP = 0x0002;
const VK = { playPause: 0xB3, next: 0xB0, prev: 0xB1, volUp: 0xAF, volDown: 0xAE, mute: 0xAD };

const CALLBACK_MSG = 0x8001; // WM_APP + 1
const ABN_POSCHANGED = 1, ABN_FULLSCREENAPP = 2;

function init() {
  if (!isWin || k) return k;
  try {
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll');
    const shell32 = koffi.load('shell32.dll');
    const RECT = koffi.struct('RECT', { left: 'int32_t', top: 'int32_t', right: 'int32_t', bottom: 'int32_t' });
    const APPBARDATA = koffi.struct('APPBARDATA', {
      cbSize: 'uint32_t',
      hWnd: 'intptr_t',
      uCallbackMessage: 'uint32_t',
      uEdge: 'uint32_t',
      rc: RECT,
      lParam: 'intptr_t'
    });
    k = {
      koffi,
      APPBARDATA,
      SHAppBarMessage: shell32.func('SHAppBarMessage', 'uintptr_t', ['uint32_t', koffi.inout(koffi.pointer(APPBARDATA))]),
      FindWindowW: user32.func('FindWindowW', 'intptr_t', ['str16', 'str16']),
      FindWindowExW: user32.func('FindWindowExW', 'intptr_t', ['intptr_t', 'intptr_t', 'str16', 'str16']),
      ShowWindow: user32.func('ShowWindow', 'bool', ['intptr_t', 'int']),
      keybd_event: user32.func('keybd_event', 'void', ['uint8_t', 'uint8_t', 'uint32_t', 'uintptr_t'])
    };
    // Açık pencereler için
    const kernel32 = koffi.load('kernel32.dll');
    const dwmapi = koffi.load('dwmapi.dll');
    const WNDENUMPROC = koffi.proto('bool __stdcall WNDENUMPROC(intptr_t hwnd, intptr_t lParam)');
    Object.assign(k, {
      EnumWindows: user32.func('bool __stdcall EnumWindows(WNDENUMPROC *cb, intptr_t lParam)'),
      IsWindowVisible: user32.func('bool __stdcall IsWindowVisible(intptr_t hWnd)'),
      IsIconic: user32.func('bool __stdcall IsIconic(intptr_t hWnd)'),
      GetWindow: user32.func('intptr_t __stdcall GetWindow(intptr_t hWnd, uint32_t uCmd)'),
      GetWindowLongPtrW: user32.func('intptr_t __stdcall GetWindowLongPtrW(intptr_t hWnd, int nIndex)'),
      GetWindowTextW: user32.func('int __stdcall GetWindowTextW(intptr_t hWnd, void *buf, int max)'),
      GetWindowTextLengthW: user32.func('int __stdcall GetWindowTextLengthW(intptr_t hWnd)'),
      GetWindowThreadProcessId: user32.func('uint32_t __stdcall GetWindowThreadProcessId(intptr_t hWnd, void *pid)'),
      GetForegroundWindow: user32.func('intptr_t __stdcall GetForegroundWindow()'),
      SetForegroundWindow: user32.func('bool __stdcall SetForegroundWindow(intptr_t hWnd)'),
      BringWindowToTop: user32.func('bool __stdcall BringWindowToTop(intptr_t hWnd)'),
      PostMessageW: user32.func('bool __stdcall PostMessageW(intptr_t hWnd, uint32_t msg, uintptr_t wParam, intptr_t lParam)'),
      OpenProcess: kernel32.func('intptr_t __stdcall OpenProcess(uint32_t access, bool inherit, uint32_t pid)'),
      QueryFullProcessImageNameW: kernel32.func('bool __stdcall QueryFullProcessImageNameW(intptr_t h, uint32_t flags, void *buf, void *size)'),
      CloseHandle: kernel32.func('bool __stdcall CloseHandle(intptr_t h)'),
      DwmGetWindowAttribute: dwmapi.func('long __stdcall DwmGetWindowAttribute(intptr_t hwnd, uint32_t attr, void *out, uint32_t size)')
    });
    // Dosya türünün varsayılan uygulaması
    try {
      const shlwapi = koffi.load('shlwapi.dll');
      k.AssocQueryStringW = shlwapi.func('long __stdcall AssocQueryStringW(uint32_t flags, uint32_t str, str16 assoc, str16 extra, void *out, void *pcch)');
    } catch {}
    // Pencere simgesini (HICON) resme çevirmek için
    const gdi32 = koffi.load('gdi32.dll');
    const ICONINFO = koffi.struct('ICONINFO', { fIcon: 'int32_t', xHotspot: 'uint32_t', yHotspot: 'uint32_t', hbmMask: 'intptr_t', hbmColor: 'intptr_t' });
    const BITMAP = koffi.struct('BITMAP', { bmType: 'int32_t', bmWidth: 'int32_t', bmHeight: 'int32_t', bmWidthBytes: 'int32_t', bmPlanes: 'uint16_t', bmBitsPixel: 'uint16_t', bmBits: 'intptr_t' });
    Object.assign(k, {
      BITMAP,
      SendMessageTimeoutW: user32.func('intptr_t __stdcall SendMessageTimeoutW(intptr_t hWnd, uint32_t msg, uintptr_t wParam, intptr_t lParam, uint32_t flags, uint32_t timeout, void *result)'),
      GetClassLongPtrW: user32.func('uintptr_t __stdcall GetClassLongPtrW(intptr_t hWnd, int nIndex)'),
      GetIconInfo: user32.func('bool __stdcall GetIconInfo(intptr_t hIcon, _Out_ ICONINFO *info)'),
      GetDC: user32.func('intptr_t __stdcall GetDC(intptr_t hWnd)'),
      ReleaseDC: user32.func('int __stdcall ReleaseDC(intptr_t hWnd, intptr_t hdc)'),
      GetObjectW: gdi32.func('int __stdcall GetObjectW(intptr_t h, int c, _Out_ BITMAP *pv)'),
      GetDIBits: gdi32.func('int __stdcall GetDIBits(intptr_t hdc, intptr_t hbm, uint32_t start, uint32_t lines, void *bits, void *bmi, uint32_t usage)'),
      DeleteObject: gdi32.func('bool __stdcall DeleteObject(intptr_t h)')
    });
  } catch (e) {
    console.error('[win32] koffi yüklenemedi:', e.message);
    k = null;
  }
  return k;
}

function hwndOf(win) {
  const buf = win.getNativeWindowHandle();
  return buf.length >= 8 ? Number(buf.readBigUInt64LE(0)) : buf.readUInt32LE(0);
}

function abd(hWnd, extra = {}) {
  return {
    cbSize: k.koffi.sizeof(k.APPBARDATA),
    hWnd,
    uCallbackMessage: 0,
    uEdge: 0,
    rc: { left: 0, top: 0, right: 0, bottom: 0 },
    lParam: 0,
    ...extra
  };
}

// ---------- AppBar ----------
let registered = null; // { win, hWnd }

/**
 * Dock penceresini AppBar olarak kaydeder ve ekranın kenarında yer ayırır.
 * @param win BrowserWindow
 * @param display electron screen display (birincil ekran)
 * @param edge 'top' | 'bottom'
 * @param heightDip dock yüksekliği (DIP)
 * @param onFullscreen (isFullscreen) => void
 * @returns Electron bounds (DIP) ya da null
 */
function reserve(win, display, edge, heightDip, onFullscreen) {
  if (!init()) return null;
  const s = display.scaleFactor;
  const hWnd = hwndOf(win);

  if (!registered) {
    k.SHAppBarMessage(ABM_NEW, abd(hWnd, { uCallbackMessage: CALLBACK_MSG }));
    registered = { win, hWnd };
    try {
      win.hookWindowMessage(CALLBACK_MSG, (wParam, lParam) => {
        const code = Number(wParam.length >= 8 ? wParam.readBigUInt64LE(0) : wParam.readUInt32LE(0));
        if (code === ABN_FULLSCREENAPP && onFullscreen) {
          const on = Number(lParam.length >= 8 ? lParam.readBigInt64LE(0) : lParam.readInt32LE(0)) !== 0;
          onFullscreen(on);
        }
        if (code === ABN_POSCHANGED && registered && registered.reapply) registered.reapply();
      });
    } catch (e) { /* hookWindowMessage desteklenmiyorsa sorun değil */ }
  }

  const b = display.bounds;
  const h = Math.round(heightDip * s);
  const data = abd(hWnd, {
    uEdge: edge === 'top' ? ABE_TOP : ABE_BOTTOM,
    rc: {
      left: Math.round(b.x * s),
      right: Math.round((b.x + b.width) * s),
      top: Math.round(b.y * s),
      bottom: Math.round((b.y + b.height) * s)
    }
  });

  k.SHAppBarMessage(ABM_QUERYPOS, data);
  if (edge === 'top') data.rc.bottom = data.rc.top + h;
  else data.rc.top = data.rc.bottom - h;
  k.SHAppBarMessage(ABM_SETPOS, data);

  registered.reapply = () => reserve(win, display, edge, heightDip, onFullscreen);
  return {
    x: Math.round(data.rc.left / s),
    y: Math.round(data.rc.top / s),
    width: Math.round((data.rc.right - data.rc.left) / s),
    height: Math.round((data.rc.bottom - data.rc.top) / s)
  };
}

function release() {
  if (!k || !registered) return;
  try { k.SHAppBarMessage(ABM_REMOVE, abd(registered.hWnd)); } catch {}
  try { registered.win.unhookWindowMessage(CALLBACK_MSG); } catch {}
  registered = null;
}

// ---------- Windows görev çubuğu ----------
function taskbarHwnd() {
  return k ? k.FindWindowW('Shell_TrayWnd', null) : 0;
}

function getTaskbarState() {
  if (!init()) return null;
  return Number(k.SHAppBarMessage(ABM_GETSTATE, abd(taskbarHwnd())));
}

function setTaskbarState(state) {
  if (!init()) return;
  k.SHAppBarMessage(ABM_SETSTATE, abd(taskbarHwnd(), { lParam: state }));
}

/** mode: 'none' | 'autohide' | 'hide' */
function applyTaskbarMode(mode, originalState) {
  if (!init()) return;
  const tb = taskbarHwnd();
  if (!tb) return;
  if (mode === 'autohide' || mode === 'hide') {
    setTaskbarState(ABS_AUTOHIDE | ABS_ALWAYSONTOP);
  } else if (originalState != null) {
    setTaskbarState(originalState);
  }
  for (const h of allTaskbars()) k.ShowWindow(h, mode === 'hide' ? SW_HIDE : SW_SHOW);
}

// Ana ve ikincil ekranlardaki tüm görev çubukları
function allTaskbars() {
  const list = [];
  const main = taskbarHwnd();
  if (main) list.push(main);
  let h = 0;
  for (let i = 0; i < 8; i++) {
    h = k.FindWindowExW(0, h, 'Shell_SecondaryTrayWnd', null);
    if (!h) break;
    list.push(h);
  }
  return list;
}

/** "Tamamen gizle" modunda Windows görev çubuğu kendiliğinden geri gelirse tekrar gizler */
function enforceHidden() {
  if (!init()) return;
  for (const h of allTaskbars()) if (k.IsWindowVisible(h)) k.ShowWindow(h, SW_HIDE);
}

function restoreTaskbar(originalState) {
  if (!init()) return;
  for (const h of allTaskbars()) k.ShowWindow(h, SW_SHOW);
  if (originalState != null) setTaskbarState(originalState);
}

// ---------- Dosya ilişkilendirmeleri ----------
/** Bir uzantının (".pdf") varsayılan uygulamasının exe yolu */
function assocExe(ext) {
  if (!init() || !k.AssocQueryStringW) return null;
  const buf = Buffer.alloc(2048);
  const len = Buffer.alloc(4); len.writeUInt32LE(1024);
  const hr = k.AssocQueryStringW(0, 2, ext, null, buf, len); // ASSOCSTR_EXECUTABLE
  if (hr !== 0) return null;
  return buf.toString('utf16le', 0, Math.max(0, len.readUInt32LE(0) - 1) * 2) || null;
}

// ---------- Klavye kısayolları ----------
const SHORTCUTS = {
  start: [0x5B],               // Win
  quick: [0x5B, 0x41],         // Win + A (hızlı ayarlar)
  notifications: [0x5B, 0x4E], // Win + N (bildirimler)
  desktop: [0x5B, 0x44]        // Win + D (masaüstünü göster)
};
function shortcut(name) {
  if (!init()) return false;
  const keys = SHORTCUTS[name];
  if (!keys) return false;
  for (const vk of keys) k.keybd_event(vk, 0, 0, 0);
  for (const vk of [...keys].reverse()) k.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0);
  return true;
}

// ---------- Medya tuşları ----------
function mediaKey(name) {
  if (!init()) return false;
  const vk = VK[name];
  if (!vk) return false;
  k.keybd_event(vk, 0, 0, 0);
  k.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0);
  return true;
}

// ---------- Açık pencereler ----------
const GWL_EXSTYLE = -20, GW_OWNER = 4, DWMWA_CLOAKED = 14;
const WS_EX_TOOLWINDOW = 0x80, WS_EX_APPWINDOW = 0x40000, WS_EX_NOACTIVATE = 0x08000000;
const SW_RESTORE = 9, SW_MINIMIZE = 6, VK_MENU = 0x12;
const exeCache = new Map(); // pid -> exe yolu
let lastForeground = 0;

function pidOf(hwnd) {
  const b = Buffer.alloc(4);
  k.GetWindowThreadProcessId(hwnd, b);
  return b.readUInt32LE(0);
}

function exeOf(pid) {
  if (exeCache.has(pid)) return exeCache.get(pid);
  let exe = null;
  const h = k.OpenProcess(0x1000, false, pid); // PROCESS_QUERY_LIMITED_INFORMATION
  if (h) {
    const buf = Buffer.alloc(1024);
    const size = Buffer.alloc(4); size.writeUInt32LE(512);
    if (k.QueryFullProcessImageNameW(h, 0, buf, size)) exe = buf.toString('utf16le', 0, size.readUInt32LE(0) * 2);
    k.CloseHandle(h);
  }
  if (exeCache.size > 500) exeCache.clear();
  exeCache.set(pid, exe);
  return exe;
}

/** Görev çubuğunda görünecek pencereleri döndürür: [{ hwnd, title, exe }] */
function listWindows() {
  if (!init()) return [];
  const out = [];
  const ownPid = process.pid;
  const fg = k.GetForegroundWindow();
  if (fg && pidOf(fg) !== ownPid) lastForeground = Number(fg);
  k.EnumWindows((hwnd) => {
    try {
      if (!k.IsWindowVisible(hwnd)) return true;
      const ex = Number(k.GetWindowLongPtrW(hwnd, GWL_EXSTYLE));
      const owner = k.GetWindow(hwnd, GW_OWNER);
      if ((ex & WS_EX_TOOLWINDOW) || (ex & WS_EX_NOACTIVATE)) return true;
      if (owner && !(ex & WS_EX_APPWINDOW)) return true;
      const cloak = Buffer.alloc(4);
      if (k.DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, cloak, 4) === 0 && cloak.readUInt32LE(0) !== 0) return true;
      const len = k.GetWindowTextLengthW(hwnd);
      if (len <= 0) return true;
      const tb = Buffer.alloc((len + 1) * 2);
      const n = k.GetWindowTextW(hwnd, tb, len + 1);
      const title = tb.toString('utf16le', 0, n * 2);
      if (!title || title === 'Program Manager') return true;
      const pid = pidOf(hwnd);
      if (pid === ownPid) return true;
      out.push({ hwnd: Number(hwnd), title, exe: exeOf(pid), minimized: !!k.IsIconic(hwnd), active: Number(hwnd) === lastForeground });
    } catch {}
    return true;
  }, 0);
  return out;
}

/** Pencereyi öne getirir; zaten öndeyse simge durumuna küçültür (görev çubuğu gibi). */
function activateWindow(hwnd, toggle = true) {
  if (!init()) return;
  if (toggle && hwnd === lastForeground && !k.IsIconic(hwnd)) {
    k.ShowWindow(hwnd, SW_MINIMIZE);
    lastForeground = 0;
    return;
  }
  if (k.IsIconic(hwnd)) k.ShowWindow(hwnd, SW_RESTORE);
  // Windows'un odak kısıtlamasını aşmak için bilinen yöntem: kısa bir Alt basımı
  k.keybd_event(VK_MENU, 0, 0, 0);
  k.keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, 0);
  k.SetForegroundWindow(hwnd);
  k.BringWindowToTop(hwnd);
  lastForeground = hwnd;
}

/** Pencereye kapanma isteği gönderir (kaydedilmemiş iş varsa uygulama kendisi sorar) */
function closeWindow(hwnd) {
  if (!init()) return;
  k.PostMessageW(hwnd, 0x0010, 0, 0); // WM_CLOSE
}

// ---------- Pencere simgesi ----------
function readBitmap(hdc, hbm, w, h) {
  const bmi = Buffer.alloc(44);
  bmi.writeUInt32LE(40, 0);      // biSize
  bmi.writeInt32LE(w, 4);        // biWidth
  bmi.writeInt32LE(-h, 8);       // biHeight (negatif = yukarıdan aşağı)
  bmi.writeUInt16LE(1, 12);      // biPlanes
  bmi.writeUInt16LE(32, 14);     // biBitCount
  const bits = Buffer.alloc(w * h * 4);
  const n = k.GetDIBits(hdc, hbm, 0, h, bits, bmi, 0);
  return n ? bits : null;
}

/** Pencerenin görev çubuğunda kullandığı simgeyi BGRA bitmap olarak döndürür: { width, height, buffer } */
function windowIcon(hwnd) {
  if (!init()) return null;
  let hIcon = 0;
  const res = Buffer.alloc(8);
  for (const type of [1, 2, 0]) { // ICON_BIG, ICON_SMALL2, ICON_SMALL
    if (k.SendMessageTimeoutW(hwnd, 0x7F, type, 0, 0x2, 80, res)) {
      hIcon = Number(res.readBigUInt64LE(0));
      if (hIcon) break;
    }
  }
  if (!hIcon) hIcon = Number(k.GetClassLongPtrW(hwnd, -14)) || Number(k.GetClassLongPtrW(hwnd, -34)); // GCLP_HICON, GCLP_HICONSM
  if (!hIcon) return null;

  const info = {};
  if (!k.GetIconInfo(hIcon, info)) return null;
  let out = null;
  const hdc = k.GetDC(0);
  try {
    if (info.hbmColor) {
      const bm = {};
      k.GetObjectW(info.hbmColor, k.koffi.sizeof(k.BITMAP), bm);
      const w = bm.bmWidth, h = Math.abs(bm.bmHeight);
      if (w > 0 && h > 0 && w <= 256 && h <= 256) {
        const px = readBitmap(hdc, info.hbmColor, w, h);
        if (px) {
          let hasAlpha = false;
          for (let i = 3; i < px.length; i += 4) if (px[i]) { hasAlpha = true; break; }
          if (!hasAlpha && info.hbmMask) {
            // Eski tip simge: saydamlığı maskeden al
            const mask = readBitmap(hdc, info.hbmMask, w, h);
            for (let i = 0; i < px.length; i += 4) px[i + 3] = mask && mask[i] ? 0 : 255;
          }
          out = { width: w, height: h, buffer: px };
        }
      }
    }
  } finally {
    k.ReleaseDC(0, hdc);
    if (info.hbmColor) k.DeleteObject(info.hbmColor);
    if (info.hbmMask) k.DeleteObject(info.hbmMask);
  }
  return out;
}

module.exports = { isWin, shortcut, assocExe, enforceHidden, listWindows, activateWindow, closeWindow, windowIcon, reserve, release, getTaskbarState, applyTaskbarMode, restoreTaskbar, mediaKey };
