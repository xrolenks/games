'use strict';
// Fatal Fists - game state, fighter moves, hits, blasts
// ===== Game state =====
const G = {
  screen: 'title', mode: '1p', level: settings.level, picks: [0, 1], picker: 0, cursor: 0,
  fighters: null, wins: [0, 0], round: 1, phase: 'none', pt: 0, timer: 60, tick: 0,
  paused: false, hitstop: 0, shake: 0, slow: 0, msg: '', sub: '', msgT: 0, winner: -1,
  projectiles: [], parts: [], embers: [], frame: 0,
};
// online play: role 'host' (runs the fight, is the left fighter) or 'guest' (right fighter), or null
let NET = {role: null, rheld: {}, rpress: []};

function makeFighter(def, side) {
  return {def, side, x: 0, y: GROUND, vx: 0, vy: 0, face: 1, hp: 100, trail: 100, state: 'idle', t: 0,
    move: null, moveHit: false, onGround: true, airAttacked: false, cd: 0, stun: 0, flash: 0,
    combo: 0, comboShow: 0, walkPhase: 0, blockLow: false, buf: {}, held: {}, ai: {q: []}};
}
function resetFighter(f) {
  Object.assign(f, {x: f.side ? 660 : 300, y: GROUND, vx: 0, vy: 0, face: f.side ? -1 : 1, hp: 100, trail: 100,
    state: 'idle', t: 0, move: null, moveHit: false, onGround: true, airAttacked: false, cd: 0, stun: 0, flash: 0,
    combo: 0, comboShow: 0, buf: {}, held: {}, ai: {q: []}});
}

function startMatch() {
  G.fighters = [makeFighter(FIGHTERS[G.picks[0]], 0), makeFighter(FIGHTERS[G.picks[1]], 1)];
  G.wins = [0, 0];
  G.round = 1;
  startRound();
  show('game');
}
function startRound() {
  G.fighters.forEach(resetFighter);
  G.projectiles = []; G.parts = [];
  G.phase = 'intro'; G.pt = 0; G.timer = 60; G.tick = 0;
  G.hitstop = 0; G.slow = 0; G.shake = 0; G.winner = -1;
  setMsg('');
}
function setMsg(t, sub = '') { G.msg = t; G.sub = sub; G.msgT = 0; }

function endRound(timeout) {
  const [a, b] = G.fighters;
  G.phase = 'ko'; G.pt = 0;
  let w = -1;
  if (a.hp > b.hp) w = 0; else if (b.hp > a.hp) w = 1;
  G.winner = w;
  if (w >= 0) G.wins[w]++;
  if (timeout) setMsg('TIME');
  else { setMsg('K.O.'); G.slow = 50; SFX.ko(); }
}

// ===== Fighter logic =====
const ACTIONABLE = new Set(['idle', 'walk', 'crouch', 'block', 'cblock']);
const FLOORED = new Set(['knockdown', 'ko', 'down']);
function setState(f, s) { f.state = s; f.t = 0; if (s !== 'attack') f.move = null; }
function keep(f, s) { if (f.state !== s) setState(f, s); }
function want(f, b) { if (f.buf[b] > 0) { f.buf[b] = 0; return true; } return false; }
function canThrow(f) { return f.onGround && (ACTIONABLE.has(f.state) || f.state === 'attack'); }

function startMove(f, m) {
  setState(f, 'attack');
  f.move = m; f.moveHit = false;
  if (f.onGround) f.vx = 0;
  if (!MOVES[m].projectile) SFX.whoosh();
}

