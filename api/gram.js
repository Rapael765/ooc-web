const crypto = require('crypto');
const { sb, table, clean, handler, SB_URL } = require('./_lib');

// Backend OOCgram: akun, feed, story, catatan (bisa berlagu), video, dan chat pribadi.
// Memakai Supabase yang sudah terhubung (SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY).
// Tabel dibuat lewat SQL Editor di Supabase (lihat file oocgram.sql + SQL tambahan v3).
// (opsional) GRAM_SECRET = teks acak panjang untuk menandatangani sesi login.

const SECRET = process.env.GRAM_SECRET ||
  crypto.createHash('sha256').update('oocgram:' + (process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev')).digest('hex');
const BUCKET = 'oocgram';
const DAY = 24 * 3600 * 1000;
const TOKEN_TTL = 30 * DAY;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const enc = encodeURIComponent;
const USER_COLS = 'id,username,name,avatar,bio';
const VIDEO_TYPES = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };

const fail = (status, message) => { const e = new Error(message); e.status = status; return e; };
const pub = u => ({ id: u.id, username: u.username, name: u.name || u.username, avatar: u.avatar || '', bio: u.bio || '' });
const uuid = v => { v = String(v || ''); if (!UUID.test(v)) throw fail(400, 'ID tidak valid'); return v; };

/* ---------- Pembatas sederhana (per instance server) ---------- */
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (list.length >= max) { hits.set(key, list); return true; }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 8000) hits.clear();
  return false;
}

/* ---------- Password & sesi ---------- */
function hashPw(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, 32);
  return salt.toString('hex') + ':' + key.toString('hex');
}
function checkPw(pw, stored) {
  const [s, k] = String(stored || '').split(':');
  if (!s || !k) return false;
  const key = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 32);
  const want = Buffer.from(k, 'hex');
  return want.length === key.length && crypto.timingSafeEqual(key, want);
}
const b64 = s => Buffer.from(s).toString('base64url');
const mac = s => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
function sign(userId) {
  const p = b64(JSON.stringify({ u: userId, e: Date.now() + TOKEN_TTL }));
  return p + '.' + mac(p);
}
function verify(token) {
  const [p, sig] = String(token || '').split('.');
  if (!p || !sig) return null;
  const good = mac(p);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (!d || !UUID.test(d.u) || !(d.e > Date.now())) return null;
    return d;
  } catch (e) { return null; }
}

