// Ağ durumu: Wi-Fi adı ve sinyal gücü ya da kablolu bağlantı.
// Önce "netsh wlan show interfaces" denenir; Windows 11'in yeni sürümlerinde konum izni kapalıysa
// SSID gizlenir, o zaman ağ adı Get-NetConnectionProfile'dan alınır.

const { execFile } = require('child_process');
const os = require('os');

let cache = { at: 0, data: null };

function run(cmd, args, timeout = 6000) {
  return new Promise(resolve => {
    execFile(cmd, args, { windowsHide: true, timeout, encoding: 'buffer' }, (err, stdout) => {
      if (err || !stdout) return resolve('');
      // netsh çıktısı konsol kod sayfasında gelir; UTF-8 değilse latin1 ile oku
      let s = stdout.toString('utf8');
      if (s.includes('�')) s = stdout.toString('latin1');
      resolve(s);
    });
  });
}

function parseNetsh(out) {
  if (!out) return null;
  const ssid = (out.match(/^\s*SSID\s*:\s*(.+)$/m) || [])[1];
  const signal = (out.match(/:\s*(\d{1,3})\s*%/) || [])[1];
  const connected = /:\s*(connected|bağlı|bagli)\s*$/im.test(out) || !!ssid;
  if (!connected) return { wifiAdapter: /SSID|Sinyal|Signal/i.test(out), connected: false };
  return { wifiAdapter: true, connected: true, ssid: ssid ? ssid.trim() : null, signal: signal ? Number(signal) : null };
}

async function profile() {
  const out = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    "Get-NetConnectionProfile | Select-Object Name, InterfaceAlias, IPv4Connectivity | ConvertTo-Json -Compress"], 8000);
  try {
    const j = JSON.parse(out);
    return (Array.isArray(j) ? j : [j]).filter(Boolean);
  } catch { return []; }
}

function hasWiredIp() {
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (/wi-?fi|wlan|kablosuz|vethernet|virtual|vmware|loopback|bluetooth/i.test(name)) continue;
    if ((addrs || []).some(a => a.family === 'IPv4' && !a.internal)) return name;
  }
  return null;
}

async function status(force = false) {
  if (!force && cache.data && Date.now() - cache.at < 10000) return cache.data;
  if (process.platform !== 'win32') return { type: 'none' };
  let data;
  const wifi = parseNetsh(await run('netsh', ['wlan', 'show', 'interfaces']));
  if (wifi && wifi.connected) {
    data = { type: 'wifi', ssid: wifi.ssid, signal: wifi.signal };
    if (!data.ssid) {
      const p = (await profile()).find(x => /wi-?fi|wlan|kablosuz/i.test(x.InterfaceAlias || ''));
      if (p) data.ssid = p.Name;
    }
  } else {
    const wired = hasWiredIp();
    if (wired) {
      const p = (await profile()).find(x => !/wi-?fi|wlan|kablosuz/i.test(x.InterfaceAlias || ''));
      data = { type: 'ethernet', name: (p && p.Name) || wired };
    } else {
      data = { type: 'none', wifiAdapter: !!(wifi && wifi.wifiAdapter) };
    }
  }
  cache = { at: Date.now(), data };
  return data;
}

module.exports = { status };
