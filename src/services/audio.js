// Sistem ses seviyesi (Windows Core Audio). Arka planda tek bir PowerShell süreci çalışır,
// "get" / "set 0.42" / "mute 1" komutlarını alır ve her birine bir JSON satırıyla cevap verir.

const { spawn } = require('child_process');
const readline = require('readline');

const PS_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int RegisterControlChangeNotify(IntPtr p);
  int UnregisterControlChangeNotify(IntPtr p);
  int GetChannelCount(out uint c);
  int SetMasterVolumeLevel(float l, ref Guid g);
  int SetMasterVolumeLevelScalar(float l, ref Guid g);
  int GetMasterVolumeLevel(out float l);
  int GetMasterVolumeLevelScalar(out float l);
  int SetChannelVolumeLevel(uint c, float l, ref Guid g);
  int SetChannelVolumeLevelScalar(uint c, float l, ref Guid g);
  int GetChannelVolumeLevel(uint c, out float l);
  int GetChannelVolumeLevelScalar(uint c, out float l);
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool m, ref Guid g);
  int GetMute([MarshalAs(UnmanagedType.Bool)] out bool m);
}

[ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  int Activate(ref Guid iid, int clsCtx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object o);
}

[ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  int EnumAudioEndpoints(int flow, int mask, out IntPtr devices);
  int GetDefaultAudioEndpoint(int flow, int role, out IMMDevice device);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumerator { }

public static class NovaAudio {
  static IAudioEndpointVolume Endpoint() {
    var en = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
    IMMDevice dev;
    Marshal.ThrowExceptionForHR(en.GetDefaultAudioEndpoint(0, 1, out dev));
    Guid iid = typeof(IAudioEndpointVolume).GUID;
    object o;
    Marshal.ThrowExceptionForHR(dev.Activate(ref iid, 23, IntPtr.Zero, out o));
    return (IAudioEndpointVolume)o;
  }
  public static float GetVolume() { float v; Marshal.ThrowExceptionForHR(Endpoint().GetMasterVolumeLevelScalar(out v)); return v; }
  public static void SetVolume(float v) { Guid g = Guid.Empty; Marshal.ThrowExceptionForHR(Endpoint().SetMasterVolumeLevelScalar(Math.Max(0f, Math.Min(1f, v)), ref g)); }
  public static bool GetMute() { bool m; Marshal.ThrowExceptionForHR(Endpoint().GetMute(out m)); return m; }
  public static void SetMute(bool m) { Guid g = Guid.Empty; Marshal.ThrowExceptionForHR(Endpoint().SetMute(m, ref g)); }
}
"@
[Console]::Out.WriteLine('{"ready":true}')
[Console]::Out.Flush()
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($line -eq $null) { break }
  try {
    $p = $line.Trim().Split(' ')
    if ($p[0] -eq 'set') { [NovaAudio]::SetVolume([float]::Parse($p[1], [Globalization.CultureInfo]::InvariantCulture)) }
    elseif ($p[0] -eq 'mute') { [NovaAudio]::SetMute($p[1] -eq '1') }
    $o = @{ ok = $true; volume = [int][math]::Round([NovaAudio]::GetVolume() * 100); muted = [NovaAudio]::GetMute() }
  } catch {
    $o = @{ ok = $false; err = "$_" }
  }
  [Console]::Out.WriteLine(($o | ConvertTo-Json -Compress))
  [Console]::Out.Flush()
}
`;

let proc = null;
let ready = false;
let queue = [];     // bekleyen cevaplar (sırayla gelir)
let restarts = 0;
let last = null;

function start() {
  if (process.platform !== 'win32' || proc) return;
  ready = false;
  const encoded = Buffer.from(PS_SCRIPT, 'utf16le').toString('base64');
  proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], { windowsHide: true });
  const rl = readline.createInterface({ input: proc.stdout });
  rl.on('line', line => {
    let j;
    try { j = JSON.parse(line); } catch { return; }
    if (j.ready) { ready = true; restarts = 0; flush(); return; }
    const q = queue.shift();
    if (j.ok) last = { volume: j.volume, muted: j.muted };
    if (q && !q.done) { clearTimeout(q.timer); q.done = true; q.resolve(j.ok ? last : null); }
  });
  proc.stderr.on('data', d => console.error('[audio]', String(d).slice(0, 300)));
  proc.on('exit', () => {
    proc = null; ready = false;
    for (const q of queue) { clearTimeout(q.timer); q.resolve(null); }
    queue = [];
    if (restarts++ < 4) setTimeout(start, 2000 * restarts);
  });
}

const pendingWrites = [];
function flush() {
  while (ready && proc && pendingWrites.length) proc.stdin.write(pendingWrites.shift() + '\n');
}

function send(cmd) {
  start();
  if (!proc) return Promise.resolve(null);
  return new Promise(resolve => {
    const item = { resolve, done: false };
    item.timer = setTimeout(() => { item.done = true; resolve(last); }, 8000);
    queue.push(item);
    pendingWrites.push(cmd);
    flush();
  });
}

const get = () => send('get');
const setVolume = (pct) => send('set ' + (Math.max(0, Math.min(100, pct)) / 100).toFixed(3));
const setMute = (m) => send('mute ' + (m ? 1 : 0));
function stop() { if (proc) { restarts = 99; proc.kill(); proc = null; } }

module.exports = { get, setVolume, setMute, stop, start };
