/* ---------------------------------------------------------------------------
   app.js — GTA+ style spawn cards for loe_spawn.

   Protocol (unchanged from the previous UI, so client/main.lua needs no edit):
     Lua -> NUI   { action: 'open', brand, title, options: [{ label, icon, ... }] }
                  { action: 'close' }
     NUI -> Lua   POST loe_spawn:select  { index }   (1-based position in `options`)

   The six cards are fixed. An option makes its card available when its `id`
   (or, failing that, its `icon`) matches; cards without an option are locked.
     id / icon   card
     hotel       Hotel
     pin / last  Last Location
     home        Home
     family      Family Home
     org         Organization HQ
     bunker      Bunker
   Options may also carry `tag`, `line1`, `line2` and `desc` for extra text.
--------------------------------------------------------------------------- */

(function () {
  'use strict';

  var RES = null;
  try {
    if (typeof GetParentResourceName === 'function') RES = GetParentResourceName();
  } catch (e) { /* running outside FiveM */ }

  function post(name, data) {
    if (!RES) return Promise.resolve();
    return fetch('https://' + RES + '/' + name, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data || {})
    }).catch(function () {});
  }

  function svg(cls, body, style) {
    return '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true"' + (style ? ' style="' + style + '"' : '') + '>' + body + '</svg>';
  }
  var ICONS = {
    hotel: '<rect x="2" y="5" width="2.2" height="14" rx="1"/><rect x="2" y="14" width="20" height="3.2" rx="1"/><rect x="19.8" y="12" width="2.2" height="7" rx="1"/><circle cx="7.6" cy="10.6" r="2.1"/><path d="M11 9h6.2A2.8 2.8 0 0 1 20 11.8V13.2H11z"/>',
    home: '<path d="M12 2.5 1.8 11.4h2.9V21h5.5v-6h3.6v6h5.5v-9.6h2.9z"/>',
    family: '<circle cx="12" cy="7" r="3.3"/><path d="M5.6 20.5c0-3.7 2.8-6.4 6.4-6.4s6.4 2.7 6.4 6.4z"/><circle cx="4.3" cy="10.4" r="2.2"/><path d="M.6 18.6c0-2.3 1.6-4 3.7-4 .8 0 1.5.2 2.1.5-1.1 1-1.8 2.2-2 3.5z"/><circle cx="19.7" cy="10.4" r="2.2"/><path d="M23.4 18.6c0-2.3-1.6-4-3.7-4-.8 0-1.5.2-2.1.5 1.1 1 1.8 2.2 2 3.5z"/>',
    org: '<path fill-rule="evenodd" d="M9 3.5h6a1 1 0 0 1 1 1V7h4a1 1 0 0 1 1 1v11.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4V4.5a1 1 0 0 1 1-1zm1 3.5h4V5.5h-4z"/>',
    bunker: '<path fill-rule="evenodd" d="M12 2.5 4 5.6v5.6c0 5 3.3 9.1 8 10.3 4.7-1.2 8-5.3 8-10.3V5.6zm0 6a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4z"/>',
    last: '<path fill-rule="evenodd" d="M12 2C7.6 2 4 5.5 4 9.9c0 5.6 6.6 11.6 7.3 12.2.4.3.9.3 1.3 0C13.4 21.5 20 15.5 20 9.9 20 5.5 16.4 2 12 2zm0 10.4a2.9 2.9 0 1 1 0-5.8 2.9 2.9 0 0 1 0 5.8z"/>',
    lock: '<path fill-rule="evenodd" d="M7 10V7.5a5 5 0 0 1 10 0V10h1.2A1.8 1.8 0 0 1 20 11.8v8.4a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 20.2v-8.4A1.8 1.8 0 0 1 5.8 10zm2 0h6V7.5a3 3 0 0 0-6 0zm3 4.2a1.7 1.7 0 0 0-.9 3.1V19h1.8v-1.7a1.7 1.7 0 0 0-.9-3.1z"/>'
  };

  var BRAND = 'Legends of Empire';

  // Card definitions, in on-screen order: 2 tall cards, then the right column top to bottom.
  var BASE = [
    { id: 'home',   layout: 'tall', name: 'Home',            rgb: '255,59,78',  art: 'img/home.webp',     pos: '50% 62%', desc: 'Wake up in your own place.',                       locked: 'No property owned' },
    { id: 'family', layout: 'tall', name: 'Family Home',     rgb: '184,76,255', art: 'img/family.webp',   pos: '50% 62%', desc: 'Return to the family home.',                       locked: 'No family home linked' },
    { id: 'hotel',  layout: 'wide', name: 'Hotel',           rgb: '255,184,0',  art: 'img/hotel_w.webp',  pos: '50% 50%', desc: 'Check into your room and start fresh.',            locked: 'No hotel room booked' },
    { id: 'org',    layout: 'wide', name: 'Organization HQ', rgb: '46,229,140', art: 'img/org_w.webp',    pos: '50% 50%', desc: 'Head straight to your organization headquarters.', locked: 'Not part of an organization' },
    { id: 'bunker', layout: 'wide', name: 'Bunker',          rgb: '25,211,240', art: 'img/bunker_w.webp', pos: '50% 50%', desc: 'Go underground and spawn inside your bunker.',     locked: 'No bunker owned' },
    { id: 'last',   layout: 'wide', name: 'Last Location',   rgb: '59,107,255', art: 'img/last_w.webp',   pos: '50% 50%', desc: 'Pick up right where you left off.',                locked: 'No saved position' }
  ];

  // The previous UI identified entries by icon; keep honouring that.
  var ICON_TO_ID = { hotel: 'hotel', pin: 'last', last: 'last', home: 'home', family: 'family', org: 'org', bunker: 'bunker' };

  // Keyboard navigation between cards.
  var NAV = {
    home:   { right: 'family' },
    family: { left: 'home', right: 'hotel' },
    hotel:  { left: 'family', down: 'org' },
    org:    { left: 'family', up: 'hotel', down: 'bunker' },
    bunker: { left: 'family', up: 'org', down: 'last' },
    last:   { left: 'family', up: 'bunker' }
  };

  // Preview only (opened in a normal browser): mirrors what the server offers today.
  var DEMO_LIVE = { brand: BRAND, options: [{ label: 'Hotel', icon: 'hotel' }, { label: 'Last Location', icon: 'pin' }] };
  var DEMO_FULL = {
    brand: BRAND,
    options: [
      { id: 'home', label: 'Home', tag: 'Owned', line1: 'Clinton Avenue', line2: 'APT 12' },
      { id: 'hotel', label: 'Hotel', tag: 'Room 214', line1: 'Sunset Motel', line2: 'VINEWOOD BLVD' },
      { id: 'last', label: 'Last Location', tag: 'Last seen', line1: 'Vespucci Canals', line2: 'NORTH ROCKFORD DR' }
    ]
  };

  // ---------- Perspective geometry ----------
  // Corner points of the sketch, normalised to 0..1 inside AREA (stage px).
  //   A,B,C,D = left card   B,E,F,C = middle card   E,G,H,F = right column
  // B-C is the ridge (nearest to the viewer), E-F is the valley (farthest).
  var SK = {
    A: [0.008, 0.134], B: [0.311, 0], C: [0.311, 0.967], D: [0, 0.905],
    E: [0.640, 0.051], F: [0.640, 0.938], G: [1, 0.092], H: [0.994, 1]
  };
  // Right column dividers: [height on the valley line E-F, height on the far edge G-H].
  // They zigzag (card 1 narrows to the right, card 2 widens, card 3 narrows, card 4 widens).
  var DIV = [[0.323, 0.275], [0.484, 0.571], [0.777, 0.767]];
  var AREA = { x: 96, y: 110, w: 1728, h: 860 };
  var SEAM = 7;   // half the visible gap between the three columns (px)
  var GAP_Y = 12; // gap between stacked cards in the right column (px)

  function pt(u, v) { return [AREA.x + u * AREA.w, AREA.y + v * AREA.h]; }
  function K(k, dx, dy) {
    var p = pt(SK[k][0], SK[k][1]);
    return [p[0] + (dx || 0), p[1] + (dy || 0)];
  }
  function onEdge(a, b, v) {
    var t = (v - SK[a][1]) / (SK[b][1] - SK[a][1]);
    return pt(SK[a][0] + t * (SK[b][0] - SK[a][0]), v);
  }

  var lp = [K('E', SEAM)].concat(DIV.map(function (d) { var p = onEdge('E', 'F', d[0]); return [p[0] + SEAM, p[1]]; }), [K('F', SEAM)]);
  var rp = [K('G')].concat(DIV.map(function (d) { return onEdge('G', 'H', d[1]); }), [K('H')]);
  function rightQuad(k) {
    var up = k > 0 ? GAP_Y / 2 : 0;
    var dn = k < 3 ? GAP_Y / 2 : 0;
    return [
      [lp[k][0], lp[k][1] + up], [rp[k][0], rp[k][1] + up],
      [rp[k + 1][0], rp[k + 1][1] - dn], [lp[k + 1][0], lp[k + 1][1] - dn]
    ];
  }

  // Quads are TL, TR, BR, BL.
  var QUADS = {
    home:   [K('A'), K('B', -SEAM), K('C', -SEAM), K('D')],
    family: [K('B', SEAM), K('E', -SEAM), K('F', -SEAM), K('C', SEAM)],
    hotel:  rightQuad(0),
    org:    rightQuad(1),
    bunker: rightQuad(2),
    last:   rightQuad(3)
  };

  // Solves the 8x8 system for the projective transform (Gauss-Jordan, partial pivoting).
  function solve(A, b) {
    var n = b.length;
    var M = A.map(function (row, i) { return row.concat(b[i]); });
    for (var c = 0; c < n; c++) {
      var p = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      var tmp = M[c]; M[c] = M[p]; M[p] = tmp;
      for (var r2 = 0; r2 < n; r2++) {
        if (r2 === c) continue;
        var f = M[r2][c] / M[c][c];
        for (var k = c; k <= n; k++) M[r2][k] -= f * M[c][k];
      }
    }
    return M.map(function (row, i) { return row[n] / row[i]; });
  }

  // CSS matrix3d that maps a w x h rectangle (origin 0 0) onto the quad q.
  function quadMatrix(w, h, q) {
    var src = [[0, 0], [w, 0], [w, h], [0, h]];
    var A = [];
    var b = [];
    src.forEach(function (s, i) {
      var x = s[0], y = s[1], X = q[i][0], Y = q[i][1];
      A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
      A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
    });
    var s8 = solve(A, b);
    return 'matrix3d(' + [s8[0], s8[3], 0, s8[6], s8[1], s8[4], 0, s8[7], 0, 0, 1, 0, s8[2], s8[5], 0, 1].join(',') + ')';
  }

  function dist(a, b) { return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2)); }
  function lineY(a, b, x) { return a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Everything a card needs: the warped art matrix plus flat text anchors (stage px).
  function geometry(q, layout) {
    var TL = q[0], TR = q[1], BR = q[2], BL = q[3];
    var leftH = dist(TL, BL);
    var rightH = dist(TR, BR);
    var w = Math.round((dist(TL, TR) + dist(BL, BR)) / 2);
    var h = Math.round(Math.max(leftH, rightH));
    var xl = (TL[0] + BL[0]) / 2;
    var xr = (TR[0] + BR[0]) / 2;
    function top(x) { return lineY(TL, TR, x); }
    function bot(x) { return lineY(BL, BR, x); }

    var ix = xl + 24;
    var avail = bot(ix) - top(ix);
    var cramped = avail < 150; // narrow left end: move the tag to the taller right end
    var ex = xr - 24;
    var tx = cramped ? xr - 20 : xl + 20;

    var lockX = layout === 'tall' ? (xl + xr) / 2 : xr - 64;
    var lockY = layout === 'tall'
      ? (TL[1] + TR[1] + BL[1] + BR[1]) / 4 - 24
      : (top(lockX) + bot(lockX)) / 2;

    return {
      w: w, h: h,
      matrix: quadMatrix(w, h, q),
      dl: clamp((1 - leftH / h) * 1.3, 0, 0.4).toFixed(3),
      dr: clamp((1 - rightH / h) * 1.3, 0, 0.4).toFixed(3),
      ts: clamp(avail / 128, 0.8, 1).toFixed(3),
      info: 'left:' + ix.toFixed(1) + 'px;bottom:' + (1080 - (bot(ix) - 26)).toFixed(1) + 'px',
      tag: cramped
        ? 'right:' + (1920 - tx).toFixed(1) + 'px;top:' + (top(tx) + 20).toFixed(1) + 'px'
        : 'left:' + tx.toFixed(1) + 'px;top:' + (top(tx) + 20).toFixed(1) + 'px',
      enter: 'right:' + (1920 - ex).toFixed(1) + 'px;bottom:' + (1080 - (bot(ex) - 28)).toFixed(1) + 'px',
      lock: 'left:' + lockX.toFixed(1) + 'px;top:' + lockY.toFixed(1) + 'px'
    };
  }

  var GEO = {};
  BASE.forEach(function (b) { GEO[b.id] = geometry(QUADS[b.id], b.layout); });

  function $(id) { return document.getElementById(id); }
  var stage = $('stage');
  var panelsEl = $('panels');
  var descEl = $('desc');
  var brandWord = $('brandWord');
  var DEFAULT_DESC = 'Choose where you want to start. Hover a location for details.';

  var cards = [];
  var els = [];
  var active = -1;
  var inputMode = 'mouse';
  var busy = false;
  var leaveTimer = 0;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fit() {
    stage.style.setProperty('--s', Math.min(innerWidth / 1920, innerHeight / 1080));
  }

  function setBrand(name) {
    var words = String(name || BRAND).trim().split(/\s+/).filter(Boolean);
    brandWord.innerHTML = words
      .map(function (w) { return '<span' + (w.length <= 2 ? ' class="small"' : '') + '>' + esc(w) + '</span>'; })
      .join('');
    $('brand').setAttribute('aria-label', words.join(' '));
  }

  function cardHtml(c, i) {
    var g = GEO[c.id];
    return '' +
      '<article class="card ' + c.layout + (c.available ? '' : ' locked') + '" role="listitem" data-id="' + c.id + '"' +
      ' style="--i:' + i + ';--accent:' + c.rgb + ';--pos:' + c.pos + ';--dl:' + g.dl + ';--dr:' + g.dr + ';--ts:' + g.ts + '">' +
        '<div class="shape" style="width:' + g.w + 'px;height:' + g.h + 'px;transform:' + g.matrix + '">' +
          '<div class="art" style="background-image:url(\'' + c.art + '\')"></div>' +
          '<div class="tint"></div><div class="glow"></div><div class="shade"></div><div class="depth"></div>' +
          '<div class="bar"></div><div class="flash"></div>' +
        '</div>' +
        '<span class="tag" style="' + g.tag + '">' + esc(c.tag) + '</span>' +
        (c.available ? '' : svg('lockbig', ICONS.lock, g.lock)) +
        '<div class="info" style="' + g.info + '">' +
          '<div class="namerow">' + (c.available ? svg('ico', ICONS[c.id]) : '') + '<h2 class="name">' + esc(c.name) + '</h2></div>' +
          '<p class="sub"><span class="l1">' + esc(c.line1) + '</span>' + (c.line2 ? '<span class="l2">' + esc(c.line2) + '</span>' : '') + '</p>' +
        '</div>' +
        (c.available ? '<button class="enter" type="button" tabindex="-1" style="' + g.enter + '">ENTER</button>' : '') +
      '</article>';
  }

  // Maps the `options` list sent by client/main.lua onto the six fixed cards.
  function optionsById(data) {
    var map = {};
    (data.options || []).forEach(function (o, i) {
      var id = o.id || ICON_TO_ID[o.icon];
      if (id && !map[id]) map[id] = { index: i + 1, tag: o.tag, line1: o.line1, line2: o.line2, desc: o.desc };
    });
    return map;
  }

  function build(data) {
    var byId = optionsById(data);
    cards = BASE.map(function (b) {
      var o = byId[b.id];
      var available = !!o;
      return {
        id: b.id, layout: b.layout, name: b.name, rgb: b.rgb, art: b.art, pos: b.pos,
        available: available,
        index: available ? o.index : 0,
        tag: available ? (o.tag || 'Available') : 'Locked',
        line1: available ? (o.line1 || '') : b.locked,
        line2: available ? (o.line2 || '') : '',
        desc: available ? (o.desc || b.desc) : 'Unavailable: ' + b.locked.toLowerCase() + '.'
      };
    });

    panelsEl.innerHTML = cards.map(cardHtml).join('');
    els = Array.prototype.slice.call(panelsEl.children);

    els.forEach(function (el, i) {
      var shape = el.querySelector('.shape');
      shape.addEventListener('mouseenter', function () {
        clearTimeout(leaveTimer);
        inputMode = 'mouse';
        setActive(i);
      });
      shape.addEventListener('mouseleave', function () {
        clearTimeout(leaveTimer);
        leaveTimer = setTimeout(function () { if (inputMode === 'mouse') setActive(-1); }, 60);
      });
      shape.addEventListener('click', function () { choose(i); });
    });

    setBrand(data.brand);
  }

  function say(text) {
    if (descEl.textContent === text) return;
    descEl.classList.add('swap');
    setTimeout(function () { descEl.textContent = text; descEl.classList.remove('swap'); }, 120);
  }

  function setActive(i) {
    if (busy || i === active) return;
    active = i;
    els.forEach(function (el, n) { el.classList.toggle('active', n === i); });
    say(i < 0 ? DEFAULT_DESC : cards[i].desc);
  }

  function move(dir) {
    inputMode = 'key';
    if (active < 0) {
      var first = cards.findIndex(function (c) { return c.available; });
      setActive(first < 0 ? 0 : first);
      return;
    }
    var to = NAV[cards[active].id][dir];
    if (to) setActive(cards.findIndex(function (c) { return c.id === to; }));
  }

  function choose(i) {
    if (busy || i < 0 || i >= cards.length) return;
    var c = cards[i];
    if (!c.available) {
      var el = els[i];
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      return;
    }
    busy = true;
    document.body.classList.add('busy');
    els[i].classList.add('chosen');
    post('loe_spawn:select', { index: c.index });
    setTimeout(function () { document.body.classList.add('out'); }, 380);
  }

  function open(data) {
    busy = false;
    active = -1;
    document.body.classList.remove('out', 'busy');
    build(data || {});
    fit();
    inputMode = 'mouse';
    descEl.textContent = DEFAULT_DESC;
    document.body.classList.add('open');
    if (RES) post('loe_spawn:uiOpened', {}); // lets Lua know the veil has started fading in
  }

  function close() {
    document.body.classList.remove('open', 'out', 'busy');
    busy = false;
  }

  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.action === 'open') open(m);
    else if (m.action === 'close') close();
  });

  window.addEventListener('resize', fit);

  window.addEventListener('mousemove', function (e) {
    stage.style.setProperty('--mx', ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
  });

  var KEYS = {
    arrowright: 'right', d: 'right',
    arrowleft: 'left', a: 'left',
    arrowup: 'up', w: 'up',
    arrowdown: 'down', s: 'down'
  };

  window.addEventListener('keydown', function (e) {
    if (!document.body.classList.contains('open')) return;
    var k = e.key.toLowerCase();
    if (KEYS[k]) { e.preventDefault(); move(KEYS[k]); }
    else if (k === 'enter' || k === ' ' || k === 'e') { e.preventDefault(); choose(active); }
  });

  setBrand(BRAND);
  fit();

  // Opened directly in a browser (no FiveM): show a demo state.
  //   ?demo=full  more cards available    ?hover=<id>  pre-select a card    ?bg=1  fake game backdrop
  if (!RES) {
    document.body.classList.add('preview');
    var q = new URLSearchParams(location.search);
    if (q.get('bg')) document.body.style.background = "#000 url('img/last_w.webp') center/cover";
    open(q.get('demo') === 'full' ? DEMO_FULL : DEMO_LIVE);
    var hover = q.get('hover');
    if (hover) setTimeout(function () { inputMode = 'key'; setActive(BASE.findIndex(function (b) { return b.id === hover; })); }, 1400);
  }
})();
