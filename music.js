/* =====================================================
   OOC - Pemutar Musik untuk halaman Tools
   Cari lagu seperti Spotify, lalu putar.
   Dimuat SEBELUM tools.js. tools.js memanggil OOCMusic.mount(wadah).
   Selagi lagu jalan dan kamu pindah halaman, muncul mini player di bawah.

   Mode:
   - YT_API_KEY kosong -> preview 30 detik dari iTunes (tanpa key)
   - YT_API_KEY diisi  -> lagu penuh lewat pemutar resmi YouTube
   ===================================================== */
(function () {
    'use strict';
    if (window.OOCMusic) return;

    var YT_API_KEY = '';

    /* ---------- CSS ---------- */
    var css = `
.om-root, #omMini { --ink:#0d1b3d; --blue:#2e7bff; --blue-d:#1b5fe0; --sky:#8ecbff; --pale:#eaf5ff; --yellow:#ffd84a;
    font-family: "Nunito","Segoe UI",system-ui,sans-serif; font-weight: 800; color: var(--ink); }
.om-root *, #omMini * { box-sizing: border-box; }

.om-ib {
    width: 38px; height: 38px; flex-shrink: 0; display: grid; place-items: center; padding: 0; cursor: pointer;
    background: #fff; border: 3px solid var(--ink); border-radius: 12px; box-shadow: 3px 3px 0 var(--ink);
    transition: transform .1s, box-shadow .1s; color: var(--ink);
}
.om-ib:active { transform: translate(3px,3px); box-shadow: 0 0 0 var(--ink); }
.om-ib svg { width: 18px; height: 18px; fill: currentColor; }
.om-ib.main { background: var(--blue); color: #fff; width: 50px; height: 50px; border-radius: 16px; }
.om-ib.main svg { width: 22px; height: 22px; }

/* mini player (muncul di halaman lain) */
#omMini {
    position: fixed; left: 12px; right: 12px; bottom: calc(92px + env(safe-area-inset-bottom, 0px)); z-index: 150;
    width: min(560px, calc(100% - 24px)); margin: 0 auto;
    display: none; align-items: center; gap: 10px; padding: 6px 8px;
    background: #fff; border: 3px solid var(--ink); border-radius: 16px; box-shadow: 4px 4px 0 var(--ink);
}
#omMini.show { display: flex; }
#omMini img { width: 38px; height: 38px; border-radius: 9px; border: 2.5px solid var(--ink); object-fit: cover; background: var(--sky); flex-shrink: 0; }
#omMini .t { flex: 1; min-width: 0; cursor: pointer; line-height: 1.2; }
#omMini .t b { display: block; font-size: .82rem; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#omMini .t span { display: block; font-size: .7rem; opacity: .7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* isi panel */
.om-search { display: flex; gap: 8px; margin-bottom: 10px; }
.om-search input {
    flex: 1; min-width: 0; padding: 10px 14px; font: inherit; font-weight: 800; font-size: 1rem; color: var(--ink);
    background: #fff; border: 3px solid var(--ink); border-radius: 14px;
}
.om-search input:focus { outline: none; box-shadow: 3px 3px 0 var(--blue); }
.om-go {
    padding: 0 16px; font-family: "Bangers", Impact, sans-serif; font-size: 1.2rem; letter-spacing: .08em; cursor: pointer;
    color: #fff; background: var(--blue); border: 3px solid var(--ink); border-radius: 14px; box-shadow: 3px 3px 0 var(--ink); text-shadow: 2px 2px 0 var(--ink);
}
.om-go:active { transform: translate(3px,3px); box-shadow: 0 0 0 var(--ink); }

.om-now { display: none; background: var(--pale); border: 3px solid var(--ink); border-radius: 18px; box-shadow: 3px 3px 0 var(--ink); padding: 10px; margin-bottom: 12px; }
.om-now.show { display: block; }
.om-vid { position: relative; width: 100%; aspect-ratio: 16/9; border: 3px solid var(--ink); border-radius: 12px; overflow: hidden; background: var(--ink); margin-bottom: 8px; }
.om-vid.hide { display: none; }
.om-vid iframe, .om-vid #omYT { position: absolute; inset: 0; width: 100%; height: 100%; }
.om-art { display: none; width: 100%; aspect-ratio: 16/9; object-fit: cover; border: 3px solid var(--ink); border-radius: 12px; margin-bottom: 8px; background: var(--sky); }
.om-art.show { display: block; }
.om-title { font-weight: 900; font-size: 1rem; line-height: 1.25; overflow-wrap: anywhere; }
.om-artist { font-size: .8rem; opacity: .7; margin-bottom: 6px; }
.om-bar { display: flex; align-items: center; gap: 8px; font-size: .72rem; font-weight: 900; font-variant-numeric: tabular-nums; }
.om-bar input[type=range] { flex: 1; min-width: 0; accent-color: var(--blue); height: 22px; }
.om-ctrl { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 8px; }

.om-mode { font-size: .72rem; opacity: .75; text-align: center; margin-bottom: 8px; }
.om-list { max-height: min(46vh, 420px); overflow-y: auto; display: grid; gap: 10px; align-content: start; padding: 2px 6px 6px 2px; -webkit-overflow-scrolling: touch; }
.om-empty { text-align: center; padding: 22px 10px; font-weight: 800; opacity: .8; }
.om-item {
    display: flex; align-items: center; gap: 10px; padding: 8px; width: 100%; text-align: left; font: inherit; color: var(--ink); cursor: pointer;
    background: #fff; border: 3px solid var(--ink); border-radius: 14px; box-shadow: 3px 3px 0 var(--ink);
    transition: transform .1s, box-shadow .1s, background .15s;
}
.om-item:active { transform: translate(3px,3px); box-shadow: 0 0 0 var(--ink); }
.om-item.on { background: var(--yellow); }
.om-item img { width: 52px; height: 52px; border-radius: 10px; border: 2.5px solid var(--ink); object-fit: cover; background: var(--sky); flex-shrink: 0; }
.om-item .tx { flex: 1; min-width: 0; line-height: 1.25; }
.om-item .tx b { font-weight: 900; font-size: .9rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.om-item .tx span { display: block; font-size: .74rem; opacity: .7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.om-item .pl { width: 30px; height: 30px; display: grid; place-items: center; border: 2.5px solid var(--ink); border-radius: 50%; background: var(--blue); color: #fff; flex-shrink: 0; }
.om-item .pl svg { width: 12px; height: 12px; fill: currentColor; }
`;
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);

    /* ---------- Ikon ---------- */
    var I = {
        play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>',
        pause: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4.5" height="16" rx="1.2"/><rect x="13.5" y="4" width="4.5" height="16" rx="1.2"/></svg>',
        next: '<svg viewBox="0 0 24 24"><path d="M5 5v14l10-7z"/><rect x="16" y="5" width="3.5" height="14" rx="1"/></svg>',
        prev: '<svg viewBox="0 0 24 24"><path d="M19 5v14L9 12z"/><rect x="4.5" y="5" width="3.5" height="14" rx="1"/></svg>'
    };

    function $(id) { return document.getElementById(id); }

    /* ---------- State ---------- */
    var list = [], idx = -1, playing = false, root = null, mini = null;
    var audio = new Audio();
    audio.preload = 'none';
    var yt = null, ytReady = false, ytPending = null, ytLoading = false;

    function fmt(s) {
        s = Math.max(0, Math.floor(s || 0));
        return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }
    function decode(s) { var t = document.createElement('textarea'); t.innerHTML = s; return t.value; }
    function items() { return Array.prototype.slice.call(document.querySelectorAll('#omList .om-item')); }

    function setPlayIcons(p) {
        playing = p;
        var ic = p ? I.pause : I.play;
        if ($('omPlay')) $('omPlay').innerHTML = ic;
        if ($('omMiniPlay')) $('omMiniPlay').innerHTML = ic;
        items().forEach(function (b, i) { b.classList.toggle('on', i === idx); });
    }

    /* ---------- Mini player ---------- */
    function buildMini() {
        mini = document.createElement('div');
        mini.id = 'omMini';
        mini.innerHTML = '<img id="omMiniImg" alt=""><div class="t" id="omMiniT"><b id="omMiniTitle"></b><span id="omMiniArtist"></span></div>' +
            '<button class="om-ib" id="omMiniPlay" type="button" aria-label="Putar atau jeda"></button>' +
            '<button class="om-ib" id="omMiniNext" type="button" aria-label="Lagu berikutnya">' + I.next + '</button>';
        document.body.appendChild(mini);
        setPlayIcons(false);
    }
    function panelVisible() { return !!(root && root.offsetParent !== null); }
    function updateMini() {
        if (!mini) return;
        mini.classList.toggle('show', idx >= 0 && !panelVisible());
    }

    /* ---------- Pasang ke wadah (panel Tools) ---------- */
    function mount(container) {
        if (root) return;
        root = document.createElement('div');
        root.className = 'om-root';
        root.innerHTML =
            '<form class="om-search" id="omForm"><input id="omQ" type="search" placeholder="Cari lagu atau artis..." autocomplete="off" enterkeyhint="search"><button class="om-go" type="submit">CARI</button></form>' +
            '<div class="om-now" id="omNow">' +
                '<div class="om-vid" id="omVid"><div id="omYT"></div></div>' +
                '<img class="om-art" id="omArt" alt="">' +
                '<div class="om-title" id="omTitle"></div><div class="om-artist" id="omArtist"></div>' +
                '<div class="om-bar"><span id="omCur">0:00</span><input id="omSeek" type="range" min="0" max="1000" value="0" aria-label="Posisi lagu"><span id="omDur">0:00</span></div>' +
                '<div class="om-ctrl"><button class="om-ib" id="omPrev" type="button" aria-label="Sebelumnya">' + I.prev + '</button>' +
                '<button class="om-ib main" id="omPlay" type="button" aria-label="Putar atau jeda"></button>' +
                '<button class="om-ib" id="omNext" type="button" aria-label="Berikutnya">' + I.next + '</button></div>' +
            '</div>' +
            '<div class="om-mode" id="omMode"></div>' +
            '<div class="om-list" id="omList"><p class="om-empty">Ketik judul lagu atau nama artis, lalu ketuk CARI 🎵</p></div>';
        container.appendChild(root);
        $('omMode').textContent = YT_API_KEY ? 'Mode: lagu penuh (YouTube)' : 'Mode: preview 30 detik';
        setPlayIcons(false);
    }

    /* ---------- Cari ---------- */
    function msg(t) {
        var box = $('omList'); box.innerHTML = '';
        var p = document.createElement('p'); p.className = 'om-empty'; p.textContent = t; box.appendChild(p);
    }

    function searchYT(q) {
        var url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&videoEmbeddable=true&maxResults=20&q=' +
            encodeURIComponent(q) + '&key=' + encodeURIComponent(YT_API_KEY);
        return fetch(url).then(function (r) { return r.json().then(function (d) {
            if (!r.ok) throw new Error((d.error && d.error.message) || 'Pencarian YouTube gagal');
            return (d.items || []).map(function (it) {
                var th = it.snippet.thumbnails || {};
                return { type: 'yt', id: it.id.videoId, title: decode(it.snippet.title), artist: decode(it.snippet.channelTitle),
                    img: (th.medium || th.default || {}).url || '' };
            });
        }); });
    }
    function searchItunes(q) {
        var url = 'https://itunes.apple.com/search?media=music&entity=song&limit=25&country=ID&term=' + encodeURIComponent(q);
        return fetch(url).then(function (r) { if (!r.ok) throw new Error('Pencarian gagal'); return r.json(); }).then(function (d) {
            return (d.results || []).filter(function (x) { return x.previewUrl; }).map(function (x) {
                return { type: 'pv', id: String(x.trackId), url: x.previewUrl, title: x.trackName, artist: x.artistName,
                    img: (x.artworkUrl100 || '').replace('100x100', '200x200') };
            });
        });
    }

    document.addEventListener('submit', function (e) {
        if (e.target.id !== 'omForm') return;
        e.preventDefault();
        var q = $('omQ').value.trim();
        if (!q) return;
        $('omQ').blur();
        msg('Mencari “' + q + '”...');
        (YT_API_KEY ? searchYT(q) : searchItunes(q)).then(function (res) {
            list = res; idx = -1;
            if (!list.length) return msg('Lagu tidak ditemukan. Coba kata kunci lain.');
            renderList();
        }).catch(function (err) { msg('Gagal mencari: ' + err.message); });
    });

    function renderList() {
        var box = $('omList');
        box.innerHTML = '';
        list.forEach(function (t, i) {
            var b = document.createElement('button');
            b.type = 'button'; b.className = 'om-item' + (i === idx ? ' on' : '');
            var im = document.createElement('img'); im.src = t.img; im.alt = ''; im.loading = 'lazy';
            var tx = document.createElement('div'); tx.className = 'tx';
            var bt = document.createElement('b'); bt.textContent = t.title;
            var sp = document.createElement('span'); sp.textContent = t.artist;
            tx.appendChild(bt); tx.appendChild(sp);
            var pl = document.createElement('div'); pl.className = 'pl'; pl.innerHTML = I.play;
            b.appendChild(im); b.appendChild(tx); b.appendChild(pl);
            b.addEventListener('click', function () { playIndex(i); });
            box.appendChild(b);
        });
    }

    /* ---------- YouTube player ---------- */
    function loadYTApi(cb) {
        if (window.YT && window.YT.Player) return cb();
        ytPending = cb;
        if (ytLoading) return;
        ytLoading = true;
        var prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () { if (prev) prev(); var f = ytPending; ytPending = null; if (f) f(); };
        var s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
    }
    function ensureYT(videoId) {
        loadYTApi(function () {
            if (yt && ytReady) { yt.loadVideoById(videoId); return; }
            if (yt) { yt.__first = videoId; return; }
            yt = new YT.Player('omYT', {
                videoId: videoId, width: '100%', height: '100%',
                playerVars: { playsinline: 1, rel: 0, modestbranding: 1, controls: 0, autoplay: 1 },
                events: {
                    onReady: function (e) { ytReady = true; if (yt.__first) yt.loadVideoById(yt.__first); else e.target.playVideo(); },
                    onStateChange: function (e) {
                        if (e.data === 1) setPlayIcons(true);
                        else if (e.data === 2) setPlayIcons(false);
                        else if (e.data === 0) next();
                    },
                    onError: function () { setPlayIcons(false); setTimeout(next, 600); }
                }
            });
        });
    }

    /* ---------- Putar ---------- */
    function showNow(t) {
        $('omNow').classList.add('show');
        $('omTitle').textContent = t.title;
        $('omArtist').textContent = t.artist;
        $('omMiniTitle').textContent = t.title;
        $('omMiniArtist').textContent = t.artist;
        $('omMiniImg').src = t.img;
        $('omVid').classList.toggle('hide', t.type !== 'yt');
        var art = $('omArt'); art.src = t.img; art.classList.toggle('show', t.type !== 'yt');
        $('omSeek').value = 0; $('omCur').textContent = '0:00'; $('omDur').textContent = '0:00';
        if ('mediaSession' in navigator && window.MediaMetadata) {
            try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, artwork: t.img ? [{ src: t.img }] : [] }); } catch (e) {}
        }
    }

    function playIndex(i) {
        if (i < 0 || i >= list.length) return;
        idx = i;
        var t = list[i];
        showNow(t);
        items().forEach(function (b, k) { b.classList.toggle('on', k === i); });
        if (t.type === 'yt') {
            audio.pause();
            if (yt && ytReady) yt.loadVideoById(t.id); else ensureYT(t.id);
        } else {
            if (yt && ytReady) { try { yt.pauseVideo(); } catch (e) {} }
            audio.src = t.url;
            audio.play().catch(function () { setPlayIcons(false); });
        }
        updateMini();
    }
    function toggle() {
        if (idx < 0) return;
        var t = list[idx];
        if (t.type === 'yt') {
            if (!yt || !ytReady) return;
            if (playing) yt.pauseVideo(); else yt.playVideo();
        } else {
            if (audio.paused) audio.play().catch(function () {}); else audio.pause();
        }
    }
    function next() { if (!list.length) return; playIndex(idx + 1 < list.length ? idx + 1 : 0); }
    function seekTo(sec) {
        var t = list[idx];
        if (!t) return;
        if (t.type === 'yt') { if (ytReady) yt.seekTo(sec, true); } else audio.currentTime = sec;
    }
    function prev() {
        if (!list.length) return;
        var t = list[idx], cur = t && t.type === 'yt' && ytReady ? yt.getCurrentTime() : audio.currentTime;
        if (cur > 4) { seekTo(0); return; }
        playIndex(idx - 1 >= 0 ? idx - 1 : list.length - 1);
    }

    audio.addEventListener('play', function () { setPlayIcons(true); });
    audio.addEventListener('pause', function () { setPlayIcons(false); });
    audio.addEventListener('ended', next);
    audio.addEventListener('error', function () { if (audio.src) setPlayIcons(false); });

    document.addEventListener('click', function (e) {
        var el = e.target.closest ? e.target : null;
        if (!el) return;
        if (el.closest('#omMiniT')) { window.dispatchEvent(new Event('ooc-music-open')); return; }
        var c = el.closest('button');
        if (!c) return;
        if (c.id === 'omPlay' || c.id === 'omMiniPlay') toggle();
        else if (c.id === 'omNext' || c.id === 'omMiniNext') next();
        else if (c.id === 'omPrev') prev();
    });

    var seeking = false;
    function curDur() {
        var t = list[idx];
        if (!t) return 0;
        return t.type === 'yt' && ytReady ? yt.getDuration() : audio.duration;
    }
    document.addEventListener('input', function (e) {
        if (e.target.id !== 'omSeek') return;
        seeking = true;
        var d = curDur();
        if (d) $('omCur').textContent = fmt(d * e.target.value / 1000);
    });
    document.addEventListener('change', function (e) {
        if (e.target.id !== 'omSeek') return;
        var d = curDur();
        if (d) seekTo(d * e.target.value / 1000);
        seeking = false;
    });

    setInterval(function () {
        updateMini();
        if (seeking || idx < 0 || !root) return;
        var t = list[idx], cur = 0, dur = 0;
        if (t.type === 'yt') { if (!ytReady || !yt.getDuration) return; cur = yt.getCurrentTime(); dur = yt.getDuration(); }
        else { cur = audio.currentTime; dur = audio.duration; }
        if (!dur || !isFinite(dur)) return;
        $('omCur').textContent = fmt(cur);
        $('omDur').textContent = fmt(dur);
        $('omSeek').value = Math.round(cur / dur * 1000);
    }, 500);

    /* ---------- Tombol media di layar kunci ---------- */
    if ('mediaSession' in navigator) {
        try {
            navigator.mediaSession.setActionHandler('play', toggle);
            navigator.mediaSession.setActionHandler('pause', toggle);
            navigator.mediaSession.setActionHandler('nexttrack', next);
            navigator.mediaSession.setActionHandler('previoustrack', prev);
        } catch (e) {}
    }

    if (document.body) buildMini(); else document.addEventListener('DOMContentLoaded', buildMini);

    window.OOCMusic = { mount: mount };
})();
