const { handler, clean } = require('./_lib');

// Endpoint "OOC AI": meneruskan chat ke penyedia AI. Kunci API tersimpan di Vercel, tidak di browser.
//
// Variabel di Vercel (Settings > Environment Variables). Pilih SALAH SATU penyedia:
//   A) Gratis (disarankan):  AI_API_KEY = kunci dari console.groq.com
//        (opsional) AI_BASE_URL  default https://api.groq.com/openai/v1
//        (opsional) AI_MODEL     default llama-3.3-70b-versatile
//        (opsional) AI_FALLBACK_MODEL default llama-3.1-8b-instant (dipakai saat kuota model utama habis)
//   B) Anthropic (berbayar): ANTHROPIC_API_KEY = kunci dari console.anthropic.com
//        (opsional) AI_MODEL     default claude-haiku-4-5-20251001
// Jika dua-duanya ada, AI_API_KEY dipakai lebih dulu.

const AI_KEY = (process.env.AI_API_KEY || process.env.GROQ_API_KEY || '').trim();
const AI_BASE = (process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1').trim().replace(/\/$/, '');
const ANTHROPIC_KEY = (process.env.ANTHROPIC_API_KEY || '').trim();
const USE_OPENAI_STYLE = !!AI_KEY;
const MODEL = (process.env.AI_MODEL || (USE_OPENAI_STYLE ? 'llama-3.3-70b-versatile' : 'claude-haiku-4-5-20251001')).trim();
const FALLBACK = (process.env.AI_FALLBACK_MODEL || (USE_OPENAI_STYLE ? 'llama-3.1-8b-instant' : '')).trim();

const MAX_TURNS = 12;       // jumlah pesan riwayat yang dikirim
const MAX_CHARS = 2000;     // panjang tiap pesan
const MAX_TOTAL = 8000;     // total karakter riwayat
const MAX_TOKENS = 800;     // panjang jawaban
const PER_MIN = 10;         // batas permintaan per IP per menit
const PER_DAY = 120;        // batas permintaan per IP per hari

const SYSTEM = [
  'Kamu adalah OOC AI, asisten di website OOC Circle (circle pertemanan).',
  'Jawab dalam Bahasa Indonesia yang santai, ramah, dan jelas, kecuali pengguna memakai bahasa lain.',
  'Mulai dengan jawaban singkat; beri detail hanya kalau diminta atau memang perlu.',
  'Jangan mengarang fakta. Kalau tidak tahu atau tidak yakin, katakan terus terang.',
  'Kamu tidak punya akses internet dan tidak bisa membuka link atau file.',
  'Tolak dengan sopan permintaan yang berbahaya, ilegal, atau merugikan orang lain.',
  'Kalau ditanya kamu model apa, jawab bahwa kamu OOC AI dan tidak tahu detail teknisnya.'
].join(' ');

/* ---------- Pembatas sederhana (per instance server) ---------- */
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 24 * 3600 * 1000);
  const lastMin = list.filter(t => now - t < 60 * 1000).length;
  if (lastMin >= PER_MIN || list.length >= PER_DAY) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

function fetchJson(url, opts) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  return fetch(url, { ...opts, signal: ctl.signal })
    .then(async r => {
      const text = await r.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
      return { ok: r.ok, status: r.status, data };
    })
    .finally(() => clearTimeout(timer));
}

async function askOpenAIStyle(model, messages) {
  return fetchJson(AI_BASE + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + AI_KEY },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
      messages: [{ role: 'system', content: SYSTEM }, ...messages]
    })
  });
}

async function askAnthropic(model, messages) {
  return fetchJson('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: MAX_TOKENS, system: SYSTEM, messages })
  });
}

function textOf(r) {
  const d = r.data || {};
  if (USE_OPENAI_STYLE) return d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
  return d.content && d.content[0] && d.content[0].text;
}

module.exports = handler(async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!AI_KEY && !ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'OOC AI belum diaktifkan: isi AI_API_KEY di Vercel' });
  }

  const ip = String(req.headers['x-forwarded-for'] || req.socket && req.socket.remoteAddress || 'x').split(',')[0].trim();
  if (limited(ip)) {
    return res.status(429).json({ error: 'Terlalu banyak pesan. Tunggu sebentar lalu coba lagi.' });
  }

  // Rapikan & batasi riwayat chat
  const raw = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
  let messages = raw
    .filter(m => m && (m.role === 'user' || m.role === 'assistant'))
    .map(m => ({ role: m.role, content: clean(m.content, MAX_CHARS) }))
    .filter(m => m.content)
    .slice(-MAX_TURNS);
  while (messages.length && messages[0].role !== 'user') messages.shift();
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    total += messages[i].content.length;
    if (total > MAX_TOTAL) { messages = messages.slice(i + 1); break; }
  }
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Pesan kosong' });
  }

  const rawAsk = USE_OPENAI_STYLE ? askOpenAIStyle : askAnthropic;
  const ask = (model, msgs) => rawAsk(model, msgs).catch(e => ({
    ok: false, status: 0, data: { error: { message: e && e.name === 'AbortError' ? 'waktu habis' : (e && e.message) || 'gagal terhubung' } }
  }));
  let r = await ask(MODEL, messages);
  if (!r.ok && FALLBACK && FALLBACK !== MODEL && (r.status === 0 || r.status === 429 || r.status === 404 || r.status >= 500 || r.status === 400)) {
    r = await ask(FALLBACK, messages);
  }

  if (!r.ok) {
    // Alasan singkat dari penyedia AI (tidak berisi kunci) supaya mudah dicari penyebabnya
    const d = r.data || {};
    const why = String((d.error && (d.error.message || d.error.type || d.error)) || d.message || '').replace(/\s+/g, ' ').slice(0, 140);
    const info = ' (kode ' + r.status + (why ? ': ' + why : '') + ')';
    console.error('AI error', r.status, JSON.stringify(r.data).slice(0, 300));
    if (r.status === 401 || r.status === 403) {
      return res.status(500).json({ error: 'Kunci AI di server tidak valid. Periksa AI_API_KEY di Vercel.' + info });
    }
    if (r.status === 429) {
      return res.status(503).json({ error: 'OOC AI sedang penuh (kuota habis). Coba lagi nanti.' + info });
    }
    return res.status(502).json({ error: 'OOC AI sedang bermasalah.' + info });
  }

  const reply = String(textOf(r) || '').trim();
  if (!reply) return res.status(502).json({ error: 'OOC AI tidak memberi jawaban. Coba ulangi.' });
  res.status(200).json({ reply });
});
