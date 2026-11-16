// AI kullanım verileri:
//  - Claude Code (yerel): ~/.claude/projects altındaki oturum kayıtlarından token sayımı,
//    5 saatlik kullanım penceresi ve sıfırlanmaya kalan süre. Anahtar gerekmez.
//  - Anthropic API: Admin API (sk-ant-admin...) ile bu ayki harcama
//  - OpenAI API: Admin anahtarı (sk-admin-...) ile bu ayki harcama

const fs = require('fs');
const path = require('path');
const os = require('os');
const store = require('../store');

const FIVE_HOURS = 5 * 3600 * 1000;

// ---------------- Claude Code ----------------
function claudeDirs() {
  const dirs = [];
  if (process.env.CLAUDE_CONFIG_DIR) {
    for (const d of process.env.CLAUDE_CONFIG_DIR.split(',')) dirs.push(path.join(d.trim(), 'projects'));
  }
  dirs.push(path.join(os.homedir(), '.claude', 'projects'));
  dirs.push(path.join(os.homedir(), '.config', 'claude', 'projects'));
  return [...new Set(dirs)].filter(d => { try { return fs.statSync(d).isDirectory(); } catch { return false; } });
}

const fileCache = new Map(); // dosya -> { mtimeMs, size, entries }

function listJsonl(dir, out = [], depth = 0) {
  if (depth > 3) return out;
  let items = [];
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) listJsonl(p, out, depth + 1);
    else if (it.name.endsWith('.jsonl')) out.push(p);
  }
  return out;
}

function parseFile(file) {
  const entries = [];
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return entries; }
  const cutoff = Date.now() - 48 * 3600 * 1000;
  for (const line of text.split('\n')) {
    if (!line || line.indexOf('"usage"') === -1) continue;
    try {
      const j = JSON.parse(line);
      const u = j.message && j.message.usage;
      if (!u || !j.timestamp) continue;
      const t = Date.parse(j.timestamp);
      if (!(t > cutoff)) continue;
      entries.push({
        t,
        key: `${j.message.id || ''}:${j.requestId || ''}`,
        input: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0),
        output: u.output_tokens || 0,
        cacheRead: u.cache_read_input_tokens || 0
      });
    } catch {}
  }
  return entries;
}

function claudeCodeUsage() {
  const dirs = claudeDirs();
  if (!dirs.length) return { available: false };
  const since = Date.now() - 48 * 3600 * 1000;
  let all = [];
  for (const dir of dirs) {
    for (const file of listJsonl(dir)) {
      let st;
      try { st = fs.statSync(file); } catch { continue; }
      if (st.mtimeMs < since) continue;
      const c = fileCache.get(file);
      if (c && c.mtimeMs === st.mtimeMs && c.size === st.size) { all.push(...c.entries); continue; }
      const entries = parseFile(file);
      fileCache.set(file, { mtimeMs: st.mtimeMs, size: st.size, entries });
      all.push(...entries);
    }
  }
  // Aynı mesaj akış sırasında birden çok kez yazılabiliyor: tekilleştir
  const seen = new Set();
  all = all.filter(e => (e.key === ':' || !seen.has(e.key)) && seen.add(e.key)).sort((a, b) => a.t - b.t);

  // 5 saatlik bloklar: ilk mesajın saat başından başlar, 5 saat sürer
  let block = null;
  for (const e of all) {
    if (!block || e.t >= block.start + FIVE_HOURS) {
      const d = new Date(e.t); d.setMinutes(0, 0, 0);
      block = { start: d.getTime(), input: 0, output: 0, cacheRead: 0, messages: 0 };
    }
    block.input += e.input; block.output += e.output; block.cacheRead += e.cacheRead; block.messages++;
  }
  const now = Date.now();
  const active = block && now < block.start + FIVE_HOURS ? block : null;

  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const today = all.filter(e => e.t >= dayStart.getTime()).reduce((s, e) => s + e.input + e.output, 0);

  const limit = store.get().ai.claudeCodeTokenLimit || 0;
  const used = active ? active.input + active.output : 0;
  return {
    available: true,
    active: !!active,
    tokens: used,
    messages: active ? active.messages : 0,
    resetsAt: active ? active.start + FIVE_HOURS : null,
    today,
    limit,
    percent: limit ? Math.min(100, Math.round((used / limit) * 100)) : null
  };
}

// ---------------- API harcamaları ----------------
function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

async function anthropicMonthCost(key) {
  let total = 0, page = null, guard = 0;
  do {
    const q = new URLSearchParams({ starting_at: monthStart().toISOString(), bucket_width: '1d', limit: '31' });
    if (page) q.set('page', page);
    const r = await fetch(`https://api.anthropic.com/v1/organizations/cost_report?${q}`, {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'User-Agent': 'NovaDock/0.1' }
    });
    if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'Admin anahtarı geçersiz' : `Anthropic ${r.status}`);
    const j = await r.json();
    for (const b of j.data || []) for (const res of b.results || []) total += parseFloat(res.amount || 0);
    page = j.has_more ? j.next_page : null;
  } while (page && ++guard < 10);
  return total / 100; // cent -> USD
}

async function openaiMonthCost(key) {
  let total = 0, page = null, guard = 0;
  do {
    const q = new URLSearchParams({ start_time: String(Math.floor(monthStart().getTime() / 1000)), bucket_width: '1d', limit: '31' });
    if (page) q.set('page', page);
    const r = await fetch(`https://api.openai.com/v1/organization/costs?${q}`, {
      headers: { Authorization: `Bearer ${key}` }
    });
    if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'Admin anahtarı geçersiz' : `OpenAI ${r.status}`);
    const j = await r.json();
    for (const b of j.data || []) for (const res of b.results || []) total += Number((res.amount && res.amount.value) || 0);
    page = j.has_more ? j.next_page : null;
  } while (page && ++guard < 10);
  return total;
}

let apiCache = { at: 0, data: null };

async function apiCosts(force = false) {
  const cfg = store.get().ai;
  if (!force && apiCache.data && Date.now() - apiCache.at < 5 * 60 * 1000) return apiCache.data;
  const out = {};
  const aKey = cfg.anthropic && store.getSecret('anthropicAdminKey');
  const oKey = cfg.openai && store.getSecret('openaiAdminKey');
  await Promise.all([
    aKey && anthropicMonthCost(aKey).then(v => { out.anthropic = { usd: v }; }).catch(e => { out.anthropic = { error: e.message }; }),
    oKey && openaiMonthCost(oKey).then(v => { out.openai = { usd: v }; }).catch(e => { out.openai = { error: e.message }; })
  ]);
  const total = (out.anthropic?.usd || 0) + (out.openai?.usd || 0);
  out.total = total;
  out.budget = cfg.monthlyBudget || 0;
  out.percent = out.budget ? Math.min(100, Math.round((total / out.budget) * 100)) : null;
  apiCache = { at: Date.now(), data: out };
  return out;
}

async function usage(force = false) {
  const cfg = store.get().ai;
  return {
    claudeCode: cfg.claudeCode ? claudeCodeUsage() : null,
    api: (cfg.anthropic || cfg.openai) ? await apiCosts(force) : null,
    warnAt: cfg.warnAt
  };
}

module.exports = { usage };
