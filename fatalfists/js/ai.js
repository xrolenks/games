'use strict';
// Fatal Fists - the computer fighter
// ===== Computer fighter =====
const AI_LEVELS = [
  {react: 30, block: 0.2, dodge: 0.2, anti: 0.15, aggr: 0.35, spec: 0.15},
  {react: 16, block: 0.5, dodge: 0.5, anti: 0.45, aggr: 0.5, spec: 0.3},
  {react: 7, block: 0.8, dodge: 0.85, anti: 0.8, aggr: 0.62, spec: 0.35},
];
function aiPlan(me, foe, dist, F, B, L) {
  const r = Math.random();
  const think = L.react + rnd(L.react);
  if (FLOORED.has(foe.state) || foe.state === 'getup') return [{h: {[F]: dist > 120}, d: 10}, {d: 8}];
  if (dist > 300) {
    if (me.cd <= 0 && r < L.spec) return [{p: 'special', d: 30}, {d: think}];
    return [{h: {[F]: true}, d: 20 + rnd(25)}];
  }
  if (dist > 110) {
    if (r < L.aggr * 0.35) return [{h: {up: true, [F]: true}, d: 2}, {d: 12 + rnd(6)}, {p: 'kick', d: 30}];
    if (me.cd <= 0 && r < L.aggr * 0.35 + L.spec * 0.5) return [{p: 'special', d: 30}, {d: think}];
    // dash in and punch (double tap toward the rival)
    if (G.level > 0 && dist < 200 && r < 0.62) return [{p: F, d: 3}, {p: F, d: 7}, {p: 'punch', d: 22}, {d: think}];
    if (r < 0.8) return [{h: {[F]: true}, d: 15 + rnd(20)}];
    if (r < 0.9) return [{h: {[B]: true}, d: 12 + rnd(12)}];
    return [{d: think}];
  }
  const crouching = foe.state === 'crouch' || foe.state === 'cblock';
  if (r < L.aggr) {
    const c = Math.random();
    if (crouching) return c < 0.5 ? [{p: 'kick', d: 24}, {d: think}] : [{h: {down: true}, p: 'kick', d: 30}, {d: think}];
    if (c < 0.3) {
      if (G.level === 2 && Math.random() < 0.5) return [{p: 'punch', d: 9}, {p: 'punch', d: 9}, {h: {down: true}, p: 'punch', d: 32}];
      return [{p: 'punch', d: 14}, {d: think}];
    }
    if (c < 0.55) return [{p: 'kick', d: 24}, {d: think}];
    if (c < 0.7) return [{h: {down: true}, p: 'kick', d: 30}, {d: think}];
    if (c < 0.82 && dist < 78) return [{h: {[F]: true}, p: 'punch', d: 28}];
    return [{h: {down: true}, p: 'punch', d: 32}];
  }
  if (r < L.aggr + 0.15) return [{h: {block: true}, d: 20 + rnd(20)}];
  if (r < L.aggr + 0.22 && G.level > 0) return [{p: B, d: 3}, {p: B, d: 18}];      // back dash out of range
  if (r < L.aggr + 0.3) return [{h: {[B]: true}, d: 15 + rnd(15)}];
  return [{d: think}];
}
function aiThink(me, foe) {
  const L = AI_LEVELS[G.level], A = me.ai;
  const dist = Math.abs(foe.x - me.x);
  const F = foe.x > me.x ? 'right' : 'left', B = F === 'right' ? 'left' : 'right';
  if (!A.react && me.onGround) {
    const M = foe.state === 'attack' ? MOVES[foe.move] : null;
    if (M && !M.projectile && dist < 160 && foe.t <= M.startup && Math.random() < L.block * 0.3) {
      A.q = [{h: {block: true}, d: 16 + rnd(10)}]; A.react = true;
    }
    const pr = G.projectiles.find(p => p.owner === foe && Math.sign(me.x - p.x) === Math.sign(p.vx) && Math.abs(me.x - p.x) < 200);
    if (!A.react && pr && Math.random() < L.dodge * 0.12) {
      A.q = Math.random() < 0.6 ? [{h: {down: true}, d: 30}] : [{h: {up: true, [F]: true}, d: 3}, {d: 20}];
      A.react = true;
    }
    if (!A.react && !foe.onGround && foe.state === 'jump' && foe.vy > -2 && dist < 120 && Math.random() < L.anti * 0.15) {
      A.q = [{h: {down: true}, p: 'punch', d: 22}]; A.react = true;
    }
  }
  if (!A.q.length) { A.react = false; A.q = aiPlan(me, foe, dist, F, B, L); }
  const s = A.q[0];
  const out = {held: Object.assign({}, s.h || {}), press: []};
  if (!s.started) { s.started = true; if (s.p) out.press.push(s.p); }
  if (--s.d <= 0) A.q.shift();
  return out;
}

