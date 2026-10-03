/* =====================================================
   OOC Circle - script utama
   Foto, agenda, dan buku tamu disimpan di Supabase lewat /api/*
   sehingga semua pengunjung melihat data yang sama.
   ===================================================== */

// Ganti ig & tiktok dengan username asli (tanpa @). Bio juga bisa diedit.
const members = [
    { name: "Daffa",   role: "Anggota", ig: "_dvaalfztok", tiktok: "__dvaaa",   bio: "Anggota OOC." },
    { name: "Khalila", role: "Anggota", ig: "brfly_khlila", tiktok: "khalilaaaavv", bio: "Anggota OOC." },
    { name: "Rapael",  role: "Anggota", ig: "faellxzz66",  tiktok: "zett609",  bio: "Anggota OOC." },
    { name: "Mila",    role: "Anggota", ig: "mila_fadhlh",    tiktok: "auraaaaaa22.12",    bio: "Anggota OOC." },
    { name: "Anisa",   role: "Anggota", ig: "annisaaramadhanii_",   tiktok: "nis_lovematchaa",   bio: "Anggota OOC." },
    { name: "Ari",     role: "Anggota", ig: "ari_siregar22",     tiktok: "tidak_ditemukan",     bio: "Anggota OOC." },
    { name: "Daitka",  role: "Anggota", ig: "daitka_itink",  tiktok: "tidak_ditemukan",  bio: "Anggota OOC." },
    { name: "Khisa",   role: "Anggota", ig: "tidak_ditemukan",  tiktok: "tidak_ditemukan",  bio: "Anggota OOC." },
    { name: "Aurora",  role: "Anggota", ig: "tidak_ditemukan",  tiktok: "tidak_ditemukan",  bio: "Anggota OOC." }
];

/* =====================================================
   UTIL
   ===================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const colors = ["#2e7bff", "#ff8a3d", "#22b8a6", "#e0559a", "#7a5cff", "#27a844", "#e6a700"];
const igIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zM17.2 6a1.1 1.1 0 1 1-1.1 1.1A1.1 1.1 0 0 1 17.2 6z"/></svg>';
const ttIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.6 2h-3.1v13.2a2.8 2.8 0 1 1-2-2.7V9.4a6 6 0 1 0 5.1 5.9V8.6a7.4 7.4 0 0 0 4.3 1.4V6.9a4.3 4.3 0 0 1-4.3-4.9z"/></svg>';
const trashIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';

const toastEl = $('#toast');
let toastTimer;
function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

/* ---------- API ---------- */
// Kunci admin hanya diminta saat HAPUS, disimpan sementara di tab ini.
function adminKey(forcePrompt) {
    let k = sessionStorage.getItem('ooc-admin');
    if (!k || forcePrompt) {
        k = prompt('Masukkan kunci admin untuk menghapus:') || '';
        if (k) sessionStorage.setItem('ooc-admin', k);
    }
    return k;
}

