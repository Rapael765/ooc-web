const { isAdmin, handler } = require('./_lib');

// Dipakai tampilan untuk memeriksa password admin sebelum membuka fitur pengaturan.
// Password = nilai ADMIN_KEY di Vercel (Settings > Environment Variables).
module.exports = handler(async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.ADMIN_KEY) {
    return res.status(500).json({ error: 'ADMIN_KEY belum diisi di Vercel' });
  }
  if (!isAdmin(req)) {
    await new Promise(r => setTimeout(r, 700)); // perlambat tebak-tebakan password
    return res.status(401).json({ error: 'Password salah' });
  }
  res.status(200).json({ ok: true });
});
