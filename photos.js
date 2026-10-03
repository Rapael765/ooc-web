const { sb, table, isAdmin, clean, handler, SB_URL } = require('./_lib');

const BUCKET = 'photos';
const MAX_BYTES = 3 * 1024 * 1024; // batas per foto (setelah dikompres di browser)

module.exports = handler(async (req, res) => {
  if (req.method === 'GET') {
    const rows = await table('photos', '?select=id,cap,url&order=created_at.desc');
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Kunci admin salah' });
    const b = req.body || {};
    const cap = clean(b.cap, 60) || 'Momen OOC';
    const m = /^data:image\/jpeg;base64,(.+)$/.exec(b.data || '');
    if (!m) return res.status(400).json({ error: 'Format foto tidak valid' });
    const buf = Buffer.from(m[1], 'base64');
    if (!buf.length || buf.length > MAX_BYTES) return res.status(400).json({ error: 'Ukuran foto terlalu besar' });

    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    await sb(`/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      body: buf,
      headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'false' }
    });
    const url = `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    const [row] = await table('photos', '', { method: 'POST', json: { cap, path, url } });
    return res.status(201).json({ id: row.id, cap: row.cap, url: row.url });
  }

  if (req.method === 'DELETE') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Kunci admin salah' });
    const id = clean(req.query.id, 60);
    if (!id) return res.status(400).json({ error: 'id wajib' });
    const rows = await table('photos', `?id=eq.${encodeURIComponent(id)}&select=path`);
    if (rows[0] && rows[0].path) {
      try { await sb(`/storage/v1/object/${BUCKET}/${rows[0].path}`, { method: 'DELETE' }); } catch (e) { /* abaikan */ }
    }
    await table('photos', `?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
});
