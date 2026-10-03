/* =====================================================
   OOC - Intro pintu (mandiri: CSS + HTML dibuat dari sini)
   Alur: pintu tertutup -> ketuk -> pintu terbuka -> judul OOC -> ketuk -> masuk web
   ===================================================== */
(function () {
    'use strict';
    if (document.getElementById('oocIntro')) return;

    var NAME = 'OOC';

    /* ---------- Font ---------- */
    var fl = document.createElement('link');
    fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@500;700&display=swap';
    document.head.appendChild(fl);

    /* ---------- CSS ---------- */
    var css = `
html.oi-lock, html.oi-lock body { overflow: hidden !important; height: 100%; }
#oocIntro {
    position: fixed; inset: 0; z-index: 99999;
    background: #050506;
    background-image: radial-gradient(rgba(255,255,255,.06) 1px, transparent 1.4px);
    background-size: 22px 22px;
    color: #e9dcc0;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; user-select: none; -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: opacity .9s ease, visibility .9s;
    font-family: "Cinzel", Georgia, serif;
}
#oocIntro.oi-leave { opacity: 0; visibility: hidden; pointer-events: none; }

/* ---- tahap 1: pintu ---- */
#oocIntro .oi-stage {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    transition: opacity 1s ease;
}
#oocIntro.oi-title .oi-stage { opacity: 0; pointer-events: none; }

.oi-frame {
    position: relative;
    width: min(82vw, 400px);
    aspect-ratio: 0.66;
    perspective: 1100px;
    border-radius: 10px;
    background:
        radial-gradient(circle at 50% 40%, #05070b 0%, #010102 70%);
    box-shadow: 0 0 60px rgba(0,0,0,.9), 0 0 0 2px #0b0c10;
    animation: oi-breathe 6s ease-in-out infinite;
}
@keyframes oi-breathe { 50% { transform: scale(1.012); } }

/* bingkai besi berpaku */
.oi-frame::before {
    content: ""; position: absolute; inset: 0; z-index: 6; pointer-events: none;
    border-radius: 10px;
    border: 15px solid transparent;
    background:
        radial-gradient(circle, #6b6f78 0 1.6px, transparent 2.2px) 0 0 / 15px 15px,
        linear-gradient(135deg, #2b2e36, #101217 50%, #23262d) border-box;
    -webkit-mask: linear-gradient(#000 0 0) padding-box exclude, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
}
.oi-frame::after {
    content: ""; position: absolute; inset: 14px; z-index: 5; pointer-events: none;
    box-shadow: inset 0 0 0 3px #07080b, inset 0 0 40px rgba(0,0,0,.8);
}

/* lorong di balik pintu */
.oi-hall {
    position: absolute; inset: 15px; z-index: 1; overflow: hidden;
    background:
        radial-gradient(ellipse 28% 45% at 50% 52%, #000 0 55%, transparent 100%),
        linear-gradient(90deg, #0b0d12 0 18%, transparent 18% 82%, #0b0d12 82%),
        linear-gradient(#10131a, #020203 60%, #08090c);
}
.oi-hall::before { /* lantai */
    content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 38%;
    background: linear-gradient(#050506, #14161c);
    clip-path: polygon(38% 0, 62% 0, 100% 100%, 0 100%);
}
.oi-hall::after { /* cahaya samar dari ujung lorong */
    content: ""; position: absolute; left: 50%; top: 40%;
    width: 30%; height: 22%; transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(120,150,200,.18), transparent 70%);
    filter: blur(6px);
}

/* daun pintu */
.oi-door {
    position: absolute; top: 15px; bottom: 15px; width: calc(50% - 15px); z-index: 3;
    background:
        linear-gradient(105deg, rgba(255,255,255,.07), transparent 28%, rgba(0,0,0,.35)),
        linear-gradient(#171a21, #0c0e12 55%, #14171d);
    transition: transform 1.9s cubic-bezier(.55,.05,.25,1), filter 1.9s;
    will-change: transform;
    box-shadow: inset 0 0 22px rgba(0,0,0,.7);
}
.oi-door.l { left: 15px; transform-origin: left center; border-right: 2px solid #040405; }
.oi-door.r { right: 15px; transform-origin: right center; border-left: 2px solid #040405; }
/* panel timbul */
.oi-door i {
    position: absolute; left: 14%; right: 14%;
    border: 2px solid #050608;
    background: linear-gradient(145deg, #1c2029, #0d0f14);
    box-shadow: inset 0 0 0 4px #14171e, inset 0 2px 10px rgba(255,255,255,.07), 0 0 6px rgba(0,0,0,.8);
    border-radius: 2px;
}
.oi-door i:nth-child(1) { top: 7%;  height: 46%; }
.oi-door i:nth-child(2) { top: 58%; height: 15%; }
.oi-door i:nth-child(3) { top: 77%; height: 15%; }
/* gagang kuningan */
.oi-door b {
    position: absolute; top: 56%; width: 7px; height: 17%;
    border-radius: 6px;
    background: linear-gradient(90deg, #5a431b, #d8b765 45%, #6e5320);
    box-shadow: 0 0 8px rgba(0,0,0,.9);
}
.oi-door.l b { right: 8px; }
.oi-door.r b { left: 8px; }

#oocIntro.oi-open .oi-door.l { transform: rotateY(-108deg); filter: brightness(.55); }
#oocIntro.oi-open .oi-door.r { transform: rotateY(108deg); filter: brightness(.55); }

/* papan gantung */
.oi-sign {
    position: absolute; left: 50%; top: 14%; z-index: 7;
    width: 64%; transform: translateX(-50%); transform-origin: 50% 0;
    animation: oi-sway 4s ease-in-out infinite;
    transition: opacity 1.1s ease .1s, top 1.4s ease-in;
}
@keyframes oi-sway { 0%,100% { transform: translateX(-50%) rotate(-1.2deg); } 50% { transform: translateX(-50%) rotate(1.2deg); } }
.oi-sign svg.chain { display: block; width: 100%; height: 38px; margin-bottom: -2px; }
.oi-plaque {
    position: relative; padding: 16px 8px 14px; text-align: center;
    background: linear-gradient(145deg, #1a1e27, #0b0d12);
    border: 3px solid #4a2f21;
    border-radius: 6px;
    box-shadow: 0 0 0 3px #271811, 0 8px 24px rgba(0,0,0,.8), inset 0 0 18px rgba(0,0,0,.8);
    font-family: "Cinzel Decorative", "Cinzel", Georgia, serif;
    font-weight: 700; line-height: 1.1;
    color: #e5d5a8;
    text-shadow: 0 2px 0 #000, 0 0 10px rgba(229,213,168,.25);
}
.oi-plaque::before, .oi-plaque::after {
    content: ""; position: absolute; top: 50%; width: 16px; height: 16px;
    background: #4a2f21; border: 2px solid #271811;
    transform: translateY(-50%) rotate(45deg);
}
.oi-plaque::before { left: -11px; }
.oi-plaque::after { right: -11px; }
.oi-plaque small { display: block; font-size: clamp(.8rem, 3.6vw, 1.05rem); letter-spacing: .04em; }
.oi-plaque strong { display: block; font-size: clamp(1.7rem, 8vw, 2.4rem); letter-spacing: .06em; }
#oocIntro.oi-open .oi-sign { opacity: 0; top: 60%; animation: none; }

.oi-hint {
    margin-top: 34px;
    font-size: .72rem; letter-spacing: .5em; text-indent: .5em;
    color: rgba(233,220,192,.55);
    animation: oi-pulse 2.2s ease-in-out infinite;
    transition: opacity .5s;
}
#oocIntro.oi-open .oi-hint { opacity: 0; animation: none; }
@keyframes oi-pulse { 50% { opacity: .25; } }

/* ---- tahap 2: judul ---- */
#oocIntro .oi-titlewrap {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none;
    transition: opacity 1.4s ease .3s;
}
#oocIntro.oi-title .oi-titlewrap { opacity: 1; }
.oi-titlewrap h1 {
    font-family: "Cinzel Decorative", "Cinzel", Georgia, serif;
    font-weight: 900;
    font-size: clamp(5.5rem, 34vw, 11rem);
    letter-spacing: .06em; text-indent: .06em; line-height: 1;
    color: #f4ead2;
    text-shadow:
        0 0 18px rgba(255,236,190,.55),
        0 0 48px rgba(255,214,140,.35),
        0 4px 0 rgba(0,0,0,.6);
    animation: oi-glow 3.2s ease-in-out infinite;
    transform: scale(.9); transition: transform 2.4s cubic-bezier(.2,.7,.2,1);
}
#oocIntro.oi-title .oi-titlewrap h1 { transform: scale(1); }
@keyframes oi-glow { 50% { text-shadow: 0 0 26px rgba(255,236,190,.8), 0 0 70px rgba(255,214,140,.5), 0 4px 0 rgba(0,0,0,.6); } }
.oi-titlewrap p {
    position: absolute; bottom: 9%;
    font-size: .72rem; letter-spacing: .5em; text-indent: .5em;
    color: rgba(233,220,192,.55);
    animation: oi-pulse 2.2s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
    .oi-frame, .oi-sign, .oi-hint, .oi-titlewrap h1, .oi-titlewrap p { animation: none !important; }
}
`;
    var st = document.createElement('style');
    st.id = 'oocIntroCss';
    st.textContent = css;
    document.head.appendChild(st);

    /* ---------- HTML ---------- */
    var chain = '<svg class="chain" viewBox="0 0 200 38" preserveAspectRatio="none" aria-hidden="true">' +
        '<path d="M100 0 L22 36 M100 0 L178 36" stroke="#6b5a3e" stroke-width="3" stroke-dasharray="5 3" fill="none"/>' +
        '<rect x="92" y="0" width="16" height="9" rx="2" fill="#3a2a1d"/></svg>';

    var root = document.createElement('div');
    root.id = 'oocIntro';
    root.setAttribute('role', 'button');
    root.setAttribute('tabindex', '0');
    root.setAttribute('aria-label', 'Ketuk untuk masuk ke website ' + NAME);
    root.innerHTML =
        '<div class="oi-stage">' +
            '<div class="oi-frame">' +
                '<div class="oi-hall"></div>' +
                '<div class="oi-door l"><i></i><i></i><i></i><b></b></div>' +
                '<div class="oi-door r"><i></i><i></i><i></i><b></b></div>' +
                '<div class="oi-sign">' + chain +
                    '<div class="oi-plaque"><small>Welcome To</small><strong>' + NAME + '</strong></div>' +
                '</div>' +
            '</div>' +
            '<p class="oi-hint">KETUK PINTU</p>' +
        '</div>' +
        '<div class="oi-titlewrap"><h1>' + NAME + '</h1><p>KETUK UNTUK MASUK</p></div>';

    document.documentElement.classList.add('oi-lock');
    document.documentElement.appendChild(root);

    /* ---------- Alur ---------- */
    var phase = 0, busy = false;

    function next() {
        if (busy) return;
        if (phase === 0) {
            busy = true;
            phase = 1;
            root.classList.add('oi-open');
            // klik pertama = interaksi pengguna -> bisa dipakai memulai musik
            try { window.dispatchEvent(new Event('ooc-intro-enter')); } catch (e) {}
            setTimeout(function () { root.classList.add('oi-title'); }, 1700);
            setTimeout(function () { busy = false; phase = 2; }, 3000);
        } else if (phase === 2) {
            busy = true;
            root.classList.add('oi-leave');
            document.documentElement.classList.remove('oi-lock');
            setTimeout(function () { root.remove(); }, 1000);
        }
    }

    root.addEventListener('click', next);
    root.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
    });
})();
