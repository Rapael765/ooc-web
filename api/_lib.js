// Helper bersama untuk semua endpoint API (file berawalan _ tidak dijadikan endpoint)
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function sb(path, { method = 'GET', body, headers = {} } = {}) {
  if (!SB_URL || !SB_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di Vercel');
  const res = await fetch(SB_URL + path, {
    method,
    body,
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, ...headers }
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText;
    throw new Error('Supabase: ' + msg);
  }
  return data;
}

// Query ke tabel (PostgREST)
const table = (name, query = '', { method = 'GET', json } = {}) =>
  sb(`/rest/v1/${name}${query}`, {
    method,
    body: json ? JSON.stringify(json) : undefined,
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }
  });

const isAdmin = req =>
  !!process.env.ADMIN_KEY && req.headers['x-admin-key'] === process.env.ADMIN_KEY;

const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

// Bungkus handler: tangani error + CORS sederhana
const handler = fn => async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await fn(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
};

module.exports = { sb, table, isAdmin, clean, handler, SB_URL };
