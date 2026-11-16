// Windows medya oturumu (GlobalSystemMediaTransportControls) okuyucusu.
// Windows'un ses düğmesine basınca çıkan medya kutusunun kullandığı kaynak:
// şarkı adı, sanatçı, albüm kapağı ve ilerleme. Spotify Free dahil her oynatıcıda çalışır, API anahtarı gerekmez.
// Arka planda tek bir PowerShell süreci çalışır ve saniyede bir JSON satırı yazar.

const { spawn } = require('child_process');
const readline = require('readline');

const PS_SCRIPT = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation` + '`' + String.raw`1' })[0]
function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); [void]$task.Wait(5000); $task.Result }
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$lastKey = ''
while ($true) {
  $out = @{ ok = $true; has = $false }
  try {
    $sessions = @($mgr.GetSessions())
    $s = $sessions | Where-Object { $_.SourceAppUserModelId -like '*Spotify*' } | Select-Object -First 1
    if (-not $s) { $s = $mgr.GetCurrentSession() }
    if ($s) {
      $p = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
      $info = $s.GetPlaybackInfo()
      $tl = $s.GetTimelineProperties()
      $out.has = $true
      $out.source = $s.SourceAppUserModelId
      $out.title = $p.Title
      $out.artist = $p.Artist
      $out.album = $p.AlbumTitle
      $out.status = [int]$info.PlaybackStatus
      $out.position = [math]::Round($tl.Position.TotalMilliseconds)
      $out.duration = [math]::Round($tl.EndTime.TotalMilliseconds)
      $out.updated = $tl.LastUpdatedTime.ToUnixTimeMilliseconds()
      $key = "$($p.Title)|$($p.Artist)"
      if ($key -ne $lastKey -and $p.Thumbnail) {
        $stream = Await ($p.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
        if ($stream -and $stream.Size -gt 0) {
          $reader = [Windows.Storage.Streams.DataReader]::new($stream.GetInputStreamAt(0))
          $n = Await ($reader.LoadAsync([uint32]$stream.Size)) ([uint32])
          $bytes = New-Object byte[] $n
          $reader.ReadBytes($bytes)
          $out.art = [Convert]::ToBase64String($bytes)
          $reader.Dispose(); $stream.Dispose()
        }
        $lastKey = $key
      }
    }
  } catch { $out.ok = $false; $out.err = "$_" }
  [Console]::Out.WriteLine(($out | ConvertTo-Json -Compress))
  [Console]::Out.Flush()
  Start-Sleep -Milliseconds 1000
}
`;

let proc = null;
let state = null;      // son okunan bilgi
let stateAt = 0;
let art = null;        // { key, url }
let restarts = 0;

function start() {
  if (process.platform !== 'win32' || proc) return;
  const encoded = Buffer.from(PS_SCRIPT, 'utf16le').toString('base64');
  proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], { windowsHide: true });
  const rl = readline.createInterface({ input: proc.stdout });
  rl.on('line', line => {
    try {
      const j = JSON.parse(line);
      if (!j.ok) return;
      restarts = 0;
      state = j;
      stateAt = Date.now();
      if (j.art) {
        const b = Buffer.from(j.art, 'base64');
        const mime = b[0] === 0x89 ? 'image/png' : 'image/jpeg';
        art = { key: `${j.title}|${j.artist}`, url: `data:${mime};base64,${j.art}` };
        delete j.art;
      }
    } catch {}
  });
  proc.stderr.on('data', () => {});
  proc.on('exit', () => {
    proc = null;
    if (restarts++ < 5) setTimeout(start, 3000 * restarts);
  });
}

function stop() {
  if (proc) { restarts = 99; proc.kill(); proc = null; }
}

/** Taze veri yoksa null döner (çağıran eski yönteme düşer) */
function nowPlaying() {
  start();
  if (!state || Date.now() - stateAt > 5000) return null;
  const s = state;
  if (!s.has) return { mode: 'media', running: false };
  const playing = s.status === 4;
  let position = s.position || 0;
  if (playing && s.updated > 1e12) position += Math.max(0, Date.now() - s.updated);
  if (s.duration) position = Math.min(position, s.duration);
  const key = `${s.title}|${s.artist}`;
  return {
    mode: 'media',
    running: true,
    playing,
    track: s.title || '',
    artist: s.artist || s.album || '',
    art: art && art.key === key ? art.url : null,
    progress: position,
    duration: s.duration || 0,
    source: s.source || ''
  };
}

module.exports = { nowPlaying, start, stop };
