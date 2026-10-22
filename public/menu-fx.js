// Animationen für den Startbildschirm. Das Bild (img/menu.webp) bleibt unverändert; ein Canvas in
// Bildkoordinaten (1672x941) liegt darüber und zeichnet Lichter, Radar, Flugwege, Personen usw.
(() => {
  'use strict';
  const W = 1672, H = 941, TAU = Math.PI * 2;
  const menu = document.getElementById('menu');
  const stage = menu.querySelector('.stage');
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cv = document.createElement('canvas');
  cv.id = 'menu-fx'; cv.width = W; cv.height = H;
  stage.insertBefore(cv, stage.firstChild);
  const ctx = cv.getContext('2d');
  const img = new Image();
  img.src = 'img/menu.webp';

  // ---------- Hilfsfunktionen ----------
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // weiches Ellipsen-Leuchten über vorgerenderte Sprites (schneller als ein Farbverlauf pro Aufruf)
  const sprites = {};
  function sprite(col) {
    const k = col.join(',');
    if (!sprites[k]) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, rgba(col, 1)); g.addColorStop(0.45, rgba(col, 0.45)); g.addColorStop(1, rgba(col, 0));
      x.fillStyle = g; x.fillRect(0, 0, 64, 64); sprites[k] = c;
    }
    return sprites[k];
  }
  function glow(cx, cy, rx, ry, col, a) {
    if (a <= 0.002) return;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(sprite(col), cx - rx, cy - ry, rx * 2, ry * 2);
    ctx.globalAlpha = 1;
  }
  const rrect = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };

  // Mittelwertfarbe eines Bildbereichs (für Balkendiagramm-Hintergrund)
  let bgBars = [18, 66, 80];
  function sampleColors() {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(405, 166, 100, 4).data; let r = 0, g = 0, b = 0, n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    bgBars = [r / n | 0, g / n | 0, b / n | 0];
  }

  // ---------- Lampen ----------
  // x,y Mitte; w,h Größe; c Farbe; g Leuchtstärke; n Dauerrauschen; f Rauschfrequenz;
  // ev Periode (s) für Flacker-Ereignisse; p Wahrscheinlichkeit je Periode; d Dunkel-Stärke beim Aussetzen
  const WARM = [255, 178, 80], COOL = [170, 225, 255], WHITE = [255, 215, 150];
  const lamps = [
    { x: 147, y: 45, w: 55, h: 16, c: WARM, g: .30, r: 90, n: .05, f: 2.2, ev: 7.1, p: .35, d: .6, s: 1 },
    { x: 490, y: 6, w: 42, h: 10, c: WHITE, g: .30, r: 80, n: .03, f: 1.5, ev: 9.3, p: .30, d: .6, s: 2 },
    { x: 1170, y: 5, w: 42, h: 10, c: WHITE, g: .30, r: 80, n: .03, f: 1.5, ev: 8.2, p: .35, d: .6, s: 3 },
    { x: 1500, y: 50, w: 56, h: 12, c: WARM, g: .30, r: 80, n: .04, f: 1.8, ev: 6.4, p: .30, d: .6, s: 4 },
    { x: 1512, y: 72, w: 60, h: 12, c: WARM, g: .30, r: 80, n: .04, f: 1.8, ev: 7.7, p: .35, d: .6, s: 5 },
    { x: 1421, y: 131, w: 16, h: 20, c: WARM, g: .35, r: 40, n: .05, f: 2.0, ev: 9.0, p: .30, d: .6, s: 6 },
    // Labor (kühles Neonlicht, flackert stärker)
    { x: 33, y: 100, w: 50, h: 14, c: COOL, g: .45, r: 80, n: .06, f: 3.0, ev: 4.6, p: .75, d: .75, s: 7 },
    { x: 165, y: 126, w: 44, h: 10, c: COOL, g: .42, r: 70, n: .06, f: 3.0, ev: 5.3, p: .65, d: .75, s: 8 },
    { x: 205, y: 134, w: 24, h: 8, c: COOL, g: .38, r: 50, n: .06, f: 3.0, ev: 6.1, p: .55, d: .75, s: 9 },
    // Wandlampen (Flammen-artiges Zucken)
    { x: 354, y: 268, w: 20, h: 46, c: WARM, g: .45, r: 70, n: .10, f: 4.0, ev: 11, p: .20, d: .5, s: 10 },
    { x: 1311, y: 267, w: 20, h: 46, c: WARM, g: .45, r: 70, n: .10, f: 4.2, ev: 12, p: .20, d: .5, s: 11 },
    { x: 1277, y: 497, w: 14, h: 32, c: WARM, g: .45, r: 55, n: .10, f: 4.4, ev: 10, p: .25, d: .5, s: 12 },
    { x: 1322, y: 497, w: 12, h: 30, c: WARM, g: .45, r: 55, n: .10, f: 4.1, ev: 13, p: .25, d: .5, s: 13 },
    { x: 1437, y: 358, w: 40, h: 26, c: WARM, g: .45, r: 70, n: .07, f: 2.6, ev: 8.4, p: .30, d: .5, s: 14 },
    { x: 1650, y: 338, w: 40, h: 26, c: WARM, g: .45, r: 70, n: .07, f: 2.6, ev: 9.6, p: .30, d: .5, s: 15 },
    // grüne Schreibtischlampe
    { x: 1218, y: 596, w: 150, h: 16, c: [255, 190, 90], g: .42, r: 130, n: .05, f: 2.0, ev: 14, p: .25, d: .35, s: 16 },
  ];
  function lampIntensity(l, t) {
    let I = 1 + l.n * (vnoise(t * l.f + l.s * 17) - 0.5) * 2;
    const q = t / l.ev + l.s * 0.37, slot = Math.floor(q);
    if (hash(slot * 7.13 + l.s) < l.p) {
      const ph = q - slot;
      if (ph < 0.09) I *= hash(Math.floor(ph / 0.09 * 9) + slot * 3.3 + l.s) > 0.45 ? 1.15 : 0.12;   // Aussetzer
    }
    return I;
  }
  function drawLamps(t) {
    for (const l of lamps) {
      const I = lampIntensity(l, t);
      if (I < 0.98) {                       // abdunkeln
        ctx.save(); ctx.translate(l.x, l.y); ctx.scale(l.w * 0.85, l.h * 1.1);
        const a = Math.min(1, (1 - I) * l.d * 1.4);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.7, `rgba(0,0,0,${a * 0.7})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lamps) {
      const I = lampIntensity(l, t);
      glow(l.x, l.y, l.r * 1.2, l.r * 0.8, l.c, l.g * 0.35 * Math.max(0, I));                 // Lichtschein im Raum
      if (I > 1.02) glow(l.x, l.y, l.w * 0.9, l.h * 1.3, l.c, Math.min(0.7, (I - 1) * 1.6));  // Aufblitzen
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- Personen (Streifen-Verformung: leichtes Wiegen und Atmen) ----------
  const people = [
    { x: 30, y: 244, w: 108, h: 148, amp: 1.1, f: .55, ph: 0.0, br: .007 },    // Wissenschaftlerin mit Tablet
    { x: 160, y: 296, w: 74, h: 92, amp: .8, f: .75, ph: 1.3, br: .006, type: [200, 348, 36, 26] }, // Mann am Rechner
    { x: 1348, y: 520, w: 92, h: 124, amp: 1.2, f: .50, ph: 2.0, br: .006, type: [1400, 575, 40, 22] },
    { x: 1440, y: 520, w: 106, h: 130, amp: 1.2, f: .58, ph: .7, br: .006, type: [1500, 580, 44, 22] },
    { x: 1562, y: 520, w: 110, h: 142, amp: 1.3, f: .46, ph: 3.1, br: .006, type: [1572, 575, 30, 22] },
    { x: 1316, y: 540, w: 50, h: 84, amp: .8, f: .62, ph: 4.2, br: .005 },
  ];
  function drawPeople(t) {
    if (!img.complete) return;
    for (const p of people) {
      const w = Math.sin(t * TAU * p.f * 0.3 + p.ph), b = p.br * Math.sin(t * TAU * 0.22 + p.ph * 1.7);
      const sway = p.amp * w, bottom = p.y + p.h;
      for (let r = 0; r < p.h; r += 2) {
        const u = (p.h - r) / p.h;                                  // 0 unten (fest), 1 oben (Kopf)
        const dx = sway * Math.pow(u, 1.5) + 0.35 * Math.sin(t * 1.3 + p.ph + r * 0.05) * u * u;
        const sy = p.y + r, dy = bottom - (bottom - sy) * (1 + b);
        ctx.drawImage(img, p.x, sy, p.w, 2, p.x + dx, dy, p.w, 2 * (1 + b) + 0.7);
      }
      if (p.type) {                                                 // Tippen: Unterarme zucken
        const [tx, ty, tw, th] = p.type;
        for (let r = 0; r < th; r += 2) {
          const j = Math.sin(t * 9 + p.ph * 3 + r * 0.7) * 0.5 + Math.sin(t * 5.3 + r) * 0.4;
          ctx.drawImage(img, tx, ty + r, tw, 2, tx, ty + r + j, tw, 2.6);
        }
      }
    }
  }

  // ---------- Radar mit Zielerfassung ----------
  const radars = [
    { x: 455, y: 308, R: 58, w: 1.7, blips: [], lock: null, next: 3 },
    { x: 1210, y: 310, R: 58, w: -1.45, blips: [], lock: null, next: 5.5 },
  ];
  radars.forEach((r, k) => {
    for (let i = 0; i < 6; i++) r.blips.push({ rho: rnd(.25, .88), phi: rnd(0, TAU), hostile: i < 3, v: rnd(-.04, .04), id: Math.floor(rnd(10, 99)) });
  });
  function drawRadar(r, t, dt) {
    const th = t * r.w, { x, y, R } = r;
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, R + 2, 0, TAU); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const dir = Math.sign(r.w);
    for (let k = 0; k < 26; k++) {                                   // Schweif des Strahls
      const a0 = th - dir * k * 0.045, a1 = th - dir * (k + 1) * 0.045, al = 0.32 * Math.pow(1 - k / 26, 1.7);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R, Math.min(a0, a1), Math.max(a0, a1)); ctx.closePath();
      ctx.fillStyle = `rgba(70,255,210,${al})`; ctx.fill();
    }
    const lg = ctx.createLinearGradient(x, y, x + Math.cos(th) * R, y + Math.sin(th) * R);
    lg.addColorStop(0, 'rgba(160,255,235,.2)'); lg.addColorStop(1, 'rgba(190,255,245,.95)');
    ctx.strokeStyle = lg; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(th) * R, y + Math.sin(th) * R); ctx.stroke();

    for (const b of r.blips) {                                       // Ziele driften langsam
      b.phi += b.v * dt;
      const bx = x + Math.cos(b.phi) * b.rho * R, by = y + Math.sin(b.phi) * b.rho * R;
      const age = (((th - b.phi) * dir) % TAU + TAU) % TAU / Math.abs(r.w);
      const br = Math.pow(Math.max(0, 1 - age / 2.6), 1.3);
      if (br > 0.02) {
        const col = b.hostile ? [255, 95, 60] : [130, 255, 235];
        glow(bx, by, 7, 7, col, 0.85 * br);
        ctx.fillStyle = rgba(b.hostile ? [255, 190, 160] : [220, 255, 250], br); ctx.beginPath(); ctx.arc(bx, by, 1.7, 0, TAU); ctx.fill();
      }
    }
    // Zielerfassung: Klammern ziehen sich zu, rasten rot ein, dann Freigabe
    r.next -= dt;
    if (!r.lock && r.next <= 0) { const hs = r.blips.filter((b) => b.hostile); r.lock = { b: hs[Math.floor(Math.random() * hs.length)], t0: t }; }
    if (r.lock) {
      const L = t - r.lock.t0, b = r.lock.b, bx = x + Math.cos(b.phi) * b.rho * R, by = y + Math.sin(b.phi) * b.rho * R;
      if (L > 4.4) { r.lock = null; r.next = rnd(2.5, 5); }
      else {
        const shrink = Math.min(1, L / 1.0), s = 20 - 12 * (1 - Math.pow(1 - shrink, 3)), locked = L > 1.0;
        const fade = L > 3.8 ? 1 - (L - 3.8) / 0.6 : 1, blink = locked ? 0.65 + 0.35 * Math.sin(L * 18) : 1;
        const col = locked ? [255, 70, 50] : [255, 210, 120];
        glow(bx, by, 11, 11, [255, 80, 50], (locked ? 0.55 : 0.25) * fade * blink);
        ctx.strokeStyle = rgba(col, fade * blink); ctx.lineWidth = 1.4;
        const c = 4;                                                  // Eckklammern
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          ctx.beginPath(); ctx.moveTo(bx + sx * s, by + sy * (s - c)); ctx.lineTo(bx + sx * s, by + sy * s); ctx.lineTo(bx + sx * (s - c), by + sy * s); ctx.stroke();
        }
        if (locked) {
          ctx.beginPath(); ctx.arc(bx, by, 6 + 2 * Math.sin(L * 10), 0, TAU); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx - s - 5, by); ctx.lineTo(bx - 3, by); ctx.moveTo(bx + 3, by); ctx.lineTo(bx + s + 5, by);
          ctx.moveTo(bx, by - s - 5); ctx.lineTo(bx, by - 3); ctx.moveTo(bx, by + 3); ctx.lineTo(bx, by + s + 5); ctx.stroke();
          ctx.font = 'bold 7px monospace'; ctx.fillStyle = rgba([255, 120, 100], fade * blink);
          ctx.fillText('ZIEL ' + b.id, Math.min(x + R - 28, bx + 9), Math.max(y - R + 9, by - 9));
        }
      }
    }
    ctx.restore();
  }

  // ---------- Weltkarte: wechselnde Flugwege ----------
  const MAP = [535, 76, 595, 206];                                    // x, y, w, h
  const nodes = [
    [714, 201], [844, 164], [1018, 190], [782, 257], [1114, 256], [892, 222], [955, 140], [1045, 268], [640, 168], [905, 175],
  ];
  let flights = [], nextFlight = 0, impacts = [];
  const quad = (p0, p1, p2, s) => { const u = 1 - s; return [u * u * p0[0] + 2 * u * s * p1[0] + s * s * p2[0], u * u * p0[1] + 2 * u * s * p1[1] + s * s * p2[1]]; };
  function newFlight(t) {
    const a = Math.floor(Math.random() * nodes.length); let b;
    do { b = Math.floor(Math.random() * nodes.length); } while (b === a || Math.hypot(nodes[a][0] - nodes[b][0], nodes[a][1] - nodes[b][1]) < 90);
    const A = nodes[a], B = nodes[b], d = Math.hypot(B[0] - A[0], B[1] - A[1]);
    flights.push({ A, B, C: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - d * rnd(.28, .42) - 8], t0: t, dur: rnd(2.8, 4.4) + d / 220 });
  }
  function drawMap(t) {
    ctx.save(); rrect(MAP[0], MAP[1], MAP[2], MAP[3], 14); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    // Radar-Pings an den Knoten
    nodes.forEach((n, i) => { const ph = ((t * .45 + i * .37) % 1); glow(n[0], n[1], 5 + 15 * ph, 5 + 15 * ph, [255, 110, 70], 0.3 * (1 - ph)); });
    // Scanband über die Karte
    const sx = MAP[0] - 80 + ((t / 7) % 1) * (MAP[2] + 160);
    const sg = ctx.createLinearGradient(sx - 70, 0, sx + 70, 0);
    sg.addColorStop(0, 'rgba(90,230,255,0)'); sg.addColorStop(.5, 'rgba(110,240,255,.13)'); sg.addColorStop(1, 'rgba(90,230,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(sx - 70, MAP[1], 140, MAP[3]);

    if (t > nextFlight && flights.length < 4) { newFlight(t); nextFlight = t + rnd(.9, 2.0); }
    flights = flights.filter((f) => t - f.t0 < f.dur + 1.4);
    for (const f of flights) {
      const s = (t - f.t0) / f.dur, head = Math.min(1, s), fade = s > 1 ? Math.max(0, 1 - (s - 1) / (1.4 / f.dur)) : 1;
      if (!f.hit && s >= 1) { f.hit = true; impacts.push({ x: f.B[0], y: f.B[1], t0: t }); }
      // gesamte Bahn schwach gestrichelt
      ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 18; ctx.lineWidth = 1.2;
      ctx.strokeStyle = `rgba(255,120,80,${0.28 * fade})`; ctx.beginPath(); ctx.moveTo(f.A[0], f.A[1]); ctx.quadraticCurveTo(f.C[0], f.C[1], f.B[0], f.B[1]); ctx.stroke();
      ctx.setLineDash([]);
      // leuchtender Schweif bis zur Spitze
      const N = 26;
      for (let i = 0; i < N; i++) {
        const s0 = Math.max(0, head - 0.4 * (1 - i / N)), s1 = Math.max(0, head - 0.4 * (1 - (i + 1) / N));
        if (s1 <= s0) continue;
        const p = quad(f.A, f.C, f.B, s0), q = quad(f.A, f.C, f.B, s1);
        ctx.strokeStyle = `rgba(255,${150 + i * 3},${90 + i * 2},${(i / N) * 0.95 * fade})`; ctx.lineWidth = 1 + i / N * 1.6;
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      }
      if (s < 1) { const h = quad(f.A, f.C, f.B, head); glow(h[0], h[1], 9, 9, [255, 140, 80], .9); ctx.fillStyle = '#fff2d8'; ctx.beginPath(); ctx.arc(h[0], h[1], 1.8, 0, TAU); ctx.fill(); }
      glow(f.A[0], f.A[1], 10, 10, [255, 120, 70], .35 * fade * (0.6 + 0.4 * Math.sin(t * 6)));   // Startpunkt
    }
    impacts = impacts.filter((i) => t - i.t0 < 1.3);
    for (const i of impacts) {                                      // Einschlag: Ringe + Blitz
      const k = (t - i.t0) / 1.3;
      glow(i.x, i.y, 6 + 26 * k, 6 + 26 * k, [255, 130, 70], .55 * (1 - k));
      ctx.strokeStyle = `rgba(255,190,140,${.8 * (1 - k)})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(i.x, i.y, 3 + 22 * k, 0, TAU); ctx.stroke();
      if (k < .2) glow(i.x, i.y, 18, 18, [255, 240, 220], .8 * (1 - k / .2));
    }
    ctx.restore();
  }

  // ---------- Seitenpaneele, Reaktor, Hologramm ----------
  function drawPanels(t) {
    // Balkendiagramm links oben
    ctx.fillStyle = rgba(bgBars, 1); ctx.fillRect(400, 168, 108, 42);
    for (let i = 0; i < 10; i++) {
      const hgt = 6 + 28 * (0.25 + 0.75 * vnoise(t * (0.7 + i * 0.09) + i * 13.1)), x = 402 + i * 10.5;
      ctx.fillStyle = `rgba(${70 + i * 3},${190 + (i % 3) * 8},215,${0.55 + 0.4 * vnoise(t * .8 + i * 3)})`;
      ctx.fillRect(x, 206 - hgt, 8.4, hgt);
    }
    ctx.globalCompositeOperation = 'lighter';
    // Satellitenschüssel: Signalwellen
    for (let k = 0; k < 3; k++) { const ph = (t * .7 + k / 3) % 1; ctx.strokeStyle = `rgba(120,240,255,${.55 * (1 - ph)})`; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(478, 92, 6 + ph * 24, -Math.PI * .95, -Math.PI * .1); ctx.stroke(); }
    // Raketenpaneel: aufsteigendes Scanband
    ctx.save(); rrect(1146, 68, 134, 158, 10); ctx.clip();
    const ry = 230 - ((t / 3.2) % 1) * 190, rg = ctx.createLinearGradient(0, ry - 26, 0, ry + 26);
    rg.addColorStop(0, 'rgba(120,240,255,0)'); rg.addColorStop(.5, 'rgba(140,245,255,.28)'); rg.addColorStop(1, 'rgba(120,240,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(1146, ry - 26, 134, 52); ctx.restore();
    glow(1210, 84, 9, 9, [255, 80, 60], .5 * (0.5 + 0.5 * Math.sin(t * 4)));
    // Haus-Schild (Zivilschutz) pulsiert
    glow(1412, 484, 52, 42, [120, 215, 255], .10 + .09 * Math.sin(t * 1.8));
    // Kuppel-Bildschirm: Scanlinie + Skyline-Funkeln
    ctx.save(); rrect(1500, 432, 172, 114, 6); ctx.clip();
    const sy = 432 + ((t / 4) % 1) * 130 - 8; ctx.fillStyle = 'rgba(150,235,255,.12)'; ctx.fillRect(1500, sy, 172, 6);
    for (let i = 0; i < 16; i++) { const a = Math.sin(t * (1.5 + hash(i) * 2) + i * 5); if (a > .6) glow(1545 + hash(i + 3) * 115, 495 + hash(i + 9) * 30, 3, 3, [255, 225, 150], (a - .6) * 1.4); }
    ctx.restore();
    // Reaktor: Leuchten, aufsteigende Blasen, kreisende Elektronen
    const pul = .12 + .08 * Math.sin(t * 1.6) + .03 * Math.sin(t * 5.1);
    glow(150, 232, 62, 72, [90, 215, 255], pul);
    for (let i = 0; i < 14; i++) {
      const sp = .12 + hash(i * 2.3) * .16, py = 292 - (((t * sp + hash(i * 5.1)) % 1) * 112), px = 112 + hash(i * 1.7) * 76 + Math.sin(t * 1.4 + i) * 3;
      const a = Math.min(1, (292 - py) / 20) * Math.min(1, (py - 182) / 18) * .55;
      ctx.strokeStyle = `rgba(190,245,255,${a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, 1.5 + hash(i) * 1.8, 0, TAU); ctx.stroke();
    }
    for (let o = 0; o < 3; o++) {
      const rot = o * Math.PI / 3, a = t * 2.1 + o * 2.1, ex = 31 * Math.cos(a), ey = 11 * Math.sin(a);
      const px = 150 + ex * Math.cos(rot) - ey * Math.sin(rot), py = 233 + ex * Math.sin(rot) + ey * Math.cos(rot);
      glow(px, py, 7, 7, [170, 245, 255], .8); ctx.fillStyle = '#eaffff'; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, TAU); ctx.fill();
    }
    // Hologramm-Globus auf dem Konferenztisch
    glow(878, 612, 92, 62, [110, 215, 255], .12 + .07 * Math.sin(t * 2.1));
    ctx.save(); ctx.beginPath(); ctx.ellipse(878, 632, 66, 54, 0, Math.PI, 0); ctx.closePath(); ctx.clip();
    const hx = 810 + ((t / 3.6) % 1) * 136, hg = ctx.createLinearGradient(hx - 24, 0, hx + 24, 0);
    hg.addColorStop(0, 'rgba(150,240,255,0)'); hg.addColorStop(.5, 'rgba(170,245,255,.3)'); hg.addColorStop(1, 'rgba(150,240,255,0)');
    ctx.fillStyle = hg; ctx.fillRect(hx - 24, 574, 48, 60); ctx.restore();
    ctx.setLineDash([9, 7]); ctx.lineDashOffset = -t * 14; ctx.strokeStyle = 'rgba(140,235,255,.4)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(878, 629, 99, 7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    for (let k = 0; k < 2; k++) {                                   // kreisende Satelliten (vorn heller, hinten dunkler)
      const a = t * .9 + k * Math.PI, sx2 = 878 + 99 * Math.cos(a), sy2 = 629 + 7 * Math.sin(a), front = .55 + .45 * Math.sin(a);
      glow(sx2, sy2, 7, 7, [170, 245, 255], .85 * front); ctx.fillStyle = rgba([235, 255, 255], front); ctx.beginPath(); ctx.arc(sx2, sy2, 1.7, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- Buttons: Glanz und Pulsieren ----------
  const buttons = [
    { x: 585, y: 295, w: 510, h: 125, r: 30, col: [90, 170, 255], off: 0 },
    { x: 577, y: 440, w: 520, h: 125, r: 30, col: [255, 180, 70], off: 2.5 },
  ];
  function drawButtons(t) {
    ctx.globalCompositeOperation = 'lighter';
    for (const b of buttons) {
      ctx.save(); ctx.shadowColor = rgba(b.col, 1); ctx.shadowBlur = 16;
      ctx.strokeStyle = rgba(b.col, .10 + .08 * Math.sin(t * 2 + b.off)); ctx.lineWidth = 5; rrect(b.x, b.y, b.w, b.h, b.r); ctx.stroke(); ctx.restore();
      const p = ((t + b.off) % 5) / 1.2;                          // alle 5 s ein Lichtreflex
      if (p < 1) {
        ctx.save(); rrect(b.x, b.y, b.w, b.h, b.r); ctx.clip();
        const cx = b.x - 90 + p * (b.w + 180), g = ctx.createLinearGradient(cx - 45, 0, cx + 45, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.32)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.transform(1, 0, -.35, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(cx - 45 + .35 * (b.y + b.h / 2), b.y, 90, b.h); ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- Staubpartikel im Licht ----------
  const dust = Array.from({ length: 70 }, () => ({ x: rnd(0, W), y: rnd(0, H), vx: rnd(-6, 6), vy: rnd(-9, -2), r: rnd(.8, 2.2), ph: rnd(0, TAU) }));
  function drawDust(t, dt) {
    ctx.globalCompositeOperation = 'lighter';
    for (const d of dust) {
      d.x += d.vx * dt + Math.sin(t * .6 + d.ph) * .15; d.y += d.vy * dt;
      if (d.y < -5) { d.y = H + 5; d.x = rnd(0, W); } if (d.x < -5) d.x = W + 5; if (d.x > W + 5) d.x = -5;
      const a = .14 + .16 * Math.sin(t * 1.3 + d.ph);
      if (a > .02) glow(d.x, d.y, d.r * 2.2, d.r * 2.2, [255, 220, 170], a);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- Hauptschleife ----------
  let last = performance.now(), ready = false;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!menu.classList.contains('active') || document.hidden || reduceMotion) return;
    if (!ready) { if (!img.complete || !img.naturalWidth) return; sampleColors(); ready = true; }
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    drawPeople(t);
    drawPanels(t);
    drawMap(t);
    drawLamps(t);
    for (const r of radars) drawRadar(r, t, dt);
    drawButtons(t);
    drawDust(t, dt);
  }
  requestAnimationFrame(frame);
})();
