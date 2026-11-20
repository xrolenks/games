'use strict';
// Fatal Fists - drawing: arena, fighters, blasts, HUD
// ===== Drawing: background (drawn once) =====
const bg = document.createElement('canvas');
function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }
function buildBg() {
  bg.width = W * S; bg.height = H * S;
  const c = bg.getContext('2d');
  c.setTransform(S, 0, 0, S, 0, 0);
  const g = c.createLinearGradient(0, 0, 0, 420);
  g.addColorStop(0, '#12030a'); g.addColorStop(0.6, '#3d0b0e'); g.addColorStop(1, '#6a1a12');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const r = seeded(7);
  c.fillStyle = '#ffd9c8';
  for (let i = 0; i < 70; i++) { c.globalAlpha = 0.2 + r() * 0.6; c.fillRect(r() * W, r() * 260, 1.5, 1.5); }
  c.globalAlpha = 1;
  // moon
  const mg = c.createRadialGradient(640, 150, 40, 640, 150, 200);
  mg.addColorStop(0, 'rgba(255,120,80,.45)'); mg.addColorStop(1, 'rgba(255,120,80,0)');
  c.fillStyle = mg; c.fillRect(400, 0, 480, 360);
  c.fillStyle = '#ff9a6a'; c.beginPath(); c.arc(640, 150, 70, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(180,60,40,.35)';
  [[620, 130, 14], [665, 170, 10], [650, 120, 6], [610, 175, 8]].forEach(([x, y, rr]) => { c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill(); });
  // far mountains
  c.fillStyle = '#2a0a0e';
  c.beginPath(); c.moveTo(0, 360);
  const r2 = seeded(3);
  for (let x = 0; x <= W; x += 40) c.lineTo(x, 280 + r2() * 70);
  c.lineTo(W, 420); c.lineTo(0, 420); c.fill();
  c.fillStyle = '#1c0609';
  c.beginPath(); c.moveTo(0, 380);
  for (let x = 0; x <= W; x += 60) c.lineTo(x, 330 + r2() * 50);
  c.lineTo(W, 420); c.lineTo(0, 420); c.fill();
  // arena wall with battlements
  c.fillStyle = '#24100f'; c.fillRect(0, 372, W, 60);
  for (let x = 0; x < W; x += 48) c.fillRect(x, 358, 28, 16);
  c.strokeStyle = '#1a0a09'; c.lineWidth = 2;
  for (let y = 388; y < 432; y += 15) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  for (let y = 372, row = 0; y < 432; y += 15, row++) for (let x = row % 2 ? 0 : 24; x < W; x += 48) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 15); c.stroke(); }
  // banners with our fist emblem
  [250, 710].forEach(x => {
    c.fillStyle = '#7a1612';
    c.beginPath(); c.moveTo(x - 26, 300); c.lineTo(x + 26, 300); c.lineTo(x + 26, 400); c.lineTo(x, 386); c.lineTo(x - 26, 400); c.fill();
    c.fillStyle = '#4a0c0a'; c.fillRect(x - 30, 296, 60, 6);
    c.fillStyle = '#ffcf5a';
    c.beginPath(); c.arc(x, 340, 15, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7a1612';
    c.fillRect(x - 8, 333, 16, 12); c.fillRect(x - 8, 345, 9, 4);
    c.fillStyle = '#ffcf5a';
    for (let i = 0; i < 3; i++) c.fillRect(x - 6, 336 + i * 3, 12, 1.2);
  });
  // floor
  const fg = c.createLinearGradient(0, 432, 0, H);
  fg.addColorStop(0, '#3a1c16'); fg.addColorStop(1, '#140807');
  c.fillStyle = fg; c.fillRect(0, 432, W, H - 432);
  c.save(); c.beginPath(); c.rect(0, 432, W, H - 432); c.clip();
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5;
  for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(480 + i * 40, 432); c.lineTo(480 + i * 160, H); c.stroke(); }
  [440, 452, 470, 494, 524].forEach(y => { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); });
  c.restore();
  c.fillStyle = 'rgba(255,140,90,.08)'; c.fillRect(0, 432, W, 3);
  // stone pillars with fire bowls
  [82, 878].forEach(x => {
    c.fillStyle = '#3a2420'; c.fillRect(x - 22, 252, 44, 220);
    c.fillStyle = '#4c302a'; c.fillRect(x - 22, 252, 8, 220);
    c.fillStyle = '#2a1815'; c.fillRect(x + 14, 252, 8, 220);
    c.fillStyle = '#4c302a'; c.fillRect(x - 28, 460, 56, 12); c.fillRect(x - 28, 252, 56, 10);
    c.fillStyle = '#2a1815';
    c.beginPath(); c.moveTo(x - 30, 236); c.lineTo(x + 30, 236); c.lineTo(x + 20, 252); c.lineTo(x - 20, 252); c.fill();
  });
}

