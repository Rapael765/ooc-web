/* =====================================================
   OOC Circle - Tools (Kalkulator + Foto ke Link)
   Dimuat SETELAH script.js. Menambahkan sendiri tombol "Tools"
   di dock bawah dan halaman #tools, jadi index.html cukup
   ditambah 1 baris <script>.
   ===================================================== */
(function () {
    if (typeof showPage !== 'function' || typeof pages === 'undefined') return;

    // Muat CSS tools
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'tools.css';
    document.head.appendChild(css);

    // Daftarkan halaman baru ke sistem navigasi yang ada
    pages.push('tools');

    /* ---------- Tombol di dock ---------- */
    const navLink = document.createElement('a');
    navLink.href = '#tools';
    navLink.dataset.page = 'tools';
    navLink.innerHTML =
        '<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/>' +
        '<rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>' +
        '</svg></span>Tools';
    $('#dock').appendChild(navLink);
    navLink.addEventListener('click', e => {
        e.preventDefault();
        history.pushState(null, '', '#tools');
        showPage('tools');
    });

    /* ---------- Halaman Tools ---------- */
    const sec = document.createElement('section');
    sec.className = 'page';
    sec.id = 'page-tools';
    sec.innerHTML = `
        <div class="page-head">
            <h2>TOOLS</h2>
            <p>Alat bantu praktis untuk circle OOC</p>
        </div>

        <div class="tool-tabs" role="tablist" aria-label="Pilih tool">
            <button class="btn on" type="button" data-tool="calc" role="tab" aria-selected="true">KALKULATOR</button>
            <button class="btn" type="button" data-tool="link" role="tab" aria-selected="false">FOTO KE LINK</button>
        </div>

        <div class="tool-panel card" id="tool-calc">
            <div class="calc-screen" aria-live="polite">
                <small id="calcExpr"></small>
                <b id="calcRes">0</b>
            </div>
            <div class="calc-keys" id="calcKeys"></div>
        </div>

        <div class="tool-panel card" id="tool-link" hidden>
            <div class="field">
                <label for="linkFile">Pilih foto</label>
                <input class="input" type="file" id="linkFile" accept="image/*">
                <p class="hint">Foto dikecilkan otomatis (maks 1600 px) lalu diunggah. Siapa pun yang punya link bisa melihatnya.</p>
            </div>
            <div class="link-preview" id="linkPrev" hidden>
                <img id="linkImg" alt="Pratinjau foto yang dipilih">
            </div>
            <button class="btn btn-primary btn-block" id="linkGo" type="button">BUAT LINK</button>
            <div class="link-out" id="linkOut" hidden>
                <label class="link-label" for="linkUrl">Link foto kamu</label>
                <input class="input" id="linkUrl" type="text" readonly>
                <div class="btn-row">
                    <button class="btn" id="linkCopy" type="button">SALIN</button>
                    <a class="btn btn-primary" id="linkOpen" target="_blank" rel="noopener">BUKA</a>
                </div>
            </div>
        </div>`;
    $('main').appendChild(sec);

    /* ---------- Pindah antar tool ---------- */
    const panels = { calc: $('#tool-calc', sec), link: $('#tool-link', sec) };
    $$('.tool-tabs .btn', sec).forEach(b => b.addEventListener('click', () => {
        const t = b.dataset.tool;
        $$('.tool-tabs .btn', sec).forEach(x => {
            const on = x === b;
            x.classList.toggle('on', on);
            x.setAttribute('aria-selected', on);
        });
        Object.keys(panels).forEach(k => { panels[k].hidden = k !== t; });
    }));

    /* =====================================================
       KALKULATOR
       ===================================================== */
    // Hitung ekspresi dengan parser sendiri (tanpa eval)
    function calc(s) {
        const tk = s.match(/\d+\.?\d*|\.\d+|[-+*/%()]/g) || [];
        let i = 0;
        const peek = () => tk[i];
        function expr() {
            let v = term();
            while (peek() === '+' || peek() === '-') {
                const o = tk[i++], r = term();
                v = o === '+' ? v + r : v - r;
            }
            return v;
        }
        function term() {
            let v = unary();
            while (peek() === '*' || peek() === '/') {
                const o = tk[i++], r = unary();
                v = o === '*' ? v * r : v / r;
            }
            return v;
        }
        function unary() {
            if (peek() === '-') { i++; return -unary(); }
            if (peek() === '+') { i++; return unary(); }
            return pct();
        }
        function pct() {
            let v = prim();
            while (peek() === '%') { i++; v /= 100; }
            return v;
        }
        function prim() {
            const t = tk[i++];
            if (t === undefined) throw new Error('x');
            if (t === '(') {
                const v = expr();
                if (tk[i++] !== ')') throw new Error('x');
                return v;
            }
            const n = parseFloat(t);
            if (isNaN(n)) throw new Error('x');
            return n;
        }
        const v = expr();
        if (i < tk.length) throw new Error('x');
        return v;
    }

    const exprEl = $('#calcExpr', sec);
    const resEl = $('#calcRes', sec);
    const isOp = c => '+-*/'.includes(c);
    const tidy = v => parseFloat(v.toPrecision(12));
    const show = s => String(s).replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−');

    let ex = '';        // ekspresi yang sedang diketik
    let done = false;   // true setelah tombol =
    let topText = '';   // baris atas setelah =
    let resText = '0';  // hasil setelah =

    function preview() {
        if (!ex) return '0';
        try {
            const v = calc(ex.replace(/[-+*/]+$/, ''));
            return isFinite(v) ? String(tidy(v)) : '';
        } catch (e) { return ''; }
    }
    function render() {
        exprEl.textContent = done ? topText : show(ex);
        resEl.textContent = done ? resText : (preview() || resEl.textContent);
    }

    function press(k) {
        if (/^\d$/.test(k)) {
            if (done) { ex = ''; done = false; }
            if (/(^|[^\d.])0$/.test(ex)) ex = ex.slice(0, -1);
            ex += k;
        } else if (k === '.') {
            if (done) { ex = ''; done = false; }
            const last = ex.split(/[-+*/%()]/).pop();
            if (last.includes('.')) return;
            ex += last === '' ? '0.' : '.';
        } else if (isOp(k)) {
            done = false;
            if (!ex) { if (k === '-') ex = '-'; render(); return; }
            if (ex === '-') return;
            ex = isOp(ex.slice(-1)) ? ex.slice(0, -1) + k : ex + k;
        } else if (k === '%') {
            if (!/[\d%]$/.test(ex)) return;
            done = false;
            ex += '%';
        } else if (k === 'back') {
            if (done) { ex = ''; done = false; } else ex = ex.slice(0, -1);
        } else if (k === 'clear') {
            ex = ''; done = false;
            resEl.textContent = '0';
        } else if (k === '=') {
            if (!ex || done) return;
            try {
                const v = calc(ex.replace(/[-+*/]+$/, ''));
                if (!isFinite(v)) { toast('Tidak bisa dibagi 0'); return; }
                const s = String(tidy(v));
                topText = show(ex.replace(/[-+*/]+$/, '')) + ' =';
                resText = s;
                // angka eksponen (mis. 1e+21) tidak bisa dilanjutkan sebagai ekspresi
                ex = /e/i.test(s) ? '' : s;
                done = true;
            } catch (e) { toast('Ekspresi tidak valid'); return; }
        }
        render();
    }

    // Tombol kalkulator
    const keys = [
        ['C', 'clear', 'fn'], ['⌫', 'back', 'fn'], ['%', '%', 'fn'], ['÷', '/', 'op'],
        ['7', '7'], ['8', '8'], ['9', '9'], ['×', '*', 'op'],
        ['4', '4'], ['5', '5'], ['6', '6'], ['−', '-', 'op'],
        ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+', 'op'],
        ['0', '0', 'wide'], ['.', '.'], ['=', '=', 'eq']
    ];
    const keysBox = $('#calcKeys', sec);
    keys.forEach(([label, k, cls]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn calc-key' + (cls ? ' ' + cls : '');
        b.textContent = label;
        b.dataset.k = k;
        b.setAttribute('aria-label', { clear: 'Hapus semua', back: 'Hapus satu', '/': 'Bagi', '*': 'Kali', '-': 'Kurang', '+': 'Tambah', '=': 'Sama dengan', '%': 'Persen', '.': 'Koma' }[k] || label);
        keysBox.appendChild(b);
    });
    keysBox.addEventListener('click', e => {
        const b = e.target.closest('.calc-key');
        if (b) press(b.dataset.k);
    });

    // Keyboard (hanya saat halaman Tools + tab kalkulator terbuka)
    document.addEventListener('keydown', e => {
        if (!sec.classList.contains('active') || panels.calc.hidden) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target.closest && e.target.closest('input, textarea')) return;
        if ($('.overlay.open')) return;
        const k = e.key;
        if (/^\d$/.test(k)) press(k);
        else if (k === '.' || k === ',') press('.');
        else if ('+-*/'.includes(k)) press(k);
        else if (k === '%') press('%');
        else if (k === 'Enter' || k === '=') { e.preventDefault(); press('='); }
        else if (k === 'Backspace') press('back');
        else if (k === 'Escape') press('clear');
        else return;
    });

    /* =====================================================
       FOTO KE LINK
       ===================================================== */
    const fileEl = $('#linkFile', sec);
    const prevBox = $('#linkPrev', sec);
    const prevImg = $('#linkImg', sec);
    const goBtn = $('#linkGo', sec);
    const outBox = $('#linkOut', sec);
    const urlEl = $('#linkUrl', sec);
    const openA = $('#linkOpen', sec);
    let prevUrl = null;

    // Kecilkan & ubah ke JPEG supaya muat batas upload Vercel
    function toJpeg(file, max = 1600) {
        return new Promise((resolve, reject) => {
            const src = URL.createObjectURL(file);
            const img = new Image();
            img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('Foto tidak bisa dibaca. Coba format JPG atau PNG.')); };
            img.onload = () => {
                URL.revokeObjectURL(src);
                const r = Math.min(1, max / Math.max(img.width, img.height));
                const w = Math.round(img.width * r), h = Math.round(img.height * r);
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                const ctx = c.getContext('2d');
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                let q = 0.85;
                let d = c.toDataURL('image/jpeg', q);
                while (d.length > 3500000 && q > 0.4) { q -= 0.15; d = c.toDataURL('image/jpeg', q); }
                resolve(d);
            };
            img.src = src;
        });
    }

    fileEl.addEventListener('change', () => {
        outBox.hidden = true;
        if (prevUrl) { URL.revokeObjectURL(prevUrl); prevUrl = null; }
        const f = fileEl.files[0];
        if (!f) { prevBox.hidden = true; return; }
        prevUrl = URL.createObjectURL(f);
        prevImg.src = prevUrl;
        prevBox.hidden = false;
    });

    goBtn.addEventListener('click', async () => {
        const f = fileEl.files[0];
        if (!f) return toast('Pilih foto dulu ya');
        goBtn.disabled = true;
        goBtn.textContent = 'MENGUNGGAH...';
        try {
            const data = await toJpeg(f);
            const r = await api('upload', { method: 'POST', body: { data } });
            urlEl.value = r.url;
            openA.href = r.url;
            outBox.hidden = false;
            toast('Link siap ✨');
        } catch (err) {
            toast(err.message);
        }
        goBtn.disabled = false;
        goBtn.textContent = 'BUAT LINK';
    });

    $('#linkCopy', sec).addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(urlEl.value);
            toast('Link disalin');
        } catch (e) {
            urlEl.select();
            document.execCommand('copy');
            toast('Link disalin');
        }
    });
    urlEl.addEventListener('focus', () => urlEl.select());

    /* ---------- Selesai: sinkronkan tampilan ---------- */
    if (typeof moveIndicator === 'function') moveIndicator();
    if (location.hash === '#tools') showPage('tools');
})();