/* ---------- Gambar & video (Supabase Storage, bucket dibuat otomatis) ---------- */
let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  try {
    await sb('/storage/v1/bucket', {
      method: 'POST',
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) { /* bucket sudah ada */ }
  bucketReady = true;
}
async function saveImage(dataUrl, folder) {
  const s = String(dataUrl || '');
  const i = s.indexOf(',');
  const head = s.slice(0, i);
  const mime = (/^data:(image\/(?:jpeg|png|webp));base64$/.exec(head) || [])[1];
  if (!mime) throw fail(400, 'Format gambar tidak didukung (pakai JPG, PNG, atau WebP)');
  const buf = Buffer.from(s.slice(i + 1), 'base64');
  if (!buf.length) throw fail(400, 'Gambar kosong');
  if (buf.length > 1.6 * 1024 * 1024) throw fail(413, 'Gambar terlalu besar');
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const path = folder + '/' + Date.now() + '-' + crypto.randomBytes(5).toString('hex') + '.' + ext;
  await ensureBucket();
  await sb('/storage/v1/object/' + BUCKET + '/' + path, {
    method: 'POST', body: buf, headers: { 'Content-Type': mime, 'x-upsert': 'true' }
  });
  return SB_URL + '/storage/v1/object/public/' + BUCKET + '/' + path;
}
async function dropImage(url) {
  const k = '/object/public/' + BUCKET + '/';
  const i = String(url || '').indexOf(k);
  if (i < 0) return;
  try { await sb('/storage/v1/object/' + BUCKET + '/' + url.slice(i + k.length), { method: 'DELETE' }); } catch (e) { /* abaikan */ }
}
// Video diunggah langsung dari HP ke Supabase lewat tautan bertanda tangan
// (supaya tidak kena batas ukuran request Vercel). Di sini hanya alamatnya yang divalidasi.
function videoUrl(v, folder) {
  v = String(v || '');
  if (!v) return '';
  const pre = SB_URL + '/storage/v1/object/public/' + BUCKET + '/' + folder + '/';
  if (!v.startsWith(pre) || v.length > 300 || /[\s"'<>]/.test(v)) throw fail(400, 'Alamat video tidak valid');
  return v;
}
function cleanSong(s) {
  if (!s || typeof s !== 'object') return null;
  const ok = u => {
    try {
      const x = new URL(String(u));
      return x.protocol === 'https:' && /(^|\.)(mzstatic\.com|apple\.com)$/.test(x.hostname) && String(u).length < 400;
    } catch (e) { return false; }
  };
  if (!ok(s.url)) return null;
  const title = clean(String(s.title || ''), 80);
  if (!title) return null;
  return { title, artist: clean(String(s.artist || ''), 80), url: String(s.url), art: ok(s.art) ? String(s.art) : '' };
}

/* ---------- Pembantu data ---------- */
async function usersById(ids) {
  ids = [...new Set(ids.filter(Boolean))];
  if (!ids.length) return {};
  const rows = await table('gram_users', '?id=in.(' + ids.join(',') + ')&select=' + USER_COLS);
  const m = {};
  rows.forEach(u => { m[u.id] = pub(u); });
  return m;
}
async function enrichPosts(posts, me) {
  if (!posts.length) return [];
  const ids = posts.map(p => p.id).join(',');
  const [likes, comments, users] = await Promise.all([
    table('gram_likes', '?post_id=in.(' + ids + ')&select=post_id,user_id'),
    table('gram_comments', '?post_id=in.(' + ids + ')&select=post_id'),
    usersById(posts.map(p => p.user_id))
  ]);
  const lc = {}, mine = {}, cc = {};
  likes.forEach(l => { lc[l.post_id] = (lc[l.post_id] || 0) + 1; if (l.user_id === me.id) mine[l.post_id] = true; });
  comments.forEach(c => { cc[c.post_id] = (cc[c.post_id] || 0) + 1; });
  return posts.map(p => ({
    id: p.id, image: p.image, video: p.video || '', caption: p.caption || '', created_at: p.created_at,
    user: users[p.user_id] || { id: p.user_id, username: 'pengguna', name: 'Pengguna', avatar: '', bio: '' },
    likes: lc[p.id] || 0, liked: !!mine[p.id], comments: cc[p.id] || 0
  }));
}
async function followingIds(meId) {
  const rows = await table('gram_follows', '?follower_id=eq.' + meId + '&select=following_id&limit=1000');
  return rows.map(r => r.following_id);
}
async function followFlags(meId, ids) {
  ids = [...new Set(ids.filter(Boolean))];
  if (!ids.length) return new Set();
  const rows = await table('gram_follows', '?follower_id=eq.' + meId + '&following_id=in.(' + ids.join(',') + ')&select=following_id');
  return new Set(rows.map(r => r.following_id));
}
const countOf = async q => (await table('gram_follows', q + '&limit=1000')).length;
const since24 = () => enc(new Date(Date.now() - DAY).toISOString());
const noteOut = (r, user) => ({
  user, body: r.body || '', created_at: r.created_at, color: r.bubble_color || '',
  song: r.song_url ? { title: r.song_title || '', artist: r.song_artist || '', url: r.song_url, art: r.song_art || '' } : null
});

/* ---------- Aksi ---------- */
const open = {
  async register(b, _me, ip) {
    if (limited('reg:' + ip, 6, 3600 * 1000)) throw fail(429, 'Terlalu banyak pendaftaran. Coba lagi nanti.');
    const username = clean(b.username, 20).toLowerCase();
    if (!/^[a-z0-9_.]{3,20}$/.test(username)) throw fail(400, 'Username 3–20 karakter: huruf kecil, angka, titik, atau garis bawah');
    const password = String(b.password || '');
    if (password.length < 6 || password.length > 100) throw fail(400, 'Password minimal 6 karakter');
    const name = clean(b.name, 30) || username;
    const ex = await table('gram_users', '?username=eq.' + enc(username) + '&select=id');
    if (ex.length) throw fail(409, 'Username sudah dipakai');
    let rows;
    try {
      rows = await table('gram_users', '', { method: 'POST', json: { username, name, pass_hash: hashPw(password) } });
    } catch (e) {
      if (/duplicate|unique/i.test(e.message)) throw fail(409, 'Username sudah dipakai');
      throw e;
    }
    return { token: sign(rows[0].id), user: pub(rows[0]) };
  },
  async login(b, _me, ip) {
    if (limited('login:' + ip, 15, 10 * 60 * 1000)) throw fail(429, 'Terlalu banyak percobaan. Tunggu beberapa menit.');
    const username = clean(b.username, 20).toLowerCase();
    const rows = await table('gram_users', '?username=eq.' + enc(username) + '&select=' + USER_COLS + ',pass_hash');
    const u = rows[0];
    if (!u || !checkPw(String(b.password || ''), u.pass_hash)) {
      await new Promise(r => setTimeout(r, 600));
      throw fail(401, 'Username atau password salah');
    }
    return { token: sign(u.id), user: pub(u) };
  }
};

const authed = {
  async me(_b, me) { return { user: pub(me) }; },

  /* --- Unggah video (tautan bertanda tangan ke Supabase Storage) --- */
  async upload_url(b, me) {
    if (limited('up:' + me.id, 20, 3600 * 1000)) throw fail(429, 'Terlalu banyak unggahan. Coba lagi nanti.');
    const folder = b.folder === 'stories' ? 'stories' : 'posts';
    const mime = String(b.mime || '').split(';')[0].toLowerCase();
    const ext = VIDEO_TYPES[mime];
    if (!ext) throw fail(400, 'Format video tidak didukung (pakai MP4, MOV, atau WebM)');
    await ensureBucket();
    const path = folder + '/' + Date.now() + '-' + crypto.randomBytes(5).toString('hex') + '.' + ext;
    let r = await sb('/storage/v1/object/upload/sign/' + BUCKET + '/' + path, {
      method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' }
    });
    if (r && typeof r.json === 'function') r = await r.json();
    const u = r && (r.url || r.signedURL);
    if (!u) throw fail(500, 'Gagal membuat tautan unggah video');
    const full = /^https?:/i.test(u) ? u : SB_URL + '/storage/v1' + (u.charAt(0) === '/' ? u : '/' + u);
    return { upload_url: full, public_url: SB_URL + '/storage/v1/object/public/' + BUCKET + '/' + path };
  },

  /* --- Feed --- */
  async feed(b, me) {
    const d = b.before ? new Date(b.before) : null;
    const filter = d && !isNaN(d) ? '&created_at=lt.' + enc(d.toISOString()) : '';
    let who = '';
    if (b.scope === 'following') who = '&user_id=in.(' + [me.id].concat(await followingIds(me.id)).join(',') + ')';
    const posts = await table('gram_posts', '?select=id,user_id,image,video,caption,created_at&order=created_at.desc&limit=15' + filter + who);
    return { posts: await enrichPosts(posts, me) };
  },
  async post_create(b, me) {
    if (limited('post:' + me.id, 20, 3600 * 1000)) throw fail(429, 'Terlalu banyak posting. Coba lagi nanti.');
    const video = videoUrl(b.video, 'posts');
    const image = await saveImage(b.image, 'posts'); // untuk video: gambar sampul
    const row = { user_id: me.id, image, caption: clean(b.caption, 500) };
    if (video) row.video = video;
    const rows = await table('gram_posts', '', { method: 'POST', json: row });
    return { post: (await enrichPosts(rows, me))[0] };
  },
  async post_delete(b, me) {
    const id = uuid(b.id);
    const rows = await table('gram_posts', '?id=eq.' + id + '&user_id=eq.' + me.id + '&select=id,image,video');
    if (!rows.length) throw fail(404, 'Postingan tidak ditemukan');
    await table('gram_posts', '?id=eq.' + id, { method: 'DELETE' });
    await dropImage(rows[0].image);
    await dropImage(rows[0].video);
    return { ok: true };
  },
  async like(b, me) {
    const id = uuid(b.id);
    const ex = await table('gram_likes', '?post_id=eq.' + id + '&user_id=eq.' + me.id + '&select=post_id');
    if (ex.length) await table('gram_likes', '?post_id=eq.' + id + '&user_id=eq.' + me.id, { method: 'DELETE' });
    else await table('gram_likes', '', { method: 'POST', json: { post_id: id, user_id: me.id } });
    const all = await table('gram_likes', '?post_id=eq.' + id + '&select=user_id');
    return { liked: !ex.length, likes: all.length };
  },
  async comments(b, me) {
    const id = uuid(b.id);
    const rows = await table('gram_comments', '?post_id=eq.' + id + '&select=id,user_id,body,created_at&order=created_at.asc&limit=100');
    const users = await usersById(rows.map(r => r.user_id));
    return { comments: rows.map(r => ({ id: r.id, body: r.body, created_at: r.created_at, user: users[r.user_id] || pub({ id: r.user_id, username: 'pengguna' }) })) };
  },
  async comment_add(b, me) {
    const id = uuid(b.id);
    const body = clean(b.body, 300);
    if (!body) throw fail(400, 'Komentar kosong');
    if (limited('cmt:' + me.id, 30, 60 * 1000)) throw fail(429, 'Terlalu cepat. Tunggu sebentar.');
    const rows = await table('gram_comments', '', { method: 'POST', json: { post_id: id, user_id: me.id, body } });
    return { comment: { id: rows[0].id, body, created_at: rows[0].created_at, user: pub(me) } };
  },

  /* --- Story --- */
  async stories(b, me) {
    let who = '';
    if (b.scope === 'following') who = '&user_id=in.(' + [me.id].concat(await followingIds(me.id)).join(',') + ')';
    const rows = await table('gram_stories', '?created_at=gte.' + since24() + '&select=id,user_id,image,video,caption,created_at&order=created_at.asc&limit=300' + who);
    const users = await usersById(rows.map(r => r.user_id));
    const groups = {};
    rows.forEach(r => {
      (groups[r.user_id] = groups[r.user_id] || { user: users[r.user_id] || pub({ id: r.user_id, username: 'pengguna' }), items: [] })
        .items.push({ id: r.id, image: r.image, video: r.video || '', caption: r.caption || '', created_at: r.created_at });
    });
    const list = Object.values(groups).sort((a, b) =>
      new Date(b.items[b.items.length - 1].created_at) - new Date(a.items[a.items.length - 1].created_at));
    return { stories: list };
  },
  async story_add(b, me) {
    if (limited('story:' + me.id, 20, 3600 * 1000)) throw fail(429, 'Terlalu banyak story. Coba lagi nanti.');
    const video = videoUrl(b.video, 'stories');
    const image = await saveImage(b.image, 'stories');
    const row = { user_id: me.id, image, caption: clean(b.caption, 120) };
    if (video) row.video = video;
    const rows = await table('gram_stories', '', { method: 'POST', json: row });
    return { story: { id: rows[0].id, image, video, caption: rows[0].caption || '', created_at: rows[0].created_at } };
  },
  async story_delete(b, me) {
    const id = uuid(b.id);
    const rows = await table('gram_stories', '?id=eq.' + id + '&user_id=eq.' + me.id + '&select=id,image,video');
    if (!rows.length) throw fail(404, 'Story tidak ditemukan');
    await table('gram_stories', '?id=eq.' + id, { method: 'DELETE' });
    await dropImage(rows[0].image);
    await dropImage(rows[0].video);
    return { ok: true };
  },

  /* --- Catatan (teks singkat + lagu opsional, hilang setelah 24 jam) --- */
  async notes(_b, me) {
    const rows = await table('gram_notes', '?created_at=gte.' + since24() + '&select=user_id,body,created_at,song_title,song_artist,song_url,song_art,bubble_color&order=created_at.desc&limit=100');
    const users = await usersById(rows.map(r => r.user_id));
    return { notes: rows.filter(r => users[r.user_id]).map(r => noteOut(r, users[r.user_id])) };
  },
  async note_set(b, me) {
    const body = clean(b.body, 60);
    const song = cleanSong(b.song);
    const color = /^#[0-9a-f]{6}$/i.test(String(b.color || '')) ? String(b.color).toLowerCase() : null;
    if (!body && !song) throw fail(400, 'Catatan kosong');
    const row = {
      user_id: me.id, body: body || '', created_at: new Date().toISOString(),
      song_title: song ? song.title : null, song_artist: song ? song.artist : null,
      song_url: song ? song.url : null, song_art: song ? song.art : null,
      bubble_color: color
    };
    await sb('/rest/v1/gram_notes?on_conflict=user_id', {
      method: 'POST',
      body: JSON.stringify(row),
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' }
    });
    return { note: noteOut(row, pub(me)) };
  },
  async note_clear(_b, me) {
    await table('gram_notes', '?user_id=eq.' + me.id, { method: 'DELETE' });
    return { ok: true };
  },

  /* --- Pengguna & profil --- */
  async users(b, me) {
    const q = String(b.q || '').toLowerCase().replace(/[^a-z0-9_. ]/g, '').trim().slice(0, 20);
    const base = '&select=' + USER_COLS + '&limit=30&id=neq.' + me.id;
    const rows = q
      ? await table('gram_users', '?or=' + enc('(username.ilike.*' + q + '*,name.ilike.*' + q + '*)') + base)
      : await table('gram_users', '?order=created_at.desc' + base);
    const flags = await followFlags(me.id, rows.map(r => r.id));
    return { users: rows.map(r => Object.assign(pub(r), { following: flags.has(r.id) })) };
  },
  async profile(b, me) {
    const username = clean(b.username, 20).toLowerCase();
    const rows = await table('gram_users', '?username=eq.' + enc(username) + '&select=' + USER_COLS);
    if (!rows.length) throw fail(404, 'Pengguna tidak ditemukan');
    const u = rows[0];
    const posts = await table('gram_posts', '?user_id=eq.' + u.id + '&select=id,image,video,caption,created_at&order=created_at.desc&limit=60');
    posts.forEach(p => { p.video = p.video || ''; });
    const [followers, following, flags] = await Promise.all([
      countOf('?following_id=eq.' + u.id + '&select=follower_id'),
      countOf('?follower_id=eq.' + u.id + '&select=following_id'),
      followFlags(me.id, [u.id])
    ]);
    return { user: pub(u), posts, isMe: u.id === me.id, followers, following, isFollowing: flags.has(u.id) };
  },
  async follow(b, me) {
    const id = uuid(b.id);
    if (id === me.id) throw fail(400, 'Tidak bisa mengikuti diri sendiri');
    if (limited('fol:' + me.id, 60, 60 * 1000)) throw fail(429, 'Terlalu cepat. Tunggu sebentar.');
    const ex = await table('gram_users', '?id=eq.' + id + '&select=id');
    if (!ex.length) throw fail(404, 'Pengguna tidak ditemukan');
    const cur = await table('gram_follows', '?follower_id=eq.' + me.id + '&following_id=eq.' + id + '&select=follower_id');
    if (cur.length) await table('gram_follows', '?follower_id=eq.' + me.id + '&following_id=eq.' + id, { method: 'DELETE' });
    else await table('gram_follows', '', { method: 'POST', json: { follower_id: me.id, following_id: id } });
    return { following: !cur.length, followers: await countOf('?following_id=eq.' + id + '&select=follower_id') };
  },
  async follow_list(b, me) {
    const username = clean(b.username, 20).toLowerCase();
    const rows = await table('gram_users', '?username=eq.' + enc(username) + '&select=id');
    if (!rows.length) throw fail(404, 'Pengguna tidak ditemukan');
    const target = rows[0].id;
    const followers = b.type !== 'following';
    const links = await table('gram_follows',
      '?' + (followers ? 'following_id' : 'follower_id') + '=eq.' + target +
      '&select=follower_id,following_id,created_at&order=created_at.desc&limit=100');
    const ids = links.map(l => followers ? l.follower_id : l.following_id);
    const [users, flags] = await Promise.all([usersById(ids), followFlags(me.id, ids)]);
    return { users: ids.filter(i => users[i]).map(i => Object.assign({}, users[i], { following: flags.has(i) })) };
  },
  async profile_update(b, me) {
    const patch = { name: clean(b.name, 30) || me.username, bio: clean(b.bio, 150) };
    if (b.avatar) patch.avatar = await saveImage(b.avatar, 'avatars');
    const rows = await table('gram_users', '?id=eq.' + me.id, { method: 'PATCH', json: patch });
    return { user: pub(rows[0]) };
  },

  /* --- Chat pribadi --- */
  async chats(_b, me) {
    const rows = await table('gram_messages',
      '?or=' + enc('(from_id.eq.' + me.id + ',to_id.eq.' + me.id + ')') +
      '&select=id,from_id,to_id,body,is_read,created_at&order=id.desc&limit=400');
    const convo = {};
    rows.forEach(m => {
      const other = m.from_id === me.id ? m.to_id : m.from_id;
      const c = convo[other] = convo[other] || { other, last: m, unread: 0, replied: false };
      if (m.to_id === me.id && !m.is_read) c.unread++;
      if (m.from_id === me.id) c.replied = true;
    });
    const ids = Object.keys(convo);
    const [users, flags] = await Promise.all([usersById(ids), followFlags(me.id, ids)]);
    const list = Object.values(convo).filter(c => users[c.other]).map(c => ({
      user: users[c.other],
      last: { id: c.last.id, body: c.last.body, mine: c.last.from_id === me.id, created_at: c.last.created_at },
      unread: c.unread,
      following: flags.has(c.other),
      replied: c.replied
    }));
    return { chats: list };
  },
  async messages(b, me) {
    const other = uuid(b.with);
    const after = Math.max(0, parseInt(b.after, 10) || 0);
    const pair = enc('(and(from_id.eq.' + me.id + ',to_id.eq.' + other + '),and(from_id.eq.' + other + ',to_id.eq.' + me.id + '))');
    const sel = '&select=id,from_id,to_id,body,is_read,created_at';
    let rows;
    if (after > 0) rows = await table('gram_messages', '?or=' + pair + '&id=gt.' + after + sel + '&order=id.asc&limit=200');
    else rows = (await table('gram_messages', '?or=' + pair + sel + '&order=id.desc&limit=80')).reverse();
    if (rows.some(m => m.to_id === me.id && !m.is_read)) {
      try { await table('gram_messages', '?to_id=eq.' + me.id + '&from_id=eq.' + other + '&is_read=eq.false', { method: 'PATCH', json: { is_read: true } }); } catch (e) { /* abaikan */ }
    }
    return { messages: rows.map(m => ({ id: m.id, body: m.body, mine: m.from_id === me.id, created_at: m.created_at })) };
  },
  async message_send(b, me) {
    const to = uuid(b.to);
    const body = clean(b.body, 1000);
    if (!body) throw fail(400, 'Pesan kosong');
    if (to === me.id) throw fail(400, 'Tidak bisa mengirim pesan ke diri sendiri');
    if (limited('msg:' + me.id, 40, 60 * 1000)) throw fail(429, 'Terlalu cepat. Tunggu sebentar.');
    const ex = await table('gram_users', '?id=eq.' + to + '&select=id');
    if (!ex.length) throw fail(404, 'Pengguna tidak ditemukan');
    const rows = await table('gram_messages', '', { method: 'POST', json: { from_id: me.id, to_id: to, body } });
    return { message: { id: rows[0].id, body, mine: true, created_at: rows[0].created_at } };
  },
  async unread(_b, me) {
    const rows = await table('gram_messages', '?to_id=eq.' + me.id + '&is_read=eq.false&select=id&limit=100');
    return { unread: rows.length };
  }
};

module.exports = handler(async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const b = req.body || {};
    const action = String(b.action || '');
    const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'x').split(',')[0].trim();

    if (open[action]) return res.status(200).json(await open[action](b, null, ip));
    if (!authed[action]) return res.status(400).json({ error: 'Aksi tidak dikenal' });

    const t = verify(req.headers['x-gram-token']);
    const rows = t ? await table('gram_users', '?id=eq.' + t.u + '&select=' + USER_COLS) : [];
    if (!rows.length) return res.status(401).json({ error: 'Sesi berakhir. Silakan masuk lagi.' });

    res.status(200).json(await authed[action](b, rows[0], ip));
  } catch (e) {
    if (e && e.status) return res.status(e.status).json({ error: e.message });
    if (/gram_\w+/.test(String(e && e.message)) && /(relation|table|schema cache|does not exist|Could not find)/i.test(e.message)) {
      return res.status(500).json({ error: 'Tabel OOCgram belum lengkap di Supabase. Jalankan SQL tambahan v3 di SQL Editor.' });
    }
    if (/(video|song_|bubble_)/.test(String(e && e.message)) && /(column|schema cache)/i.test(e.message)) {
      return res.status(500).json({ error: 'Kolom video/lagu belum ada di Supabase. Jalankan SQL tambahan v3 di SQL Editor.' });
    }
    throw e;
  }
});