// ===== Drawing: fighters =====
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v * k)));
  return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
}
function ik(a, b, l1, l2, s) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 0.001;
  const ux = dx / len, uy = dy / len;
  const d = Math.min(len, l1 + l2 - 0.5);
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const hgt = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  return [[a[0] + ux * along - s * uy * hgt, a[1] + uy * along + s * ux * hgt], [a[0] + ux * d, a[1] + uy * d]];
}
function seg(c, pts, w, color, outline = true) {
  const path = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); };
  if (outline) { c.strokeStyle = '#0a0405'; c.lineWidth = w + 5; path(); c.stroke(); }
  c.strokeStyle = color; c.lineWidth = w; path(); c.stroke();
}
function dot(c, p, r, color) {
  c.fillStyle = '#0a0405'; c.beginPath(); c.arc(p[0], p[1], r + 2.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = color; c.beginPath(); c.arc(p[0], p[1], r, 0, Math.PI * 2); c.fill();
}
function drawHead(c, d, h, white) {
  const [x, y] = h;
  const hair = white ? '#ffffff' : d.hairCol;
  // hair behind the head
  c.fillStyle = hair;
  if (d.hair === 'long') {
    c.fillStyle = '#0a0405'; c.beginPath(); c.roundRect(x - 19, y - 8, 15, 36, 6); c.fill();
    c.fillStyle = hair; c.beginPath(); c.roundRect(x - 17, y - 6, 11, 32, 5); c.fill();
  } else if (d.hair === 'tail') {
    c.fillStyle = '#0a0405'; c.beginPath(); c.ellipse(x - 20, y + 4, 9, 15, 0.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = hair; c.beginPath(); c.ellipse(x - 20, y + 4, 6.5, 12.5, 0.5, 0, Math.PI * 2); c.fill();
  }
  dot(c, h, 14, white ? '#ffffff' : d.skin);
  c.fillStyle = hair;
  if (d.hair === 'spiky') {
    c.beginPath(); c.moveTo(x - 15, y - 1);
    [[-20, -12], [-10, -12], [-10, -24], [-2, -15], [4, -25], [8, -14], [16, -16], [14, -6]].forEach(([px, py]) => c.lineTo(x + px, y + py));
    c.closePath(); c.fill();
  } else if (d.hair === 'long' || d.hair === 'tail') {
    c.beginPath(); c.arc(x, y, 15, Math.PI * 0.95, Math.PI * 2.02); c.closePath(); c.fill();
  } else if (d.hair === 'bald') {
    c.beginPath(); c.arc(x + 3, y + 5, 11, 0.1, Math.PI - 0.4); c.closePath(); c.fill();
  }
  // headband with tails
  c.strokeStyle = white ? '#ffffff' : d.band; c.lineWidth = 4;
  c.beginPath(); c.moveTo(x - 14, y - 6); c.lineTo(x + 14, y - 8); c.stroke();
  c.lineWidth = 3;
  c.beginPath(); c.moveTo(x - 14, y - 6); c.quadraticCurveTo(x - 24, y - 6, x - 30, y + 2); c.stroke();
  // eye
  c.fillStyle = '#111'; c.fillRect(x + 6, y - 3, 4, 3);
}
function drawFighter(c, d, pose, x, y, face, sc, white) {
  c.save();
  c.translate(x, y); c.scale(face * sc, sc);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const W_ = '#ffffff';
  const col = k => white ? W_ : d[k];
  const dark = k => white ? '#dddddd' : shade(d[k], 0.68);
  const n = pose.neck, hp = pose.hip;
  const shF = [n[0] + 3, n[1] + 8], shB = [n[0] - 3, n[1] + 8];
  const [eF, hF] = ik(shF, pose.hF, 30, 30, 1), [eB, hB] = ik(shB, pose.hB, 30, 30, 1);
  const hiF = [hp[0] + 4, hp[1]], hiB = [hp[0] - 4, hp[1]];
  const [kF, fF] = ik(hiF, pose.fF, 40, 40, -1), [kB, fB] = ik(hiB, pose.fB, 40, 40, -1);
  const arm = (sh, el, hd, back) => {
    seg(c, [sh, el], 11, back ? dark('shirt') : col('shirt'));
    seg(c, [el, hd], 10, back ? dark('skin') : col('skin'));
    dot(c, hd, 7.5, back ? dark('glove') : col('glove'));
  };
  const leg = (hi, kn, ft, back) => {
    seg(c, [hi, kn, ft], 14, back ? dark('pants') : col('pants'));
    seg(c, [ft, [ft[0] + 9, ft[1] + 1]], 8, white ? W_ : '#1a1210');
  };
  arm(shB, eB, hB, true);
  leg(hiB, kB, fB, true);
  seg(c, [hp, n], 26, col('shirt'));
  // belt
  const bx = n[0] - hp[0], by = n[1] - hp[1], bl = Math.hypot(bx, by) || 1;
  seg(c, [hp, [hp[0] + bx / bl * 6, hp[1] + by / bl * 6]], 27, col('band'), false);
  leg(hiF, kF, fF, false);
  seg(c, [n, pose.head], 9, col('skin'));
  drawHead(c, d, pose.head, white);
  arm(shF, eF, hF, false);
  c.restore();
}
function poseFor(f) {
  const t = f.t;
  switch (f.state) {
    case 'idle': {
      const b = Math.sin(G.frame * 0.08 + f.side * 2) * 2;
      const p = clonePose(P.idle);
      p.hip[1] += b * 0.6; p.neck[1] += b; p.head[1] += b; p.hF[1] += b * 1.3; p.hB[1] += b * 1.3;
      return p;
    }
    case 'walk': {
      const ph = f.walkPhase, p = clonePose(P.idle);
      p.fF = [18 + Math.sin(ph) * 16, -Math.max(0, Math.cos(ph)) * 10];
      p.fB = [-18 - Math.sin(ph) * 16, -Math.max(0, -Math.cos(ph)) * 10];
      const b = -Math.abs(Math.sin(ph)) * 3;
      for (const k of ['hip', 'neck', 'head', 'hF', 'hB']) p[k][1] += b;
      return p;
    }
    case 'crouch': return P.crouch;
    case 'block': return P.block;
    case 'cblock': return P.cblock;
    case 'blockstun': return f.blockLow ? P.cblock : P.block;
    case 'hitstun': return P.hit;
    case 'jump': return P.jump;
    case 'dashf': case 'dashb': return lerpPose(P.idle, P[f.state], ease(Math.min(1, t / 3)));
    case 'knockdown': return P.fall;
    case 'down': return P.lie;
    case 'getup': return lerpPose(P.lie, P.crouch, ease(Math.min(1, t / 20)));
    case 'ko': return f.onGround ? P.lie : P.fall;
    case 'win': return lerpPose(P.idle, P.win, ease(Math.min(1, t / 12)));
    case 'attack': {
      const M = MOVES[f.move];
      const base = M.air ? P.jump : (f.move === 'sweep' || f.move === 'uppercut') ? P.crouch : P.idle;
      let k;
      if (t < M.startup) k = t / M.startup;
      else if (t < M.startup + M.active) k = 1;
      else k = 1 - (t - M.startup - M.active) / M.recovery;
      return lerpPose(base, P[f.move], ease(Math.max(0, Math.min(1, k))));
    }
  }
  return P.idle;
}

// ===== Drawing: blasts, particles, fire =====
function drawProjectile(c, p) {
  const s = p.s, col = s.color;
  c.save(); c.translate(p.x, p.y);
  const glow = c.createRadialGradient(0, 0, 2, 0, 0, p.r * 2.4);
  glow.addColorStop(0, col); glow.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalAlpha = 0.55; c.fillStyle = glow; c.beginPath(); c.arc(0, 0, p.r * 2.4, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1;
  if (s.type === 'flame') {
    c.scale(Math.sign(p.vx), 1);
    c.fillStyle = col;
    c.beginPath(); c.moveTo(16, 0);
    for (let i = 0; i <= 8; i++) { const a = Math.PI / 2 + (i / 8) * Math.PI; const rr = 12 + Math.sin(G.frame * 0.6 + i * 2) * 4 + (i % 2 ? 10 : 0); c.lineTo(Math.cos(a) * rr - 4, Math.sin(a) * 12); }
    c.closePath(); c.fill();
    c.fillStyle = '#fff3c0'; c.beginPath(); c.arc(4, 0, 7, 0, Math.PI * 2); c.fill();
  } else if (s.type === 'orb') {
    c.fillStyle = col; c.beginPath(); c.arc(0, 0, p.r, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, p.r * 0.45, 0, Math.PI * 2); c.fill();
    c.strokeStyle = col; c.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      c.beginPath(); c.moveTo(Math.cos(a) * p.r, Math.sin(a) * p.r);
      c.lineTo(Math.cos(a + 0.3) * (p.r + 10), Math.sin(a + 0.3) * (p.r + 10)); c.lineTo(Math.cos(a) * (p.r + 18), Math.sin(a) * (p.r + 18)); c.stroke();
    }
  } else if (s.type === 'rock') {
    c.rotate(p.t * 0.25 * Math.sign(p.vx));
    c.fillStyle = '#0a0405';
    c.beginPath(); [[-15, -8], [-4, -16], [12, -11], [16, 4], [6, 15], [-11, 12]].forEach(([x, y], i) => i ? c.lineTo(x * 1.12, y * 1.12) : c.moveTo(x * 1.12, y * 1.12)); c.fill();
    c.fillStyle = col;
    c.beginPath(); [[-15, -8], [-4, -16], [12, -11], [16, 4], [6, 15], [-11, 12]].forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.fill();
    c.fillStyle = shade(col, 0.7); c.beginPath(); c.moveTo(0, 0); c.lineTo(16, 4); c.lineTo(6, 15); c.lineTo(-11, 12); c.fill();
  } else {
    c.scale(0.55 + Math.abs(Math.sin(p.t * 0.25)) * 0.45, 1);
    c.strokeStyle = col; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, p.r, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, p.r - 5, 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}
function drawParts(c) {
  for (const p of G.parts) {
    const k = p.life / p.max;
    c.globalAlpha = Math.max(0, k);
    if (p.kind === 'line') {
      c.strokeStyle = p.color; c.lineWidth = p.size; c.lineCap = 'round';
      c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); c.stroke();
    } else if (p.kind === 'ring') {
      c.strokeStyle = p.color; c.lineWidth = 3;
      c.beginPath(); c.arc(p.x, p.y, p.r * (1.2 - k), 0, Math.PI * 2); c.stroke();
    } else {
      c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size * (0.5 + k * 0.5), 0, Math.PI * 2); c.fill();
    }
  }
  c.globalAlpha = 1;
}
function drawFires(c) {
  for (const x of [82, 878]) {
    const g = c.createRadialGradient(x, 225, 5, x, 225, 120);
    g.addColorStop(0, 'rgba(255,150,60,' + (0.28 + Math.sin(G.frame * 0.3 + x) * 0.05) + ')');
    g.addColorStop(1, 'rgba(255,150,60,0)');
    c.fillStyle = g; c.fillRect(x - 120, 105, 240, 240);
    [['#ff4a1c', 1], ['#ffa53a', 0.7], ['#fff1a8', 0.38]].forEach(([colr, sc]) => {
      c.fillStyle = colr;
      c.beginPath(); c.moveTo(x - 26 * sc, 238);
      for (let i = 0; i <= 6; i++) {
        const px = x - 26 * sc + (52 * sc * i) / 6;
        const tall = (i % 2 ? 46 : 26) * sc + Math.sin(G.frame * 0.35 + i * 1.7 + x) * 8 * sc;
        c.lineTo(px, 238 - tall);
      }
      c.lineTo(x + 26 * sc, 238); c.fill();
    });
  }
  c.fillStyle = '#ffb35a';
  for (const e of G.embers) { c.globalAlpha = Math.min(1, e.life / 60); c.fillRect(e.x, e.y, 2, 2); }
  c.globalAlpha = 1;
}

// ===== Drawing: screen =====
function render() {
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (G.shake > 0.5 && !G.paused) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
  ctx.drawImage(bg, 0, 0, W, H);
  drawFires(ctx);
  const showFight = G.fighters && (G.screen === 'game' || G.screen === 'end');
  if (showFight) {
    const [a, b] = G.fighters;
    for (const f of G.fighters) {
      const sc = Math.max(0.4, 1 - (GROUND - f.y) / 300);
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath(); ctx.ellipse(f.x, GROUND + 3, 38 * sc, 8 * sc, 0, 0, Math.PI * 2); ctx.fill();
    }
    const order = b.state === 'attack' && a.state !== 'attack' ? [a, b] : [b, a];
    for (const f of order) drawFighter(ctx, f.def, poseFor(f), f.x, f.y, f.face, 1, f.flash > 3);
    for (const p of G.projectiles) drawProjectile(ctx, p);
    drawParts(ctx);
  }
  ctx.restore();
  if (showFight) { drawHUD(); drawMsg(); }
}
function drawHUD() {
  const c = ctx, [a, b] = G.fighters;
  const bar = (x, f, right) => {
    const w = 380, y = 22;
    c.fillStyle = '#000'; c.fillRect(x - 3, y - 3, w + 6, 28);
    c.fillStyle = '#3a0d0c'; c.fillRect(x, y, w, 22);
    const tw = w * f.trail / 100, hw = w * f.hp / 100;
    c.fillStyle = '#ff3b2f'; c.fillRect(right ? x + w - tw : x, y, tw, 22);
    const g = c.createLinearGradient(0, y, 0, y + 22);
    g.addColorStop(0, '#fff09a'); g.addColorStop(0.5, '#ffcf3a'); g.addColorStop(1, '#d49a10');
    c.fillStyle = g; c.fillRect(right ? x + w - hw : x, y, hw, 22);
    // special meter
    const ready = f.cd <= 0;
    c.fillStyle = '#000'; c.fillRect(right ? x + w - 152 : x - 2, y + 28, 154, 9);
    c.fillStyle = '#2a0d0c'; c.fillRect(right ? x + w - 150 : x, y + 30, 150, 5);
    const sw = 150 * (1 - f.cd / SPECIAL_WAIT);
    c.fillStyle = ready ? f.def.special.color : shade(f.def.special.color, 0.5);
    c.fillRect(right ? x + w - sw : x, y + 30, sw, 5);
    // name + label
    c.font = 'italic 800 20px system-ui, sans-serif';
    c.textAlign = right ? 'right' : 'left'; c.textBaseline = 'top';
    const label = G.mode === 'online' ? (f.side === NET.side ? 'YOU' : 'RIVAL') :
      f.side === 0 ? (G.mode === '2p' ? 'P1' : 'YOU') : (G.mode === '2p' ? 'P2' : 'CPU');
    const nx = right ? x + w : x;
    c.lineWidth = 4; c.strokeStyle = '#000';
    c.strokeText(f.def.name.toUpperCase(), nx, y + 42); c.fillStyle = '#fff'; c.fillText(f.def.name.toUpperCase(), nx, y + 42);
    const nw = c.measureText(f.def.name.toUpperCase() + ' ').width;
    c.font = '700 12px system-ui, sans-serif'; c.fillStyle = f.def.shirt;
    c.fillText(label, right ? nx - nw : nx + nw, y + 49);
    // round wins
    for (let i = 0; i < 2; i++) {
      const px = right ? x + 14 + i * 22 : x + w - 14 - i * 22;
      c.beginPath(); c.arc(px, y + 54, 7, 0, Math.PI * 2);
      c.fillStyle = G.wins[f.side] > i ? '#ffcf5a' : '#2a0d0c'; c.fill();
      c.lineWidth = 2; c.strokeStyle = '#000'; c.stroke();
    }
    // combo
    if (f.comboShow > 0) {
      c.globalAlpha = Math.min(1, f.comboShow / 20);
      c.font = 'italic 900 34px system-ui, sans-serif';
      c.textAlign = right ? 'right' : 'left';
      const cx = right ? W - 40 : 40;
      c.lineWidth = 6; c.strokeStyle = '#000'; c.strokeText(f.combo + ' HITS', cx, 120);
      c.fillStyle = '#ffcf5a'; c.fillText(f.combo + ' HITS', cx, 120);
      c.font = '800 14px system-ui, sans-serif'; c.fillStyle = '#fff';
      c.fillText('COMBO', cx, 156);
      c.globalAlpha = 1;
    }
  };
  bar(40, a, false);
  bar(540, b, true);
  c.fillStyle = '#000'; c.fillRect(448, 14, 64, 46);
  c.fillStyle = '#2a0d0c'; c.fillRect(451, 17, 58, 40);
  c.font = '900 30px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = G.timer <= 10 ? '#ff5a4d' : '#fff';
  c.fillText(String(G.timer).padStart(2, '0'), 480, 38);
}
function drawMsg() {
  if (!G.msg) return;
  const c = ctx, k = Math.min(1, G.msgT / 8);
  c.save();
  c.translate(480, 230);
  const sc = 1.6 - 0.6 * ease(k);
  c.scale(sc, sc);
  c.globalAlpha = k;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = 'italic 900 84px system-ui, sans-serif';
  const g = c.createLinearGradient(0, -40, 0, 40);
  g.addColorStop(0, '#fff3a8'); g.addColorStop(0.5, '#ffb030'); g.addColorStop(1, '#ff3b2f');
  c.lineWidth = 12; c.strokeStyle = '#000'; c.lineJoin = 'round';
  c.strokeText(G.msg, 0, 0); c.fillStyle = g; c.fillText(G.msg, 0, 0);
  if (G.sub) {
    c.font = 'italic 900 38px system-ui, sans-serif';
    c.lineWidth = 8; c.strokeText(G.sub, 0, 70); c.fillStyle = '#ffffff'; c.fillText(G.sub, 0, 70);
  }
  c.restore();
}

