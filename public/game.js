(() => {
  'use strict';

  // Spielbare Länder (ISO-Nummer aus world-atlas). Alle anderen Länder sind grau und nicht wählbar.
  const COUNTRIES = {
    '840': { name: 'USA',         anchor: [-98, 39],  flag: 'usa' },
    '643': { name: 'Russland',    anchor: [95, 62],   flag: 'rus' },
    '276': { name: 'Deutschland', anchor: [10.4, 51.1], flag: 'deu' },
    '156': { name: 'China',       anchor: [104, 35],  flag: 'chn' },
    '356': { name: 'Indien',      anchor: [79, 22],   flag: 'ind' },
    '004': { name: 'Afghanistan', anchor: [66, 33.5], flag: 'afg' },
  };

  const $ = (id) => document.getElementById(id);
  const screens = { menu: $('menu'), globe: $('globe-screen') };
  function show(name) { for (const k in screens) screens[k].classList.toggle('active', k === name); if (name === 'globe') resize(); }

  let toastTimer;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- Menü ----------
  $('btn-single').onclick = () => show('globe');
  $('btn-multi').onclick = () => toast('Multiplayer folgt in Kürze');
  $('btn-back').onclick = () => show('menu');

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
    draw();
  }
  window.addEventListener('resize', resize);

  function flag(kind, b, c) {
    const [x0, y0] = b[0], [x1, y1] = b[1], w = x1 - x0, h = y1 - y0;
    const hs = (cols) => cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(x0, y0 + (h * i) / cols.length - 1, w, h / cols.length + 2); });
    const vs = (cols) => cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(x0 + (w * i) / cols.length - 1, y0, w / cols.length + 2, h); });
    switch (kind) {
      case 'rus': hs(['#ffffff', '#1c57a5', '#d52b1e']); break;
      case 'deu': hs(['#111', '#dd0000', '#ffce00']); break;
      case 'ind':
        hs(['#ff9933', '#ffffff', '#138808']);
        c.strokeStyle = '#000080'; c.lineWidth = 1.5; c.beginPath(); c.arc(x0 + w / 2, y0 + h / 2, Math.min(w, h) * 0.09, 0, 7); c.stroke(); break;
      case 'afg': vs(['#111', '#c8102e', '#0a7d3c']); break;
      case 'chn':
        c.fillStyle = '#de2910'; c.fillRect(x0, y0, w, h);
        c.fillStyle = '#ffde00'; star(c, x0 + w * 0.22, y0 + h * 0.25, Math.min(w, h) * 0.1); break;
      case 'usa':
        for (let i = 0; i < 13; i++) { c.fillStyle = i % 2 ? '#fff' : '#b22234'; c.fillRect(x0, y0 + (h * i) / 13 - 0.5, w, h / 13 + 1); }
        c.fillStyle = '#3c3b6e'; c.fillRect(x0, y0, w * 0.42, h * 0.54); break;
    }
  }
  function star(c, cx, cy, r) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.4 : r; c.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
    c.closePath(); c.fill();
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

    // Wählbare Länder mit Flagge
    for (const f of playable) {
      ctx.beginPath(); path(f);
      const b = path.bounds(f);
      if (!isFinite(b[0][0]) || b[1][0] - b[0][0] < 1) continue;
      ctx.save(); ctx.clip(); flag(COUNTRIES[f.id].flag, b, ctx); ctx.restore();
      ctx.beginPath(); path(f);
      const sel = selected === f.id;
      ctx.strokeStyle = sel ? '#ffd23a' : 'rgba(0,0,0,.6)'; ctx.lineWidth = sel ? 3 : 1; ctx.stroke();
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
  let vel = [0, 0];
  (function loop() {
    if (screens.globe.classList.contains('active')) {
      if (!dragging && (Math.abs(vel[0]) > 0.01 || Math.abs(vel[1]) > 0.01)) { rotateBy(vel[0], vel[1]); vel[0] *= 0.94; vel[1] *= 0.94; }
      draw();
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
    rotateBy(dx * k, -dy * k); vel = [dx * k, -dy * k];
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
    selected = hit.id;
    $('chosen').textContent = 'Gewählt: ' + COUNTRIES[hit.id].name;
    $('btn-start').disabled = false;
  }

  $('rot-left').onclick = () => { vel = [-4, 0]; };
  $('rot-right').onclick = () => { vel = [4, 0]; };

  $('btn-start').onclick = () => {
    if (!selected) return;
    // Spielstart folgt später – die Auswahl steht hier bereit.
    window.WorldCommand = { mode: 'single', country: COUNTRIES[selected].name };
    toast(COUNTRIES[selected].name + ' gewählt – Spielstart folgt');
  };
})();