function control(f, foe) {
  const h = f.held;
  if (f.onGround && ACTIONABLE.has(f.state)) {
    if (Math.abs(foe.x - f.x) > 2) f.face = foe.x > f.x ? 1 : -1;
    const fwd = f.face > 0 ? 'right' : 'left';
    if (want(f, 'punch')) {
      if (h.down) return startMove(f, 'uppercut');
      if (h[fwd] && Math.abs(foe.x - f.x) < 80 && canThrow(foe)) return startMove(f, 'throw');
      return startMove(f, 'punch');
    }
    if (want(f, 'kick')) return startMove(f, h.down ? 'sweep' : 'kick');
    if (f.buf.special > 0 && f.cd <= 0 && !G.projectiles.some(p => p.owner === f)) {
      f.buf.special = 0;
      return startMove(f, 'special');
    }
    // double-tap left or right = a short dash (toward the rival = forward dash, away = back dash)
    for (const d of ['left', 'right']) {
      if (!want(f, d)) continue;
      const s = d === 'right' ? 1 : -1;
      if (f.lastTap && f.lastTap.s === s && G.frame - f.lastTap.t <= DASH_TAP) { f.lastTap = null; return startDash(f, s); }
      f.lastTap = {s, t: G.frame};
    }
    if (h.up) {
      f.onGround = false; f.vy = -f.def.jump;
      f.vx = ((h.right ? 1 : 0) - (h.left ? 1 : 0)) * 4.2;
      setState(f, 'jump'); f.airAttacked = false;
      SFX.jump();
      return;
    }
    if (h.block) { keep(f, h.down ? 'cblock' : 'block'); f.vx = 0; return; }
    if (h.down) { keep(f, 'crouch'); f.vx = 0; return; }
    const dir = (h.right ? 1 : 0) - (h.left ? 1 : 0);
    if (dir) { keep(f, 'walk'); f.vx = dir * f.def.speed * (dir === f.face ? 1 : 0.75); return; }
    keep(f, 'idle'); f.vx = 0;
  } else if (f.state === 'jump' && !f.airAttacked) {
    if (want(f, 'punch')) { f.airAttacked = true; startMove(f, 'airPunch'); }
    else if (want(f, 'kick')) { f.airAttacked = true; startMove(f, 'airKick'); }
  } else if ((f.state === 'dashf' || f.state === 'dashb') && f.t >= DASH_CANCEL) {
    // a dash can be cut short by an attack (dash in and punch)
    if (want(f, 'punch')) return startMove(f, f.held.down ? 'uppercut' : 'punch');
    if (want(f, 'kick')) return startMove(f, f.held.down ? 'sweep' : 'kick');
  }
}

// Dash: DASH_FRAMES long; forward is faster than backward. While dashing you can still be hit.
const DASH_TAP = 14, DASH_FRAMES = 14, DASH_CANCEL = 5, DASH_SPEED = 9.5, DASH_BACK = 7.5;
function startDash(f, s) {
  setState(f, s === f.face ? 'dashf' : 'dashb');
  f.dashDir = s;
  SFX.whoosh();
  dust(f.x - s * 16, 4);
}

function updateFighter(f) {
  f.t++;
  if (f.cd > 0) f.cd--;
  if (f.flash > 0) f.flash--;
  if (f.comboShow > 0) f.comboShow--;
  f.trail += (f.hp - f.trail) * (f.trail > f.hp + 0.2 ? 0.04 : 1);

  if (f.state === 'attack') {
    const M = MOVES[f.move];
    if (M.projectile && f.t === M.startup) spawnProjectile(f);
    if (f.onGround) f.vx = 0;
    if (f.t >= M.startup + M.active + M.recovery) setState(f, f.onGround ? 'idle' : 'jump');
  }
  if ((f.state === 'hitstun' || f.state === 'blockstun') && f.t >= f.stun) setState(f, f.onGround ? 'idle' : 'jump');
  if (f.state === 'dashf' || f.state === 'dashb') {
    const top = f.state === 'dashf' ? DASH_SPEED : DASH_BACK;
    f.vx = f.dashDir * top * (f.t < DASH_FRAMES * 0.6 ? 1 : 0.45);
    if (f.t >= DASH_FRAMES) { setState(f, 'idle'); f.vx = 0; }
  }
  if (f.state === 'down' && f.t >= 36) setState(f, 'getup');
  if (f.state === 'getup' && f.t >= 20) setState(f, 'idle');
  if (f.state === 'walk') f.walkPhase += Math.abs(f.vx) * 0.11 * (f.vx * f.face > 0 ? 1 : -1);

  if (!f.onGround) {
    f.vy += GRAV; f.x += f.vx; f.y += f.vy;
    if (f.y >= GROUND) { f.y = GROUND; f.vy = 0; f.onGround = true; land(f); }
  } else {
    f.x += f.vx;
    if (!ACTIONABLE.has(f.state)) f.vx *= 0.8;
  }
  f.x = Math.max(36, Math.min(W - 36, f.x));
}

