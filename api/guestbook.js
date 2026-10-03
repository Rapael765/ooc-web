const { table, isAdmin, clean, handler } = require('./_lib');

const EMOJIS = ['😊', '🔥', '💙', '🎉', '😎'];

module.exports = handler(async (req, res) => {
  if (req.method === 'GET') {
    const rows = await table('guestbook', '?select=id,name,message,emoji,created_at&order=created_at.desc&limit=50');
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    const name = clean(b.name, 40);
    const message = clean(b.message, 300);
    const emoji = EMOJIS.includes(b.emoji) ? b.emoji : '😊';
    if (!name || !message) return res.status(400).json({ error: 'Nama dan pesan wajib diisi' });
    const [row] = await table('guestbook', '', { method: 'POST', json: { name, message, emoji } });
    return res.status(201).json(row);
  }

  if (req.method === 'DELETE') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Kunci admin salah' });
    const id = clean(req.query.id, 60);
    if (!id) return res.status(400).json({ error: 'id wajib' });
    await table('guestbook', `?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
});
