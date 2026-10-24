(() => {
  'use strict';

  // Spielbare Länder (ISO-Nummer aus world-atlas). Alle anderen Länder sind grau und nicht wählbar.
  const COUNTRIES = {
    '840': { name: 'USA',         anchor: [-98, 39],  flag: 'usa', office: 'img/office-usa.webp' },
    '643': { name: 'Russland',    anchor: [95, 62],   flag: 'rus', office: 'img/office-russia.webp' },
    '276': { name: 'Deutschland', anchor: [10.4, 51.1], flag: 'deu', office: 'img/office-germany.webp' },
    '156': { name: 'China',       anchor: [104, 35],  flag: 'chn', office: 'img/office-china.webp' },
    '356': { name: 'Indien',      anchor: [79, 22],   flag: 'ind', office: 'img/office-india.webp' },
    '004': { name: 'Afghanistan', anchor: [66, 33.5], flag: 'afg' },
  };

  const $ = (id) => document.getElementById(id);
  const screens = { menu: $('menu'), globe: $('globe-screen'), office: $('office-screen') };
  function show(name) { dirty = true; $('pause-menu').hidden = true; resetOffice(); for (const k in screens) screens[k].classList.toggle('active', k === name); if (name === 'globe') resize(); }

  let toastTimer;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- Menü ----------
  $('btn-single').onclick = () => show('globe');
  $('btn-multi').onclick = () => toast('Multiplayer folgt in Kürze');
  $('btn-back').onclick = () => show('menu');
  // Im Spiel: Pause-Button öffnet das Pausenmenü (auch mit Esc)
  const pauseMenu = $('pause-menu');
  $('btn-pause').onclick = () => { pauseMenu.hidden = false; };
  $('btn-resume').onclick = () => { pauseMenu.hidden = true; };
  $('btn-quit').onclick = () => show('menu');
  let readyTimer;
  $('btn-pc').onclick = () => {                                              // zum PC vorbeugen
    screens.office.classList.add('zoomed');
    clearTimeout(readyTimer); readyTimer = setTimeout(() => screens.office.classList.add('ready'), 1900);  // bedienbar, sobald der Zoom fertig ist
  };
  $('btn-lean').onclick = resetOffice;                                       // wieder zurücklehnen
  function resetOffice() { clearTimeout(readyTimer); screens.office.classList.remove('zoomed', 'ready', 'app-open'); }

  // ---------- Zivil-Programm (Bunkerübersicht) ----------
  // Bunker je Land: count = Anzahl in der Liste, pages = vorhandene Bilder (Bunker ohne Bild zeigen "folgt"),
  // rows = Mitte der Listenzeilen im Bild, dx = Textversatz der Zahlen (Pixel) gegenüber der Vorlage.
  const pagesOf = (tag, n) => Array.from({ length: n }, (_, k) => 'img/zivil-' + tag + '-' + (k + 1) + '.webp');
  const ROWS10 = [205, 265, 324, 383, 443, 502, 563, 623, 684, 745], ROWS4 = [205, 265, 324, 383];
  const ROWS12 = [205, 253, 300, 348, 397, 446, 495, 543, 594, 643, 695, 745];
  const ZIVIL = {
    'USA': { count: 10, pages: pagesOf('usa', 10), rows: ROWS10, dx: 0 },
    'Deutschland': { count: 4, pages: pagesOf('deu', 4), rows: ROWS4, dx: 0 },
    'China': { count: 12, pages: pagesOf('chn', 4), rows: ROWS12, dx: -2 },
  };
  const zivil = () => ZIVIL[(window.WorldCommand || {}).country];
  function zivilPages() { const z = zivil(); return z && z.pages; }
  $('btn-zivil').onclick = () => {
    const pages = zivilPages();
    if (!pages) { toast('Zivil ist für dieses Land noch nicht verfügbar'); return; }
    showBunker(0);
  };
  // Upgrades (nur USA): je Bunker und Feld Stufe 1–5 (vier Upgrades). Die Texte im Bild werden übermalt
  // und mit den aktuellen Werten neu gezeichnet. Schutzplätze: +10.000 Plätze (und Gesamtkapazität),
  // Vorräte: +7 Tage, Medizin: +25 Personen pro Upgrade.
  const MAX_LEVEL = 5, MAX_BUNKERS = 12, BASE_PLACES = 10000, PER_UPGRADE = 10000;
  let current = 0;
  const fx = $('app-fx').getContext('2d');
  const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
  const fmt = (n) => n.toLocaleString('de-DE');
  const pageImg = {};
  function pageImage(i) { const u = zivilPages()[i]; return pageImg[u] || (pageImg[u] = Object.assign(new Image(), { src: u })); }   // Cache je Bild-URL (nicht je Land/Nummer)
  // Textfeld: Hintergrund mit einer benachbarten Pixelspalte übermalen, dann Text mit gleicher Breite wie das Original
  function retext(img, f, str, dx = 0) {
    f = dx ? { ...f, x0: f.x0 + dx, x1: f.x1 + dx, x: f.x + dx } : f;
    fx.drawImage(img, f.src, f.y0, 1, f.y1 - f.y0, f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0);
    fx.font = f.w + ' 100px ' + FONT;
    const size = 100 * f.refW / fx.measureText(f.ref).width;
    fx.font = f.w + ' ' + size + 'px ' + FONT; fx.fillStyle = f.c; fx.textBaseline = 'alphabetic';
    fx.fillText(str, f.x, f.base);
  }
  const NAVY = 'rgb(11,12,61)', SUB = 'rgb(36,40,91)', STUFE = 'rgb(19,21,64)';
  const TRACKS = [
    { key: 'places', label: 'Schutzplätzen', btn: 'btn-upg-people', button: [1243, 329, 321, 46],
      big: { x0: 1376, x1: 1500, y0: 221, y1: 257, src: 1371, x: 1380, base: 253, ref: '10.000', refW: 116, w: 800, c: NAVY },
      bigText: (L) => fmt(BASE_PLACES + PER_UPGRADE * (L - 1)),
      sub: { x0: 1376, x1: 1546, y0: 259, y1: 282, src: 1371, x: 1379, base: 275, ref: '+5.000 pro Upgrade', refW: 153, w: 600, c: SUB },
      subText: '+' + fmt(PER_UPGRADE) + ' pro Upgrade',                      // im Bild steht +5.000 → immer neu zeichnen
      stage: { x0: 1261, x1: 1349, y0: 298, y1: 321, src: 1255, x: 1265, base: 315, ref: 'Stufe 1/5', refW: 79, w: 600, c: STUFE } },
    { key: 'food', label: 'Vorräten', btn: 'btn-upg-food', button: [1245, 553, 323, 44],
      big: { x0: 1382, x1: 1506, y0: 434, y1: 474, src: 1371, x: 1386, base: 463, ref: '7 Tage', refW: 110, w: 800, c: NAVY },
      bigText: (L) => 7 * L + ' Tage',
      sub: { x0: 1382, x1: 1562, y0: 473, y1: 494, src: 1371, x: 1386, base: 487, ref: '+7 Tage pro Upgrade', refW: 167, w: 600, c: SUB },
      stage: { x0: 1261, x1: 1349, y0: 521, y1: 542, src: 1255, x: 1265, base: 538, ref: 'Stufe 1/5', refW: 81, w: 600, c: STUFE } },
    { key: 'med', label: 'Medizin', btn: 'btn-upg-med', button: [1247, 766, 323, 40],
      big: { x0: 1379, x1: 1566, y0: 646, y1: 676, src: 1371, x: 1383, base: 672, ref: '50 Personen', refW: 164, w: 800, c: NAVY },
      bigText: (L) => 50 + 25 * (L - 1) + ' Personen',
      sub: { x0: 1379, x1: 1524, y0: 701, y1: 722, src: 1371, x: 1383, base: 716, ref: '+25 pro Upgrade', refW: 124, w: 600, c: SUB },
      stage: { x0: 1261, x1: 1349, y0: 734, y1: 757, src: 1255, x: 1266, base: 752, ref: 'Stufe 1/5', refW: 80, w: 600, c: STUFE } },
  ];
  TRACKS.forEach((t) => { t.lv = Array(MAX_BUNKERS).fill(1); });
  const TOTAL = { x0: 567, x1: 740, y0: 766, y1: 801, src: 556, x: 571, base: 798, ref: '100.000', refW: 146, w: 800, c: 'rgb(8,9,53)' };
  function drawUpgrades() {
    fx.clearRect(0, 0, 1672, 941);
    const img = pageImage(current), dx = zivil().dx;
    if (!img.complete) { img.onload = drawUpgrades; return; }
    for (const t of TRACKS) {
      const L = t.lv[current], max = L >= MAX_LEVEL;
      if (L > 1) { retext(img, t.big, t.bigText(L), dx); retext(img, t.stage, 'Stufe ' + L + '/' + MAX_LEVEL); }
      if (max) retext(img, t.sub, 'Maximalstufe erreicht', dx); else if (t.subText) retext(img, t.sub, t.subText, dx);
      if (max) {                                                             // Button ausgegraut
        const [x, y, w, h] = t.button, g = fx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#d9dbe3'); g.addColorStop(1, '#a9adbb');
        fx.fillStyle = g; fx.beginPath(); fx.roundRect(x, y, w, h, 12); fx.fill();
        fx.font = '800 22px ' + FONT; fx.fillStyle = 'rgb(70,74,100)'; fx.textAlign = 'center'; fx.textBaseline = 'middle';
        fx.fillText('Maximal', x + w / 2, y + h / 2 + 1); fx.textAlign = 'left';
      }
    }
    const extra = TRACKS[0].lv.reduce((n, l) => n + l - 1, 0);               // Gesamtkapazität zählt nur die Schutzplätze
    if (extra > 0) retext(img, TOTAL, fmt(zivil().count * BASE_PLACES + PER_UPGRADE * extra));
  }
  for (const t of TRACKS) {
    $(t.btn).onclick = () => {
      if (t.lv[current] >= MAX_LEVEL) { toast('Bunker ' + String(current + 1).padStart(2, '0') + ': Maximalstufe bei ' + t.label + ' erreicht'); return; }
      t.lv[current]++; drawUpgrades();
    };
  }
  function showBunker(i) {
    const z = zivil();
    if (!z) return;
    if (!z.pages[i]) { toast('Bunker ' + String(i + 1).padStart(2, '0') + ' folgt'); return; }   // Bild noch nicht vorhanden
    current = i;
    const step = z.rows.length > 1 ? z.rows[1] - z.rows[0] : 60, h = Math.min(56, step - 3);       // Klickflächen auf die Listenzeilen legen
    document.querySelectorAll('.bunker').forEach((b, k) => {
      b.hidden = k >= z.count;
      if (k < z.count) { b.style.top = ((z.rows[k] - h / 2) / 941 * 100).toFixed(2) + '%'; b.style.height = (h / 941 * 100).toFixed(2) + '%'; }
    });
    $('app-zivil').style.setProperty('--app', 'url(' + z.pages[i] + ')');
    drawUpgrades();
    screens.office.classList.add('app-open');
  }
  document.querySelectorAll('.bunker').forEach((b) => { b.onclick = () => showBunker(+b.dataset.i); });
  const closeApp = () => screens.office.classList.remove('app-open');
  $('btn-app-close').onclick = closeApp; $('btn-app-min').onclick = closeApp;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && screens.office.classList.contains('active')) pauseMenu.hidden = !pauseMenu.hidden;
  });

  // ---------- Globus ----------
  const canvas = $('globe');
  const ctx = canvas.getContext('2d');
  const features = topojson.feature(WORLD_TOPO, WORLD_TOPO.objects.countries).features;
  const borders = topojson.mesh(WORLD_TOPO, WORLD_TOPO.objects.countries, (a, b) => a !== b);
  const sphere = { type: 'Sphere' };
  const projection = d3.geoOrthographic().clipAngle(90).rotate([-40, -25]);
  const path = d3.geoPath(projection, ctx);

  let W = 0, H = 0, dpr = 1, selected = null;
  const playable = features.filter((f) => COUNTRIES[f.id]);

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const r = Math.min(W, H) * 0.43;
    projection.scale(r).translate([W / 2, H / 2]);
    dirty = true;
  }
  window.addEventListener('resize', resize);

  // ---------- Flaggen als Textur auf der Erdoberfläche ----------
  // Jede Flagge wird einmal in Längen-/Breitengrad-Koordinaten (equirectangular) in ein Bild
  // gemalt und pro Frame auf die Kugel projiziert. So sitzen die Flaggen fest auf den Ländern
  // und drehen sich mit dem Globus mit.
  const TW = 4096, TH = 2048;
  // Rahmen der Flagge in Grad: [lonW, latS, lonE, latN]
  const FRAMES = {
    usa: [-125, 25, -67, 49], rus: [27, 41, 180, 82], deu: [5.9, 47.3, 15.1, 55],
    chn: [73.5, 18, 135, 53.6], ind: [68, 8, 97.4, 37], afg: [60.5, 29.3, 74.9, 38.5],
  };
  const tx = (lon) => ((lon + 180) / 360) * TW;
  const ty = (lat) => ((90 - lat) / 180) * TH;

  function paintFlag(kind, c) {
    const [w, s, e, n] = FRAMES[kind];
    const x0 = tx(w), x1 = tx(e), y0 = ty(n), y1 = ty(s), fw = x1 - x0, fh = y1 - y0, BIG = 4000;
    // Streifen; der erste und letzte Streifen reichen bis über den Rand (z. B. Alaska, Hawaii).
    const hs = (cols) => cols.forEach((col, i) => {
      const a = i === 0 ? y0 - BIG : y0 + (fh * i) / cols.length, b = i === cols.length - 1 ? y1 + BIG : y0 + (fh * (i + 1)) / cols.length;
      c.fillStyle = col; c.fillRect(-BIG, a, TW + 2 * BIG, b - a + 0.5);
    });
    const vs = (cols) => cols.forEach((col, i) => {
      const a = i === 0 ? x0 - BIG : x0 + (fw * i) / cols.length, b = i === cols.length - 1 ? x1 + BIG : x0 + (fw * (i + 1)) / cols.length;
      c.fillStyle = col; c.fillRect(a, -BIG, b - a + 0.5, TH + 2 * BIG);
    });
    switch (kind) {
      case 'rus': hs(['#ffffff', '#0039a6', '#d52b1e']); break;
      case 'deu': hs(['#111111', '#dd0000', '#ffce00']); break;
      case 'ind':
        hs(['#ff9933', '#ffffff', '#138808']);
        c.strokeStyle = '#000080'; c.lineWidth = 6; c.beginPath(); c.arc(x0 + fw / 2, y0 + fh / 2, fh * 0.09, 0, 7); c.stroke(); break;
      case 'afg': vs(['#111111', '#c8102e', '#0a7d3c']); break;
      case 'chn':
        c.fillStyle = '#de2910'; c.fillRect(-BIG, -BIG, TW + 2 * BIG, TH + 2 * BIG);
        c.fillStyle = '#ffde00'; star(c, x0 + fw * 0.2, y0 + fh * 0.22, fh * 0.13); break;
      case 'usa':
        c.fillStyle = '#fff'; c.fillRect(-BIG, -BIG, TW + 2 * BIG, TH + 2 * BIG);
        for (let i = 0; i < 13; i += 2) {
          const a = i === 0 ? y0 - BIG : y0 + (fh * i) / 13, b = i === 12 ? y1 + BIG : y0 + (fh * (i + 1)) / 13;
          c.fillStyle = '#b22234'; c.fillRect(-BIG, a, TW + 2 * BIG, b - a + 0.5);
        }
        c.fillStyle = '#3c3b6e'; c.fillRect(x0 - 40, y0 - 40, fw * 0.42 + 40, fh * 0.54 + 40); break;
    }
  }
  function star(c, cx, cy, r) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.4 : r; c.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
    c.closePath(); c.fill();
  }

  // Textur einmalig erzeugen (nur die wählbaren Länder; alles andere bleibt transparent)
  const texPx = (() => {
    const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
    const c = cv.getContext('2d', { willReadFrequently: true });
    const p = d3.geoPath(d3.geoEquirectangular().scale(TW / (2 * Math.PI)).translate([TW / 2, TH / 2]), c);
    for (const f of playable) {
      c.save(); c.beginPath(); p(f); c.clip(); paintFlag(COUNTRIES[f.id].flag, c); c.restore();
    }
    return new Uint32Array(c.getImageData(0, 0, TW, TH).data.buffer);
  })();

  // Pro Frame: jeden Pixel der Kugel auf Länge/Breite zurückrechnen und in der Textur nachschlagen.
  const flagLayer = document.createElement('canvas');
  const fctx = flagLayer.getContext('2d');
  let geo = null; // pro Pixel vorberechnete, drehungsunabhängige Werte
  function buildGeo() {
    const r = projection.scale(), D = Math.ceil(r) * 2 + 2, n = D * D, h = D / 2;
    geo = { D, r, h, rho: new Float32Array(n), sc: new Float32Array(n), cc: new Float32Array(n), px: new Float32Array(n), py: new Float32Array(n) };
    for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
      const k = j * D + i, px = (i + 0.5 - h) / r, py = -(j + 0.5 - h) / r, rho = Math.hypot(px, py);
      geo.px[k] = px; geo.py[k] = py; geo.rho[k] = rho;
      if (rho <= 1) { const c = Math.asin(rho); geo.sc[k] = Math.sin(c); geo.cc[k] = Math.cos(c); } else geo.rho[k] = -1;
    }
    flagLayer.width = D; flagLayer.height = D;
  }
  let flagKey = '';
  // Schnelle Näherungen (Fehler < 0,001°) – ersetzen asin/atan2 pro Pixel
  const LAT_MIN = Math.sin(14 * Math.PI / 180), LAT_MAX = Math.sin(83 * Math.PI / 180); // nur dort liegen Flaggen
  const ROWS = 16384, ROW_K = (ROWS - 1) / (LAT_MAX - LAT_MIN);
  const rowTab = new Int16Array(ROWS);
  for (let i = 0; i < ROWS; i++) rowTab[i] = Math.round(TH / 2 - Math.asin(LAT_MIN + i / ROW_K) * (TH / Math.PI));
  function atan2f(y, x) {
    const ax = Math.abs(x), ay = Math.abs(y), mx = ax > ay ? ax : ay;
    if (mx === 0) return 0;
    const z = (ax > ay ? ay : ax) / mx, z2 = z * z;
    let r = z * (0.99986605 + z2 * (-0.33029950 + z2 * (0.18014100 + z2 * (-0.08513300 + 0.02083510 * z2))));
    if (ay > ax) r = Math.PI / 2 - r;
    if (x < 0) r = Math.PI - r;
    return y < 0 ? -r : r;
  }
  function renderFlags() {
    if (!geo || geo.r !== projection.scale()) { buildGeo(); flagKey = ''; }
    const [rl, rp] = projection.rotate(), key = rl + ',' + rp;
    if (key === flagKey) return; flagKey = key;               // unverändert → Ebene wiederverwenden
    const lam0 = -rl * Math.PI / 180, phi0 = -rp * Math.PI / 180, sp0 = Math.sin(phi0), cp0 = Math.cos(phi0);
    const { D, rho, sc, cc, px, py, h } = geo, [cx, cy] = projection.translate();
    const img = fctx.createImageData(D, D), out = new Uint32Array(img.data.buffer);
    const k1 = TW / (2 * Math.PI), TWAP = 2 * Math.PI;
    // Nur die sichtbaren Bereiche der Flaggenländer berechnen
    for (const f of playable) {
      const b = path.bounds(f);
      if (!isFinite(b[0][0]) || b[1][0] <= b[0][0]) continue;
      const i0 = Math.max(0, Math.floor(b[0][0] - (cx - h)) - 1), i1 = Math.min(D - 1, Math.ceil(b[1][0] - (cx - h)) + 1);
      const j0 = Math.max(0, Math.floor(b[0][1] - (cy - h)) - 1), j1 = Math.min(D - 1, Math.ceil(b[1][1] - (cy - h)) + 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = j * D + i, p = rho[k]; if (p < 0) continue;
        const sinPhi = p === 0 ? sp0 : cc[k] * sp0 + (py[k] * sc[k] * cp0) / p;
        if (sinPhi < LAT_MIN || sinPhi > LAT_MAX) continue;
        let lam = lam0 + (p === 0 ? 0 : atan2f(px[k] * sc[k], p * cp0 * cc[k] - py[k] * sp0 * sc[k])) + Math.PI;
        lam = lam % TWAP; if (lam < 0) lam += TWAP;
        const col = texPx[rowTab[((sinPhi - LAT_MIN) * ROW_K) | 0] * TW + Math.min(TW - 1, (lam * k1) | 0)];
        if (col >>> 24) out[k] = col;
      }
    }
    fctx.putImageData(img, 0, 0);
  }

  function visible(lonlat) { const [l, p] = projection.rotate(); return d3.geoDistance(lonlat, [-l, -p]) < Math.PI / 2 - 0.02; }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const [cx, cy] = projection.translate(), r = projection.scale();

    // Leuchtrand (Atmosphäre)
    const glow = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.12);
    glow.addColorStop(0, 'rgba(60,150,255,.75)'); glow.addColorStop(1, 'rgba(60,150,255,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, r * 1.12, 0, 7); ctx.fill();

    // Ozean
    const sea = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    sea.addColorStop(0, '#2b7fe0'); sea.addColorStop(1, '#0d3a8c');
    ctx.beginPath(); path(sphere); ctx.fillStyle = sea; ctx.fill();

    // Graue (nicht wählbare) Länder
    ctx.beginPath(); for (const f of features) if (!COUNTRIES[f.id]) path(f);
    ctx.fillStyle = '#9b9ea3'; ctx.fill();
    ctx.beginPath(); path(borders); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.6; ctx.stroke();

    // Wählbare Länder: Flaggen-Textur (dreht mit dem Globus), darüber die Umrisse
    renderFlags();
    ctx.drawImage(flagLayer, cx - geo.h, cy - geo.h);
    for (const f of playable) {
      ctx.beginPath(); path(f);
      const sel = selected === f.id;
      ctx.strokeStyle = sel ? '#ffd23a' : 'rgba(0,0,0,.75)'; ctx.lineWidth = sel ? 3 : 1.4; ctx.stroke();
    }

    // Marker
    if (selected) {
      const a = COUNTRIES[selected].anchor;
      if (visible(a)) {
        const [x, y] = projection(a), pulse = 1 + 0.12 * Math.sin(performance.now() / 180);
        ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#e8262b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-18, -22, -14, -40, 0, -40); ctx.bezierCurveTo(14, -40, 18, -22, 0, 0); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -27, 5, 0, 7); ctx.fill();
        ctx.restore();
      }
    }
  }

  // Dauerhafte Animation nur solange der Globus sichtbar ist (Marker pulsiert, Trägheit beim Drehen).
  let vel = [0, 0], dirty = true;
  (function loop() {
    if (screens.globe.classList.contains('active')) {
      const coasting = !dragging && (Math.abs(vel[0]) > 0.01 || Math.abs(vel[1]) > 0.01);
      if (coasting) { rotateBy(vel[0], vel[1]); vel[0] *= 0.94; vel[1] *= 0.94; }
      if (coasting || dragging || selected || dirty) { dirty = false; draw(); }
    }
    requestAnimationFrame(loop);
  })();

  function rotateBy(dLon, dLat) {
    const [l, p, g] = projection.rotate();
    projection.rotate([l + dLon, Math.max(-75, Math.min(75, p + dLat)), g]);
  }

  // ---------- Drehen (Ziehen) & Tippen ----------
  let dragging = false, moved = 0, last = null, down = null;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    dragging = true; moved = 0; last = [e.clientX, e.clientY]; down = [e.clientX, e.clientY]; vel = [0, 0];
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - last[0], dy = e.clientY - last[1];
    last = [e.clientX, e.clientY]; moved += Math.abs(dx) + Math.abs(dy);
    const k = 90 / projection.scale() * 1.6;
    rotateBy(dx * k, -dy * k); vel = [dx * k, -dy * k]; dirty = true;
  });
  canvas.addEventListener('pointerup', (e) => {
    dragging = false;
    if (moved < 8) tap(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointercancel', () => { dragging = false; });

  function tap(px, py) {
    const rect = canvas.getBoundingClientRect();
    const ll = projection.invert([px - rect.left, py - rect.top]);
    if (!ll || !isFinite(ll[0]) || !visible(ll)) return;
    const hit = playable.find((f) => d3.geoContains(f, ll));
    if (!hit) { toast('Dieses Land ist nicht wählbar'); return; }
    selected = hit.id; dirty = true;
    if (COUNTRIES[hit.id].office) new Image().src = COUNTRIES[hit.id].office; // vorladen
    $('chosen').textContent = 'Gewählt: ' + COUNTRIES[hit.id].name;
    $('btn-start').disabled = false;
  }

  $('rot-left').onclick = () => { vel = [-4, 0]; };
  $('rot-right').onclick = () => { vel = [4, 0]; };

  $('btn-start').onclick = () => {
    if (!selected) return;
    const c = COUNTRIES[selected];
    window.WorldCommand = { mode: 'single', country: c.name };
    TRACKS.forEach((t) => t.lv.fill(1));                                  // neues Spiel: alle Bunker auf Stufe 1
    if (!c.office) { toast('Für ' + c.name + ' gibt es noch keinen Bildschirm'); return; }
    screens.office.style.setProperty('--img', 'url(' + c.office + ')');
    ((ZIVIL[c.name] || {}).pages || []).forEach((u) => { new Image().src = u; });          // vorladen
    show('office');
  };
})();