async function api(path, { method = 'GET', body, admin = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (admin) {
        const k = adminKey();
        if (!k) throw new Error('Dibatalkan');
        headers['x-admin-key'] = k;
    }
    const res = await fetch('/api/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401) sessionStorage.removeItem('ooc-admin');
    if (!res.ok) throw new Error((data && data.error) || 'Terjadi kesalahan (' + res.status + ')');
    return data;
}

/* ---------- Modal ---------- */
let confirmResolve = null;
function openOv(id) {
    const el = $('#' + id);
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
}
function closeAll() {
    $$('.overlay').forEach(o => { o.classList.remove('open'); o.setAttribute('aria-hidden', 'true'); });
    if (confirmResolve) { const r = confirmResolve; confirmResolve = null; r(false); }
}
$$('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) closeAll(); }));
$$('[data-close]').forEach(b => b.addEventListener('click', closeAll));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

function ask(msg) {
    $('#cMsg').textContent = msg;
    openOv('confirmModal');
    return new Promise(res => { confirmResolve = res; });
}
$('#cYes').addEventListener('click', () => {
    const r = confirmResolve; confirmResolve = null;
    closeAll();
    if (r) r(true);
});
$('#cNo').addEventListener('click', closeAll);

/* =====================================================
   NAVIGASI ANTAR HALAMAN
   ===================================================== */
const pages = ['home', 'about', 'members', 'gallery', 'agenda', 'guestbook'];

function showPage(name) {
    if (!pages.includes(name)) name = 'home';
    $$('.page').forEach(p => p.classList.remove('active'));
    $('#page-' + name).classList.add('active');
    $$('.dock a').forEach(a => a.classList.toggle('active', a.dataset.page === name));
    moveIndicator();
    window.scrollTo(0, 0);
    if (name === 'about') runCounters();
    // Ambil data terbaru dari server setiap buka halaman
    if (name === 'gallery') loadPhotos();
    if (name === 'agenda') loadEvents();
    if (name === 'guestbook') loadGuests();
}
function moveIndicator() {
    const active = $('.dock a.active');
    const ind = $('#dockIndicator');
    if (!active) return;
    ind.style.width = active.offsetWidth + 'px';
    ind.style.transform = `translateX(${active.offsetLeft}px)`;
}
window.addEventListener('resize', moveIndicator);
window.addEventListener('load', moveIndicator);

$$('[data-page]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    history.pushState(null, '', '#' + el.dataset.page);
    showPage(el.dataset.page);
}));
window.addEventListener('popstate', () => showPage(location.hash.slice(1)));

/* =====================================================
   EFEK MENGETIK
   ===================================================== */
const words = ["OOC", "ASIK", "SOLID", "PLENGER"];
const typingEl = $('#typing');
let wi = 0, ci = 0, del = false;
(function typeLoop() {
    const w = words[wi];
    ci += del ? -1 : 1;
    typingEl.textContent = w.slice(0, ci);
    let delay = del ? 90 : 150;
    if (!del && ci === w.length) { del = true; delay = 1800; }
    else if (del && ci === 0) { del = false; wi = (wi + 1) % words.length; delay = 400; }
    setTimeout(typeLoop, delay);
})();

/* =====================================================
   ANGGOTA
   ===================================================== */
const socialButtons = m =>
    `<a class="btn btn-sm ig" href="https://www.instagram.com/${encodeURIComponent(m.ig)}" target="_blank" rel="noopener" aria-label="Instagram ${esc(m.name)}">${igIcon} IG</a>` +
    `<a class="btn btn-sm tt" href="https://www.tiktok.com/@${encodeURIComponent(m.tiktok)}" target="_blank" rel="noopener" aria-label="TikTok ${esc(m.name)}">${ttIcon} TikTok</a>`;

const grid = $('#membersGrid');
let current = null;

function renderMembers(filter = '') {
    const q = filter.trim().toLowerCase();
    const list = members.map((m, i) => ({ m, i })).filter(({ m }) => m.name.toLowerCase().includes(q));
    grid.innerHTML = '';
    if (!list.length) { grid.innerHTML = '<p class="empty">Anggota tidak ditemukan.</p>'; return; }
    list.forEach(({ m, i }) => {
        const card = document.createElement('div');
        card.className = 'member card';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', 'Lihat profil ' + m.name);
        card.innerHTML = `
            <div class="avatar" style="background:${colors[i % colors.length]}">${esc(m.name[0])}</div>
            <h4>${esc(m.name)}</h4>
            <span class="role">${esc(m.role)}</span>
            <div class="social-row">${socialButtons(m)}</div>`;
        card.addEventListener('click', e => { if (!e.target.closest('a')) openMember(i); });
        card.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target === card) openMember(i); });
        grid.appendChild(card);
    });
}
function openMember(i) {
    const m = members[i];
    current = m;
    $('#mAvatar').style.background = colors[i % colors.length];
    $('#mAvatar').textContent = m.name[0];
    $('#mName').textContent = m.name;
    $('#mRole').textContent = m.role;
    $('#mBio').textContent = m.bio;
    $('#mSocial').innerHTML = socialButtons(m);
    openOv('memberModal');
}
$('#mCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('@' + current.ig); toast('Username IG disalin: @' + current.ig); }
    catch (e) { toast('Gagal menyalin username'); }
});
$('#searchMember').addEventListener('input', e => renderMembers(e.target.value));
renderMembers();

/* =====================================================
   GALERI
   ===================================================== */
let photos = [];

function renderGallery(msg) {
    const g = $('#galleryGrid');
    g.innerHTML = '';
    if (msg) { g.innerHTML = `<p class="empty">${esc(msg)}</p>`; return; }
    if (!photos.length) {
        g.innerHTML = '<p class="empty">Belum ada foto. Klik “UPLOAD FOTO” untuk menambah.</p>';
        return;
    }
    photos.forEach(p => {
        const d = document.createElement('div');
        d.className = 'shot card';

        const open = document.createElement('button');
        open.type = 'button';
        open.className = 'shot-open';
        const img = new Image();
        img.src = p.url;
        img.alt = p.cap;
        img.loading = 'lazy';
        const cap = document.createElement('span');
        cap.textContent = p.cap;
        open.append(img, cap);
        open.addEventListener('click', () => {
            $('#lbImg').src = p.url;
            $('#lbImg').alt = p.cap;
            openOv('lightbox');
        });

        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'del';
        rm.setAttribute('aria-label', 'Hapus foto ' + p.cap);
        rm.innerHTML = trashIcon;
        rm.addEventListener('click', async () => {
            if (!(await ask('Hapus foto “' + p.cap + '”?'))) return;
            try {
                await api('photos?id=' + encodeURIComponent(p.id), { method: 'DELETE', admin: true });
                photos = photos.filter(x => x.id !== p.id);
                renderGallery();
                toast('Foto dihapus');
            } catch (err) { toast(err.message); }
        });

        d.append(open, rm);
        g.appendChild(d);
    });
}

