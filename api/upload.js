const { sb, handler, SB_URL } = require('./_lib');

// Memakai bucket "photos" yang sudah ada (publik), di dalam folder tools/
// Foto di sini TIDAK muncul di Galeri karena tidak dicatat di tabel photos.
const BUCKET = 'photos';
const MAX_BYTES = 3 * 1024 * 1024;

module.exports = handler(async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const b = req.body || {};
  const m = /^data:image\/jpeg;base64,(.+)$/.exec(b.data || '');
  if (!m) return res.status(400).json({ error: 'Format foto tidak valid' });

  const buf = Buffer.from(m[1], 'base64');
  if (!buf.length || buf.length > MAX_BYTES) {
    return res.status(400).json({ error: 'Ukuran foto terlalu besar' });
  }

  const path = `tools/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  await sb(`/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    body: buf,
    headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'false' }
  });

  return res.status(201).json({ url: `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}` });
});
