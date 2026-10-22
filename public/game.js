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
  function show(name) { dirty = true; $('pause-menu').hidden = true; screens.office.classList.remove('zoomed'); for (const k in screens) screens[k].classList.toggle('active', k === name); if (name === 'globe') resize(); }

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
  $('btn-pc').onclick = () => screens.office.classList.add('zoomed');      // zum PC vorbeugen
  $('btn-lean').onclick = () => screens.office.classList.remove('zoomed'); // wieder zurücklehnen
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
    if (!c.office) { toast('Für ' + c.name + ' gibt es noch keinen Bildschirm'); return; }
    screens.office.style.setProperty('--img', 'url(' + c.office + ')');
    show('office');
  };
})();
