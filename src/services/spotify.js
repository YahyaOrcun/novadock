// Spotify widget'ı için iki mod:
//  - local: Kurulum gerektirmez. Çalan şarkıyı Spotify masaüstü penceresinin başlığından okur,
//           kontrol için Windows medya tuşlarını kullanır. Free hesapta da çalışır.
//  - api:   Spotify Web API (PKCE). Albüm kapağı ve ilerleme çubuğu gelir.
//           Spotify, geliştirici modundaki uygulamalar için Premium şartı koyuyor.

const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { shell } = require('electron');
const store = require('../store');
const win32 = require('../win32');
const media = require('./media');

const REDIRECT_PORT = 8974;
const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}/callback`;
const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing';

// ---------------- Yerel mod ----------------
function readSpotifyWindowTitle() {
  return new Promise(resolve => {
    if (process.platform !== 'win32') return resolve(null);
    execFile('tasklist', ['/v', '/fo', 'csv', '/nh', '/fi', 'imagename eq Spotify.exe'],
      { windowsHide: true, timeout: 4000 },
      (err, stdout) => {
        if (err || !stdout) return resolve(null);
        const titles = stdout.split(/\r?\n/)
          .map(line => line.match(/"([^"]*)"\s*$/))
          .filter(Boolean)
          .map(m => m[1])
          .filter(t => t && t !== 'N/A' && t !== 'Yok' && !/^(MSCTFIME UI|Default IME)$/i.test(t));
        resolve(titles.length ? titles : []);
      });
  });
}

async function localNowPlaying() {
  const titles = await readSpotifyWindowTitle();
  if (titles === null) return { mode: 'local', running: false };
  if (titles.length === 0) return { mode: 'local', running: false };
  const songTitle = titles.find(t => t.includes(' - '));
  if (!songTitle) return { mode: 'local', running: true, playing: false };
  const idx = songTitle.indexOf(' - ');
  return {
    mode: 'local',
    running: true,
    playing: true,
    artist: songTitle.slice(0, idx),
    track: songTitle.slice(idx + 3)
  };
}

// ---------------- API modu (PKCE) ----------------
function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let authServer = null;

function connect(clientId) {
  if (!clientId) return Promise.reject(new Error('Client ID gerekli'));
  if (authServer) { try { authServer.close(); } catch {} authServer = null; }

  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const state = b64url(crypto.randomBytes(12));

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { finish(); reject(new Error('Zaman aşımı: tarayıcıda giriş tamamlanmadı')); }, 5 * 60 * 1000);
    const finish = () => { clearTimeout(timeout); if (authServer) { authServer.close(); authServer = null; } };

    authServer = http.createServer(async (req, res) => {
      const url = new URL(req.url, REDIRECT_URI);
      if (url.pathname !== '/callback') { res.writeHead(404); return res.end(); }
      const code = url.searchParams.get('code');
      const err = url.searchParams.get('error');
      const ok = !err && code && url.searchParams.get('state') === state;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<body style="font-family:Segoe UI,sans-serif;background:#0a0a0a;color:#eee;display:grid;place-items:center;height:100vh;margin:0">
        <div style="text-align:center"><h2>${ok ? 'Spotify bağlandı ✓' : 'Bağlantı başarısız'}</h2><p>Bu sekmeyi kapatabilirsin.</p></div></body>`);
      if (!ok) { finish(); return reject(new Error(err || 'Geçersiz yanıt')); }
      try {
        const tokens = await tokenRequest({
          grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI,
          client_id: clientId, code_verifier: verifier
        });
        store.setSecret('spotifyTokens', tokens);
        finish();
        resolve(true);
      } catch (e) { finish(); reject(e); }
    });
    authServer.on('error', e => { finish(); reject(e); });
    authServer.listen(REDIRECT_PORT, '127.0.0.1', () => {
      const q = new URLSearchParams({
        client_id: clientId, response_type: 'code', redirect_uri: REDIRECT_URI,
        scope: SCOPES, code_challenge_method: 'S256', code_challenge: challenge, state
      });
      shell.openExternal(`https://accounts.spotify.com/authorize?${q}`);
    });
  });
}

async function tokenRequest(params, prevRefresh) {
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  });
  if (!r.ok) throw new Error(`Spotify token hatası (${r.status})`);
  const j = await r.json();
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token || prevRefresh,
    expires_at: Date.now() + (j.expires_in - 60) * 1000
  };
}

async function accessToken() {
  let t = store.getSecret('spotifyTokens', true);
  if (!t) return null;
  if (Date.now() > t.expires_at) {
    const clientId = store.get().spotify.clientId;
    t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: clientId }, t.refresh_token);
    store.setSecret('spotifyTokens', t);
  }
  return t.access_token;
}

async function api(method, path) {
  const token = await accessToken();
  if (!token) throw new Error('not-connected');
  return fetch(`https://api.spotify.com/v1${path}`, { method, headers: { Authorization: `Bearer ${token}` } });
}

async function apiNowPlaying() {
  const r = await api('GET', '/me/player/currently-playing?additional_types=episode');
  if (r.status === 204) return { mode: 'api', running: true, playing: false };
  if (!r.ok) throw new Error(`Spotify API ${r.status}`);
  const j = await r.json();
  const item = j.item || {};
  const images = (item.album && item.album.images) || item.images || [];
  return {
    mode: 'api',
    running: true,
    playing: !!j.is_playing,
    track: item.name || '',
    artist: (item.artists || []).map(a => a.name).join(', ') || (item.show && item.show.name) || '',
    art: images.length ? images[images.length > 1 ? images.length - 2 : 0].url : null,
    progress: j.progress_ms || 0,
    duration: item.duration_ms || 0
  };
}

// ---------------- Ortak ----------------
async function nowPlaying() {
  const cfg = store.get().spotify;
  if (cfg.mode === 'api' && store.getSecret('spotifyTokens')) {
    try { return await apiNowPlaying(); }
    catch (e) { /* API hata verirse yerel moda düş */ }
  }
  // Windows medya oturumu: albüm kapağı ve ilerleme dahil
  const m = media.nowPlaying();
  if (m) return m;
  return localNowPlaying();
}

async function control(action) {
  const cfg = store.get().spotify;
  if (cfg.mode === 'api' && store.getSecret('spotifyTokens')) {
    const map = {
      play: ['PUT', '/me/player/play'],
      pause: ['PUT', '/me/player/pause'],
      next: ['POST', '/me/player/next'],
      prev: ['POST', '/me/player/previous']
    };
    try {
      const r = await api(...map[action]);
      if (r.ok || r.status === 204) return true;
    } catch {}
  }
  // Yedek: medya tuşları (Premium gerekmez)
  const keyMap = { play: 'playPause', pause: 'playPause', toggle: 'playPause', next: 'next', prev: 'prev' };
  return win32.mediaKey(keyMap[action] || 'playPause');
}

function disconnect() { store.setSecret('spotifyTokens', null); }

module.exports = { nowPlaying, control, connect, disconnect, REDIRECT_URI };
