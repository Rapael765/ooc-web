/* =====================================================
   OOC - Intro pintu gaya Comic 3D biru (mandiri: CSS + HTML dibuat dari sini)
   Alur: pintu tertutup -> ketuk -> pintu terbuka -> judul OOC -> ketuk -> masuk web
   ===================================================== */
(function () {
    'use strict';
    if (document.getElementById('oocIntro')) return;

    var NAME = 'OOC';

    /* ---------- Font (sama dengan website) ---------- */
    var fl = document.createElement('link');
    fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=Bangers&family=Nunito:wght@800;900&display=swap';
    document.head.appendChild(fl);

    /* ---------- CSS ---------- */
    var css = `
html.oi-lock, html.oi-lock body { overflow: hidden !important; height: 100%; }

#oocIntro {
    --ink: #0d1b3d; --blue: #2e7bff; --blue-d: #1b5fe0; --blue-l: #6aa8ff;
    --sky: #8ecbff; --pale: #eaf5ff; --yellow: #ffd84a;
    position: fixed; inset: 0; z-index: 99999; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    background-color: #dff0ff;
    background-image:
        radial-gradient(#b4dbff 22%, transparent 24%),
        radial-gradient(#b4dbff 22%, transparent 24%);
    background-size: 24px 24px; background-position: 0 0, 12px 12px;
    font-family: "Nunito", "Segoe UI", system-ui, sans-serif; font-weight: 900; color: var(--ink);
    cursor: pointer; user-select: none; -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: opacity .7s ease, transform .7s ease, visibility .7s;
}
#oocIntro.oi-leave { opacity: 0; transform: scale(1.15); visibility: hidden; pointer-events: none; }

/* bintang ledakan komik di latar */
#oocIntro .oi-burst {
    position: absolute; background: var(--sky); opacity: .75;
    clip-path: polygon(50% 0%, 61% 18%, 82% 10%, 80% 32%, 100% 40%, 84% 56%, 96% 76%, 74% 76%, 68% 98%, 52% 82%, 32% 98%, 28% 76%, 4% 78%, 18% 56%, 0% 38%, 22% 32%, 20% 10%, 40% 18%);
    animation: oi-spin 40s linear infinite;
}
#oocIntro .oi-burst.a { width: 360px; height: 360px; top: -110px; right: -110px; }
#oocIntro .oi-burst.b { width: 280px; height: 280px; bottom: -70px; left: -90px; background: var(--blue); opacity: .35; animation-direction: reverse; }
@keyframes oi-spin { to { transform: rotate(360deg); } }

/* ---------------- TAHAP 1: PINTU ---------------- */
#oocIntro .oi-stage {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    transition: opacity .6s ease, transform .6s ease;
}
#oocIntro.oi-title .oi-stage { opacity: 0; transform: scale(1.25); pointer-events: none; }

#oocIntro .oi-wrap { position: relative; width: min(76vw, 340px); animation: oi-float 3.4s ease-in-out infinite; }
@keyframes oi-float { 50% { transform: translateY(-8px); } }

#oocIntro .oi-ground {
    position: absolute; left: 6%; right: -2%; bottom: -16px; height: 26px;
    background: var(--ink); opacity: .22; border-radius: 50%; filter: blur(2px);
}

/* kusen pintu (lengkung) */
#oocIntro .oi-frame {
    position: relative; aspect-ratio: .6;
    background: var(--ink);
    border: 5px solid var(--ink);
    border-radius: 46% 46% 12px 12px / 24% 24% 12px 12px;
    box-shadow: 9px 9px 0 var(--ink);
    padding: 13px;
}
#oocIntro .oi-frame::before { /* garis kilap kusen */
    content: ""; position: absolute; inset: 4px; border-radius: inherit;
    border: 3px solid var(--blue-l); opacity: .55; pointer-events: none;
}

/* lubang pintu (di sinilah pintu & cahaya berada) */
#oocIntro .oi-open {
    position: relative; width: 100%; height: 100%; overflow: hidden;
    perspective: 900px; background: #fff;
    border: 4px solid var(--ink);
    border-radius: 44% 44% 6px 6px / 22% 22% 6px 6px;
}

/* ruangan terang di balik pintu */
#oocIntro .oi-hall { position: absolute; inset: 0; overflow: hidden; background: var(--pale); }
#oocIntro .oi-rays {
    position: absolute; left: -60%; top: -30%; width: 220%; height: 160%;
    background: repeating-conic-gradient(from 0deg at 50% 55%, #bfe0ff 0 7deg, #f3faff 7deg 14deg);
    animation: oi-spin 24s linear infinite;
}
#oocIntro .oi-hall::after { /* cahaya tengah */
    content: ""; position: absolute; inset: 0;
    background: radial-gradient(circle at 50% 55%, #fff 0 14%, rgba(255,255,255,.55) 30%, transparent 62%);
}
#oocIntro .oi-star {
    position: absolute; z-index: 1; left: 50%; top: 52%; width: 46px; height: 46px;
    margin: -23px 0 0 -23px; background: var(--yellow);
    clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
    filter: drop-shadow(3px 3px 0 var(--ink));
    animation: oi-twinkle 1.6s ease-in-out infinite;
}
@keyframes oi-twinkle { 50% { transform: scale(1.3) rotate(18deg); } }

/* daun pintu 3D */
#oocIntro .oi-door {
    position: absolute; top: 0; bottom: 0; width: 50%; z-index: 3;
    background-color: var(--blue);
    background-image:
        linear-gradient(120deg, rgba(255,255,255,.28) 0 8%, transparent 8% 14%, rgba(255,255,255,.14) 14% 18%, transparent 18%),
        radial-gradient(var(--blue-d) 22%, transparent 24%);
    background-size: 100% 100%, 16px 16px;
    transition: transform 1.5s cubic-bezier(.55,.05,.2,1), filter 1.5s ease;
    will-change: transform;
}
#oocIntro .oi-door.l { left: 0; transform-origin: left center; border-right: 4px solid var(--ink); box-shadow: inset -14px 0 0 -4px rgba(13,27,61,.25); }
#oocIntro .oi-door.r { right: 0; transform-origin: right center; border-left: 4px solid var(--ink); box-shadow: inset 14px 0 0 -4px rgba(13,27,61,.25); }

/* panel timbul */
#oocIntro .oi-door i {
    position: absolute; left: 13%; right: 13%;
    background: var(--blue-l);
    border: 4px solid var(--ink); border-radius: 10px;
    box-shadow: 4px 4px 0 var(--ink), inset 0 5px 0 rgba(255,255,255,.4);
}
#oocIntro .oi-door i:nth-child(1) { top: 7%;  height: 44%; border-radius: 40px 10px 10px 10px; }
#oocIntro .oi-door.r i:nth-child(1) { border-radius: 10px 40px 10px 10px; }
#oocIntro .oi-door i:nth-child(2) { top: 57%; height: 15%; }
#oocIntro .oi-door i:nth-child(3) { top: 77%; height: 15%; }

/* paku keling */
#oocIntro .oi-door u {
    position: absolute; width: 9px; height: 9px; border-radius: 50%;
    background: var(--yellow); border: 2px solid var(--ink); text-decoration: none;
}
#oocIntro .oi-door u:nth-of-type(1) { top: 3%; left: 6%; }
#oocIntro .oi-door u:nth-of-type(2) { bottom: 3%; left: 6%; }
#oocIntro .oi-door u:nth-of-type(3) { top: 3%; right: 6%; }
#oocIntro .oi-door u:nth-of-type(4) { bottom: 3%; right: 6%; }

/* gagang bulat */
#oocIntro .oi-door b {
    position: absolute; top: 52%; width: 22px; height: 22px; margin-top: -11px; border-radius: 50%;
    background: var(--yellow); border: 3.5px solid var(--ink);
    box-shadow: 3px 3px 0 var(--ink), inset -3px -3px 0 rgba(224,166,0,.9);
}
#oocIntro .oi-door.l b { right: 7px; }
#oocIntro .oi-door.r b { left: 7px; }

#oocIntro.oi-doors-open .oi-door.l { transform: rotateY(104deg); filter: brightness(.8); }
#oocIntro.oi-doors-open .oi-door.r { transform: rotateY(-104deg); filter: brightness(.8); }

/* papan gantung */
#oocIntro .oi-sign {
    position: absolute; left: 50%; top: 26%; z-index: 8; width: 74%;
    transform-origin: 50% -26px;
    animation: oi-sway 3.6s ease-in-out infinite;
    transition: opacity .7s ease, top 1s ease-in;
}
@keyframes oi-sway {
    0%, 100% { transform: translateX(-50%) rotate(-3deg); }
    50% { transform: translateX(-50%) rotate(3deg); }
}
#oocIntro .oi-sign::before, #oocIntro .oi-sign::after { /* tali */
    content: ""; position: absolute; top: -26px; width: 4px; height: 30px; background: var(--ink); border-radius: 3px;
}
#oocIntro .oi-sign::before { left: 18%; transform: rotate(14deg); }
#oocIntro .oi-sign::after { right: 18%; transform: rotate(-14deg); }
#oocIntro .oi-plaque {
    padding: 8px 6px 6px; text-align: center;
    background: #fff; border: 4px solid var(--ink); border-radius: 16px;
    box-shadow: 5px 5px 0 var(--ink);
}
#oocIntro .oi-plaque small {
    display: block; font-family: "Bangers", Impact, sans-serif; font-weight: 400;
    font-size: clamp(.95rem, 4.4vw, 1.2rem); letter-spacing: .1em; line-height: 1.1;
}
#oocIntro .oi-plaque strong {
    display: block; font-family: "Bangers", Impact, sans-serif; font-weight: 400;
    font-size: clamp(2.3rem, 11vw, 3.1rem); letter-spacing: .06em; line-height: 1;
    color: #fff; -webkit-text-stroke: 2px var(--ink); paint-order: stroke fill;
    text-shadow: 3px 3px 0 var(--blue), 5px 5px 0 var(--ink);
}
#oocIntro.oi-doors-open .oi-sign { opacity: 0; top: 60%; animation: none; }

/* stiker "ketuk pintu" */
#oocIntro .oi-tap {
    margin-top: 40px; padding: 7px 20px;
    font-family: "Bangers", Impact, sans-serif; font-weight: 400;
    font-size: 1.25rem; letter-spacing: .12em; text-align: center;
    background: var(--yellow); border: 3px solid var(--ink); border-radius: 12px;
    box-shadow: 4px 4px 0 var(--ink);
    transform: rotate(-2deg);
    animation: oi-bump 1.3s ease-in-out infinite;
    transition: opacity .4s ease;
}
@keyframes oi-bump { 50% { transform: rotate(-2deg) scale(1.08); } }
#oocIntro.oi-doors-open .oi-tap { opacity: 0; animation: none; }

/* ---------------- TAHAP 2: JUDUL ---------------- */
#oocIntro .oi-titlewrap {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none; transition: opacity .5s ease;
}
#oocIntro.oi-title .oi-titlewrap { opacity: 1; }
#oocIntro .oi-titlewrap::before { /* sinar komik */
    content: ""; position: absolute; inset: -40%;
    background: repeating-conic-gradient(from 0deg at 50% 50%, rgba(142,203,255,.55) 0 8deg, transparent 8deg 16deg);
    animation: oi-spin 30s linear infinite; opacity: 0; transition: opacity 1s ease .2s;
    -webkit-mask: radial-gradient(circle, #000 0 30%, transparent 70%); mask: radial-gradient(circle, #000 0 30%, transparent 70%);
}
#oocIntro.oi-title .oi-titlewrap::before { opacity: 1; }

#oocIntro .oi-titlewrap h1 {
    position: relative; font-family: "Bangers", Impact, sans-serif; font-weight: 400;
    font-size: clamp(6rem, 38vw, 12rem); letter-spacing: .05em; text-indent: .05em; line-height: 1;
    color: #fff; -webkit-text-stroke: 4px var(--ink); paint-order: stroke fill;
    text-shadow: 6px 6px 0 var(--blue), 10px 10px 0 var(--ink);
    transform: scale(.3) rotate(-10deg); opacity: 0;
}
#oocIntro.oi-title .oi-titlewrap h1 { animation: oi-pop .8s cubic-bezier(.34,1.7,.5,1) .15s forwards, oi-wob 3s ease-in-out 1s infinite; }
@keyframes oi-pop { to { transform: scale(1) rotate(-3deg); opacity: 1; } }
@keyframes oi-wob { 0%, 100% { transform: scale(1) rotate(-3deg); } 50% { transform: scale(1.04) rotate(2deg); } }

#oocIntro .oi-sub {
    position: relative; margin-top: 18px; padding: 6px 18px;
    font-family: "Bangers", Impact, sans-serif; font-weight: 400; font-size: 1.3rem; letter-spacing: .12em;
    background: #fff; border: 3px solid var(--ink); border-radius: 12px; box-shadow: 4px 4px 0 var(--ink);
    transform: rotate(2deg) translateY(20px); opacity: 0; transition: all .6s cubic-bezier(.34,1.5,.64,1) .7s;
}
#oocIntro.oi-title .oi-sub { transform: rotate(2deg); opacity: 1; }
#oocIntro .oi-enter {
    position: absolute; bottom: 11%; padding: 9px 26px;
    font-family: "Bangers", Impact, sans-serif; font-weight: 400; font-size: 1.4rem; letter-spacing: .12em;
    color: #fff; background: var(--blue); border: 3px solid var(--ink); border-radius: 14px;
    text-shadow: 2px 2px 0 var(--ink); box-shadow: 5px 5px 0 var(--ink);
    opacity: 0; transition: opacity .5s ease 1.4s;
}
#oocIntro.oi-title .oi-enter { opacity: 1; animation: oi-bump2 1.3s ease-in-out 2s infinite; }
@keyframes oi-bump2 { 50% { transform: scale(1.08); } }

@media (prefers-reduced-motion: reduce) {
    #oocIntro *, #oocIntro *::before, #oocIntro *::after { animation-duration: .01s !important; animation-iteration-count: 1 !important; }
}
`;
    var st = document.createElement('style');
    st.id = 'oocIntroCss';
    st.textContent = css;
    document.head.appendChild(st);

    /* ---------- HTML ---------- */
    var rivets = '<u></u><u></u><u></u><u></u>';
    var leaf = function (side) {
        return '<div class="oi-door ' + side + '"><i></i><i></i><i></i>' + rivets + '<b></b></div>';
    };

    var root = document.createElement('div');
    root.id = 'oocIntro';
    root.setAttribute('role', 'button');
    root.setAttribute('tabindex', '0');
    root.setAttribute('aria-label', 'Ketuk untuk masuk ke website ' + NAME);
    root.innerHTML =
        '<div class="oi-burst a"></div><div class="oi-burst b"></div>' +
        '<div class="oi-stage">' +
            '<div class="oi-wrap">' +
                '<div class="oi-ground"></div>' +
                '<div class="oi-frame">' +
                    '<div class="oi-open">' +
                        '<div class="oi-hall"><div class="oi-rays"></div><div class="oi-star"></div></div>' +
                        leaf('l') + leaf('r') +
                    '</div>' +
                    '<div class="oi-sign"><div class="oi-plaque"><small>WELCOME TO</small><strong>' + NAME + '</strong></div></div>' +
                '</div>' +
            '</div>' +
            '<div class="oi-tap">KETUK PINTU</div>' +
        '</div>' +
        '<div class="oi-titlewrap">' +
            '<h1>' + NAME + '</h1>' +
            '<div class="oi-sub">CIRCLE OFFICIAL</div>' +
            '<div class="oi-enter">KETUK UNTUK MASUK</div>' +
        '</div>';

    document.documentElement.classList.add('oi-lock');
    document.documentElement.appendChild(root);

    /* ---------- Alur ---------- */
    var phase = 0, busy = false;

    function next() {
        if (busy) return;
        if (phase === 0) {
            busy = true; phase = 1;
            root.classList.add('oi-doors-open');
            // ketukan pertama = interaksi pengguna -> bisa dipakai memulai musik
            try { window.dispatchEvent(new Event('ooc-intro-enter')); } catch (e) {}
            setTimeout(function () { root.classList.add('oi-title'); }, 1500);
            setTimeout(function () { busy = false; phase = 2; }, 2600);
        } else if (phase === 2) {
            busy = true;
            root.classList.add('oi-leave');
            document.documentElement.classList.remove('oi-lock');
            setTimeout(function () { root.remove(); }, 800);
        }
    }

    root.addEventListener('click', next);
    root.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
    });
})();