async function loadPhotos() {
    if (!photos.length) renderGallery('Memuat foto...');
    try { photos = await api('photos'); renderGallery(); }
    catch (err) { renderGallery('Gagal memuat foto: ' + err.message); }
}

// Kecilkan foto sebelum diupload (hemat kuota & storage)
function compress(file) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) return reject(new Error('bukan gambar'));
        const fr = new FileReader();
        fr.onerror = reject;
        fr.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const max = 1000;
                const r = Math.min(1, max / Math.max(img.width, img.height));
                const w = Math.round(img.width * r), h = Math.round(img.height * r);
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(c.toDataURL('image/jpeg', 0.72));
            };
            img.src = fr.result;
        };
        fr.readAsDataURL(file);
    });
}

$('#openPhotoForm').addEventListener('click', () => { $('#photoForm').reset(); $('#photoInfo').textContent = 'Foto otomatis dikecilkan supaya hemat penyimpanan.'; openOv('photoModal'); });
$('#photoFile').addEventListener('change', e => {
    const n = e.target.files.length;
    if (n) $('#photoInfo').textContent = n + ' foto dipilih.';
});

$('#photoForm').addEventListener('submit', async e => {
    e.preventDefault();
    const files = [...$('#photoFile').files];
    if (!files.length) return toast('Pilih foto dulu ya');
    const base = $('#photoCap').value.trim() || 'Momen OOC';
    const btn = $('#photoSave');
    btn.disabled = true;

    let ok = 0, failed = 0;
    for (let i = 0; i < files.length; i++) {
        btn.textContent = `MENGUNGGAH ${i + 1}/${files.length}`;
        try {
            const data = await compress(files[i]);
            const cap = files.length > 1 ? `${base} ${i + 1}` : base;
            await api('photos', { method: 'POST', body: { cap, data } });
            ok++;
        } catch (err) { failed++; }
    }

    btn.disabled = false;
    btn.textContent = 'SIMPAN';

    if (!ok) return toast('Upload gagal. Coba lagi atau pakai foto JPG/PNG.');
    closeAll();
    await loadPhotos();
    toast(ok + ' foto ditambahkan' + (failed ? ` (${failed} gagal)` : ''));
});

/* =====================================================
   AGENDA
   ===================================================== */
let events = [];
let eventsLoaded = false;
const bulan = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

const sortedEvents = () => events
    .filter(ev => !isNaN(new Date(ev.event_date)))
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

function renderEvents(msg) {
    const box = $('#agendaList');
    box.innerHTML = '';
    if (msg) { box.innerHTML = `<p class="empty">${esc(msg)}</p>`; return; }
    const list = sortedEvents();
    if (!list.length) {
        box.innerHTML = '<p class="empty">Belum ada agenda. Klik “TAMBAH AGENDA”.</p>';
    }
    list.forEach(ev => {
        const d = new Date(ev.event_date);
        const done = d < new Date();
        const el = document.createElement('div');
        el.className = 'event card' + (done ? ' done' : '');
        const tgl = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        el.innerHTML = `
            <div class="date">${d.getDate()}<small>${bulan[d.getMonth()]}</small></div>
            <div class="info">
                <h4>${esc(ev.title)}</h4>
                <p>${esc(tgl)} · ${esc(jam)}</p>
                <p>📍 ${esc(ev.place || 'Tempat belum ditentukan')}${done ? ' · Selesai' : ''}</p>
            </div>`;
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'del';
        rm.setAttribute('aria-label', 'Hapus agenda ' + ev.title);
        rm.innerHTML = trashIcon;
        rm.addEventListener('click', async () => {
            if (!(await ask('Hapus agenda “' + ev.title + '”?'))) return;
            try {
                await api('events?id=' + encodeURIComponent(ev.id), { method: 'DELETE', admin: true });
                events = events.filter(x => x.id !== ev.id);
                renderEvents();
                tick();
                toast('Agenda dihapus');
            } catch (err) { toast(err.message); }
        });
        el.appendChild(rm);
        box.appendChild(el);
    });
}

async function loadEvents() {
    if (!eventsLoaded) renderEvents('Memuat agenda...');
    try {
        events = await api('events');
        eventsLoaded = true;
        renderEvents();
        tick();
    } catch (err) { renderEvents('Gagal memuat agenda: ' + err.message); }
}

