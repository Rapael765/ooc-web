/* =====================================================
   OOC Circle - Studio
   Menambah 2 tool ke halaman Tools:
   1. Motion Photo Studio (foto JPG + video MP4 -> 1 file Motion Photo)
   2. iPhone Quote Chat   (screenshot chat 1:1 + mode 3D Cinema)
   Dimuat SETELAH tools.js. Semua proses jalan di browser
   (tidak butuh API / Supabase baru).
   ===================================================== */
(function () {
    const sec = document.getElementById('page-tools');
    const tabs = sec && sec.querySelector('.tool-tabs');
    if (!sec || !tabs || typeof toast !== 'function') return;

    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'studio.css';
    document.head.appendChild(css);

    /* =====================================================
       TAB + PANEL
       ===================================================== */
    tabs.insertAdjacentHTML('beforeend',
        '<button class="btn" type="button" data-tool="motion" role="tab" aria-selected="false">MOTION PHOTO</button>' +
        '<button class="btn" type="button" data-tool="quote" role="tab" aria-selected="false">QUOTE CHAT</button>');

    sec.insertAdjacentHTML('beforeend', `
        <div class="tool-panel card studio-panel" id="tool-motion" hidden>
            <h3 class="st-title">MOTION PHOTO STUDIO</h3>
            <p class="hint">Foto + video pendek (2–3 detik, kayak Live Photo iPhone) jadi 1 file JPG. Gerak terbaca di Google Photos (Pixel), Xiaomi, OPPO/Realme.</p>

            <div class="ms-cam">
                <small>Mode kamera · cepat</small>
                <b>Rekam langsung, 1x pencet</b>
                <p>Rekam 2–3 detik. Frame HD otomatis diambil dari detik pertama, lalu langsung digabung jadi Motion Photo.</p>
                <label class="btn btn-block" for="msCam">● REKAM DARI KAMERA</label>
                <input type="file" id="msCam" accept="video/*" capture="environment" hidden>
            </div>

            <div class="ms-step">
                <span class="ms-num">1</span>
                <div class="ms-txt"><b>Pilih foto</b><small>Foto dasar (JPG) – bagian diam</small></div>
                <label class="btn btn-primary btn-sm" for="msPhoto">PILIH FOTO</label>
                <input type="file" id="msPhoto" accept="image/*" hidden>
            </div>
            <div class="ms-step">
                <span class="ms-num">2</span>
                <div class="ms-txt"><b>Pilih video</b><small>Video gerak (MP4, 2–3 detik)</small></div>
                <label class="btn btn-primary btn-sm" for="msVideo">PILIH VIDEO</label>
                <input type="file" id="msVideo" accept="video/mp4,video/*" hidden>
            </div>

            <div class="ms-prev" id="msPrev" hidden>
                <img id="msPrevImg" alt="Pratinjau foto">
                <video id="msPrevVid" muted loop playsinline autoplay></video>
            </div>

            <label class="ms-check">
                <input type="checkbox" id="msRhythm">
                <span>Ritme: diam–gerak–diam <small>(render ekstra, lebih lambat, butuh Chrome terbaru)</small></span>
            </label>

            <button class="btn btn-primary btn-block" id="msGo" type="button" disabled>LENGKAPI FOTO &amp; VIDEO</button>

            <div class="ms-out" id="msOut" hidden>
                <video id="msOutVid" muted loop playsinline autoplay></video>
                <p class="hint" id="msInfo"></p>
                <div class="btn-row">
                    <a class="btn btn-primary" id="msDl">UNDUH JPG</a>
                    <button class="btn" id="msShare" type="button" hidden>BAGIKAN</button>
                </div>
                <p class="hint">Kirim sebagai <b>file / dokumen</b>. Kalau dikirim sebagai foto biasa, WhatsApp &amp; IG mengompres dan gerakannya hilang.</p>
            </div>
        </div>

        <div class="tool-panel card studio-panel" id="tool-quote" hidden>
            <h3 class="st-title">IPHONE QUOTE CHAT</h3>
            <div class="iq-modes" role="tablist">
                <button class="btn on" type="button" data-mode="flat" role="tab" aria-selected="true">SCREENSHOT ASLI</button>
                <button class="btn" type="button" data-mode="3d" role="tab" aria-selected="false">3D CINEMA (JJ)</button>
            </div>

            <div class="iq-view">
                <img class="iq-flat" id="iqFlat" alt="Hasil screenshot chat">
                <canvas class="iq-stage" id="iqAnim" width="432" height="768" hidden aria-label="Pratinjau chat dalam HP 3D"></canvas>
            </div>
            <p class="hint" id="iqHint">Screenshot 1:1 gaya iPhone. Tekan UNDUH PNG untuk menyimpan.</p>
            <div class="btn-row">
                <button class="btn btn-primary" id="iqDl" type="button">UNDUH PNG</button>
                <button class="btn" id="iqDlVid" type="button" hidden>UNDUH VIDEO 3D</button>
            </div>

            <div class="iq-form">
                <div class="field"><label for="iqName">Nama kontak</label><input class="input" id="iqName" value="Farhan Ahmad" maxlength="30"></div>
                <div class="field"><label for="iqStatus">Status</label><input class="input" id="iqStatus" value="online" maxlength="30"></div>
                <div class="field"><label for="iqMsg">Pesan</label><textarea class="input" id="iqMsg" maxlength="300">halo</textarea></div>
                <div class="iq-row">
                    <div class="field"><label for="iqTime">Jam</label><input class="input" id="iqTime" value="23:53" maxlength="5"></div>
                    <div class="field"><label for="iqBat">Baterai %</label><input class="input" id="iqBat" type="number" min="1" max="100" value="95"></div>
                    <div class="field"><label for="iqBadge">Chat belum dibaca</label><input class="input" id="iqBadge" value="29" maxlength="4"></div>
                </div>
                <div class="field"><label for="iqCar">Operator</label><input class="input" id="iqCar" value="TRI... LTE" maxlength="16"></div>
                <label class="ms-check"><input type="checkbox" id="iqReact" checked><span>Tampilkan bar reaksi emoji</span></label>
                <label class="ms-check"><input type="checkbox" id="iqMenu" checked><span>Tampilkan menu pesan (Balas, Teruskan, …)</span></label>
            </div>
        </div>`);

    const mine = { motion: $('#tool-motion', sec), quote: $('#tool-quote', sec) };
    tabs.addEventListener('click', e => {
        const b = e.target.closest('.btn');
        if (!b) return;
        const t = b.dataset.tool;
        $$('.btn', tabs).forEach(x => {
            const on = x === b;
            x.classList.toggle('on', on);
            x.setAttribute('aria-selected', on);
        });
        ['calc', 'link', 'motion', 'quote'].forEach(k => {
            const p = $('#tool-' + k, sec);
            if (p) p.hidden = k !== t;
        });
        if (t === 'quote') { renderQuote(); startAnim(); }
    });

    /* =====================================================
       MOTION PHOTO STUDIO
       ===================================================== */
    /*BUILD_START*/
    function makeXmp(videoLen, tsUs) {
        return '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>\n' +
            '<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="OOC Motion Photo Studio">' +
            '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
            '<rdf:Description rdf:about=""' +
            ' xmlns:GCamera="http://ns.google.com/photos/1.0/camera/"' +
            ' xmlns:Container="http://ns.google.com/photos/1.0/container/"' +
            ' xmlns:Item="http://ns.google.com/photos/1.0/container/item/"' +
            ' GCamera:MotionPhoto="1"' +
            ' GCamera:MotionPhotoVersion="1"' +
            ' GCamera:MotionPhotoPresentationTimestampUs="' + tsUs + '"' +
            ' GCamera:MicroVideo="1"' +
            ' GCamera:MicroVideoVersion="1"' +
            ' GCamera:MicroVideoOffset="' + videoLen + '"' +
            ' GCamera:MicroVideoPresentationTimestampUs="' + tsUs + '">' +
            '<Container:Directory><rdf:Seq>' +
            '<rdf:li rdf:parseType="Resource"><Container:Item Item:Mime="image/jpeg" Item:Semantic="Primary" Item:Length="0" Item:Padding="0"/></rdf:li>' +
            '<rdf:li rdf:parseType="Resource"><Container:Item Item:Mime="video/mp4" Item:Semantic="MotionPhoto" Item:Length="' + videoLen + '" Item:Padding="0"/></rdf:li>' +
            '</rdf:Seq></Container:Directory>' +
            '</rdf:Description></rdf:RDF></x:xmpmeta>\n' +
            '<?xpacket end="w"?>';
    }

    // JPEG + XMP (APP1) + MP4 di akhir file = Motion Photo
    async function buildMotionPhoto(jpegBlob, mp4Blob, tsUs) {
        const jpg = new Uint8Array(await jpegBlob.arrayBuffer());
        const vid = new Uint8Array(await mp4Blob.arrayBuffer());
        if (jpg[0] !== 0xFF || jpg[1] !== 0xD8) throw new Error('Foto bukan JPG yang valid.');
        const enc = new TextEncoder();
        const ns = enc.encode('http://ns.adobe.com/xap/1.0/\0');
        const xmp = enc.encode(makeXmp(vid.length, tsUs || 0));
        const segLen = 2 + ns.length + xmp.length;
        if (segLen > 65535) throw new Error('Metadata terlalu besar.');
        // sisipkan setelah SOI (dan setelah APP0/JFIF kalau ada)
        let pos = 2;
        if (jpg[2] === 0xFF && jpg[3] === 0xE0) pos = 4 + ((jpg[4] << 8) | jpg[5]);
        const head = new Uint8Array([0xFF, 0xE1, (segLen >> 8) & 255, segLen & 255]);
        return new Blob([jpg.subarray(0, pos), head, ns, xmp, jpg.subarray(pos), vid], { type: 'image/jpeg' });
    }
    /*BUILD_END*/

    const msCam = $('#msCam', sec), msPhoto = $('#msPhoto', sec), msVideo = $('#msVideo', sec);
    const msGo = $('#msGo', sec), msPrev = $('#msPrev', sec);
    const msPrevImg = $('#msPrevImg', sec), msPrevVid = $('#msPrevVid', sec);
    const msOut = $('#msOut', sec), msOutVid = $('#msOutVid', sec);
    const msDl = $('#msDl', sec), msShare = $('#msShare', sec), msInfo = $('#msInfo', sec);
    const msRhythm = $('#msRhythm', sec);

    let photoSrc = null;   // File / Blob foto
    let videoSrc = null;   // File video
    let urls = [];         // object URL untuk dibersihkan
    let busy = false;
    const mkUrl = b => { const u = URL.createObjectURL(b); urls.push(u); return u; };

    function loadVideo(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const v = document.createElement('video');
            v.muted = true;
            v.playsInline = true;
            v.preload = 'auto';
            v.onloadeddata = () => resolve({ v, url });
            v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Video tidak bisa dibaca. Pakai MP4 (H.264).')); };
            v.src = url;
        });
    }

    // Ambil frame HD dari awal video
    function frameFromVideo(v, t) {
        return new Promise((resolve, reject) => {
            const grab = () => {
                const w = v.videoWidth, h = v.videoHeight;
                if (!w || !h) return reject(new Error('Gagal mengambil frame video.'));
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(v, 0, 0, w, h);
                c.toBlob(b => b ? resolve(b) : reject(new Error('Gagal membuat foto dari video.')), 'image/jpeg', 0.95);
            };
            const target = Math.min(t, (v.duration || t) / 2);
            if (Math.abs(v.currentTime - target) < 0.001) return grab();
            v.onseeked = () => { v.onseeked = null; grab(); };
            v.currentTime = target;
        });
    }

    // Pastikan foto jadi JPEG bersih (tanpa metadata lama), maks 4096 px
    function toJpegBlob(file, max = 4096) {
        return new Promise((resolve, reject) => {
            const src = URL.createObjectURL(file);
            const img = new Image();
            img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('Foto tidak bisa dibaca. Coba format JPG atau PNG.')); };
            img.onload = () => {
                URL.revokeObjectURL(src);
                const r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
                const w = Math.round(img.naturalWidth * r), h = Math.round(img.naturalHeight * r);
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                const ctx = c.getContext('2d');
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                c.toBlob(b => b ? resolve(b) : reject(new Error('Gagal memproses foto.')), 'image/jpeg', 0.92);
            };
            img.src = src;
        });
    }

    // Ritme: diam -> gerak -> diam (render ulang video lewat MediaRecorder)
    async function renderRhythm(file, holdMs = 700) {
        if (typeof MediaRecorder === 'undefined') throw new Error('Browser ini belum bisa render ritme. Matikan opsi Ritme.');
        const mime = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4']
            .find(m => MediaRecorder.isTypeSupported(m));
        if (!mime) throw new Error('Browser ini belum bisa render MP4 untuk ritme. Matikan opsi Ritme atau pakai Chrome terbaru.');
        const { v, url } = await loadVideo(file);
        try {
            let w = v.videoWidth, h = v.videoHeight;
            const r = Math.min(1, 1280 / Math.max(w, h));
            w = Math.round(w * r / 2) * 2; h = Math.round(h * r / 2) * 2;
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const ctx = c.getContext('2d');
            const draw = () => ctx.drawImage(v, 0, 0, w, h);

            v.currentTime = 0;
            await new Promise(res => { v.onseeked = () => { v.onseeked = null; res(); }; setTimeout(res, 400); });
            draw();

            const rec = new MediaRecorder(c.captureStream(30), { mimeType: mime, videoBitsPerSecond: 6000000 });
            const chunks = [];
            rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
            const stopped = new Promise(res => { rec.onstop = res; });
            const hold = ms => new Promise(res => {
                const t0 = performance.now();
                (function f() { draw(); (performance.now() - t0 < ms) ? requestAnimationFrame(f) : res(); })();
            });

            rec.start();
            await hold(holdMs);
            const ended = new Promise(res => { v.onended = res; });
            await v.play();
            (function f() { draw(); if (!v.ended) requestAnimationFrame(f); })();
            await ended;
            draw();
            await hold(holdMs);
            rec.stop();
            await stopped;
            return new Blob(chunks, { type: 'video/mp4' });
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    async function checkMp4(blob) {
        if (blob.size > 25 * 1024 * 1024) throw new Error('Video terlalu besar (maks 25 MB). Pakai video 2–3 detik.');
        const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
        const tag = String.fromCharCode(head[4], head[5], head[6], head[7]);
        if (tag !== 'ftyp') throw new Error('Video harus berformat MP4 (H.264). Coba rekam ulang atau konversi dulu.');
        const brand = String.fromCharCode(head[8], head[9], head[10], head[11]);
        if (brand.startsWith('qt')) toast('Video format MOV, kalau gerak tidak jalan konversi ke MP4 dulu');
    }

    function setGo(label, disabled) {
        msGo.textContent = label;
        msGo.disabled = disabled;
    }
    function refreshGo() {
        if (busy) return;
        if (photoSrc && videoSrc) setGo('GABUNGKAN JADI MOTION PHOTO', false);
        else setGo('LENGKAPI FOTO & VIDEO', true);
    }

    function showPreview() {
        if (photoSrc) { msPrevImg.src = mkUrl(photoSrc); }
        if (videoSrc) { msPrevVid.src = mkUrl(videoSrc); msPrevVid.play().catch(() => {}); }
        msPrev.hidden = !(photoSrc || videoSrc);
        msPrevImg.hidden = !photoSrc;
        msPrevVid.hidden = !videoSrc;
    }

    async function checkDuration(file) {
        try {
            const { v, url } = await loadVideo(file);
            const d = v.duration;
            URL.revokeObjectURL(url);
            if (d > 4) toast('Video ' + d.toFixed(1) + ' detik. Sebaiknya 2–3 detik saja');
        } catch (e) { /* diabaikan, dicek lagi saat gabung */ }
    }

    msPhoto.addEventListener('change', () => {
        const f = msPhoto.files[0];
        if (!f) return;
        photoSrc = f;
        msOut.hidden = true;
        showPreview();
        refreshGo();
    });
    msVideo.addEventListener('change', async () => {
        const f = msVideo.files[0];
        if (!f) return;
        videoSrc = f;
        msOut.hidden = true;
        showPreview();
        refreshGo();
        checkDuration(f);
    });

    // Mode kamera: rekam -> frame detik pertama jadi foto -> langsung gabung
    msCam.addEventListener('change', async () => {
        const f = msCam.files[0];
        if (!f) return;
        msOut.hidden = true;
        videoSrc = f;
        busy = true;
        setGo('MENGAMBIL FRAME HD...', true);
        try {
            const { v, url } = await loadVideo(f);
            try { photoSrc = await frameFromVideo(v, 0.05); }
            finally { URL.revokeObjectURL(url); }
        } catch (err) {
            busy = false;
            refreshGo();
            return toast(err.message);
        }
        busy = false;
        showPreview();
        merge();
    });

    async function merge() {
        if (busy || !photoSrc || !videoSrc) return;
        busy = true;
        msOut.hidden = true;
        try {
            setGo('MEMPROSES FOTO...', true);
            const jpeg = await toJpegBlob(photoSrc);
            let vid = videoSrc;
            await checkMp4(vid);
            if (msRhythm.checked) {
                setGo('RENDER RITME...', true);
                vid = await renderRhythm(videoSrc);
            }
            setGo('MENGGABUNG...', true);
            const out = await buildMotionPhoto(jpeg, vid, 0);

            const d = new Date();
            const p = n => String(n).padStart(2, '0');
            const name = `MVIMG_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.jpg`;
            const href = mkUrl(out);
            msDl.href = href;
            msDl.download = name;
            msOutVid.poster = mkUrl(jpeg);
            msOutVid.src = mkUrl(vid);
            msOutVid.play().catch(() => {});
            msInfo.textContent = name + ' · ' + (out.size / 1048576).toFixed(2) + ' MB';
            const file = new File([out], name, { type: 'image/jpeg' });
            msShare.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
            msShare.onclick = () => navigator.share({ files: [file] }).catch(() => {});
            msOut.hidden = false;
            msOut.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            toast('Motion Photo jadi ✨');
        } catch (err) {
            toast(err.message || 'Gagal membuat Motion Photo');
        }
        busy = false;
        refreshGo();
    }
    msGo.addEventListener('click', merge);

    /* =====================================================
       IPHONE QUOTE CHAT (digambar di canvas -> PNG)
       ===================================================== */
    /*WARP_START*/
    function rotMat(ax, ay, az) {
        const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay), cg = Math.cos(az), sg = Math.sin(az);
        const Ry = [[cb, 0, sb], [0, 1, 0], [-sb, 0, cb]];
        const Rx = [[1, 0, 0], [0, ca, -sa], [0, sa, ca]];
        const Rz = [[cg, -sg, 0], [sg, cg, 0], [0, 0, 1]];
        const mul = (P, Q) => P.map(r => [0, 1, 2].map(j => r[0] * Q[0][j] + r[1] * Q[1][j] + r[2] * Q[2][j]));
        return mul(Rz, mul(Rx, Ry));
    }
    // jarak bertanda ke persegi bulat (negatif = di dalam)
    function sdRR(x, y, hw, hh, r) {
        const qx = Math.abs(x) - (hw - r), qy = Math.abs(y) - (hh - r);
        const mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0;
        return Math.sqrt(mx * mx + my * my) + Math.min(Math.max(qx, qy), 0) - r;
    }
    // Gambar HP 3D (perspektif sungguhan) per piksel. tex = {data,w,h}; A,B = setengah lebar/tinggi layar.
    function warpPhone(tex, A, B, o, out) {
        const W = o.W, H = o.H, D = 1400, f = o.scale * D, cx = W / 2, cy = H / 2;
        const M = 12, a = A + M, b = B + M, Ro = 50, Rs = Ro - M;
        const R = rotMat(o.ax, o.ay, o.az);
        const n0 = R[0][2], n1 = R[1][2], n2 = R[2][2];
        const r00 = R[0][0], r10 = R[1][0], r20 = R[2][0], r01 = R[0][1], r11 = R[1][1], r21 = R[2][1];
        const td = tex.data, tw = tex.w, th = tex.h;
        out.fill(0);
        for (let py = 0; py < H; py++) {
            const uy = (py + 0.5 - cy) / f;
            for (let px = 0; px < W; px++) {
                const ux = (px + 0.5 - cx) / f;
                const den = n0 * ux + n1 * uy + n2;
                if (Math.abs(den) < 1e-6) continue;
                const t = D * n2 / den;
                if (t <= 0) continue;
                const Qx = t * ux, Qy = t * uy, Qz = t - D;
                const x = r00 * Qx + r10 * Qy + r20 * Qz;
                const y = r01 * Qx + r11 * Qy + r21 * Qz;
                const dO = sdRR(x, y, a, b, Ro);
                if (dO > 0) continue;
                const dS = sdRR(x, y, A, B, Rs);
                const i = (py * W + px) * 4;
                let r, g, bl;
                if (dS <= 0) {
                    const u = (x + A) / (2 * A) * tw - 0.5, v = (y + B) / (2 * B) * th - 0.5;
                    let x0 = Math.floor(u), y0 = Math.floor(v);
                    const fx = u - x0, fy = v - y0;
                    let x1 = x0 + 1, y1 = y0 + 1;
                    x0 = x0 < 0 ? 0 : x0 > tw - 1 ? tw - 1 : x0; x1 = x1 < 0 ? 0 : x1 > tw - 1 ? tw - 1 : x1;
                    y0 = y0 < 0 ? 0 : y0 > th - 1 ? th - 1 : y0; y1 = y1 < 0 ? 0 : y1 > th - 1 ? th - 1 : y1;
                    const i00 = (y0 * tw + x0) * 4, i10 = (y0 * tw + x1) * 4, i01 = (y1 * tw + x0) * 4, i11 = (y1 * tw + x1) * 4;
                    const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
                    r = td[i00] * w00 + td[i10] * w10 + td[i01] * w01 + td[i11] * w11;
                    g = td[i00 + 1] * w00 + td[i10 + 1] * w10 + td[i01 + 1] * w01 + td[i11 + 1] * w11;
                    bl = td[i00 + 2] * w00 + td[i10 + 2] * w10 + td[i01 + 2] * w01 + td[i11 + 2] * w11;
                    // kilau kaca diagonal
                    const gq = (x / A * 0.8 - y / B * 0.6 + 0.25) * 2.2;
                    const gl = 0.07 * Math.exp(-gq * gq);
                    r += (255 - r) * gl; g += (255 - g) * gl; bl += (255 - bl) * gl;
                } else if (dO > -3) {
                    const m = 105 + 45 * (x / a) - 25 * (y / b);   // pinggir logam
                    r = m; g = m + 2; bl = m + 8;
                } else if (dS < 2) {
                    r = g = bl = 6;                                  // garis hitam dalam
                } else {
                    const m = 30 - 10 * (y / b) + 8 * (x / a);
                    r = m; g = m + 1; bl = m + 5;
                }
                out[i] = r; out[i + 1] = g; out[i + 2] = bl; out[i + 3] = 255;
            }
        }
    }
    /*WARP_END*/

    const FONT = '-apple-system, "SF Pro Text", Roboto, "Segoe UI", Helvetica, Arial, sans-serif';
    const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

    function rr(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function wrapText(ctx, text, maxW) {
        const lines = [];
        text.split('\n').forEach(par => {
            let line = '';
            par.split(' ').forEach(w => {
                const t = line ? line + ' ' + w : w;
                if (ctx.measureText(t).width <= maxW) { line = t; return; }
                if (line) lines.push(line);
                let cur = w;
                while (ctx.measureText(cur).width > maxW && cur.length > 1) {
                    let k = cur.length - 1;
                    while (k > 1 && ctx.measureText(cur.slice(0, k)).width > maxW) k--;
                    lines.push(cur.slice(0, k));
                    cur = cur.slice(k);
                }
                line = cur;
            });
            lines.push(line);
        });
        return lines;
    }

    // ikon menu
    const icons = {
        star(ctx, cx, cy) {
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.8 : 10.5;
                ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            }
            ctx.closePath(); ctx.stroke();
        },
        reply(ctx, cx, cy) {
            ctx.beginPath();
            ctx.moveTo(cx - 11, cy - 1); ctx.lineTo(cx - 2, cy - 9); ctx.lineTo(cx - 2, cy - 4);
            ctx.bezierCurveTo(cx + 7, cy - 4, cx + 11, cy + 1, cx + 11, cy + 8);
            ctx.bezierCurveTo(cx + 8, cy + 3, cx + 3, cy + 1, cx - 2, cy + 1);
            ctx.lineTo(cx - 2, cy + 6); ctx.closePath(); ctx.fill();
        },
        fwd(ctx, cx, cy) {
            ctx.beginPath();
            ctx.moveTo(cx - 9, cy + 8); ctx.lineTo(cx - 9, cy + 1);
            ctx.quadraticCurveTo(cx - 9, cy - 5, cx - 3, cy - 5); ctx.lineTo(cx + 8, cy - 5);
            ctx.moveTo(cx + 3, cy - 10); ctx.lineTo(cx + 9, cy - 5); ctx.lineTo(cx + 3, cy);
            ctx.stroke();
        },
        copy(ctx, cx, cy, bg) {
            rr(ctx, cx - 4, cy - 10, 14, 16, 3); ctx.stroke();
            ctx.save(); ctx.fillStyle = bg; rr(ctx, cx - 10, cy - 5, 14, 16, 3); ctx.fill(); ctx.restore();
            rr(ctx, cx - 10, cy - 5, 14, 16, 3); ctx.stroke();
        },
        speak(ctx, cx, cy) {
            rr(ctx, cx - 11, cy - 9, 22, 16, 3); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - 5, cy + 7); ctx.lineTo(cx - 8, cy + 11); ctx.lineTo(cx - 8, cy + 7); ctx.stroke();
        },
        warn(ctx, cx, cy) {
            ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 11, cy + 9); ctx.lineTo(cx - 11, cy + 9); ctx.closePath(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx, cy - 3); ctx.lineTo(cx, cy + 3); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy + 6, 0.6, 0, 7); ctx.stroke();
        }
    };

    function drawQuote(cfg) {
        const W = 414, S = 3;
        const f = (w, s) => `${w} ${s}px ${FONT}`;

        // ukur dulu supaya tinggi kanvas pas
        const m = document.createElement('canvas').getContext('2d');
        m.font = f(400, 17);
        const lines = wrapText(m, cfg.msg || ' ', 250);
        const lh = 22;
        const textW = Math.max(...lines.map(l => m.measureText(l).width));
        m.font = f(400, 12);
        const timeW = m.measureText(cfg.time).width;
        const bw = Math.max(textW + 28, timeW + 28, 72);
        const bh = 12 + lines.length * lh + 26;

        let y = 112 + ((cfg.menu || cfg.react) ? 90 : 60);
        const reactY = y;
        if (cfg.react) y += 58 + 16;
        const bubY = y;
        y += bh + 8;
        const menuY = y;
        const menuH = 6 * 54;
        if (cfg.menu) y += menuH;
        const H = Math.max(Math.round(y + 36), 440);

        const c = document.createElement('canvas');
        c.width = W * S; c.height = Math.round(H * S);
        const ctx = c.getContext('2d');
        ctx.scale(S, S);
        ctx.textBaseline = 'middle';

        // latar chat
        ctx.fillStyle = '#080b0c';
        ctx.fillRect(0, 0, W, H);
        const g = ctx.createRadialGradient(W * 0.78, H * 0.42, 10, W * 0.78, H * 0.42, W * 0.9);
        g.addColorStop(0, 'rgba(18,70,44,0.38)');
        g.addColorStop(1, 'rgba(18,70,44,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 112, W, H - 112);

        // status bar
        ctx.fillStyle = '#0b0e10';
        ctx.fillRect(0, 0, W, 50);
        [5, 8, 11, 14].forEach((bhh, i) => {
            ctx.fillStyle = i < 3 ? '#fff' : 'rgba(255,255,255,0.35)';
            rr(ctx, 24 + i * 7, 34 - bhh, 5, bhh, 1.5); ctx.fill();
        });
        ctx.fillStyle = '#fff';
        ctx.font = f(500, 14); ctx.textAlign = 'left';
        ctx.fillText(cfg.carrier, 62, 28);
        ctx.font = f(700, 17); ctx.textAlign = 'center';
        ctx.fillText(cfg.time, W / 2, 28);
        // baterai
        const bat = Math.max(1, Math.min(100, cfg.bat));
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2;
        rr(ctx, W - 54, 21, 30, 15, 4.5); ctx.stroke();
        ctx.fillStyle = bat <= 20 ? '#ff453a' : '#34c759';
        rr(ctx, W - 52, 23, 26 * bat / 100, 11, 3); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        rr(ctx, W - 23, 26, 2.5, 5, 1); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = f(500, 14); ctx.textAlign = 'right';
        ctx.fillText(bat + '%', W - 62, 28);
        // ikon gembok
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(W - 100, 28, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#fff'; rr(ctx, W - 104, 28, 8, 6, 1.5); ctx.fill();
        ctx.beginPath(); ctx.arc(W - 100, 27.5, 2.6, Math.PI, 0); ctx.stroke();

        // header chat
        ctx.fillStyle = '#1b2327';
        ctx.fillRect(0, 50, W, 62);
        ctx.strokeStyle = '#2f8bff'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(30, 71); ctx.lineTo(22, 81); ctx.lineTo(30, 91); ctx.stroke();
        ctx.fillStyle = '#2f8bff'; ctx.font = f(400, 19); ctx.textAlign = 'left';
        ctx.fillText(cfg.badge, 38, 81);
        const ax = 38 + ctx.measureText(cfg.badge).width + 34;
        ctx.fillStyle = '#3a4248';
        ctx.beginPath(); ctx.arc(ax, 81, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9aa4ab';
        ctx.beginPath(); ctx.arc(ax, 75, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ax, 94, 11, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = f(700, 17);
        ctx.fillText(cfg.name, ax + 30, 74);
        ctx.fillStyle = '#25c488'; ctx.font = f(400, 14);
        ctx.fillText(cfg.status, ax + 30, 93);
        // ikon video & telepon
        ctx.fillStyle = '#2f8bff';
        rr(ctx, 318, 73, 22, 16, 4); ctx.fill();
        ctx.beginPath(); ctx.moveTo(342, 78); ctx.lineTo(352, 72); ctx.lineTo(352, 90); ctx.lineTo(342, 84); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#2f8bff'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(384, 82, 9, Math.PI * 0.62, Math.PI * 1.38, true); ctx.stroke();
        ctx.beginPath(); ctx.arc(384, 82, 9, Math.PI * 0.62, Math.PI * 1.38, false); ctx.stroke();
        ctx.lineWidth = 2;

        // bar reaksi
        if (cfg.react) {
            ctx.fillStyle = '#272a2c';
            rr(ctx, 14, reactY, 300, 58, 29); ctx.fill();
            ctx.font = `28px ${EMOJI_FONT}`; ctx.textAlign = 'center';
            ['👍', '❤️', '😂', '😮', '😢', '🙏'].forEach((e, i) => ctx.fillText(e, 44 + i * 48, reactY + 30));
        }

        // bubble pesan masuk
        ctx.fillStyle = '#1f2c34';
        rr(ctx, 16, bubY, bw, bh, 16); ctx.fill();
        ctx.textAlign = 'left'; ctx.fillStyle = '#e9edef'; ctx.font = f(400, 17);
        lines.forEach((l, i) => ctx.fillText(l, 30, bubY + 12 + i * lh + lh / 2));
        ctx.fillStyle = '#8696a0'; ctx.font = f(400, 12);
        ctx.fillText(cfg.time, 30, bubY + bh - 13);

        // menu pesan
        if (cfg.menu) {
            const mw = 280, bg = '#202123';
            ctx.fillStyle = bg;
            rr(ctx, 16, menuY, mw, menuH, 18); ctx.fill();
            const items = [['Beri Bintang', 'star'], ['Balas', 'reply'], ['Teruskan', 'fwd'], ['Salin', 'copy'], ['Ucapkan', 'speak'], ['Laporkan', 'warn']];
            items.forEach(([t, ic], i) => {
                const cy = menuY + i * 54 + 27;
                ctx.fillStyle = '#fff'; ctx.font = f(400, 18); ctx.textAlign = 'left';
                ctx.fillText(t, 36, cy);
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                icons[ic](ctx, 16 + mw - 30, cy, bg);
                if (i < items.length - 1) {
                    ctx.strokeStyle = '#3b3d40'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(36, menuY + (i + 1) * 54); ctx.lineTo(16 + mw, menuY + (i + 1) * 54); ctx.stroke();
                }
            });
        }
        return c;
    }

    /* ---------- render 3D ---------- */
    const STILL = { ax: 0.16, ay: -0.42, az: -0.06 };
    const poseAt = t => {
        const p = (t / 4) * Math.PI * 2;
        return { ax: 0.15 + 0.05 * Math.sin(p + 1), ay: 0.42 * Math.sin(p), az: -0.05 * Math.sin(p) };
    };

    let texCache = null, bufCache = null, pcCache = null;
    function getTex(src, texW) {
        if (texCache && texCache.src === src && texCache.w === texW) return texCache.tex;
        const th = Math.round(texW * src.height / src.width);
        const c = document.createElement('canvas');
        c.width = texW; c.height = th;
        const x = c.getContext('2d');
        x.imageSmoothingQuality = 'high';
        x.drawImage(src, 0, 0, texW, th);
        const d = x.getImageData(0, 0, texW, th);
        const tex = { data: d.data, w: texW, h: th };
        texCache = { src, w: texW, tex };
        return tex;
    }

    // Gambar HP 3D lengkap dengan latar ke canvas target (W x H)
    function draw3D(target, W, H, ssaa, pose) {
        if (!iqCanvas) return;
        const A = 207, B = A * iqCanvas.height / iqCanvas.width;
        const scale = Math.min(0.74 * W / (2 * (A + 12)), 0.84 * H / (2 * (B + 12)));
        const Wp = Math.round(W * ssaa), Hp = Math.round(H * ssaa);
        const tex = getTex(iqCanvas, Math.min(iqCanvas.width, Math.round(2 * A * scale * ssaa * 1.25)));
        if (!bufCache || bufCache.length !== Wp * Hp * 4) bufCache = new Uint8ClampedArray(Wp * Hp * 4);
        warpPhone(tex, A, B, { W: Wp, H: Hp, scale: scale * ssaa, ax: pose.ax, ay: pose.ay, az: pose.az }, bufCache);

        if (!pcCache || pcCache.width !== Wp || pcCache.height !== Hp) {
            pcCache = document.createElement('canvas');
            pcCache.width = Wp; pcCache.height = Hp;
        }
        pcCache.getContext('2d').putImageData(new ImageData(bufCache, Wp, Hp), 0, 0);

        if (target.width !== W) target.width = W;
        if (target.height !== H) target.height = H;
        const ctx = target.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const bg = ctx.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H * 0.4, H * 0.75);
        bg.addColorStop(0, '#17406b'); bg.addColorStop(0.6, '#0a1830'); bg.addColorStop(1, '#060d1c');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.shadowColor = 'rgba(46,123,255,0.5)'; ctx.shadowBlur = W * 0.09;
        ctx.drawImage(pcCache, 0, 0, W, H);
        ctx.restore();
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = W * 0.05; ctx.shadowOffsetY = W * 0.035;
        ctx.drawImage(pcCache, 0, 0, W, H);
        ctx.restore();
        ctx.drawImage(pcCache, 0, 0, W, H);
    }

    /* ---------- kontrol UI quote chat ---------- */
    const iq = {
        name: $('#iqName', sec), status: $('#iqStatus', sec), msg: $('#iqMsg', sec),
        time: $('#iqTime', sec), bat: $('#iqBat', sec), badge: $('#iqBadge', sec),
        car: $('#iqCar', sec), react: $('#iqReact', sec), menu: $('#iqMenu', sec)
    };
    const iqFlat = $('#iqFlat', sec), iqAnim = $('#iqAnim', sec);
    const iqHint = $('#iqHint', sec), iqDl = $('#iqDl', sec), iqDlVid = $('#iqDlVid', sec);
    let iqCanvas = null, iqMode = 'flat', iqRaf = 0, animRaf = 0, recording = false;

    function renderQuote() {
        cancelAnimationFrame(iqRaf);
        iqRaf = requestAnimationFrame(() => {
            iqCanvas = drawQuote({
                name: iq.name.value.trim() || 'Nama',
                status: iq.status.value.trim(),
                msg: iq.msg.value || ' ',
                time: iq.time.value.trim() || '00:00',
                bat: parseInt(iq.bat.value, 10) || 100,
                badge: iq.badge.value.trim() || '0',
                carrier: iq.car.value.trim(),
                react: iq.react.checked,
                menu: iq.menu.checked
            });
            texCache = null;
            iqFlat.src = iqCanvas.toDataURL('image/png');
        });
    }
    Object.values(iq).forEach(el => el.addEventListener('input', renderQuote));
    iq.react.addEventListener('change', renderQuote);
    iq.menu.addEventListener('change', renderQuote);

    // pratinjau 3D bergerak (pakai renderer yang sama dengan hasil unduhan)
    function startAnim() {
        if (animRaf) return;
        const t0 = performance.now();
        const loop = now => {
            if (iqMode !== '3d' || mine.quote.hidden) { animRaf = 0; return; }
            if (!recording && iqCanvas) draw3D(iqAnim, 432, 768, 1, poseAt((now - t0) / 1000));
            animRaf = requestAnimationFrame(loop);
        };
        animRaf = requestAnimationFrame(loop);
    }

    $$('.iq-modes .btn', sec).forEach(b => b.addEventListener('click', () => {
        iqMode = b.dataset.mode;
        $$('.iq-modes .btn', sec).forEach(x => {
            const on = x === b;
            x.classList.toggle('on', on);
            x.setAttribute('aria-selected', on);
        });
        const is3d = iqMode === '3d';
        iqFlat.hidden = is3d;
        iqAnim.hidden = !is3d;
        iqDlVid.hidden = !is3d;
        iqDl.textContent = is3d ? 'UNDUH PNG 3D' : 'UNDUH PNG';
        iqHint.textContent = is3d
            ? 'HP 3D untuk konten JJ. Unduh gambar 1080×1920 atau video 4 detik.'
            : 'Screenshot 1:1 gaya iPhone. Tekan UNDUH PNG untuk menyimpan.';
        if (is3d) startAnim();
    }));

    function saveBlob(blob, name) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }

    iqDl.addEventListener('click', () => {
        if (!iqCanvas) return toast('Tunggu sebentar, lalu coba lagi');
        if (iqMode === 'flat') {
            return iqCanvas.toBlob(b => b ? saveBlob(b, 'quote-chat.png') : toast('Gagal membuat PNG'), 'image/png');
        }
        const label = iqDl.textContent;
        iqDl.disabled = true;
        iqDl.textContent = 'MERENDER...';
        setTimeout(() => {
            try {
                const cv = document.createElement('canvas');
                draw3D(cv, 1080, 1920, 1.5, STILL);
                cv.toBlob(b => {
                    if (b) saveBlob(b, 'quote-chat-3d.png'); else toast('Gagal membuat PNG');
                    iqDl.disabled = false; iqDl.textContent = label;
                }, 'image/png');
            } catch (err) {
                toast('Gagal render 3D, coba lagi');
                iqDl.disabled = false; iqDl.textContent = label;
            }
        }, 40);
    });

    // Video 3D (4 detik, loop mulus) lewat MediaRecorder
    iqDlVid.addEventListener('click', async () => {
        if (!iqCanvas) return toast('Tunggu sebentar, lalu coba lagi');
        if (typeof MediaRecorder === 'undefined') return toast('Browser ini belum bisa merekam video');
        const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
            .find(m => MediaRecorder.isTypeSupported(m));
        if (!mime) return toast('Browser ini belum bisa merekam video');
        const label = iqDlVid.textContent;
        iqDlVid.disabled = true;
        recording = true;
        try {
            const cv = document.createElement('canvas');
            draw3D(cv, 540, 960, 1, poseAt(0));
            const rec = new MediaRecorder(cv.captureStream(30), { mimeType: mime, videoBitsPerSecond: 5000000 });
            const chunks = [];
            rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
            const stopped = new Promise(res => { rec.onstop = res; });
            rec.start();
            const T = 4, t0 = performance.now();
            await new Promise(res => {
                (function f(now) {
                    const t = (now - t0) / 1000;
                    if (t >= T) return res();
                    iqDlVid.textContent = 'MEREKAM ' + Math.ceil(T - t) + 'd';
                    draw3D(cv, 540, 960, 1, poseAt(t));
                    requestAnimationFrame(f);
                })(performance.now());
            });
            rec.stop();
            await stopped;
            const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
            saveBlob(new Blob(chunks, { type: mime.split(';')[0] }), 'quote-chat-3d.' + ext);
        } catch (err) {
            toast('Gagal merekam video');
        }
        recording = false;
        iqDlVid.disabled = false;
        iqDlVid.textContent = label;
    });

    renderQuote();
})();
