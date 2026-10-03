const { table, isAdmin, clean, handler } = require('./_lib');

module.exports = handler(async (req, res) => {
  if (req.method === 'GET') {
    const rows = await table('events', '?select=id,title,event_date,place&order=event_date.asc');
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Kunci admin salah' });
    const b = req.body || {};
    const title = clean(b.title, 60);
    const event_date = clean(b.event_date, 25);
    const place = clean(b.place, 60);
    if (!title || isNaN(new Date(event_date))) return res.status(400).json({ error: 'Nama acara & tanggal wajib valid' });
    const [row] = await table('events', '', { method: 'POST', json: { title, event_date, place } });
    return res.status(201).json(row);
  }

  if (req.method === 'DELETE') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Kunci admin salah' });
    const id = clean(req.query.id, 60);
    if (!id) return res.status(400).json({ error: 'id wajib' });
    await table('events', `?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
});