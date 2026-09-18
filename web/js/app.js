/* ---------------------------------------------------------------------------
   app.js — renders the spawn cards and reports the click back to Lua.
   Clicking a card spawns immediately; there is no confirm step.
--------------------------------------------------------------------------- */

(function () {
    'use strict';

    var resourceName = 'loe_spawn';
    try {
        if (typeof GetParentResourceName === 'function') {
            resourceName = GetParentResourceName();
        }
    } catch (e) { /* running outside FiveM */ }

    var root = document.getElementById('root');
    var cardsEl = document.getElementById('cards');
    var brandEl = document.getElementById('brand');
    var titleEl = document.getElementById('title');
    var locked = false;

    function post(name, data) {
        return fetch('https://' + resourceName + '/' + name, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(data || {})
        }).catch(function () {});
    }

    // Inline icon set — no external files, so nothing can 404.
    function P(d) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
    }
    var ICONS = {
        hotel: P('<path d="M4 21V6l8-3 8 3v15"/><path d="M9 21v-5h6v5"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>'),
        pin: P('<path d="M12 21s7-5.4 7-11a7 7 0 10-14 0c0 5.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>'),
        home: P('<path d="M4 11l8-6 8 6v9H4z"/><path d="M10 20v-5h4v5"/>'),
        star: P('<path d="M12 4l2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z"/>'),
        'default': P('<circle cx="12" cy="12" r="8"/>')
    };
    function iconFor(name) { return ICONS[name] || ICONS['default']; }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function open(data) {
        locked = false;
        if (data.brand) brandEl.textContent = data.brand;
        if (data.title) titleEl.textContent = data.title;

        var options = data.options || [];
        cardsEl.innerHTML = '';

        options.forEach(function (opt, i) {
            var el = document.createElement('div');
            el.className = 'card';
            el.style.transitionDelay = (i * 60) + 'ms';
            el.innerHTML =
                '<div class="card-icon">' + iconFor(opt.icon) + '</div>' +
                '<div class="card-label">' + escapeHtml(opt.label) + '</div>';

            el.addEventListener('click', function () {
                if (locked) return;
                locked = true;                     // one click only
                el.classList.add('chosen');
                post('loe_spawn:select', { index: i + 1 });
            });

            cardsEl.appendChild(el);
        });

        root.classList.remove('hidden');
        requestAnimationFrame(function () { root.classList.add('show'); });
    }

    function close() {
        root.classList.remove('show');
        setTimeout(function () {
            root.classList.add('hidden');
            cardsEl.innerHTML = '';
        }, 260);
    }

    window.addEventListener('message', function (event) {
        var data = event.data;
        if (!data || !data.action) return;
        if (data.action === 'open') { open(data); }
        else if (data.action === 'close') { close(); }
    });
})();
