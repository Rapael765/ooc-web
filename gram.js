/* =====================================================
   OOCgram - aplikasi mirip Instagram (layar penuh)
   Beranda + Story, Catatan, Kamera, Pesan pribadi, Profil.
   Wajib masuk / daftar akun dulu. Data lewat /api/gram (Supabase).
   Dimuat SEBELUM tools.js. tools.js memanggil OOCGram.mount(wadah).
   ===================================================== */
(function () {
    'use strict';
    if (window.OOCGram) return;

    const VERSION = 'v2.2';
    const TOKEN_KEY = 'oocgram-token';
    const SEEN_KEY = 'oocgram-seen';
    const store = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } },
        del(k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
    };

    let token = store.get(TOKEN_KEY) || '';
    let me = null;
    let root, authEl, appEl, view, layer, navEl, toastEl, badgeEl;
    let authReset = () => {};
    let tab = 'home';
    let cssLink = null, cssDone = null;
    let screens = [];
    const timers = {};
    const cam = { stream: null, facing: 'environment', ui: null };
    const feed = { posts: [], more: false, loading: false };
    let storyGroups = [];
    let scope = store.get('oocgram-scope') === 'following' ? 'following' : 'all';
    let themePref = ['light', 'dark', 'auto'].includes(store.get('oocgram-theme')) ? store.get('oocgram-theme') : 'auto';
    let navInd = null, themeBtn = null;
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    let home = null;
    let seen = new Set();
    try { seen = new Set(JSON.parse(store.get(SEEN_KEY) || '[]')); } catch (e) { seen = new Set(); }

    /* ---------- Ikon ---------- */
    const ICONS = {
        home: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
        note: '<svg viewBox="0 0 24 24"><path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-4 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M8 9h8M8 12.5h5"/></svg>',
        plus: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/></svg>',
        send: '<svg viewBox="0 0 24 24"><path d="M21 3 10.5 13.5"/><path d="M21 3l-6.5 18-4-7.5L3 9.5z"/></svg>',
        user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
        heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-8-4.7-8-10.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 2.9c0 5.9-8 10.6-8 10.6z"/></svg>',
        heartFill: '<svg viewBox="0 0 24 24"><path class="fill" d="M12 20.5s-8-4.7-8-10.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 2.9c0 5.9-8 10.6-8 10.6z"/></svg>',
        comment: '<svg viewBox="0 0 24 24"><path d="M20.5 12a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5l1.1-4.4A8.5 8.5 0 1 1 20.5 12z"/></svg>',
        back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
        close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
        flip: '<svg viewBox="0 0 24 24"><path d="M4 8h12l-3-3M20 16H8l3 3"/></svg>',
        image: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M3.5 17l5-4.5 4 3.5 3-2.5 5 4"/></svg>',
        trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
        refresh: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>',
        edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
        search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
        moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/></svg>',
        sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>'
    };

    /* ---------- Pembantu DOM ---------- */
    const el = (tag, cls, ...kids) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        kids.flat().forEach(k => { if (k != null && k !== false) e.append(k); });
        return e;
    };
    const txt = (tag, cls, s) => { const e = el(tag, cls); e.textContent = s; return e; };
    const icon = name => { const s = document.createElement('span'); s.className = 'g-ic'; s.innerHTML = ICONS[name] || ''; return s; };
    function btn(cls, label, onClick, iconName, aria) {
        const b = el('button', cls);
        b.type = 'button';
        if (iconName) b.append(icon(iconName));
        if (label) b.append(label);
        if (aria) b.setAttribute('aria-label', aria);
        if (onClick) b.addEventListener('click', onClick);
        return b;
    }
    function field(type, placeholder, auto, max) {
        const i = el('input', 'g-in');
        i.type = type; i.placeholder = placeholder;
        if (auto) i.autocomplete = auto;
        if (max) i.maxLength = max;
        i.autocapitalize = 'off';
        i.spellcheck = false;
        return i;
    }
    function ago(iso) {
        const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
        if (s < 60) return 'baru saja';
        if (s < 3600) return Math.floor(s / 60) + ' mnt';
        if (s < 86400) return Math.floor(s / 3600) + ' j';
        if (s < 604800) return Math.floor(s / 86400) + ' h';
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    }
    const PALETTE = ['#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888', '#2e7bff', '#22b8a6', '#7a5cff'];
    function avatar(u, size) {
        const a = el('span', 'g-av');
        a.style.width = a.style.height = size + 'px';
        a.style.fontSize = Math.round(size * 0.42) + 'px';
        if (u.avatar) {
            const i = new Image();
            i.src = u.avatar; i.alt = ''; i.loading = 'lazy';
            a.append(i);
        } else {
            const n = u.name || u.username || '?';
            a.textContent = n.charAt(0).toUpperCase();
            let h = 0;
            for (const c of (u.username || n)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
            a.style.background = PALETTE[h % PALETTE.length];
        }
        return a;
    }
    function gtoast(msg) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(timers.toast);
        timers.toast = setTimeout(() => toastEl.classList.remove('show'), 2600);
    }
    function confirmBox(message, yes) {
        return new Promise(resolve => {
            const back = el('div', 'g-modal');
            const done = v => { back.remove(); resolve(v); };
            const box = el('div', 'g-modalbox', txt('p', '', message),
                el('div', 'row', btn('g-secondary', 'Batal', () => done(false)), btn('g-secondary g-danger', yes || 'Ya', () => done(true))));
            back.append(box);
            back.addEventListener('click', e => { if (e.target === back) done(false); });
            root.append(back);
        });
    }

    /* ---------- API ---------- */
    async function call(action, data) {
        let res;
        try {
            res = await fetch('/api/gram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-gram-token': token },
                body: JSON.stringify(Object.assign({ action }, data || {}))
            });
        } catch (e) { throw new Error('Tidak bisa terhubung ke server'); }
        let j = null;
        try { j = await res.json(); } catch (e) { /* abaikan */ }
        if (res.status === 401 && token && action !== 'login' && action !== 'register') {
            logoutLocal();
            throw new Error('Sesi berakhir. Silakan masuk lagi.');
        }
        if (!res.ok) throw new Error((j && j.error) || ('Terjadi kesalahan (' + res.status + ')'));
        return j;
    }

    /* ---------- Gambar ---------- */
    function loadImage(src) {
        return new Promise((ok, bad) => {
            const i = new Image();
            i.onload = () => ok(i);
            i.onerror = () => bad(new Error('Foto tidak bisa dibaca. Coba format JPG atau PNG.'));
            i.src = src;
        });
    }
    function drawScaled(src, w, h, max, q, square) {
        let sx = 0, sy = 0, sw = w, sh = h;
        if (square) { const m = Math.min(w, h); sx = (w - m) / 2; sy = (h - m) / 2; sw = sh = m; }
        const r = Math.min(1, max / Math.max(sw, sh));
        const cw = Math.max(1, Math.round(sw * r)), ch = Math.max(1, Math.round(sh * r));
        const c = document.createElement('canvas');
        c.width = cw; c.height = ch;
        const x = c.getContext('2d');
        x.fillStyle = '#fff';
        x.fillRect(0, 0, cw, ch);
        x.drawImage(src, sx, sy, sw, sh, 0, 0, cw, ch);
        return c.toDataURL('image/jpeg', q);
    }
    async function fileToJpeg(file, max, q, square) {
        const url = URL.createObjectURL(file);
        try {
            const img = await loadImage(url);
            return drawScaled(img, img.naturalWidth, img.naturalHeight, max, q, square);
        } finally { URL.revokeObjectURL(url); }
    }

    /* ---------- Layar bertumpuk ---------- */
    function pushScreen(node, onClose) {
        node.classList.add('g-screen');
        layer.append(node);
        screens.push({ node, onClose });
        requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add('in')));
        return node;
    }
    function popScreen() {
        const s = screens.pop();
        if (!s) return;
        if (s.onClose) s.onClose();
        s.node.remove();
    }
    function closeAllScreens() { while (screens.length) popScreen(); }
    function screenHead(title, right) {
        return el('div', 'g-sh', btn('g-ibtn', '', popScreen, 'back', 'Kembali'), txt('h3', '', title), right || el('span', 'sp'));
    }

    /* =====================================================
       MASUK / DAFTAR
       ===================================================== */
    function buildAuth() {
        authEl = el('div', 'g-auth');
        let mode = 'login';
        const tL = btn('on', 'Masuk'), tR = btn('', 'Daftar');
        const seg = el('div', 'g-seg', tL, tR);
        const user = field('text', 'Username', 'username', 20);
        const name = field('text', 'Nama yang tampil di profil', 'name', 30);
        const pass = field('password', 'Password', 'current-password', 100);
        const err = el('div', 'g-err');
        err.setAttribute('role', 'alert');
        const go = el('button', 'g-primary');
        go.type = 'submit';
        const form = el('form', 'g-form', user, name, pass, err, go);
        const hint = txt('p', 'g-note-small', 'Username: huruf kecil, angka, titik, atau garis bawah (3–20 karakter).');

        function setMode(m) {
            mode = m;
            tL.classList.toggle('on', m === 'login');
            tR.classList.toggle('on', m === 'register');
            name.hidden = m === 'login';
            hint.hidden = m === 'login';
            pass.autocomplete = m === 'login' ? 'current-password' : 'new-password';
            pass.placeholder = m === 'login' ? 'Password' : 'Password (min. 6 karakter)';
            go.textContent = m === 'login' ? 'Masuk' : 'Buat akun';
            err.textContent = '';
        }
        tL.addEventListener('click', () => setMode('login'));
        tR.addEventListener('click', () => setMode('register'));
        setMode('login');
        authReset = () => { setMode('login'); user.value = ''; name.value = ''; pass.value = ''; };

        form.addEventListener('submit', async e => {
            e.preventDefault();
            err.textContent = '';
            if (!user.value.trim() || !pass.value) { err.textContent = 'Isi username dan password'; return; }
            go.disabled = true;
            const label = go.textContent;
            go.textContent = 'Tunggu...';
            try {
                const r = await call(mode, { username: user.value.trim(), password: pass.value, name: name.value.trim() });
                token = r.token;
                me = r.user;
                store.set(TOKEN_KEY, token);
                pass.value = '';
                enterApp();
            } catch (ex) { err.textContent = ex.message; }
            go.disabled = false;
            go.textContent = label;
        });

        authEl.append(el('div', 'g-auth-card',
            txt('div', 'g-logo big', 'OOCgram'),
            txt('p', 'g-sub', 'Bagikan momen bareng circle OOC'),
            seg, form, hint, txt('p', 'g-note-small', 'OOCgram ' + VERSION),
            el('div', '', btn('g-link', 'Kembali ke website OOC', close))));
        root.append(authEl);
    }

    /* =====================================================
       KERANGKA APLIKASI
       ===================================================== */
    function buildApp() {
        appEl = el('div', 'g-app');
        themeBtn = btn('g-ibtn', '', quickTheme, 'moon', 'Ganti tema gelap atau terang');
        const top = el('header', 'g-top',
            btn('g-ibtn', '', close, 'close', 'Tutup OOCgram'),
            txt('div', 'g-logo', 'OOCgram'),
            el('div', 'g-top-r',
                themeBtn,
                btn('g-ibtn', '', () => show(tab, true), 'refresh', 'Segarkan')));
        view = el('main', 'g-view');
        navEl = el('nav', 'g-nav');
        navInd = el('span', 'g-ind');
        navEl.append(navInd);
        [['home', 'home', 'Beranda'], ['search', 'search', 'Cari'], ['camera', 'plus', 'Kamera'],
         ['notes', 'note', 'Catatan'], ['chat', 'send', 'Pesan'], ['me', 'user', 'Profil']].forEach(([id, ic, label]) => {
            const b = btn(id === 'camera' ? 'mid' : '', '', () => show(id), ic, label);
            b.dataset.tab = id;
            b.append(label);
            if (id === 'chat') { badgeEl = txt('span', 'g-badge', '0'); badgeEl.hidden = true; b.append(badgeEl); }
            navEl.append(b);
        });
        appEl.append(view, top, navEl);
        root.append(appEl);
        window.addEventListener('resize', moveInd);
        paintThemeBtn();
    }
    function moveInd() {
        if (!navInd || !navEl) return;
        const on = navEl.querySelector('button.on');
        if (!on || !on.offsetWidth) return;
        navInd.style.width = on.offsetWidth + 'px';
        navInd.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    }

    /* ---------- Tema gelap / terang ---------- */
    function resolvedTheme() {
        return themePref === 'auto' ? (mq && mq.matches ? 'dark' : 'light') : themePref;
    }
    function paintThemeBtn() {
        if (!themeBtn) return;
        themeBtn.innerHTML = '';
        themeBtn.append(icon(resolvedTheme() === 'dark' ? 'sun' : 'moon'));
    }
    function applyTheme() {
        if (root) root.dataset.theme = resolvedTheme();
        paintThemeBtn();
    }
    function setThemePref(p) {
        themePref = p;
        store.set('oocgram-theme', p);
        applyTheme();
    }
    function quickTheme() {
        setThemePref(resolvedTheme() === 'dark' ? 'light' : 'dark');
        if (tab === 'me') renderMe();
    }
    if (mq && mq.addEventListener) mq.addEventListener('change', () => { if (themePref === 'auto') applyTheme(); });

    function show(t, force) {
        if (tab === 'camera' && t !== 'camera') stopCam();
        clearInterval(timers.chats);
        tab = t;
        navEl.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
        view.classList.toggle('cam', t === 'camera');
        view.scrollTop = 0;
        moveInd();
        ({ home: renderHome, search: renderSearch, notes: renderNotes, camera: renderCamera, chat: renderChat, me: renderMe })[t](force);
    }

    function enterApp() {
        authEl.hidden = true;
        appEl.hidden = false;
        closeAllScreens();
        feed.posts = []; storyGroups = [];
        show('home', true);
        requestAnimationFrame(() => requestAnimationFrame(moveInd));
        pollUnread();
        clearInterval(timers.unread);
        timers.unread = setInterval(pollUnread, 15000);
    }
    function showAuth() {
        authReset();
        appEl.hidden = true;
        authEl.hidden = false;
        clearInterval(timers.unread);
        clearInterval(timers.chats);
        stopCam();
        closeAllScreens();
    }
    function logoutLocal() {
        token = ''; me = null;
        store.del(TOKEN_KEY);
        if (root && !root.hidden) showAuth();
    }
    async function pollUnread() {
        if (!token) return;
        try {
            const r = await call('unread');
            badgeEl.hidden = !r.unread;
            badgeEl.textContent = r.unread > 9 ? '9+' : String(r.unread);
        } catch (e) { /* abaikan */ }
    }

    /* =====================================================
       BERANDA: STORY + FEED
       ===================================================== */
    async function renderHome(force) {
        view.innerHTML = '';
        home = { bar: el('div', 'g-stories'), list: el('div', 'g-posts') };
        const sAll = btn(scope === 'all' ? 'on' : '', 'Semua'), sFol = btn(scope === 'following' ? 'on' : '', 'Mengikuti');
        const pick = m => {
            if (scope === m) return;
            scope = m;
            store.set('oocgram-scope', m);
            feed.posts = []; storyGroups = [];
            renderHome(true);
        };
        sAll.addEventListener('click', () => pick('all'));
        sFol.addEventListener('click', () => pick('following'));
        view.append(el('div', 'g-scope', el('div', 'g-seg', sAll, sFol)), home.bar, home.list);
        drawStories();
        loadStories();
        if (force || !feed.posts.length) await loadFeed(true);
        else drawFeed();
    }

    async function loadStories() {
        try {
            const r = await call('stories', { scope });
            storyGroups = r.stories;
            if (tab === 'home' && home) drawStories();
        } catch (e) { /* abaikan */ }
    }

    function isNew(g) { return g.items.some(i => !seen.has(i.id)); }
    function orderedGroups() {
        const mine = storyGroups.find(g => g.user.id === me.id);
        const others = storyGroups.filter(g => g.user.id !== me.id).sort((a, b) => isNew(b) - isNew(a));
        return (mine ? [mine] : []).concat(others);
    }
    function storyBubble(user, label, ringClass, plus, onOpen, onPlus) {
        const b = el('div', 'g-story');
        const open = el('button', '');
        open.type = 'button';
        open.setAttribute('aria-label', 'Lihat story ' + label);
        open.append(el('span', 'ring ' + ringClass, el('span', 'inner', avatar(user, 56))), txt('span', 'nm', label));
        open.addEventListener('click', onOpen);
        b.append(open);
        if (plus) {
            const p = btn('plus', '', onPlus, 'plus', 'Tambah story');
            p.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M12 6v12M6 12h12"/></svg>';
            b.append(p);
        }
        return b;
    }
    function drawStories() {
        if (!home) return;
        const bar = home.bar;
        bar.innerHTML = '';
        const groups = orderedGroups();
        const mine = groups.find(g => g.user.id === me.id);
        bar.append(storyBubble(me, 'Cerita kamu', mine ? (isNew(mine) ? 'new' : '') : 'none', true,
            () => { if (mine) openStories(groups, 0); else openStoryCamera(); }, openStoryCamera));
        groups.forEach((g, idx) => {
            if (g.user.id === me.id) return;
            bar.append(storyBubble(g.user, g.user.username, isNew(g) ? 'new' : '', false, () => openStories(groups, idx)));
        });
    }
    function openStoryCamera() { cam.preferStory = true; show('camera'); }

    function openStories(groups, start) {
        let g = start, i = 0;
        const sv = el('div', 'g-sv');
        const bars = el('div', 'g-sv-bars');
        const head = el('div', 'g-sv-head');
        const img = new Image();
        img.className = 'g-sv-img';
        img.alt = 'Story';
        const cap = el('div', 'g-sv-cap');
        const left = el('button', 'g-sv-l'), right = el('button', 'g-sv-r');
        left.type = right.type = 'button';
        left.setAttribute('aria-label', 'Sebelumnya');
        right.setAttribute('aria-label', 'Berikutnya');
        sv.append(img, bars, head, cap, left, right);

        function save() {
            store.set(SEEN_KEY, JSON.stringify([...seen].slice(-400)));
        }
        function exit() { popScreen(); }
        function next() {
            if (i < groups[g].items.length - 1) { i++; paint(); }
            else if (g < groups.length - 1) { g++; i = 0; paint(); }
            else exit();
        }
        function prev() {
            if (i > 0) { i--; paint(); }
            else if (g > 0) { g--; i = 0; paint(); }
            else paint();
        }
        function paint() {
            const grp = groups[g], it = grp.items[i];
            seen.add(it.id);
            save();
            bars.innerHTML = '';
            grp.items.forEach((_, k) => {
                const b = el('i'), f = el('u');
                if (k < i) b.classList.add('done');
                if (k === i) { f.classList.add('run'); f.addEventListener('animationend', next, { once: true }); }
                b.append(f);
                bars.append(b);
            });
            img.src = it.image;
            cap.textContent = it.caption || '';
            cap.hidden = !it.caption;
            head.innerHTML = '';
            head.append(avatar(grp.user, 34), txt('b', '', grp.user.username), txt('small', '', ago(it.created_at)), el('span', 'sp'));
            if (grp.user.id === me.id) {
                head.append(btn('g-ibtn', '', async () => {
                    sv.classList.add('hold');
                    const yes = await confirmBox('Hapus story ini?', 'Hapus');
                    sv.classList.remove('hold');
                    if (!yes) return;
                    try {
                        await call('story_delete', { id: it.id });
                        grp.items.splice(i, 1);
                        if (!grp.items.length) {
                            storyGroups = storyGroups.filter(x => x !== grp);
                            groups.splice(g, 1);
                            if (!groups.length) { exit(); return; }
                            if (g >= groups.length) g = groups.length - 1;
                            i = 0;
                        } else if (i >= grp.items.length) i = grp.items.length - 1;
                        paint();
                    } catch (e) { gtoast(e.message); }
                }, 'trash', 'Hapus story'));
            }
            head.append(btn('g-ibtn', '', exit, 'close', 'Tutup'));
        }
        left.addEventListener('click', prev);
        right.addEventListener('click', next);
        ['pointerdown'].forEach(ev => sv.addEventListener(ev, () => sv.classList.add('hold')));
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => sv.addEventListener(ev, () => sv.classList.remove('hold')));
        pushScreen(sv, () => { drawStories(); });
        sv.style.transform = 'none';
        paint();
    }

    async function loadFeed(reset) {
        if (feed.loading) return;
        feed.loading = true;
        if (reset) {
            feed.posts = [];
            home.list.innerHTML = '';
            home.list.append(el('div', 'g-spin'));
        }
        try {
            const before = feed.posts.length ? feed.posts[feed.posts.length - 1].created_at : '';
            const r = await call('feed', before ? { before, scope } : { scope });
            feed.posts = feed.posts.concat(r.posts);
            feed.more = r.posts.length >= 15;
        } catch (e) {
            if (tab === 'home' && home) { home.list.innerHTML = ''; home.list.append(txt('div', 'g-empty', e.message)); }
            feed.loading = false;
            return;
        }
        feed.loading = false;
        if (tab === 'home' && home) drawFeed();
    }
    function drawFeed() {
        const list = home.list;
        list.innerHTML = '';
        if (!feed.posts.length) {
            list.append(scope === 'following'
                ? el('div', 'g-empty', txt('span', 'big', '👥'),
                    'Belum ada postingan dari orang yang kamu ikuti. Buka tab Cari untuk menemukan teman.',
                    el('div', '', btn('g-link', 'Lihat semua postingan', () => { scope = 'all'; store.set('oocgram-scope', 'all'); feed.posts = []; renderHome(true); })))
                : el('div', 'g-empty', txt('span', 'big', '📷'),
                    'Belum ada postingan. Ketuk tombol Kamera untuk memposting yang pertama!'));
            return;
        }
        feed.posts.forEach(p => list.append(postCard(p)));
        if (feed.more) list.append(btn('g-secondary g-more', 'Muat lebih banyak', async e => {
            e.currentTarget.disabled = true;
            await loadFeed(false);
        }));
    }

    function postCard(p) {
        const card = el('article', 'g-post');
        const who = el('button', 'g-who');
        who.type = 'button';
        who.append(avatar(p.user, 32), txt('b', '', p.user.username));
        who.addEventListener('click', () => openProfile(p.user.username));
        const head = el('div', 'g-phead', who);
        if (p.user.id === me.id) {
            head.append(btn('g-ibtn', '', async () => {
                if (!(await confirmBox('Hapus postingan ini?', 'Hapus'))) return;
                try {
                    await call('post_delete', { id: p.id });
                    feed.posts = feed.posts.filter(x => x.id !== p.id);
                    if (tab === 'home' && home) drawFeed();
                    gtoast('Postingan dihapus');
                } catch (e) { gtoast(e.message); }
            }, 'trash', 'Hapus postingan'));
        }

        const img = new Image();
        img.src = p.image;
        img.alt = p.caption || 'Foto dari ' + p.user.username;
        img.className = 'g-pimg';
        img.loading = 'lazy';
        const heart = el('span', 'g-bigheart');
        heart.append(icon('heartFill'));
        const wrap = el('div', 'g-pimgwrap', img, heart);

        const likeB = el('button', 'g-ibtn like');
        likeB.type = 'button';
        likeB.setAttribute('aria-label', 'Suka');
        const likes = el('div', 'g-likes');
        const cmtLink = el('button', 'g-cmt-link');
        cmtLink.type = 'button';

        function paint() {
            likeB.className = 'g-ibtn like' + (p.liked ? ' on' : '');
            likeB.innerHTML = '';
            likeB.append(icon(p.liked ? 'heartFill' : 'heart'));
            likes.textContent = p.likes ? p.likes + ' suka' : 'Jadilah yang pertama menyukai ini';
            cmtLink.textContent = p.comments ? 'Lihat ' + p.comments + ' komentar' : 'Tambah komentar...';
        }
        async function like() {
            const was = p.liked, n = p.likes;
            p.liked = !p.liked;
            p.likes += p.liked ? 1 : -1;
            paint();
            try {
                const r = await call('like', { id: p.id });
                p.liked = r.liked; p.likes = r.likes;
            } catch (e) { p.liked = was; p.likes = n; gtoast(e.message); }
            paint();
        }
        likeB.addEventListener('click', like);
        let last = 0;
        wrap.addEventListener('click', () => {
            const now = Date.now();
            if (now - last < 320) {
                heart.classList.remove('pop');
                void heart.offsetWidth;
                heart.classList.add('pop');
                if (!p.liked) like();
            }
            last = now;
        });
        const openCmt = () => openComments(p, paint);
        cmtLink.addEventListener('click', openCmt);
        const acts = el('div', 'g-pacts', likeB, btn('g-ibtn', '', openCmt, 'comment', 'Komentar'));

        card.append(head, wrap, acts, likes);
        if (p.caption) card.append(el('div', 'g-cap', txt('b', '', p.user.username + ' '), p.caption));
        card.append(cmtLink, txt('div', 'g-ptime', ago(p.created_at)));
        paint();
        return card;
    }

    function openComments(p, onChange) {
        const list = el('div', 'g-sbody', el('div', 'g-spin'));
        const input = el('input', 'g-in');
        input.type = 'text'; input.placeholder = 'Tambahkan komentar...'; input.maxLength = 300;
        const post = btn('g-link', 'Kirim');
        post.disabled = true;
        input.addEventListener('input', () => { post.disabled = !input.value.trim(); });
        const scr = el('div', '', screenHead('Komentar'), list, el('div', 'g-compose', avatar(me, 32), input, post));
        pushScreen(scr);

        function row(c) {
            return el('div', 'g-comment', avatar(c.user, 32),
                el('div', 't', txt('b', '', c.user.username + ' '), c.body, txt('small', '', ago(c.created_at))));
        }
        call('comments', { id: p.id }).then(r => {
            list.innerHTML = '';
            if (p.caption) list.append(el('div', 'g-comment', avatar(p.user, 32),
                el('div', 't', txt('b', '', p.user.username + ' '), p.caption, txt('small', '', ago(p.created_at)))));
            r.comments.forEach(c => list.append(row(c)));
            if (!r.comments.length && !p.caption) list.append(txt('div', 'g-empty', 'Belum ada komentar.'));
        }).catch(e => { list.innerHTML = ''; list.append(txt('div', 'g-empty', e.message)); });

        async function send() {
            const body = input.value.trim();
            if (!body) return;
            post.disabled = true;
            try {
                const r = await call('comment_add', { id: p.id, body });
                const empty = list.querySelector('.g-empty');
                if (empty) empty.remove();
                list.append(row(r.comment));
                list.scrollTop = list.scrollHeight;
                input.value = '';
                p.comments++;
                onChange();
            } catch (e) { gtoast(e.message); post.disabled = false; }
        }
        post.addEventListener('click', send);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    }

    /* =====================================================
       KAMERA
       ===================================================== */
    function stopCam() {
        if (cam.stream) { cam.stream.getTracks().forEach(t => t.stop()); cam.stream = null; }
    }
    function camFail(message) {
        const ui = cam.ui;
        if (!ui) return;
        ui.msg.innerHTML = '';
        ui.msg.append(txt('p', '', message), btn('g-primary', 'Pilih dari galeri', () => ui.file.click()));
        ui.msg.hidden = false;
    }
    async function startCam() {
        stopCam();
        const ui = cam.ui;
        if (!ui) return;
        ui.msg.hidden = true;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            camFail('Kamera tidak didukung di browser ini. Kamu tetap bisa memilih foto dari galeri.');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: cam.facing, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false
            });
            if (tab !== 'camera' || cam.ui !== ui) { stream.getTracks().forEach(t => t.stop()); return; }
            cam.stream = stream;
            ui.vid.srcObject = stream;
            ui.vid.classList.toggle('mirror', cam.facing === 'user');
            ui.vid.play().catch(() => { /* abaikan */ });
        } catch (e) {
            camFail('Kamera tidak bisa dibuka. Izinkan akses kamera di browser, atau pilih foto dari galeri.');
        }
    }
    function renderCamera() {
        view.innerHTML = '';
        const vid = document.createElement('video');
        vid.autoplay = true; vid.muted = true; vid.playsInline = true;
        vid.setAttribute('playsinline', '');
        const msg = el('div', 'g-cam-msg');
        msg.hidden = true;
        const file = el('input');
        file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
        const flip = btn('g-cam-flip', '', () => { cam.facing = cam.facing === 'user' ? 'environment' : 'user'; startCam(); }, 'flip', 'Ganti kamera');
        const shutter = el('button', 'g-shutter');
        shutter.type = 'button';
        shutter.setAttribute('aria-label', 'Ambil foto');
        const gal = btn('g-cam-gal', 'Galeri', () => file.click(), 'image');
        const bar = el('div', 'g-cam-bar', gal, shutter, el('span'));
        view.append(el('div', 'g-cam', vid, msg, flip, bar, file));
        cam.ui = { vid, msg, file };

        shutter.addEventListener('click', () => {
            if (!vid.videoWidth) { gtoast('Kamera belum siap'); return; }
            openEditor(drawScaled(vid, vid.videoWidth, vid.videoHeight, 1080, 0.85, false));
        });
        file.addEventListener('change', async () => {
            const f = file.files[0];
            file.value = '';
            if (!f) return;
            try { openEditor(await fileToJpeg(f, 1080, 0.85, false)); }
            catch (e) { gtoast(e.message); }
        });
        startCam();
    }

    function openEditor(dataUrl) {
        stopCam();
        let mode = cam.preferStory ? 'story' : 'post';
        cam.preferStory = false;
        const img = new Image();
        img.src = dataUrl; img.alt = 'Pratinjau'; img.className = 'g-edit-img';
        const pBtn = btn('on', 'Postingan'), sBtn = btn('', 'Story');
        const cap = el('textarea', 'g-ta');
        cap.placeholder = 'Tulis keterangan...';
        const share = btn('g-link', 'Bagikan');
        function setMode(m) {
            mode = m;
            pBtn.classList.toggle('on', m === 'post');
            sBtn.classList.toggle('on', m === 'story');
            cap.maxLength = m === 'post' ? 500 : 120;
            cap.placeholder = m === 'post' ? 'Tulis keterangan...' : 'Tulis teks untuk story (opsional)';
        }
        pBtn.addEventListener('click', () => setMode('post'));
        sBtn.addEventListener('click', () => setMode('story'));
        setMode(mode);
        const head = screenHead('Baru', share);
        const scr = el('div', '', head, el('div', 'g-sbody', img, el('div', 'g-edit-body', el('div', 'g-seg', pBtn, sBtn), cap)));
        pushScreen(scr, () => { if (tab === 'camera') startCam(); });

        share.addEventListener('click', async () => {
            share.disabled = true;
            share.textContent = 'Mengirim...';
            try {
                if (mode === 'post') {
                    const r = await call('post_create', { image: dataUrl, caption: cap.value.trim() });
                    feed.posts.unshift(r.post);
                } else {
                    await call('story_add', { image: dataUrl, caption: cap.value.trim() });
                    storyGroups = [];
                }
                screens.splice(screens.findIndex(s => s.node === scr), 1);
                scr.remove();
                closeAllScreens();
                gtoast(mode === 'post' ? 'Postingan dibagikan ✨' : 'Story dibagikan ✨');
                show('home', mode === 'story');
            } catch (e) {
                gtoast(e.message);
                share.disabled = false;
                share.textContent = 'Bagikan';
            }
        });
    }

    /* =====================================================
       CATATAN
       ===================================================== */
    async function renderNotes() {
        view.innerHTML = '';
        const box = el('div', 'g-pad');
        view.append(box);
        box.append(txt('h2', 'g-h', 'Catatan'),
            txt('p', 'g-mute', 'Tulis kabar singkat (maks. 60 huruf). Teman bisa melihatnya selama 24 jam.'));

        const input = el('input', 'g-in');
        input.type = 'text'; input.maxLength = 60; input.placeholder = 'Lagi mikirin apa?';
        const count = txt('div', 'g-count', '0/60');
        input.addEventListener('input', () => { count.textContent = input.value.length + '/60'; });
        const shareB = btn('g-primary', 'Bagikan');
        const delB = btn('g-secondary g-danger', 'Hapus');
        delB.hidden = true;
        const mine = el('div', 'g-mynote', el('div', '', avatar(me, 44)), el('div', 'row', input, shareB), count, delB);
        const grid = el('div', 'g-notes-grid');
        box.append(mine, txt('h3', 'g-h', 'Catatan teman'), grid);
        grid.append(el('div', 'g-spin'));

        async function load() {
            try {
                const r = await call('notes');
                grid.innerHTML = '';
                const my = r.notes.find(n => n.user.id === me.id);
                delB.hidden = !my;
                if (my && !input.value) { input.value = my.body; count.textContent = my.body.length + '/60'; }
                const others = r.notes.filter(n => n.user.id !== me.id);
                if (!others.length) {
                    grid.style.display = 'block';
                    grid.append(txt('div', 'g-empty', 'Belum ada catatan dari teman.'));
                    return;
                }
                grid.style.display = '';
                others.forEach(n => {
                    const b = el('div', 'g-nitem');
                    b.tabIndex = 0;
                    b.setAttribute('role', 'button');
                    b.addEventListener('keydown', e => { if (e.key === 'Enter') openChat(n.user); });
                    b.append(txt('span', 'nbub', n.body), avatar(n.user, 60), txt('span', 'nm', n.user.name), txt('small', '', ago(n.created_at)));
                    b.addEventListener('click', () => openChat(n.user));
                    grid.append(b);
                });
            } catch (e) { grid.innerHTML = ''; grid.style.display = 'block'; grid.append(txt('div', 'g-empty', e.message)); }
        }
        shareB.addEventListener('click', async () => {
            const body = input.value.trim();
            if (!body) { gtoast('Tulis catatan dulu'); return; }
            shareB.disabled = true;
            try { await call('note_set', { body }); gtoast('Catatan dibagikan ✨'); await load(); }
            catch (e) { gtoast(e.message); }
            shareB.disabled = false;
        });
        delB.addEventListener('click', async () => {
            try { await call('note_clear'); input.value = ''; count.textContent = '0/60'; gtoast('Catatan dihapus'); await load(); }
            catch (e) { gtoast(e.message); }
        });
        load();
    }

    /* =====================================================
       PESAN PRIBADI
       ===================================================== */
    function renderChat() {
        view.innerHTML = '';
        const list = el('div', 'g-chats');
        view.append(el('div', 'g-chat-top', txt('b', '', 'Pesan'), btn('g-newbtn', 'Pesan baru', openUserSearch, 'edit')), list);
        list.append(el('div', 'g-spin'));
        async function load() {
            try {
                const r = await call('chats');
                list.innerHTML = '';
                if (!r.chats.length) {
                    list.append(el('div', 'g-empty', txt('span', 'big', '💬'), 'Belum ada pesan. Ketuk “Pesan baru” untuk mulai ngobrol.'));
                    return;
                }
                r.chats.forEach(c => {
                    const row = el('button', 'g-crow' + (c.unread ? ' unread' : ''));
                    row.type = 'button';
                    row.append(avatar(c.user, 52),
                        el('div', 't', txt('b', '', c.user.name), txt('span', '', (c.last.mine ? 'Kamu: ' : '') + c.last.body + ' · ' + ago(c.last.created_at))));
                    if (c.unread) row.append(el('span', 'dot'));
                    row.addEventListener('click', () => openChat(c.user));
                    list.append(row);
                });
            } catch (e) { if (!list.querySelector('.g-crow')) { list.innerHTML = ''; list.append(txt('div', 'g-empty', e.message)); } }
        }
        load();
        timers.chats = setInterval(() => { if (tab === 'chat' && !screens.length) load(); }, 8000);
    }

    function openUserSearch() {
        const q = el('input', 'g-in');
        q.type = 'search'; q.placeholder = 'Cari nama atau username...'; q.maxLength = 20;
        const list = el('div', 'g-sbody');
        const scr = el('div', '', screenHead('Pesan baru'), el('div', 'g-pad', q), list);
        pushScreen(scr);
        let t;
        async function load() {
            list.innerHTML = '';
            list.append(el('div', 'g-spin'));
            try {
                const r = await call('users', { q: q.value });
                list.innerHTML = '';
                if (!r.users.length) { list.append(txt('div', 'g-empty', 'Tidak ada pengguna yang cocok.')); return; }
                r.users.forEach(u => {
                    const row = el('button', 'g-crow');
                    row.type = 'button';
                    row.append(avatar(u, 46), el('div', 't', txt('b', '', u.name), txt('span', '', '@' + u.username)));
                    row.addEventListener('click', () => { popScreen(); openChat(u); });
                    list.append(row);
                });
            } catch (e) { list.innerHTML = ''; list.append(txt('div', 'g-empty', e.message)); }
        }
        q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 300); });
        load();
    }

    function openChat(user) {
        const thread = el('div', 'g-thread');
        const input = el('input', 'g-in');
        input.type = 'text'; input.placeholder = 'Tulis pesan...'; input.maxLength = 1000;
        const send = btn('g-link', 'Kirim');
        send.disabled = true;
        input.addEventListener('input', () => { send.disabled = !input.value.trim(); });
        const who = el('button', 'g-chead');
        who.type = 'button';
        who.append(avatar(user, 32), txt('b', '', user.name));
        who.addEventListener('click', () => openProfile(user.username));
        const head = el('div', 'g-sh', btn('g-ibtn', '', popScreen, 'back', 'Kembali'), who);
        const scr = el('div', '', head, thread, el('div', 'g-compose', input, send));
        let lastId = 0, poll = null, lastTime = 0;
        const have = new Set();
        pushScreen(scr, () => { clearInterval(poll); pollUnread(); if (tab === 'chat') renderChat(); });

        function add(m) {
            if (have.has(m.id)) return;
            have.add(m.id);
            const t = new Date(m.created_at).getTime();
            if (t - lastTime > 15 * 60 * 1000) {
                thread.append(txt('div', 'g-mtime', new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })));
            }
            lastTime = t;
            thread.append(txt('div', 'g-msg' + (m.mine ? ' me' : ''), m.body));
            if (m.id > lastId) lastId = m.id;
        }
        const nearBottom = () => thread.scrollHeight - thread.scrollTop - thread.clientHeight < 120;
        async function load(first) {
            try {
                const r = await call('messages', first ? { with: user.id } : { with: user.id, after: lastId });
                const stick = first || nearBottom();
                r.messages.forEach(add);
                if (first && !r.messages.length) thread.append(txt('div', 'g-empty', 'Mulai percakapan dengan ' + user.name + '. Kirim pesan pertama!'));
                if (r.messages.length) { const e = thread.querySelector('.g-empty'); if (e) e.remove(); }
                if (stick && r.messages.length) thread.scrollTop = thread.scrollHeight;
            } catch (e) { if (first) thread.append(txt('div', 'g-empty', e.message)); }
        }
        load(true);
        poll = setInterval(() => load(false), 3000);

        async function doSend() {
            const body = input.value.trim();
            if (!body) return;
            send.disabled = true;
            try {
                const r = await call('message_send', { to: user.id, body });
                const e = thread.querySelector('.g-empty'); if (e) e.remove();
                add(r.message);
                input.value = '';
                thread.scrollTop = thread.scrollHeight;
            } catch (e) { gtoast(e.message); send.disabled = false; }
        }
        send.addEventListener('click', doSend);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSend(); } });
    }

    /* =====================================================
       CARI ORANG & IKUTI
       ===================================================== */
    function followBtn(user, initial, onChange) {
        const b = el('button', 'g-fbtn');
        b.type = 'button';
        let on = !!initial;
        const paint = () => { b.className = 'g-fbtn' + (on ? ' on' : ''); b.textContent = on ? 'Mengikuti' : 'Ikuti'; };
        b.addEventListener('click', async e => {
            e.stopPropagation();
            b.disabled = true;
            try {
                const r = await call('follow', { id: user.id });
                on = r.following;
                feed.posts = [];
                if (onChange) onChange(r);
            } catch (err) { gtoast(err.message); }
            b.disabled = false;
            paint();
        });
        paint();
        return b;
    }
    function userRow(u) {
        const row = el('div', 'g-crow');
        row.tabIndex = 0;
        row.setAttribute('role', 'button');
        row.append(avatar(u, 46), el('div', 't', txt('b', '', u.name), txt('span', '', '@' + u.username)));
        if (u.id !== me.id) row.append(followBtn(u, u.following));
        row.addEventListener('click', () => openProfile(u.username));
        row.addEventListener('keydown', e => { if (e.key === 'Enter') openProfile(u.username); });
        return row;
    }
    function renderSearch() {
        const q = el('input', 'g-in');
        q.type = 'search'; q.placeholder = 'Cari nama atau username...'; q.maxLength = 20;
        q.setAttribute('aria-label', 'Cari orang');
        const list = el('div', '');
        view.innerHTML = '';
        view.append(el('div', 'g-pad', txt('h2', 'g-h', 'Cari orang'), q), list);
        let t, n = 0;
        async function load() {
            const my = ++n;
            list.innerHTML = '';
            list.append(el('div', 'g-spin'));
            try {
                const r = await call('users', { q: q.value });
                if (my !== n) return;
                list.innerHTML = '';
                if (!r.users.length) { list.append(txt('div', 'g-empty', 'Tidak ada pengguna yang cocok.')); return; }
                if (!q.value.trim()) list.append(txt('div', 'g-pad g-mute', 'Anggota OOCgram'));
                r.users.forEach(u => list.append(userRow(u)));
            } catch (e) { if (my === n) { list.innerHTML = ''; list.append(txt('div', 'g-empty', e.message)); } }
        }
        q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 300); });
        load();
    }
    async function openFollowList(username, type) {
        const body = el('div', 'g-sbody', el('div', 'g-spin'));
        pushScreen(el('div', '', screenHead(type === 'followers' ? 'Pengikut' : 'Mengikuti'), body));
        try {
            const r = await call('follow_list', { username, type });
            body.innerHTML = '';
            if (!r.users.length) { body.append(txt('div', 'g-empty', type === 'followers' ? 'Belum ada pengikut.' : 'Belum mengikuti siapa pun.')); return; }
            r.users.forEach(u => body.append(userRow(u)));
        } catch (e) { body.innerHTML = ''; body.append(txt('div', 'g-empty', e.message)); }
    }

    /* =====================================================
       PROFIL
       ===================================================== */
    async function renderMe() {
        view.innerHTML = '';
        view.append(el('div', 'g-spin'));
        try {
            const r = await call('profile', { username: me.username });
            view.innerHTML = '';
            view.append(profileView(r));
        } catch (e) { view.innerHTML = ''; view.append(txt('div', 'g-empty', e.message)); }
    }
    async function openProfile(username) {
        if (username === me.username && !screens.length) { show('me'); return; }
        const body = el('div', 'g-sbody', el('div', 'g-spin'));
        pushScreen(el('div', '', screenHead('@' + username), body));
        try {
            const r = await call('profile', { username });
            body.innerHTML = '';
            body.append(profileView(r));
        } catch (e) { body.innerHTML = ''; body.append(txt('div', 'g-empty', e.message)); }
    }
    function profileView(d) {
        const u = d.user;
        const wrap = el('div', '');
        const folNum = txt('b', '', String(d.followers || 0));
        const stat = (num, label, onClick) => {
            const b = el('button', 'g-stat', num, txt('span', '', label));
            b.type = 'button';
            if (onClick) b.addEventListener('click', onClick); else b.style.cursor = 'default';
            return b;
        };
        const stats = el('div', 'g-stats',
            stat(txt('b', '', String(d.posts.length)), 'postingan'),
            stat(folNum, 'pengikut', () => openFollowList(u.username, 'followers')),
            stat(txt('b', '', String(d.following || 0)), 'mengikuti', () => openFollowList(u.username, 'following')));
        const prof = el('div', 'g-prof',
            el('div', 'g-prof-top', avatar(u, 84), stats),
            txt('div', 'nm', u.name),
            txt('div', 'g-mute', '@' + u.username));
        if (u.bio) prof.append(txt('div', 'bio', u.bio));
        const acts = el('div', 'g-prof-act');
        if (d.isMe) {
            acts.append(btn('g-secondary', 'Edit profil', openEditProfile), btn('g-secondary g-danger', 'Keluar', async () => {
                if (await confirmBox('Keluar dari OOCgram?', 'Keluar')) { logoutLocal(); }
            }));
        } else {
            acts.append(followBtn(u, d.isFollowing, r => { folNum.textContent = String(r.followers); }),
                btn('g-secondary', 'Kirim pesan', () => openChat(u)));
        }
        prof.append(acts);
        if (d.isMe) {
            const seg = el('div', 'g-seg');
            [['light', 'Terang'], ['dark', 'Gelap'], ['auto', 'Otomatis']].forEach(([v, label]) => {
                const b = btn(themePref === v ? 'on' : '', label, () => {
                    setThemePref(v);
                    seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
                });
                seg.append(b);
            });
            prof.append(el('div', 'g-theme', txt('small', '', 'Tema tampilan OOCgram'), seg), txt('div', 'g-note-small', 'OOCgram ' + VERSION));
        }
        const grid = el('div', 'g-grid');
        d.posts.forEach(p => {
            const b = el('button', '');
            b.type = 'button';
            const i = new Image();
            i.src = p.image; i.alt = p.caption || 'Postingan'; i.loading = 'lazy';
            b.append(i);
            b.addEventListener('click', () => openPostViewer(p, u));
            grid.append(b);
        });
        wrap.append(prof, grid);
        if (!d.posts.length) wrap.append(txt('div', 'g-empty', d.isMe ? 'Kamu belum memposting apa pun.' : 'Belum ada postingan.'));
        return wrap;
    }
    function openPostViewer(p, user) {
        const img = new Image();
        img.src = p.image; img.alt = p.caption || 'Postingan'; img.className = 'g-pimg';
        const body = el('div', 'g-sbody', img);
        if (p.caption) body.append(el('div', 'g-cap', txt('b', '', user.username + ' '), p.caption));
        body.append(txt('div', 'g-ptime', ago(p.created_at)));
        let right = null;
        if (user.id === me.id) {
            right = btn('g-ibtn', '', async () => {
                if (!(await confirmBox('Hapus postingan ini?', 'Hapus'))) return;
                try {
                    await call('post_delete', { id: p.id });
                    feed.posts = feed.posts.filter(x => x.id !== p.id);
                    popScreen();
                    if (tab === 'me') renderMe();
                    gtoast('Postingan dihapus');
                } catch (e) { gtoast(e.message); }
            }, 'trash', 'Hapus postingan');
        }
        pushScreen(el('div', '', screenHead(user.username, right), body));
    }
    function openEditProfile() {
        const name = field('text', 'Nama', 'name', 30);
        name.value = me.name;
        const bio = el('textarea', 'g-ta');
        bio.placeholder = 'Bio singkat'; bio.maxLength = 150; bio.value = me.bio || '';
        let newAvatar = '';
        const prev = el('div', '', avatar(me, 72));
        const file = el('input');
        file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
        file.addEventListener('change', async () => {
            const f = file.files[0];
            file.value = '';
            if (!f) return;
            try {
                newAvatar = await fileToJpeg(f, 320, 0.85, true);
                prev.innerHTML = '';
                prev.append(avatar({ avatar: newAvatar, username: me.username }, 72));
            } catch (e) { gtoast(e.message); }
        });
        const save = btn('g-link', 'Simpan');
        const scr = el('div', '', screenHead('Edit profil', save),
            el('div', 'g-sbody', el('div', 'g-pad',
                el('div', 'g-avedit', prev, btn('g-link', 'Ganti foto profil', () => file.click()), file),
                el('div', 'g-form', name, bio))));
        pushScreen(scr);
        save.addEventListener('click', async () => {
            save.disabled = true;
            try {
                const r = await call('profile_update', { name: name.value.trim(), bio: bio.value.trim(), avatar: newAvatar || undefined });
                me = r.user;
                feed.posts = [];
                popScreen();
                gtoast('Profil diperbarui');
                if (tab === 'me') renderMe();
            } catch (e) { gtoast(e.message); save.disabled = false; }
        });
    }

    /* =====================================================
       BUKA / TUTUP
       ===================================================== */
    function ensureCss() {
        if (cssDone) return cssDone;
        cssDone = new Promise(resolve => {
            cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'gram.css?v=' + VERSION;
            cssLink.onload = resolve;
            cssLink.onerror = resolve;
            document.head.appendChild(cssLink);
            setTimeout(resolve, 2500);
        });
        return cssDone;
    }
    function build() {
        if (root) return;
        root = el('div', 'g-root');
        root.hidden = true;
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-label', 'OOCgram');
        layer = el('div', 'g-layer');
        toastEl = el('div', 'g-toast');
        toastEl.setAttribute('role', 'status');
        buildAuth();
        buildApp();
        root.append(layer, toastEl);
        applyTheme();
        document.body.appendChild(root);
        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape' || root.hidden) return;
            if (screens.length) popScreen(); else close();
        });
    }
    async function open() {
        await ensureCss();
        build();
        root.hidden = false;
        document.documentElement.classList.add('gram-open');
        if (token && !me) {
            try { const r = await call('me'); me = r.user; } catch (e) { token = ''; store.del(TOKEN_KEY); }
        }
        if (token && me) enterApp(); else showAuth();
    }
    function close() {
        if (!root) return;
        root.hidden = true;
        document.documentElement.classList.remove('gram-open');
        clearInterval(timers.unread);
        clearInterval(timers.chats);
        stopCam();
        closeAllScreens();
    }

    function mount(box) {
        if (box.__gram) return;
        box.__gram = true;
        ensureCss();
        box.append(el('div', 'g-launch',
            txt('div', 'g-logo', 'OOCgram'),
            txt('p', '', 'Media sosial mini untuk circle OOC'),
            el('ul', '', txt('li', '', '📷 Posting foto & story dari kamera'),
                txt('li', '', '📝 Catatan singkat 24 jam'),
                txt('li', '', '💬 Chat pribadi antar anggota')),
            btn('g-primary', 'BUKA OOCGRAM', open)));
        const tabBtn = document.querySelector('.tool-tabs [data-tool="gram"]');
        if (tabBtn) tabBtn.addEventListener('click', () => setTimeout(open, 60));
    }

    window.OOCGram = { mount, open, close };
})();