function land(f) {
  if (f.state === 'knockdown') { setState(f, 'down'); f.vx *= 0.3; SFX.thud(); G.shake = Math.max(G.shake, 5); dust(f.x, 10); }
  else if (f.state === 'ko') { f.vx *= 0.3; SFX.thud(); G.shake = Math.max(G.shake, 7); dust(f.x, 14); }
  else if (f.state === 'attack' || f.state === 'jump' || f.state === 'hitstun' || f.state === 'blockstun') {
    setState(f, 'idle'); f.vx = 0; dust(f.x, 4);
  }
  f.airAttacked = false;
}

function hurtbox(f) {
  if (FLOORED.has(f.state) || f.state === 'getup') return null;
  const low = f.onGround && (f.state === 'crouch' || f.state === 'cblock' || (f.state === 'blockstun' && f.blockLow) ||
    (f.state === 'attack' && f.move === 'sweep'));
  const h = low ? 96 : 150;
  return {x: f.x - 24, y: f.y - h, w: 48, h};
}
function hitRect(f) {
  const b = MOVES[f.move].hit;
  return {x: f.face > 0 ? f.x + b.x : f.x - b.x - b.w, y: f.y + b.y, w: b.w, h: b.h};
}
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function isBlocking(f) {
  return f.onGround && (f.state === 'block' || f.state === 'cblock' || (f.state === 'blockstun' && f.held.block));
}

function checkHit(att, def) {
  if (att.state !== 'attack' || att.moveHit) return;
  const M = MOVES[att.move];
  if (!M.hit || att.t < M.startup || att.t >= M.startup + M.active) return;
  const hb = hurtbox(def);
  if (!hb) return;
  if (M.throw && !canThrow(def)) return;
  const r = hitRect(att);
  if (!overlap(r, hb)) return;
  att.moveHit = true;
  const sx = att.face > 0 ? Math.max(r.x, hb.x) : Math.min(r.x + r.w, hb.x + hb.w);
  const sy = Math.max(r.y, hb.y) + Math.min(r.h, 20) / 2;
  applyHit(att, def, M, att.face, sx, sy);
}

function applyHit(att, def, M, dir, sx, sy) {
  const pw = att.def.power;
  if (!M.throw && isBlocking(def)) {
    def.hp = Math.max(0, def.hp - Math.max(1, Math.round(M.dmg * pw * 0.15)));
    def.blockLow = def.state === 'cblock' || (def.state === 'blockstun' && def.blockLow);
    setState(def, 'blockstun');
    def.stun = M.blockstun || 12;
    def.vx = dir * 4;
    G.hitstop = 4;
    SFX.block();
    spark(sx, sy, '#8fd8ff', 6);
    if (def.hp <= 0) { setState(def, 'ko'); def.onGround = false; def.vy = -9; def.vx = dir * 5; }
    return;
  }
  const d = Math.round(M.dmg * pw);
  const comboing = def.state === 'hitstun' || def.state === 'knockdown';
  att.combo = comboing ? att.combo + 1 : 1;
  if (att.combo >= 2) att.comboShow = 80;
  def.hp = Math.max(0, def.hp - d);
  def.flash = 6;
  if (def.hp <= 0) {
    setState(def, 'ko'); def.onGround = false; def.vy = -9; def.vx = dir * 5;
  } else if (M.throw) {
    setState(def, 'knockdown'); def.onGround = false; def.vy = -11; def.vx = -dir * 5.5;
  } else if (M.knockdown || !def.onGround) {
    setState(def, 'knockdown'); def.onGround = false; def.vy = M.launch || -7; def.vx = dir * (M.kb || 4);
  } else {
    setState(def, 'hitstun'); def.stun = M.hitstun; def.vx = dir * M.push;
  }
  const heavy = M.heavy || d >= 10;
  G.hitstop = heavy ? 9 : 6;
  G.shake = Math.max(G.shake, heavy ? 9 : 4);
  SFX.hit(heavy);
  spark(sx, sy, '#fff2b0', heavy ? 14 : 9);
}

