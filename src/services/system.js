// CPU ve RAM kullanımı (ek paket gerektirmez). Pil bilgisi arayüzde navigator.getBattery() ile okunur.
const os = require('os');

let last = snapshot();

function snapshot() {
  let idle = 0, total = 0;
  for (const c of os.cpus()) {
    for (const v of Object.values(c.times)) total += v;
    idle += c.times.idle;
  }
  return { idle, total };
}

function stats() {
  const now = snapshot();
  const dTotal = now.total - last.total;
  const dIdle = now.idle - last.idle;
  last = now;
  const cpu = dTotal > 0 ? Math.round((1 - dIdle / dTotal) * 100) : 0;
  const total = os.totalmem();
  const free = os.freemem();
  return {
    cpu: Math.max(0, Math.min(100, cpu)),
    ram: Math.round(((total - free) / total) * 100),
    ramUsedGb: +((total - free) / 1024 ** 3).toFixed(1),
    ramTotalGb: +(total / 1024 ** 3).toFixed(1)
  };
}

module.exports = { stats };
