const { table, isAdmin, clean, handler } = require('./_lib');

const TAGS = ['Pembaruan', 'Info', 'Acara', 'Penting'];

module.exports = handler(async (req, res) => {
  if (req.method === 'GET') {
    const rows = await table('notifications', '?select=id,title,message,tag,created_at&order=created_at.desc&limit=100');
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Kunci admin salah' });
    const b = req.body || {};
    const title = clean(b.title, 80);
    const message = clean(b.message, 500);
    const tag = TAGS.includes(b.tag) ? b.tag : 'Pembaruan';
    if (!title || !message) return res.status(400).json({ error: 'Judul dan isi wajib diisi' });
    const [row] = await table('notifications', '', { method: 'POST', json: { title, message, tag } });
    return res.status(201).json(row);
  }

  if (req.method === 'DELETE') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Kunci admin salah' });
    const id = clean(req.query.id, 60);
    if (!id) return res.status(400).json({ error: 'id wajib' });
    await table('notifications', `?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
});
