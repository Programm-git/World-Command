// Animationen für den Startbildschirm: flackernde Schreibtischlampe, Raketenziele auf der
// Weltkarte, Radar-Sweeps und blinkende Konsolenlichter. Alle Koordinaten sind Pixel im
// Hintergrundbild (1672×941) und werden in Prozent der .stage umgerechnet.
(() => {
  'use strict';

  const W = 1672, H = 941;
  const menu = document.getElementById('menu');
  const stage = menu.querySelector('.stage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const NS = 'http://www.w3.org/2000/svg';

  const fx = document.createElement('div');
  fx.className = 'fx';
  fx.setAttribute('aria-hidden', 'true');
  stage.prepend(fx);

  // Element mittig auf (x, y) mit Größe w×h platzieren
  function place(cls, x, y, w, h) {
    const el = document.createElement('div');
    el.className = cls;
    Object.assign(el.style, { left: (x - w / 2) / W * 100 + '%', top: (y - h / 2) / H * 100 + '%', width: w / W * 100 + '%', height: h / H * 100 + '%' });
    fx.appendChild(el);
    return el;
  }

  // ---------- Radar-Sweeps (links und rechts neben der Karte) ----------
  for (const [x, y, r] of [[455, 307, 60], [1210, 311, 58]]) {
    const radar = place('radar', x, y, r * 2, r * 2);
    radar.appendChild(document.createElement('div')).className = 'sweep';
    for (let i = 0; i < 3; i++) {
      const a = rnd(0, 360), d = rnd(.25, .85);
      const b = document.createElement('i');
      b.className = 'blip';
      Object.assign(b.style, { left: 50 + Math.sin(a * Math.PI / 180) * d * 50 + '%', top: 50 - Math.cos(a * Math.PI / 180) * d * 50 + '%',
        animationDelay: (a / 360 * 4 - 4) + 's' }); // leuchtet auf, wenn der Strahl vorbeikommt (4 s pro Umdrehung)
      radar.appendChild(b);
    }
  }

  // ---------- Konsolenlichter auf dem Schreibtisch ----------
  const lights = [[617, 681], [630, 684], [645, 686], [660, 684], [677, 684], [611, 696], [640, 700], [657, 700], [669, 699]]
    .map(([x, y]) => place('btn-light', x, y, 16, 12));
  lights.push(place('btn-light big', 712, 694, 34, 26), place('btn-light big', 745, 694, 34, 26));

  // ---------- Schreibtischlampe ----------
  const lampDim = place('lamp-dim', 1225, 655, 460, 330);
  const bulbDim = place('lamp-dim bulb', 1222, 588, 250, 46);
  const lampGlow = place('lamp-glow', 1222, 600, 300, 200);
  const lampPool = place('lamp-pool', 1245, 722, 300, 70);

  // ---------- Weltkarte: wechselnde Ziele ----------
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = `<defs><filter id="fx-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <clipPath id="fx-map"><rect x="535" y="70" width="605" height="222"/></clipPath></defs>
    <g clip-path="url(#fx-map)" filter="url(#fx-glow)"></g>`;
  fx.appendChild(svg);
  const layer = svg.querySelector('g');

  // Orte auf der Karte (Bildpixel)
  const CITIES = [
    [714, 199], [622, 186], [668, 160], [844, 164], [828, 150], [905, 147], [888, 205], [965, 213],
    [1017, 191], [1055, 180], [985, 160], [742, 268], [858, 262], [1060, 250], [1113, 254], [780, 256],
  ];

  function el(tag, attrs, parent = layer) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }

  const strikes = [];
  const busy = new Set();
  function launch(now) {
    let s, d;
    do { s = CITIES[Math.random() * CITIES.length | 0]; d = CITIES[Math.random() * CITIES.length | 0]; }
    while (s === d || busy.has(d) || Math.hypot(d[0] - s[0], d[1] - s[1]) < 120);
    busy.add(d);
    const dist = Math.hypot(d[0] - s[0], d[1] - s[1]);
    const c = [(s[0] + d[0]) / 2, Math.max(78, (s[1] + d[1]) / 2 - dist * .38)];
    const g = el('g', {});
    const strike = {
      s, d, c, g, t0: now, flight: 1300 + dist * 3,
      trail: el('path', { fill: 'none', stroke: '#ff6a3d', 'stroke-width': 2.2, 'stroke-dasharray': '7 5', 'stroke-linecap': 'round' }, g),
      head: el('circle', { r: 3.2, fill: '#fff2c0' }, g),
      lock: el('g', {}, g),
      ring: el('circle', { cx: d[0], cy: d[1], fill: 'none', stroke: '#ffb070', 'stroke-width': 2 }, g),
      core: el('circle', { cx: d[0], cy: d[1], fill: '#ff8a4a' }, g),
    };
    // Fadenkreuz um das neue Ziel
    el('circle', { r: 10, fill: 'none', stroke: '#ff4d3a', 'stroke-width': 1.6 }, strike.lock);
    for (const [x1, y1, x2, y2] of [[0, -16, 0, -6], [0, 6, 0, 16], [-16, 0, -6, 0], [6, 0, 16, 0]])
      el('line', { x1, y1, x2, y2, stroke: '#ff4d3a', 'stroke-width': 1.6 }, strike.lock);
    strikes.push(strike);
  }

  const bez = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
  const LOCK = 900, IMPACT = 900, HOLD = 1800, FADE = 900;

  function drawStrike(k, now) {
    const { s, d, c } = k;
    const t = now - k.t0;
    // 1) Zielerfassung: Fadenkreuz zieht sich zusammen und blinkt
    const lt = Math.min(1, t / LOCK);
    const sc = 1.8 - .8 * (1 - (1 - lt) ** 3);
    k.lock.setAttribute('transform', `translate(${d[0]} ${d[1]}) scale(${sc}) rotate(${(1 - lt) * 90})`);
    k.lock.setAttribute('opacity', t < LOCK ? (Math.floor(t / 110) % 2 ? .35 : 1) : Math.max(0, 1 - (t - LOCK - k.flight) / 300));
    // 2) Flug: gestrichelte Bahn wächst, Leuchtkopf an der Spitze
    const ft = Math.max(0, Math.min(1, (t - LOCK) / k.flight));
    const e = ft < .5 ? 2 * ft * ft : 1 - (-2 * ft + 2) ** 2 / 2;
    const q = [s[0] + (c[0] - s[0]) * e, s[1] + (c[1] - s[1]) * e];
    const p = [bez(s[0], c[0], d[0], e), bez(s[1], c[1], d[1], e)];
    k.trail.setAttribute('d', ft > 0 ? `M${s[0]} ${s[1]}Q${q[0]} ${q[1]} ${p[0]} ${p[1]}` : '');
    k.trail.setAttribute('stroke-dashoffset', -now / 40);
    k.head.setAttribute('cx', p[0]); k.head.setAttribute('cy', p[1]);
    k.head.setAttribute('opacity', ft > 0 && ft < 1 ? 1 : 0);
    // 3) Einschlag: Ring dehnt sich aus, Punkt pulsiert weiter
    const it = t - LOCK - k.flight;
    const end = IMPACT + HOLD;
    if (it > 0) {
      const r = Math.min(1, it / IMPACT);
      k.ring.setAttribute('r', 4 + r * 26);
      k.ring.setAttribute('opacity', 1 - r);
      k.core.setAttribute('r', 4 + (it < 150 ? (1 - it / 150) * 6 : Math.sin(it / 160) * 1.2));
    } else { k.ring.setAttribute('r', 0); k.core.setAttribute('r', 0); }
    // 4) Ausblenden
    k.g.setAttribute('opacity', it > end ? Math.max(0, 1 - (it - end) / FADE) : 1);
    return it > end + FADE;
  }

  // ---------- Lampenflackern ----------
  let lampSteps = [], lampNext = 0;
  function setLamp(v) { // v: 1 = normal hell, 0 = fast aus
    lampGlow.style.opacity = v; lampPool.style.opacity = v;
    lampDim.style.opacity = bulbDim.style.opacity = 1 - v;
  }
  function planFlicker(now) {
    let t = now;
    lampSteps = [];
    const n = 2 + (Math.random() * 6 | 0);
    for (let i = 0; i < n; i++) {
      lampSteps.push([t, rnd(0, .45)]); t += rnd(40, 110);
      lampSteps.push([t, rnd(.7, 1)]); t += rnd(50, 260);
    }
    lampSteps.push([t, 1]);
    // Gelegentlich ein längerer Aussetzer
    if (Math.random() < .25) { lampSteps.push([t + 300, .15], [t + 700, .6], [t + 780, .2], [t + 900, 1]); t += 900; }
    lampNext = t + rnd(2500, 7000);
  }

  // ---------- Hauptschleife ----------
  let nextLaunch = 0, last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!menu.classList.contains('active') || document.hidden) { last = 0; return; }
    if (!last) { nextLaunch = now + 400; lampNext = now + 1500; } // nach dem Zurückkehren sauber neu starten
    last = now;

    if (now >= nextLaunch && strikes.length < 3) { launch(now); nextLaunch = now + rnd(1400, 2600); }
    for (let i = strikes.length - 1; i >= 0; i--) {
      if (drawStrike(strikes[i], now)) { busy.delete(strikes[i].d); strikes[i].g.remove(); strikes.splice(i, 1); }
    }

    if (now >= lampNext) planFlicker(now);
    while (lampSteps.length && lampSteps[0][0] <= now) setLamp(lampSteps.shift()[1]);

    // Konsolenlichter: ab und zu eines umschalten
    if (Math.random() < .06) lights[Math.random() * lights.length | 0].classList.toggle('off');
  }

  setLamp(1);
  if (!reduced) requestAnimationFrame(frame);
})();
