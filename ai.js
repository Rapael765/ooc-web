/* =====================================================
   OOC - Tool "OOC AI" (chat)
   Dimuat SEBELUM tools.js. tools.js memanggil OOCAi.mount(wadah).
   Pesan dikirim ke /api/ai; riwayat chat disimpan di browser ini saja.
   ===================================================== */
(function () {
    'use strict';
    if (window.OOCAi) return;

    var KEY = 'ooc-ai-chat';
    var MAX_SAVED = 24;
    var SUGGEST = ['Jelaskan apa itu AI', 'Buatkan caption foto kumpul', 'Ide acara kumpul circle', 'Bantu perbaiki kalimat ini'];

    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // Format sederhana & aman: ```kode```, `kode`, **tebal**
    function fmt(text) {
        var parts = String(text).split('```');
        return parts.map(function (p, i) {
            if (i % 2 === 1) {
                var nl = p.indexOf('\n');
                var body = nl > -1 && nl < 20 && !/\s/.test(p.slice(0, nl).trim()) ? p.slice(nl + 1) : p;
                return '<pre><code>' + esc(body.replace(/^\n+|\n+$/g, '')) + '</code></pre>';
            }
            return esc(p)
                .replace(/`([^`\n]+)`/g, '<code>$1</code>')
                .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
        }).join('');
    }

    function mount(box) {
        if (box.__ai) return;
        box.__ai = true;

        box.innerHTML =
            '<div class="ai-head"><b>OOC AI</b><button class="btn btn-sm" id="aiClear" type="button">HAPUS CHAT</button></div>' +
            '<div class="ai-log" id="aiLog" aria-live="polite"></div>' +
            '<div class="ai-chips" id="aiChips"></div>' +
            '<div class="ai-form">' +
                '<textarea class="input" id="aiInput" rows="1" maxlength="1000" placeholder="Tanya apa saja ke OOC AI..." enterkeyhint="send"></textarea>' +
                '<button class="btn btn-primary" id="aiSend" type="button" aria-label="Kirim">KIRIM</button>' +
            '</div>' +
            '<p class="hint ai-note">Jawaban AI bisa keliru. Jangan kirim data pribadi atau password.</p>';

        var q = function (s) { return box.querySelector(s); };
        var log = q('#aiLog'), input = q('#aiInput'), sendBtn = q('#aiSend'), chips = q('#aiChips');
        var history = [], busy = false;

        try { history = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(history)) history = []; } catch (e) { history = []; }

        function save() {
            try { localStorage.setItem(KEY, JSON.stringify(history.slice(-MAX_SAVED))); } catch (e) {}
        }
        function toBottom() { log.scrollTop = log.scrollHeight; }

        function bubble(role, text, isErr) {
            var row = document.createElement('div');
            row.className = 'ai-msg ' + (role === 'user' ? 'me' : 'bot') + (isErr ? ' err' : '');
            var b = document.createElement('div');
            b.className = 'ai-bubble';
            if (role === 'user') b.textContent = text; else b.innerHTML = fmt(text);
            row.appendChild(b);
            if (role !== 'user' && !isErr) {
                var cp = document.createElement('button');
                cp.type = 'button'; cp.className = 'ai-copy'; cp.textContent = 'SALIN';
                cp.addEventListener('click', function () {
                    var done = function () { toast('Jawaban disalin'); };
                    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { toast('Gagal menyalin'); });
                    else toast('Gagal menyalin');
                });
                row.appendChild(cp);
            }
            log.appendChild(row);
            toBottom();
            return row;
        }

        function render() {
            log.innerHTML = '';
            if (!history.length) {
                var hello = document.createElement('div');
                hello.className = 'ai-hello';
                hello.innerHTML = '<span>🤖</span><p>Halo! Aku <b>OOC AI</b>. Tanya apa saja, atau pilih ide di bawah.</p>';
                log.appendChild(hello);
            } else {
                history.forEach(function (m) { bubble(m.role, m.content); });
            }
            chips.hidden = history.length > 0;
        }

        chips.innerHTML = '';
        SUGGEST.forEach(function (t) {
            var c = document.createElement('button');
            c.type = 'button'; c.className = 'ai-chip'; c.textContent = t;
            c.addEventListener('click', function () { input.value = t; input.focus(); });
            chips.appendChild(c);
        });

        function grow() {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 130) + 'px';
        }
        input.addEventListener('input', grow);

        async function send() {
            if (busy) return;
            var text = input.value.trim();
            if (!text) return;
            busy = true;
            sendBtn.disabled = true;

            var hello = log.querySelector('.ai-hello');
            if (hello) hello.remove();
            chips.hidden = true;

            history.push({ role: 'user', content: text });
            bubble('user', text);
            input.value = ''; grow();
            save();

            var wait = document.createElement('div');
            wait.className = 'ai-msg bot';
            wait.innerHTML = '<div class="ai-bubble ai-dots"><i></i><i></i><i></i></div>';
            log.appendChild(wait);
            toBottom();

            try {
                var r = await api('ai', { method: 'POST', body: { messages: history.slice(-12) } });
                wait.remove();
                history.push({ role: 'assistant', content: r.reply });
                bubble('assistant', r.reply);
                save();
            } catch (err) {
                wait.remove();
                // pesan error tidak masuk riwayat; pesan pengguna terakhir dibuang dari riwayat kirim berikutnya
                history.pop();
                save();
                bubble('assistant', err.message || 'Gagal terhubung ke OOC AI', true);
            }
            busy = false;
            sendBtn.disabled = false;
            input.focus();
        }

        sendBtn.addEventListener('click', send);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
        });
        q('#aiClear').addEventListener('click', function () {
            history = [];
            save();
            render();
            toast('Chat dihapus');
        });

        render();
    }

    window.OOCAi = { mount: mount };
})();