/* =====================================================
   OOC Circle - Tombol ganti tampilan (Komik <-> Biasa)
   Pilihan disimpan di browser. Gaya "biasa" ada di theme.css.
   Class awal dipasang oleh potongan kecil di <head> index.html
   supaya tidak berkedip saat halaman dibuka.
   ===================================================== */
(function () {
    'use strict';
    const KEY = 'ooc-theme';
    const root = document.documentElement;

    const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
    const write = v => { try { localStorage.setItem(KEY, v); } catch (e) { /* abaikan */ } };

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'th-btn';
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z"/></svg>';

    function paint() {
        const normal = root.classList.contains('theme-normal');
        btn.setAttribute('aria-label', normal ? 'Ganti ke tampilan komik' : 'Ganti ke tampilan biasa');
        btn.title = normal ? 'Ganti ke tampilan komik' : 'Ganti ke tampilan biasa';
        const m = document.querySelector('meta[name="theme-color"]');
        if (m) m.setAttribute('content', normal ? '#2563eb' : '#2e7bff');
    }

    function set(normal, announce) {
        root.classList.toggle('theme-normal', normal);
        write(normal ? 'normal' : 'comic');
        paint();
        if (announce && typeof toast === 'function') toast(normal ? 'Tampilan biasa aktif' : 'Tampilan komik aktif');
        // dock punya penanda yang dihitung dari ukuran; hitung ulang setelah gaya berubah
        if (typeof moveIndicator === 'function') setTimeout(moveIndicator, 60);
    }

    // sinkronkan dengan pilihan tersimpan (jaga-jaga kalau snippet di <head> tidak ada)
    if (read() === 'normal') root.classList.add('theme-normal');

    btn.addEventListener('click', () => set(!root.classList.contains('theme-normal'), true));
    document.body.appendChild(btn);
    paint();
})();