// ===== Energy blasts =====
function spawnProjectile(f) {
  const s = f.def.special;
  G.projectiles.push({x: f.x + f.face * 56, y: f.y - 114, vx: f.face * s.speed, owner: f, s, t: 0,
    r: s.type === 'orb' ? 18 : 14, dead: false});
  f.cd = SPECIAL_WAIT;
  SFX.special();
}
function circleRect(c, r) {
  const nx = Math.max(r.x, Math.min(c.x, r.x + r.w)), ny = Math.max(r.y, Math.min(c.y, r.y + r.h));
  return (c.x - nx) ** 2 + (c.y - ny) ** 2 < c.r * c.r;
}
function updateProjectiles() {
  const live = G.phase === 'fight';
  for (const p of G.projectiles) {
    p.x += p.vx; p.t++;
    if (p.s.type === 'flame' && p.t % 2 === 0) G.parts.push({x: p.x - Math.sign(p.vx) * 10, y: p.y + (Math.random() - 0.5) * 12,
      vx: -p.vx * 0.15, vy: -0.6, life: 16, max: 16, color: p.s.color, size: 5, kind: 'dot'});
    if (p.x < -60 || p.x > W + 60) { p.dead = true; continue; }
    if (!live) continue;
    const foe = G.fighters[0] === p.owner ? G.fighters[1] : G.fighters[0];
    const hb = hurtbox(foe);
    if (hb && circleRect(p, hb)) {
      p.dead = true;
      applyHit(p.owner, foe, {dmg: p.s.dmg / p.owner.def.power, hitstun: 22, push: 6, blockstun: 14, heavy: true},
        Math.sign(p.vx), p.x, p.y);
    }
  }
  const ps = G.projectiles;
  if (ps.length === 2 && !ps[0].dead && !ps[1].dead && Math.abs(ps[0].x - ps[1].x) < ps[0].r + ps[1].r) {
    ps[0].dead = ps[1].dead = true;
    spark((ps[0].x + ps[1].x) / 2, ps[0].y, '#ffffff', 16);
    SFX.block();
  }
  G.projectiles = ps.filter(p => !p.dead);
}

// ===== Keep fighters apart =====
function separate(a, b) {
  if (FLOORED.has(a.state) || FLOORED.has(b.state)) return;
  if (Math.abs(a.y - b.y) > 110) return;
  const min = 46, dx = b.x - a.x;
  if (Math.abs(dx) >= min) return;
  const s = dx === 0 ? (a.face || 1) : Math.sign(dx);
  const push = (min - Math.abs(dx)) / 2;
  a.x -= s * push; b.x += s * push;
  const clamp = f => { f.x = Math.max(36, Math.min(W - 36, f.x)); };
  clamp(a); clamp(b);
  if (Math.abs(b.x - a.x) < min - 0.5) {
    if (a.x <= 36 || a.x >= W - 36) b.x = a.x + s * min; else a.x = b.x - s * min;
    clamp(a); clamp(b);
  }
}

