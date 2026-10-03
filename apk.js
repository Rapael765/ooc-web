/* =====================================================
   OOC - Tool "Web to APK"
   Minta foto ikon, nama, dan link -> dibuatkan APK lewat /api/apk
   (build berjalan di GitHub Actions, sekitar 3-6 menit).
   Dimuat SEBELUM tools.js. tools.js memanggil OOCApk.mount(wadah).
   ===================================================== */
(function () {
    'use strict';
    if (window.OOCApk) return;

    var KEY = 'ooc-apk-job';
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

    // Potong persegi di tengah, ubah ke JPEG 512x512
    function squareJpeg(file, size) {
        return new Promise(function (resolve, reject) {
            var src = URL.createObjectURL(file);
            var img = new Image();
            img.onerror = function () {
                URL.revokeObjectURL(src);
                reject(new Error('Foto tidak bisa dibaca. Coba format JPG atau PNG.'));
            };
            img.onload = function () {
                URL.revokeObjectURL(src);
                var m = Math.min(img.width, img.height);
                var sx = (img.width - m) / 2, sy = (img.height - m) / 2;
                var c = document.createElement('canvas');
                c.width = c.height = size;
                var x = c.getContext('2d');
                x.fillStyle = '#fff';
                x.fillRect(0, 0, size, size);
                x.drawImage(img, sx, sy, m, m, 0, 0, size, size);
                resolve(c.toDataURL('image/jpeg', 0.92));
            };
            img.src = src;
        });
    }

    function mount(box) {
        if (box.__apk) return;
        box.__apk = true;

        box.innerHTML =
            '<div class="field">' +
                '<label for="apkIcon">Foto ikon aplikasi</label>' +
                '<input class="input" type="file" id="apkIcon" accept="image/*">' +
                '<p class="hint">Otomatis dipotong persegi (512 px).</p>' +
            '</div>' +
            '<div class="apk-prev" id="apkPrev" hidden><img id="apkPrevImg" alt="Pratinjau ikon"></div>' +
            '<div class="field">' +
                '<label for="apkName">Nama aplikasi</label>' +
                '<input class="input" type="text" id="apkName" maxlength="30" placeholder="Contoh: OOC Circle" autocomplete="off">' +
            '</div>' +
            '<div class="field">' +
                '<label for="apkUrl">Link website</label>' +
                '<input class="input" type="url" id="apkUrl" inputmode="url" placeholder="https://ooc-web.vercel.app" autocomplete="off" autocapitalize="off">' +
            '</div>' +
            '<button class="btn btn-primary btn-block" id="apkGo" type="button">BUAT APK</button>' +
            '<div class="apk-status" id="apkStatus" hidden>' +
                '<div class="apk-bar"><i></i></div>' +
                '<p id="apkMsg"></p>' +
            '</div>' +
            '<div class="apk-done" id="apkDone" hidden>' +
                '<a class="btn btn-primary btn-block" id="apkDl" download>UNDUH APK</a>' +
                '<p class="hint" id="apkFile"></p>' +
                '<p class="hint">Buka file APK di HP, izinkan “Instal dari sumber tidak dikenal”, lalu instal.</p>' +
            '</div>';

        var $q = function (s) { return box.querySelector(s); };
        var fileEl = $q('#apkIcon'), prevBox = $q('#apkPrev'), prevImg = $q('#apkPrevImg');
        var nameEl = $q('#apkName'), urlEl = $q('#apkUrl'), goBtn = $q('#apkGo');
        var stBox = $q('#apkStatus'), msgEl = $q('#apkMsg');
        var doneBox = $q('#apkDone'), dlEl = $q('#apkDl'), fileInfo = $q('#apkFile');
        var prevUrl = null, busy = false;

        fileEl.addEventListener('change', function () {
            if (prevUrl) { URL.revokeObjectURL(prevUrl); prevUrl = null; }
            var f = fileEl.files[0];
            if (!f) { prevBox.hidden = true; return; }
            prevUrl = URL.createObjectURL(f);
            prevImg.src = prevUrl;
            prevBox.hidden = false;
        });

        function setBusy(b) {
            busy = b;
            goBtn.disabled = b;
            goBtn.textContent = b ? 'MEMBUAT APK...' : 'BUAT APK';
        }
        function showMsg(t, isErr) {
            stBox.hidden = false;
            stBox.classList.toggle('err', !!isErr);
            msgEl.textContent = t;
        }

        async function poll(id) {
            var t0 = Date.now(), fails = 0;
            doneBox.hidden = true;
            showMsg('Menunggu antrean GitHub...');
            while (true) {
                await sleep(5000);
                if (Date.now() - t0 > 15 * 60 * 1000) {
                    localStorage.removeItem(KEY);
                    showMsg('Terlalu lama. Coba buat ulang beberapa saat lagi.', true);
                    return;
                }
                var r;
                try { r = await api('apk?id=' + encodeURIComponent(id)); fails = 0; }
                catch (e) {
                    if (++fails >= 6) { showMsg('Koneksi bermasalah: ' + e.message, true); return; }
                    continue;
                }
                if (r.status === 'done') {
                    localStorage.removeItem(KEY);
                    stBox.hidden = true;
                    dlEl.href = '/api/apk?id=' + encodeURIComponent(id) + '&download=1';
                    dlEl.setAttribute('download', r.file || 'app.apk');
                    fileInfo.textContent = (r.file || 'app.apk') + (r.size ? ' · ' + (r.size / 1024).toFixed(0) + ' KB' : '');
                    doneBox.hidden = false;
                    toast('APK siap diunduh ✨');
                    return;
                }
                if (r.status === 'failed') {
                    localStorage.removeItem(KEY);
                    showMsg('Build gagal. Periksa link/ikon, atau lihat log di GitHub Actions.', true);
                    return;
                }
                if (r.status === 'building') showMsg('Membangun APK... (3–6 menit, jangan tutup halaman ini)');
                else if (r.status === 'finishing') showMsg('Hampir selesai...');
                else showMsg('Menunggu antrean GitHub...');
            }
        }

        goBtn.addEventListener('click', async function () {
            if (busy) return;
            var f = fileEl.files[0];
            var name = nameEl.value.trim();
            var url = urlEl.value.trim();
            if (!f) return toast('Pilih foto ikon dulu ya');
            if (!name) return toast('Isi nama aplikasi dulu ya');
            if (!url) return toast('Isi link website dulu ya');
            if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
            try { new URL(url); } catch (e) { return toast('Link website tidak valid'); }

            setBusy(true);
            doneBox.hidden = true;
            try {
                showMsg('Mengunggah ikon...');
                var data = await squareJpeg(f, 512);
                var up = await api('upload', { method: 'POST', body: { data: data } });
                showMsg('Mengirim ke server build...');
                var job = await api('apk', { method: 'POST', body: { name: name, url: url, icon: up.url } });
                localStorage.setItem(KEY, JSON.stringify({ id: job.id, t: Date.now() }));
                await poll(job.id);
            } catch (err) {
                showMsg(err.message, true);
            }
            setBusy(false);
        });

        // Lanjutkan pantauan kalau halaman sempat dimuat ulang saat build berjalan
        try {
            var last = JSON.parse(localStorage.getItem(KEY) || 'null');
            if (last && last.id && Date.now() - last.t < 20 * 60 * 1000) {
                setBusy(true);
                poll(last.id).then(function () { setBusy(false); });
            } else if (last) {
                localStorage.removeItem(KEY);
            }
        } catch (e) {}
    }

    window.OOCApk = { mount: mount };
})();
