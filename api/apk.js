const crypto = require('crypto');
const { handler, clean } = require('./_lib');

const REPO = (process.env.GITHUB_REPO || '').trim();
const TOKEN = (process.env.GITHUB_TOKEN || '').trim();
const BRANCH = (process.env.GITHUB_BRANCH || 'main').trim();
const DAILY_LIMIT = parseInt(process.env.APK_DAILY_LIMIT || '20', 10);
const MAX_ACTIVE = 3;
const WORKFLOW = 'build-apk.yml';

async function gh(path, opts = {}) {
  if (!TOKEN || !REPO) throw new Error('GITHUB_TOKEN / GITHUB_REPO belum diisi di Vercel');
  return fetch('https://api.github.com' + path, {
    ...opts,
    headers: {
      Authorization: 'Bearer ' + TOKEN,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ooc-web-apk',
      ...(opts.headers || {})
    }
  });
}

async function ghJson(path, opts) {
  const r = await gh(path, opts);
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (!r.ok && r.status !== 404) {
    throw new Error('GitHub: ' + ((data && data.message) || r.statusText));
  }
  return { status: r.status, data };
}

async function listRuns() {
  const r = await ghJson(`/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=50`);
  return (r.data && r.data.workflow_runs) || [];
}

async function start(req, res) {
  const b = req.body || {};
  const name = clean(b.name, 30).replace(/[\r\n]+/g, ' ');
  if (!name) return res.status(400).json({ error: 'Nama aplikasi wajib diisi' });

  let url;
  try {
    const u = new URL(clean(b.url, 500));
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('x');
    url = u.href;
  } catch (e) {
    return res.status(400).json({ error: 'Link website tidak valid (harus diawali http:// atau https://)' });
  }

  let icon;
  try {
    const u = new URL(clean(b.icon, 600));
    if (u.protocol !== 'https:') throw new Error('x');
    icon = u.href;
  } catch (e) {
    return res.status(400).json({ error: 'Link ikon tidak valid' });
  }

  const runs = await listRuns();
  const active = runs.filter(r => r.status !== 'completed').length;
  if (active >= MAX_ACTIVE) {
    return res.status(429).json({ error: 'Antrean penuh, coba lagi beberapa menit lagi' });
  }
  const since = Date.now() - 24 * 3600 * 1000;
  const today = runs.filter(r => Date.parse(r.created_at) > since).length;
  if (today >= DAILY_LIMIT) {
    return res.status(429).json({ error: 'Batas pembuatan APK hari ini sudah tercapai' });
  }

  const id = crypto.randomBytes(8).toString('hex').slice(0, 10);
  const r = await gh(`/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ref: BRANCH,
      inputs: { job_id: id, app_name: name, site_url: url, icon_url: icon }
    })
  });
  if (r.status !== 204) {
    let msg = r.statusText;
    try { const d = await r.json(); if (d && d.message) msg = d.message; } catch (e) {}
    throw new Error('GitHub: ' + msg + ' (cek token, nama repo, dan file workflow)');
  }
  res.status(200).json({ id });
}

async function status(req, res) {
  const id = String(req.query.id || '');
  if (!/^[a-z0-9]{6,20}$/.test(id)) return res.status(400).json({ error: 'ID tidak valid' });
  const wantsFile = !!req.query.download;

  const rel = await ghJson(`/repos/${REPO}/releases/tags/apk-${id}`);
  const asset = rel.status === 200 && rel.data && rel.data.assets && rel.data.assets[0];

  if (asset) {
    if (!wantsFile) return res.status(200).json({ status: 'done', file: asset.name, size: asset.size });
    const dl = await gh(`/repos/${REPO}/releases/assets/${asset.id}`, {
      headers: { Accept: 'application/octet-stream' },
      redirect: 'follow'
    });
    if (!dl.ok) throw new Error('Gagal mengambil file APK dari GitHub');
    const buf = Buffer.from(await dl.arrayBuffer());
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="' + asset.name.replace(/[^\w.-]/g, '_') + '"');
    res.setHeader('Content-Length', buf.length);
    return res.status(200).end(buf);
  }

  if (wantsFile) return res.status(404).json({ error: 'APK belum siap' });

  const runs = await listRuns();
  const run = runs.find(r => String(r.display_title || r.name || '').includes(id));
  if (!run) return res.status(200).json({ status: 'queued' });
  if (run.status === 'completed') {
    if (run.conclusion === 'success') return res.status(200).json({ status: 'finishing' });
    return res.status(200).json({ status: 'failed', logs: run.html_url });
  }
  res.status(200).json({ status: run.status === 'in_progress' ? 'building' : 'queued' });
}

module.exports = handler(async (req, res) => {
  if (req.method === 'POST') return start(req, res);
  if (req.method === 'GET') return status(req, res);
  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed' });
});