function tick() {
    const next = sortedEvents().find(ev => new Date(ev.event_date) > new Date());
    if (!next) {
        $('#nextTitle').textContent = eventsLoaded ? 'Belum ada agenda berikutnya' : 'Memuat...';
        $('#timer').style.display = 'none';
        return;
    }
    $('#timer').style.display = 'flex';
    $('#nextTitle').textContent = next.title;
    let s = Math.max(0, Math.floor((new Date(next.event_date) - Date.now()) / 1000));
    $('#cdD').textContent = Math.floor(s / 86400); s %= 86400;
    $('#cdH').textContent = String(Math.floor(s / 3600)).padStart(2, '0'); s %= 3600;
    $('#cdM').textContent = String(Math.floor(s / 60)).padStart(2, '0');
    $('#cdS').textContent = String(s % 60).padStart(2, '0');
}

$('#openEventForm').addEventListener('click', () => { $('#eventForm').reset(); openOv('eventModal'); });
$('#eventForm').addEventListener('submit', async e => {
    e.preventDefault();
    const title = $('#evTitle').value.trim();
    const event_date = $('#evDate').value;
    const place = $('#evPlace').value.trim();
    if (!title || !event_date) return;
    try {
        await api('events', { method: 'POST', body: { title, event_date, place } });
        closeAll();
        await loadEvents();
        toast('Agenda ditambahkan ✨');
    } catch (err) { toast(err.message); }
});
tick();
setInterval(tick, 1000);
loadEvents(); // supaya hitung mundur di halaman agenda langsung siap

/* =====================================================
   ANGKA STATISTIK BERJALAN
   ===================================================== */
function runCounters() {
    $$('[data-count]').forEach(el => {
        const target = +el.dataset.count, suffix = el.dataset.suffix || '', pad = +el.dataset.pad || 0;
        const t0 = performance.now(), dur = 1100;
        (function step(t) {
            const p = Math.min((t - t0) / dur, 1);
            const v = Math.round(target * (1 - Math.pow(1 - p, 3)));
            el.textContent = String(v).padStart(pad, '0') + suffix;
            if (p < 1) requestAnimationFrame(step);
        })(t0);
    });
}

/* =====================================================
   BUKU TAMU
   ===================================================== */
let emoji = '😊';
$('#emojiPick').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    emoji = b.dataset.e;
    $$('#emojiPick button').forEach(x => x.classList.toggle('on', x === b));
});

let guests = [];

function renderGuests(msg) {
    const box = $('#guestList');
    box.innerHTML = '';
    if (msg) { box.innerHTML = `<p class="empty">${esc(msg)}</p>`; return; }
    guests.forEach(g => {
        const d = document.createElement('div');
        d.className = 'guest card';
        d.innerHTML = `<div class="em">${esc(g.emoji)}</div><div class="body"><strong>${esc(g.name)}</strong><p>${esc(g.message)}</p></div>`;
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'del';
        rm.setAttribute('aria-label', 'Hapus pesan dari ' + g.name);
        rm.innerHTML = trashIcon;
        rm.addEventListener('click', async () => {
            if (!(await ask('Hapus pesan dari ' + g.name + '?'))) return;
            try {
                await api('guestbook?id=' + encodeURIComponent(g.id), { method: 'DELETE', admin: true });
                guests = guests.filter(x => x.id !== g.id);
                renderGuests();
                toast('Pesan dihapus');
            } catch (err) { toast(err.message); }
        });
        d.appendChild(rm);
        box.appendChild(d);
    });
}

async function loadGuests() {
    if (!guests.length) renderGuests('Memuat pesan...');
    try { guests = await api('guestbook'); renderGuests(); }
    catch (err) { renderGuests('Gagal memuat pesan: ' + err.message); }
}

$('#commentForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#visitorName').value.trim();
    const message = $('#visitorMsg').value.trim();
    if (!name || !message) return;
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    try {
        await api('guestbook', { method: 'POST', body: { name, message, emoji } });
        e.target.reset();
        await loadGuests();
        toast('Pesan terkirim, makasih! ✨');
    } catch (err) { toast(err.message); }
    btn.disabled = false;
});

showPage(location.hash.slice(1) || 'home');

/* =====================================================
   INTRO PINTU
   ===================================================== */
(function () {
    const intro = $('#intro');
    document.body.classList.add('intro-lock');
    function enter() {
        if (intro.classList.contains('open')) return;
        intro.classList.add('open');
        setTimeout(() => {
            intro.remove();
            document.body.classList.remove('intro-lock');
        }, 1200);
    }
    intro.addEventListener('click', enter);
    intro.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target === intro || e.key === ' ') enter();
    });
})();
