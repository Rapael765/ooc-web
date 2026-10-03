/* =====================================================
   OOC Circle - Notifikasi pembaruan + kunci admin
   - Tombol lonceng (kanan atas) -> riwayat pembaruan
   - Layar sambutan saat web dibuka kalau ada notifikasi baru
   - Tab "Notifikasi" di Tools (tambah/hapus, wajib password admin)
   - Password admin dicek server (ADMIN_KEY di Vercel) untuk:
     upload/hapus foto, tambah/hapus agenda, hapus buku tamu,
     tambah/hapus notifikasi
   Dimuat SETELAH script.js, tools.js, studio.js.
   ===================================================== */
(function () {
    if (typeof toast !== 'function' || typeof $ !== 'function') return;

    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'notify.css';
    document.head.appendChild(css);

    const KEY = 'ooc-admin';          // sama dengan script.js
    const SEEN = 'ooc-notif-seen';    // waktu notifikasi terakhir yang sudah dilihat
    const TAG_CLASS = { Pembaruan: 't-up', Info: 't-info', Acara: 't-ev', Penting: 't-hot' };
    const STICKER = { Pembaruan: 'PEMBARUAN BARU!', Info: 'INFO BARU!', Acara: 'ACARA BARU!', Penting: 'PENTING!' };

    const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const store = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }
    };
    const fmtDate = iso => {
        const d = new Date(iso);
        if (isNaN(d)) return '';
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
            ' · ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    /* =====================================================
       KUNCI ADMIN
       ===================================================== */
    let adminOk = false;
    let pwPending = null;
    let passNext = false;   // lewati penjaga satu kali saat klik diulang

    async function checkKey(k) {
        try {
            const res = await fetch('/api/auth', { method: 'POST', headers: { 'x-admin-key': k } });
            if (res.ok) return { ok: true };
            let d = null;
            try { d = await res.json(); } catch (e) { /* abaikan */ }
            return { ok: false, status: res.status, error: (d && d.error) || ('Terjadi kesalahan (' + res.status + ')') };
        } catch (e) {
            return { ok: false, status: 0, error: 'Tidak bisa terhubung ke server' };
        }
    }

    async function requireAdmin(why) {
        if (adminOk && sessionStorage.getItem(KEY)) return true;
        const saved = sessionStorage.getItem(KEY);
        if (saved) {
            const r = await checkKey(saved);
            if (r.ok) { adminOk = true; return true; }
            sessionStorage.removeItem(KEY);
        }
        return askPassword(why);
    }

    // Semua permintaan tulis (kecuali kirim pesan buku tamu & foto ke link) otomatis minta password.
    const needsAdmin = (path, method) => {
        const base = String(path).split('?')[0];
        if (method === 'GET') return false;
        if (base === 'guestbook' && method === 'POST') return false;
        if (base === 'upload') return false;
        return true;
    };

    // Gantikan api() dari script.js
    window.api = async function (path, { method = 'GET', body, admin = false } = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (admin || needsAdmin(path, method)) {
            if (!(await requireAdmin())) throw new Error('Dibatalkan');
            headers['x-admin-key'] = sessionStorage.getItem(KEY) || '';
        }
        const res = await fetch('/api/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
        let data = null;
        try { data = await res.json(); } catch (e) { /* abaikan */ }
        if (res.status === 401) { sessionStorage.removeItem(KEY); adminOk = false; }
        if (!res.ok) throw new Error((data && data.error) || 'Terjadi kesalahan (' + res.status + ')');
        return data;
    };

    /* =====================================================
       ANTARMUKA (disuntik lewat JS)
       ===================================================== */
    document.body.insertAdjacentHTML('beforeend', `
        <button class="card nf-bell" id="nfBell" type="button" aria-label="Riwayat notifikasi pembaruan">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17v-6a6 6 0 0 1 12 0v6l1.6 2H4.4z"/><path d="M10 21.5a2.2 2.2 0 0 0 4 0"/></svg>
            <span class="nf-dot" id="nfDot" hidden>0</span>
        </button>

        <div class="nf-wrap" id="nfHistory" aria-hidden="true">
            <div class="nf-sheet card" role="dialog" aria-modal="true" aria-labelledby="nfHTitle">
                <div class="nf-head">
                    <h3 id="nfHTitle">RIWAYAT PEMBARUAN</h3>
                    <button class="btn btn-sm nf-x" id="nfHClose" type="button" aria-label="Tutup">✕</button>
                </div>
                <div class="nf-list" id="nfList"></div>
            </div>
        </div>

        <div class="nf-splash" id="nfSplash" aria-hidden="true">
            <div class="nf-burst b1" aria-hidden="true"></div>
            <div class="nf-burst b2" aria-hidden="true"></div>
            <div class="nf-card card" id="nfSCard" role="dialog" aria-modal="true" aria-labelledby="nfSTitle">
                <span class="nf-sticker" id="nfSSticker"></span>
                <h2 id="nfSTitle"></h2>
                <p class="nf-msg" id="nfSMsg"></p>
                <div class="nf-sfoot"><span id="nfSDate"></span><span id="nfSCount"></span></div>
                <button class="btn btn-primary btn-block" id="nfSNext" type="button"></button>
                <button class="nf-skip" id="nfSSkip" type="button">Lewati semua</button>
            </div>
        </div>

        <div class="nf-pw" id="nfPw" aria-hidden="true">
            <form class="nf-pwbox card" id="nfPwForm" role="dialog" aria-modal="true" aria-labelledby="nfPwT">
                <div class="nf-lock" aria-hidden="true">🔐</div>
                <h3 id="nfPwT">MASUK ADMIN</h3>
                <p class="hint" id="nfPwWhy"></p>
                <div class="field">
                    <label for="nfPwIn">Password admin</label>
                    <input class="input" id="nfPwIn" type="password" autocomplete="off" required>
                </div>
                <label class="nf-show"><input type="checkbox" id="nfPwShow"> Tampilkan password</label>
                <p class="nf-err" id="nfPwErr" role="alert" hidden></p>
                <div class="btn-row">
                    <button class="btn" id="nfPwNo" type="button">BATAL</button>
                    <button class="btn btn-primary" id="nfPwGo" type="submit">MASUK</button>
                </div>
            </form>
        </div>`);

    const bell = $('#nfBell'), dot = $('#nfDot');
    const hist = $('#nfHistory'), splash = $('#nfSplash');
    const pw = $('#nfPw'), pwForm = $('#nfPwForm'), pwIn = $('#nfPwIn'), pwErr = $('#nfPwErr'), pwGo = $('#nfPwGo');

    /* =====================================================
       MODAL PASSWORD
       ===================================================== */
    let pwResolve = null;
    function askPassword(why) {
        if (pwPending) return pwPending;
        pwPending = new Promise(resolve => { pwResolve = resolve; });
        $('#nfPwWhy').textContent = why || 'Masukkan password admin untuk melanjutkan.';
        pwIn.value = '';
        pwIn.type = 'password';
        $('#nfPwShow').checked = false;
        pwErr.hidden = true;
        pw.classList.add('open');
        pw.setAttribute('aria-hidden', 'false');
        setTimeout(() => pwIn.focus(), 60);
        return pwPending;
    }
    function closePw(ok) {
        pw.classList.remove('open');
        pw.setAttribute('aria-hidden', 'true');
        const r = pwResolve;
        pwResolve = null;
        pwPending = null;
        if (r) r(ok);
    }
    pwForm.addEventListener('submit', async e => {
        e.preventDefault();
        const k = pwIn.value;
        if (!k) return;
        pwGo.disabled = true;
        pwGo.textContent = 'MEMERIKSA...';
        const r = await checkKey(k);
        pwGo.disabled = false;
        pwGo.textContent = 'MASUK';
        if (r.ok) {
            sessionStorage.setItem(KEY, k);
            adminOk = true;
            closePw(true);
            toast('Masuk sebagai admin ✨');
        } else {
            pwErr.textContent = r.status === 401 ? 'Password salah. Coba lagi.' : r.error;
            pwErr.hidden = false;
            const box = $('#nfPwForm');
            box.classList.remove('shake');
            void box.offsetWidth;
            box.classList.add('shake');
            pwIn.select();
        }
    });
    $('#nfPwNo').addEventListener('click', () => closePw(false));
    pw.addEventListener('click', e => { if (e.target === pw) closePw(false); });
    $('#nfPwShow').addEventListener('change', e => { pwIn.type = e.target.checked ? 'text' : 'password'; });

    // Penjaga: tombol buka form upload foto / tambah agenda wajib login dulu
    document.addEventListener('click', async e => {
        const b = e.target.closest && e.target.closest('#openPhotoForm, #openEventForm');
        if (!b) return;
        if (passNext) { passNext = false; return; }
        e.stopPropagation();
        e.preventDefault();
        const why = b.id === 'openPhotoForm' ? 'Upload foto hanya untuk admin.' : 'Menambah agenda hanya untuk admin.';
        if (await requireAdmin(why)) { passNext = true; b.click(); }
    }, true);

    /* =====================================================
       DATA NOTIFIKASI
       ===================================================== */
    let list = [];
    let loaded = false;
    let lastFetch = 0;
    const ts = n => new Date(n.created_at).getTime() || 0;
    const seenTs = () => parseInt(store.get(SEEN) || '0', 10) || 0;
    const unread = () => list.filter(n => ts(n) > seenTs());

    function updateDot() {
        const n = unread().length;
        dot.hidden = n === 0;
        dot.textContent = n > 9 ? '9+' : String(n);
        bell.classList.toggle('has-new', n > 0);
    }
    function markSeen() {
        const m = list.reduce((a, n) => Math.max(a, ts(n)), 0);
        if (m > seenTs()) store.set(SEEN, String(m));
        updateDot();
    }
    async function loadNotifs() {
        try {
            const rows = await api('notifications');
            list = Array.isArray(rows) ? rows : [];
            loaded = true;
            lastFetch = Date.now();
            updateDot();
            return true;
        } catch (e) {
            return false;
        }
    }

    /* =====================================================
       RIWAYAT
       ===================================================== */
    function renderHistory(seen, failed) {
        const box = $('#nfList');
        if (failed && !loaded) { box.innerHTML = '<p class="nf-empty">Gagal memuat notifikasi. Coba lagi nanti.</p>'; return; }
        if (!loaded) { box.innerHTML = '<p class="nf-empty">Memuat...</p>'; return; }
        if (!list.length) { box.innerHTML = '<p class="nf-empty">Belum ada pembaruan. Notifikasi baru akan muncul di sini.</p>'; return; }
        box.innerHTML = list.map(n => {
            const fresh = ts(n) > seen;
            return `<article class="nf-item${fresh ? ' fresh' : ''}">
                <div class="nf-meta"><span class="nf-tag ${TAG_CLASS[n.tag] || 't-up'}">${h(n.tag)}</span>${fresh ? '<span class="nf-new">BARU</span>' : ''}<time>${h(fmtDate(n.created_at))}</time></div>
                <h4>${h(n.title)}</h4>
                <p>${h(n.message)}</p>
            </article>`;
        }).join('');
    }
    function openHistory() {
        const seen = seenTs();
        renderHistory(seen, false);
        hist.classList.add('open');
        hist.setAttribute('aria-hidden', 'false');
        if (loaded) markSeen();
        if (!loaded || Date.now() - lastFetch > 30000) {
            loadNotifs().then(ok => {
                renderHistory(seen, !ok);
                if (ok && hist.classList.contains('open')) markSeen();
            });
        }
    }
    function closeHistory() {
        hist.classList.remove('open');
        hist.setAttribute('aria-hidden', 'true');
    }
    bell.addEventListener('click', openHistory);
    $('#nfHClose').addEventListener('click', closeHistory);
    hist.addEventListener('click', e => { if (e.target === hist) closeHistory(); });

    /* =====================================================
       LAYAR SAMBUTAN
       ===================================================== */
    let sq = [], si = 0, spPreview = false;
    const sNext = $('#nfSNext'), sSkip = $('#nfSSkip'), sCard = $('#nfSCard');

    function renderSplash() {
        const n = sq[si];
        $('#nfSSticker').textContent = '🔔 ' + (STICKER[n.tag] || STICKER.Pembaruan);
        $('#nfSTitle').textContent = n.title;
        $('#nfSMsg').textContent = n.message;
        $('#nfSDate').textContent = fmtDate(n.created_at);
        $('#nfSCount').textContent = sq.length > 1 ? (si + 1) + ' / ' + sq.length : '';
        const last = si >= sq.length - 1;
        sNext.textContent = !last ? 'BERIKUTNYA' : (spPreview ? 'TUTUP PRATINJAU' : 'MASUK KE WEB');
        sSkip.hidden = last;
        sCard.classList.remove('swap');
        void sCard.offsetWidth;
        sCard.classList.add('swap');
    }
    function showSplash(items, preview) {
        sq = items;
        si = 0;
        spPreview = !!preview;
        renderSplash();
        splash.classList.add('open');
        splash.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('nf-lock');
        setTimeout(() => sNext.focus(), 80);
    }
    function closeSplash() {
        splash.classList.remove('open');
        splash.setAttribute('aria-hidden', 'true');
        document.documentElement.classList.remove('nf-lock');
        if (!spPreview) markSeen();
    }
    sNext.addEventListener('click', () => { if (si < sq.length - 1) { si++; renderSplash(); } else closeSplash(); });
    sSkip.addEventListener('click', closeSplash);

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (pw.classList.contains('open')) closePw(false);
        else if (splash.classList.contains('open')) closeSplash();
        else if (hist.classList.contains('open')) closeHistory();
    });

    /* =====================================================
       TAB "NOTIFIKASI" DI TOOLS (admin)
       ===================================================== */
    const sec = $('#page-tools');
    const tabs = sec && $('.tool-tabs', sec);
    if (tabs) {
        tabs.insertAdjacentHTML('beforeend',
            '<button class="btn" type="button" data-tool="notif" role="tab" aria-selected="false">🔔 NOTIFIKASI</button>');

        sec.insertAdjacentHTML('beforeend', `
            <div class="tool-panel card nf-tool" id="tool-notif" hidden>
                <h3 class="nf-title">NOTIFIKASI PEMBARUAN</h3>
                <p class="hint">Notifikasi yang ditambah tampil sebagai layar sambutan saat web dibuka, dan masuk ke riwayat (lonceng).</p>

                <div class="field">
                    <label>Label</label>
                    <div class="nf-chips" id="nfChips" role="group" aria-label="Pilih label">
                        <button type="button" class="nf-chip on" data-tag="Pembaruan">Pembaruan</button>
                        <button type="button" class="nf-chip" data-tag="Info">Info</button>
                        <button type="button" class="nf-chip" data-tag="Acara">Acara</button>
                        <button type="button" class="nf-chip" data-tag="Penting">Penting</button>
                    </div>
                </div>
                <div class="field">
                    <label for="nfTitleIn">Judul</label>
                    <input class="input" id="nfTitleIn" type="text" maxlength="80" placeholder="Contoh: Fitur baru di Tools">
                </div>
                <div class="field">
                    <label for="nfMsgIn">Isi pesan</label>
                    <textarea class="input" id="nfMsgIn" maxlength="500" placeholder="Tulis ringkas apa yang baru..."></textarea>
                </div>
                <div class="btn-row">
                    <button class="btn" id="nfPreview" type="button">PRATINJAU</button>
                    <button class="btn btn-primary" id="nfAdd" type="button">TAMBAH</button>
                </div>

                <h4 class="nf-sub">DAFTAR NOTIFIKASI</h4>
                <div class="nf-alist" id="nfAList"></div>
                <button class="btn btn-sm nf-relock" id="nfRelock" type="button">🔒 KUNCI LAGI</button>
            </div>`);

        const panel = $('#tool-notif', sec);
        const tIn = $('#nfTitleIn', sec), mIn = $('#nfMsgIn', sec), addBtn = $('#nfAdd', sec);
        let tag = 'Pembaruan';

        // Penjaga: masuk tab ini wajib password (fase capture, sebelum handler tab lain)
        tabs.addEventListener('click', async e => {
            const b = e.target.closest('.btn');
            if (!b || b.dataset.tool !== 'notif') return;
            if (passNext) { passNext = false; return; }
            e.stopPropagation();
            e.preventDefault();
            if (await requireAdmin('Notifikasi hanya bisa diatur admin.')) { passNext = true; b.click(); }
        }, true);

        // Tampilkan / sembunyikan panel ini sesuai tab
        tabs.addEventListener('click', e => {
            const b = e.target.closest('.btn');
            if (!b) return;
            const t = b.dataset.tool;
            panel.hidden = t !== 'notif';
            $$('.btn', tabs).forEach(x => {
                const on = x === b;
                x.classList.toggle('on', on);
                x.setAttribute('aria-selected', on);
            });
            if (t === 'notif') { renderAdminList(); loadNotifs().then(renderAdminList); }
        });

        $('#nfChips', sec).addEventListener('click', e => {
            const c = e.target.closest('.nf-chip');
            if (!c) return;
            tag = c.dataset.tag;
            $$('.nf-chip', sec).forEach(x => x.classList.toggle('on', x === c));
        });

        $('#nfPreview', sec).addEventListener('click', () => {
            showSplash([{
                title: tIn.value.trim() || 'Judul notifikasi',
                message: mIn.value.trim() || 'Isi pesan akan tampil di sini.',
                tag,
                created_at: new Date().toISOString()
            }], true);
        });

        addBtn.addEventListener('click', async () => {
            const title = tIn.value.trim(), message = mIn.value.trim();
            if (!title || !message) return toast('Judul dan isi wajib diisi');
            addBtn.disabled = true;
            addBtn.textContent = 'MENGIRIM...';
            try {
                await api('notifications', { method: 'POST', body: { title, message, tag } });
                tIn.value = '';
                mIn.value = '';
                await loadNotifs();
                renderAdminList();
                toast('Notifikasi ditambahkan ✨');
            } catch (err) { toast(err.message); }
            addBtn.disabled = false;
            addBtn.textContent = 'TAMBAH';
        });

        function renderAdminList() {
            const box = $('#nfAList', sec);
            box.innerHTML = '';
            if (!loaded) { box.innerHTML = '<p class="nf-empty">Memuat...</p>'; return; }
            if (!list.length) { box.innerHTML = '<p class="nf-empty">Belum ada notifikasi.</p>'; return; }
            list.forEach(n => {
                const row = document.createElement('div');
                row.className = 'nf-arow';
                row.innerHTML = `<div class="nf-ainfo"><span class="nf-tag ${TAG_CLASS[n.tag] || 't-up'}">${h(n.tag)}</span><b>${h(n.title)}</b><small>${h(fmtDate(n.created_at))}</small></div>`;
                const rm = document.createElement('button');
                rm.type = 'button';
                rm.className = 'del';
                rm.setAttribute('aria-label', 'Hapus notifikasi ' + n.title);
                rm.innerHTML = typeof trashIcon === 'string' ? trashIcon : '🗑';
                rm.addEventListener('click', async () => {
                    const yes = typeof ask === 'function' ? await ask('Hapus notifikasi “' + n.title + '”?') : confirm('Hapus notifikasi ini?');
                    if (!yes) return;
                    try {
                        await api('notifications?id=' + encodeURIComponent(n.id), { method: 'DELETE', admin: true });
                        list = list.filter(x => x.id !== n.id);
                        updateDot();
                        renderAdminList();
                        toast('Notifikasi dihapus');
                    } catch (err) { toast(err.message); }
                });
                row.appendChild(rm);
                box.appendChild(row);
            });
        }

        $('#nfRelock', sec).addEventListener('click', () => {
            sessionStorage.removeItem(KEY);
            adminOk = false;
            const first = $('.btn[data-tool="calc"]', tabs);
            if (first) first.click();
            toast('Terkunci lagi 🔒');
        });
    }

    /* =====================================================
       MULAI
       ===================================================== */
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && Date.now() - lastFetch > 120000) loadNotifs();
    });

    (async function init() {
        if (!(await loadNotifs())) return;
        const fresh = unread().sort((a, b) => ts(b) - ts(a)).slice(0, 5);
        if (fresh.length) setTimeout(() => showSplash(fresh, false), 500);
    })();
})();
