/* =====================================================
   OOC Circle - Tools PDF
   1. Foto ke PDF : 1 atau banyak foto -> 1 file PDF
   2. Word ke PDF : file .docx -> PDF (maks 100 MB)
   Semua diproses di browser (file tidak diunggah ke server).
   Dimuat SETELAH studio.js dan SEBELUM notify.js.
   ===================================================== */
(function () {
    const sec = document.getElementById('page-tools');
    const tabs = sec && sec.querySelector('.tool-tabs');
    if (!sec || !tabs || typeof toast !== 'function') return;

    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'pdf.css';
    document.head.appendChild(css);

    const MAX_BYTES = 100 * 1024 * 1024;   // batas 100 MB

    /*PDF_START*/
    // Susun file PDF dari daftar halaman bergambar JPEG.
    // pages[i] = { w, h, x, y, dw, dh (satuan pt), iw, ih (piksel gambar), bytes (JPEG) }
    function buildPdf(pages) {
        const enc = new TextEncoder();
        const chunks = [];
        let len = 0;
        const offsets = [];
        const push = d => {
            const u = typeof d === 'string' ? enc.encode(d) : d;
            chunks.push(u);
            len += u.length;
        };
        const num = n => String(Math.round(n * 100) / 100);
        const obj = id => { offsets[id] = len; push(id + ' 0 obj\n'); };
        const n = pages.length;
        const d = new Date();
        const p2 = v => String(v).padStart(2, '0');
        const stamp = d.getUTCFullYear() + p2(d.getUTCMonth() + 1) + p2(d.getUTCDate()) + p2(d.getUTCHours()) + p2(d.getUTCMinutes()) + p2(d.getUTCSeconds());

        push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
        obj(1); push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
        obj(2); push('<< /Type /Pages /Count ' + n + ' /Kids [' + pages.map((_, i) => (4 + 3 * i) + ' 0 R').join(' ') + '] >>\nendobj\n');
        obj(3); push('<< /Producer (OOC Circle) /CreationDate (D:' + stamp + 'Z) >>\nendobj\n');
        pages.forEach((p, i) => {
            const pg = 4 + 3 * i, ct = pg + 1, im = pg + 2;
            obj(pg);
            push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + num(p.w) + ' ' + num(p.h) + '] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>\nendobj\n');
            const content = 'q ' + num(p.dw) + ' 0 0 ' + num(p.dh) + ' ' + num(p.x) + ' ' + num(p.y) + ' cm /Im0 Do Q';
            obj(ct);
            push('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');
            obj(im);
            push('<< /Type /XObject /Subtype /Image /Width ' + p.iw + ' /Height ' + p.ih + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.bytes.length + ' >>\nstream\n');
            push(p.bytes);
            push('\nendstream\nendobj\n');
        });
        const xref = len, total = 4 + 3 * n;
        let x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
        for (let id = 1; id < total; id++) x += String(offsets[id]).padStart(10, '0') + ' 00000 n \n';
        x += 'trailer\n<< /Size ' + total + ' /Root 1 0 R /Info 3 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
        push(x);
        return new Blob(chunks, { type: 'application/pdf' });
    }

    // Posisi gambar di halaman. opt = { size: 'fit'|'a4'|'letter', orient: 'auto'|'p'|'l', margin (pt) }
    function layoutPage(iw, ih, opt) {
        if (opt.size === 'fit') {
            const k = 842 / Math.max(iw, ih);
            return { w: iw * k, h: ih * k, x: 0, y: 0, dw: iw * k, dh: ih * k };
        }
        let W = opt.size === 'letter' ? 612 : 595.28;
        let H = opt.size === 'letter' ? 792 : 841.89;
        const land = opt.orient === 'l' || (opt.orient === 'auto' && iw > ih);
        if (land) { const t = W; W = H; H = t; }
        const m = opt.margin || 0;
        const k = Math.min((W - 2 * m) / iw, (H - 2 * m) / ih);
        const dw = iw * k, dh = ih * k;
        return { w: W, h: H, x: (W - dw) / 2, y: (H - dh) / 2, dw, dh };
    }
    /*PDF_END*/

    /* =====================================================
       UTIL
       ===================================================== */
    const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtSize = b => b >= 1048576 ? (b / 1048576).toFixed(b >= 10485760 ? 0 : 1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
    const stampName = () => {
        const d = new Date(), p = n => String(n).padStart(2, '0');
        return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
    };
    const safeName = s => String(s || '').replace(/\.[^.]+$/, '').replace(/[^\w\- ]+/g, '').trim().slice(0, 60);
    const canvasJpeg = (c, q) => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Gagal membuat gambar halaman.')), 'image/jpeg', q));

    let urls = [];
    const mkUrl = b => { const u = URL.createObjectURL(b); urls.push(u); return u; };

    // Tampilkan hasil (unduh + bagikan)
    function showResult(box, blob, name, info) {
        const dl = box.querySelector('[data-dl]'), sh = box.querySelector('[data-share]'), inf = box.querySelector('[data-info]');
        dl.href = mkUrl(blob);
        dl.download = name;
        inf.textContent = name + ' · ' + info + ' · ' + fmtSize(blob.size);
        const file = new File([blob], name, { type: 'application/pdf' });
        sh.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
        sh.onclick = () => navigator.share({ files: [file] }).catch(() => {});
        box.hidden = false;
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /* =====================================================
       TAB + PANEL
       ===================================================== */
    tabs.insertAdjacentHTML('beforeend',
        '<button class="btn" type="button" data-tool="img2pdf" role="tab" aria-selected="false">FOTO KE PDF</button>' +
        '<button class="btn" type="button" data-tool="doc2pdf" role="tab" aria-selected="false">WORD KE PDF</button>');

    const resultHtml = `
        <div class="pd-out" data-out hidden>
            <div class="pd-ok">✅ PDF siap</div>
            <p class="hint" data-info></p>
            <div class="btn-row">
                <a class="btn btn-primary" data-dl>UNDUH PDF</a>
                <button class="btn" data-share type="button" hidden>BAGIKAN</button>
            </div>
        </div>`;

    sec.insertAdjacentHTML('beforeend', `
        <div class="tool-panel card pdf-panel" id="tool-img2pdf" hidden>
            <h3 class="pd-title">FOTO KE PDF</h3>
            <p class="hint">Pilih 1 atau lebih foto, atur urutannya, lalu gabung jadi 1 file PDF. Maksimal total 100 MB.</p>

            <label class="btn btn-primary btn-block" for="ipFiles">＋ PILIH FOTO</label>
            <input type="file" id="ipFiles" accept="image/*" multiple hidden>

            <p class="pd-sum" id="ipSum" hidden></p>
            <div class="pd-list" id="ipList"></div>

            <div class="pd-opts" id="ipOpts" hidden>
                <div class="field">
                    <label for="ipSize">Ukuran halaman</label>
                    <select class="input" id="ipSize">
                        <option value="fit">Sesuai foto (tanpa batas putih)</option>
                        <option value="a4" selected>A4</option>
                        <option value="letter">Letter</option>
                    </select>
                </div>
                <div class="pd-row">
                    <div class="field">
                        <label for="ipOri">Orientasi</label>
                        <select class="input" id="ipOri">
                            <option value="auto" selected>Otomatis</option>
                            <option value="p">Tegak</option>
                            <option value="l">Mendatar</option>
                        </select>
                    </div>
                    <div class="field">
                        <label for="ipMar">Margin</label>
                        <select class="input" id="ipMar">
                            <option value="0">Tanpa</option>
                            <option value="18" selected>Kecil</option>
                            <option value="36">Sedang</option>
                        </select>
                    </div>
                </div>
                <div class="field">
                    <label for="ipName">Nama file (opsional)</label>
                    <input class="input" id="ipName" type="text" maxlength="60" placeholder="Contoh: Tugas Kelompok">
                </div>
            </div>

            <div class="pd-bar" id="ipBar" hidden><i></i></div>
            <button class="btn btn-primary btn-block" id="ipGo" type="button" disabled>PILIH FOTO DULU</button>
            ${resultHtml.replace('data-out', 'id="ipOut"')}
        </div>

        <div class="tool-panel card pdf-panel" id="tool-doc2pdf" hidden>
            <h3 class="pd-title">WORD KE PDF</h3>
            <p class="hint">Pilih file Word <b>.docx</b>, maksimal 100 MB. Diproses di browser kamu, file tidak diunggah ke server.</p>

            <div class="field">
                <label for="wdFile">File Word</label>
                <input class="input" type="file" id="wdFile" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
            </div>
            <div class="pd-file" id="wdInfo" hidden></div>

            <div class="field">
                <label for="wdQ">Ketajaman</label>
                <select class="input" id="wdQ">
                    <option value="1.4">Hemat (file lebih kecil)</option>
                    <option value="2" selected>Standar</option>
                    <option value="3">Tajam (file lebih besar)</option>
                </select>
            </div>

            <div class="pd-bar" id="wdBar" hidden><i></i></div>
            <p class="hint" id="wdStatus" hidden></p>
            <button class="btn btn-primary btn-block" id="wdGo" type="button" disabled>PILIH FILE DULU</button>
            <button class="btn btn-block" id="wdCancel" type="button" hidden>BATAL</button>
            ${resultHtml.replace('data-out', 'id="wdOut"')}

            <div class="pd-alt" id="wdAlt" hidden>
                <button class="btn btn-block" id="wdPrint" type="button">CETAK / SIMPAN (TEKS BISA DISALIN)</button>
                <p class="hint">Alternatif: pilih "Simpan sebagai PDF" di jendela cetak. Hasilnya berupa teks asli, bukan gambar.</p>
            </div>
            <p class="hint pd-note">Hanya format .docx (Word 2007 ke atas). Font yang tidak ada di HP diganti otomatis, jadi tata letak bisa sedikit berbeda dari aslinya.</p>
        </div>`);

    const panels = { img2pdf: $('#tool-img2pdf', sec), doc2pdf: $('#tool-doc2pdf', sec) };
    tabs.addEventListener('click', e => {
        const b = e.target.closest('.btn');
        if (!b) return;
        const t = b.dataset.tool;
        Object.keys(panels).forEach(k => { panels[k].hidden = k !== t; });
    });

    /* =====================================================
       FOTO KE PDF
       ===================================================== */
    const ipFiles = $('#ipFiles', sec), ipList = $('#ipList', sec), ipSum = $('#ipSum', sec);
    const ipOpts = $('#ipOpts', sec), ipGo = $('#ipGo', sec), ipBar = $('#ipBar', sec), ipOut = $('#ipOut', sec);
    let items = [];       // { id, file, rot, url }
    let nextId = 1;
    let ipBusy = false;

    const totalBytes = () => items.reduce((a, it) => a + it.file.size, 0);

    function renderItems() {
        ipOut.hidden = true;
        ipList.innerHTML = items.map((it, i) => `
            <div class="pd-item" data-id="${it.id}">
                <div class="pd-thumb"><img src="${it.url}" alt="" style="transform:rotate(${it.rot * 90}deg)"></div>
                <div class="pd-name"><b>${h(it.file.name)}</b><small>Halaman ${i + 1} · ${fmtSize(it.file.size)}</small></div>
                <div class="pd-acts">
                    <button type="button" data-act="up" aria-label="Naikkan" ${i === 0 ? 'disabled' : ''}>↑</button>
                    <button type="button" data-act="down" aria-label="Turunkan" ${i === items.length - 1 ? 'disabled' : ''}>↓</button>
                    <button type="button" data-act="rot" aria-label="Putar 90 derajat">↻</button>
                    <button type="button" data-act="del" aria-label="Hapus">✕</button>
                </div>
            </div>`).join('');
        const n = items.length;
        ipSum.hidden = n === 0;
        ipSum.textContent = n + ' foto · ' + fmtSize(totalBytes()) + ' (maks 100 MB)';
        ipOpts.hidden = n === 0;
        if (!ipBusy) {
            ipGo.disabled = n === 0;
            ipGo.textContent = n ? 'BUAT PDF (' + n + ' HALAMAN)' : 'PILIH FOTO DULU';
        }
    }

    ipFiles.addEventListener('change', () => {
        const added = [...ipFiles.files];
        ipFiles.value = '';
        let skipped = 0, tooBig = 0;
        added.forEach(f => {
            if (!f.type.startsWith('image/')) { skipped++; return; }
            if (totalBytes() + f.size > MAX_BYTES) { tooBig++; return; }
            items.push({ id: nextId++, file: f, rot: 0, url: URL.createObjectURL(f) });
        });
        renderItems();
        if (tooBig) toast(tooBig + ' foto tidak ditambah (total melebihi 100 MB)');
        else if (skipped) toast(skipped + ' file bukan foto, dilewati');
    });

    ipList.addEventListener('click', e => {
        const b = e.target.closest('button[data-act]');
        if (!b || ipBusy) return;
        const row = b.closest('.pd-item');
        const i = items.findIndex(x => x.id === +row.dataset.id);
        if (i < 0) return;
        const act = b.dataset.act;
        if (act === 'up' && i > 0) [items[i - 1], items[i]] = [items[i], items[i - 1]];
        else if (act === 'down' && i < items.length - 1) [items[i + 1], items[i]] = [items[i], items[i + 1]];
        else if (act === 'rot') items[i].rot = (items[i].rot + 1) % 4;
        else if (act === 'del') { URL.revokeObjectURL(items[i].url); items.splice(i, 1); }
        renderItems();
    });

    function loadImg(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Foto "' + file.name + '" tidak bisa dibaca. Pakai JPG/PNG (HEIC belum didukung).')); };
            img.src = url;
        });
    }

    // Foto -> JPEG (maks 3000 px sisi terpanjang), sudah diputar sesuai pilihan
    async function photoToJpeg(it) {
        const img = await loadImg(it.file);
        const sw = img.naturalWidth, sh = img.naturalHeight;
        const k = Math.min(1, 3000 / Math.max(sw, sh));
        const dw = Math.round(sw * k), dh = Math.round(sh * k);
        const swap = it.rot % 2 === 1;
        const c = document.createElement('canvas');
        c.width = swap ? dh : dw;
        c.height = swap ? dw : dh;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.translate(c.width / 2, c.height / 2);
        ctx.rotate(it.rot * Math.PI / 2);
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        const blob = await canvasJpeg(c, 0.9);
        const out = { bytes: new Uint8Array(await blob.arrayBuffer()), iw: c.width, ih: c.height };
        c.width = c.height = 0;
        return out;
    }

    ipGo.addEventListener('click', async () => {
        if (!items.length || ipBusy) return;
        ipBusy = true;
        ipGo.disabled = true;
        ipOut.hidden = true;
        ipBar.hidden = false;
        const opt = { size: $('#ipSize', sec).value, orient: $('#ipOri', sec).value, margin: +$('#ipMar', sec).value };
        const bar = ipBar.firstElementChild;
        try {
            const pages = [];
            for (let i = 0; i < items.length; i++) {
                ipGo.textContent = 'MEMPROSES ' + (i + 1) + '/' + items.length + '...';
                bar.style.width = Math.round(i / items.length * 100) + '%';
                await new Promise(r => setTimeout(r, 20));   // beri napas ke tampilan
                const img = await photoToJpeg(items[i]);
                pages.push(Object.assign(layoutPage(img.iw, img.ih, opt), img));
            }
            ipGo.textContent = 'MENYUSUN PDF...';
            bar.style.width = '100%';
            const blob = buildPdf(pages);
            const name = (safeName($('#ipName', sec).value) || 'Foto_' + stampName()) + '.pdf';
            showResult(ipOut, blob, name, pages.length + ' halaman');
            toast('PDF jadi ✨');
        } catch (err) {
            toast(err.message || 'Gagal membuat PDF');
        }
        ipBusy = false;
        ipBar.hidden = true;
        bar.style.width = '0';
        renderItems();
        ipOut.hidden = !ipOut.querySelector('[data-dl]').href;
    });

    /* =====================================================
       WORD KE PDF
       ===================================================== */
    const LIBS = {
        JSZip: ['https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'],
        docx: ['https://cdn.jsdelivr.net/npm/docx-preview@0.3/dist/docx-preview.min.js', 'https://unpkg.com/docx-preview@0.3/dist/docx-preview.min.js'],
        html2canvas: ['https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js']
    };
    function addScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => { s.remove(); reject(new Error('gagal')); };
            document.head.appendChild(s);
        });
    }
    async function loadLib(name) {
        if (window[name]) return;
        for (const src of LIBS[name]) {
            try { await addScript(src); if (window[name]) return; } catch (e) { /* coba sumber berikutnya */ }
        }
        throw new Error('Gagal memuat komponen konversi. Cek koneksi internet lalu coba lagi.');
    }
    async function loadDocLibs() {
        await loadLib('JSZip');
        await loadLib('docx');
    }

    const wdFile = $('#wdFile', sec), wdInfo = $('#wdInfo', sec), wdGo = $('#wdGo', sec);
    const wdBar = $('#wdBar', sec), wdStatus = $('#wdStatus', sec), wdCancel = $('#wdCancel', sec);
    const wdOut = $('#wdOut', sec), wdAlt = $('#wdAlt', sec);
    let docFile = null, wdBusy = false, wdStop = false;
    let printRoot = null;

    const setStatus = t => { wdStatus.hidden = !t; wdStatus.textContent = t || ''; };
    const setBar = p => { wdBar.hidden = p == null; if (p != null) wdBar.firstElementChild.style.width = Math.round(p) + '%'; };

    async function isZip(file) {
        const b = new Uint8Array(await file.slice(0, 4).arrayBuffer());
        return b[0] === 0x50 && b[1] === 0x4B;   // "PK"
    }

    wdFile.addEventListener('change', async () => {
        const f = wdFile.files[0];
        docFile = null;
        wdOut.hidden = true;
        wdInfo.hidden = true;
        wdAlt.hidden = true;
        wdGo.disabled = true;
        wdGo.textContent = 'PILIH FILE DULU';
        if (!f) return;
        if (/\.doc$/i.test(f.name)) return toast('Format .doc lama belum didukung. Simpan ulang sebagai .docx di Word.');
        if (!/\.docx$/i.test(f.name)) return toast('Pilih file Word berformat .docx');
        if (f.size > MAX_BYTES) return toast('File ' + fmtSize(f.size) + ' melebihi batas 100 MB');
        if (!(await isZip(f))) return toast('File bukan .docx yang valid');
        docFile = f;
        wdInfo.hidden = false;
        wdInfo.innerHTML = '📄 <b>' + h(f.name) + '</b><small>' + fmtSize(f.size) + '</small>';
        wdGo.disabled = false;
        wdGo.textContent = 'UBAH KE PDF';
        wdAlt.hidden = false;
    });

    const RENDER_OPTS = {
        className: 'docx', inWrapper: true, breakPages: true, ignoreLastRenderedPageBreak: false,
        renderHeaders: true, renderFooters: true, renderFootnotes: true, renderEndnotes: true,
        useBase64URL: true
    };

    wdCancel.addEventListener('click', () => { wdStop = true; wdCancel.disabled = true; setStatus('Membatalkan...'); });

    wdGo.addEventListener('click', async () => {
        if (!docFile || wdBusy) return;
        wdBusy = true; wdStop = false;
        wdGo.disabled = true; wdCancel.hidden = false; wdCancel.disabled = false;
        wdOut.hidden = true;
        const scale = +$('#wdQ', sec).value || 2;
        let host = null;
        try {
            setBar(2); setStatus('Memuat komponen...');
            await loadDocLibs();
            await loadLib('html2canvas');
            if (wdStop) throw new Error('Dibatalkan');

            setStatus('Membaca dokumen...'); setBar(6);
            const buf = await docFile.arrayBuffer();
            host = document.createElement('div');
            host.id = 'wdHost';
            document.body.appendChild(host);
            await window.docx.renderAsync(buf, host, null, RENDER_OPTS);
            await new Promise(r => setTimeout(r, 350));   // beri waktu gambar & font selesai

            const secs = [...host.querySelectorAll('section.docx')];
            if (!secs.length) throw new Error('Dokumen kosong atau tidak bisa dibaca.');

            const pages = [];
            for (let i = 0; i < secs.length; i++) {
                if (wdStop) throw new Error('Dibatalkan');
                setStatus('Mengubah halaman ' + (i + 1) + ' dari ' + secs.length + '...');
                setBar(10 + i / secs.length * 88);
                await new Promise(r => setTimeout(r, 20));
                const el = secs[i];
                const r = el.getBoundingClientRect();
                const canvas = await window.html2canvas(el, { scale, backgroundColor: '#ffffff', useCORS: true, logging: false });
                const blob = await canvasJpeg(canvas, 0.88);
                const wpt = r.width * 0.75, hpt = r.height * 0.75;   // px CSS -> pt
                pages.push({ w: wpt, h: hpt, x: 0, y: 0, dw: wpt, dh: hpt, iw: canvas.width, ih: canvas.height, bytes: new Uint8Array(await blob.arrayBuffer()) });
                canvas.width = canvas.height = 0;
            }
            setStatus('Menyusun PDF...'); setBar(99);
            const pdf = buildPdf(pages);
            const name = (safeName(docFile.name) || 'Dokumen') + '.pdf';
            showResult(wdOut, pdf, name, pages.length + ' halaman');
            toast('PDF jadi ✨');
        } catch (err) {
            const m = err && err.message;
            toast(m === 'Dibatalkan' ? 'Dibatalkan' : (m || 'Gagal mengubah ke PDF. Dokumen mungkin terlalu berat untuk perangkat ini.'));
        }
        if (host) host.remove();
        wdBusy = false;
        wdGo.disabled = !docFile;
        wdCancel.hidden = true;
        setStatus(''); setBar(null);
    });

    // Alternatif: cetak -> "Simpan sebagai PDF" (teks tetap berupa teks)
    $('#wdPrint', sec).addEventListener('click', async () => {
        if (!docFile || wdBusy) return;
        wdBusy = true;
        const btn = $('#wdPrint', sec);
        const label = btn.textContent;
        btn.disabled = true;
        try {
            btn.textContent = 'MEMUAT...';
            await loadDocLibs();
            if (printRoot) printRoot.remove();
            printRoot = document.createElement('div');
            printRoot.id = 'wdPrintRoot';
            document.body.appendChild(printRoot);
            await window.docx.renderAsync(await docFile.arrayBuffer(), printRoot, null, RENDER_OPTS);
            await new Promise(r => setTimeout(r, 350));
            document.documentElement.classList.add('wd-printing');
            const done = () => {
                document.documentElement.classList.remove('wd-printing');
                if (printRoot) { printRoot.remove(); printRoot = null; }
                window.removeEventListener('afterprint', done);
            };
            window.addEventListener('afterprint', done);
            window.print();
        } catch (err) {
            toast(err.message || 'Gagal menyiapkan dokumen untuk dicetak');
            document.documentElement.classList.remove('wd-printing');
            if (printRoot) { printRoot.remove(); printRoot = null; }
        }
        btn.disabled = false;
        btn.textContent = label;
        wdBusy = false;
    });
})();
