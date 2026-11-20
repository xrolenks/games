'use strict';
// Fatal Fists - main update loop step() and particles
// ===== Main update (60 times a second) =====
function step() {
  G.frame++;
  updateEmbers();
  if (NET.role === 'guest') {      // the host runs the fight; we just send keys and show what it sends back
    guestTick(); tapped.clear(); updateParts(); G.shake *= 0.85;
    return;
  }
  if (NET.role === 'host') hostTick();
  if (G.screen !== 'game' || G.paused || !G.fighters) { tapped.clear(); return; }
  const live = G.phase === 'fight';
  if (!live) NET.rpress = [];
  for (let i = 0; i < 2; i++) {
    const f = G.fighters[i], foe = G.fighters[1 - i];
    let inp = {held: {}, press: []};
    if (live) {
      if (i === 1 && G.mode === '1p') inp = aiThink(f, foe);
      else if (i === 1 && G.mode === 'online') inp = {held: NET.rheld, press: NET.rpress.splice(0)};
      else inp = humanInput(G.mode === '2p' ? [KEYMAP[i]] : KEYMAP);
    }
    f.held = inp.held;
    for (const p of inp.press) f.buf[p] = 8;
  }
  tapped.clear();
  if (G.hitstop > 0) { G.hitstop--; return; }
  if (G.slow > 0) { G.slow--; if (G.slow % 2) return; }

  G.pt++; G.msgT++;
  const [a, b] = G.fighters;
  if (G.phase === 'intro') {
    if (G.pt === 1) { setMsg('ROUND ' + G.round); SFX.gong(); }
    if (G.pt === 75) { setMsg('FIGHT!'); SFX.fight(); }
    if (G.pt >= 115) { G.phase = 'fight'; setMsg(''); }
  } else if (G.phase === 'fight') {
    G.tick++;
    if (G.tick % 60 === 0 && G.timer > 0) { G.timer--; if (G.timer === 0) endRound(true); }
  } else if (G.phase === 'ko') {
    if (G.pt === 80) {
      if (G.winner < 0) setMsg('DRAW');
      else {
        const w = G.fighters[G.winner];
        setMsg(w.def.name.toUpperCase() + ' WINS', w.hp >= 100 ? 'PERFECT!' : '');
        if (G.wins[G.winner] >= 2) SFX.win();
      }
    }
    if (G.pt > 80 && G.winner >= 0) {
      const w = G.fighters[G.winner];
      if (w.onGround && ACTIONABLE.has(w.state)) setState(w, 'win');
    }
    if (G.pt === 230) {
      if (G.wins.some(x => x >= 2)) showEnd();
      else { G.round++; startRound(); return; }
    }
  }

  for (let i = 0; i < 2; i++) {
    const f = G.fighters[i], foe = G.fighters[1 - i];
    if (G.phase === 'fight') control(f, foe);
    else if (ACTIONABLE.has(f.state)) { keep(f, 'idle'); f.vx = 0; }
    updateFighter(f);
    for (const k in f.buf) if (f.buf[k] > 0) f.buf[k]--;
  }
  if (G.phase === 'fight') {
    checkHit(a, b); checkHit(b, a);
  }
  updateProjectiles();
  separate(a, b);
  if (G.phase === 'fight' && (a.hp <= 0 || b.hp <= 0)) endRound(false);
  updateParts();
  G.shake *= 0.85;
}

// ===== Particles =====
function spark(x, y, color, n) {
  netEvent(['spark', x, y, color, n]);
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 6;
    G.parts.push({x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 14, max: 14, color, size: 3, kind: 'line'});
  }
  G.parts.push({x, y, life: 9, max: 9, color, r: n * 2.2, kind: 'ring'});
}
function dust(x, n) {
  netEvent(['dust', x, n]);
  for (let i = 0; i < n; i++) {
    G.parts.push({x: x + (Math.random() - 0.5) * 50, y: GROUND - 2, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 1.5,
      life: 24, max: 24, color: '#8a6a5a', size: 4 + Math.random() * 4, kind: 'dot'});
  }
}
function updateParts() {
  for (const p of G.parts) {
    p.life--;
    if (p.kind !== 'ring') { p.x += p.vx; p.y += p.vy; p.vx *= 0.9; p.vy = p.vy * 0.9 + (p.kind === 'line' ? 0.2 : 0); }
  }
  G.parts = G.parts.filter(p => p.life > 0);
}
function updateEmbers() {
  if (G.embers.length < 40 && Math.random() < 0.5) {
    const side = Math.random() < 0.5 ? 82 : 878;
    G.embers.push({x: side + (Math.random() - 0.5) * 20, y: 236, vx: (Math.random() - 0.5) * 0.6, vy: -0.6 - Math.random() * 0.9,
      life: 90 + rnd(90)});
  }
  for (const e of G.embers) { e.x += e.vx + Math.sin((G.frame + e.life) * 0.05) * 0.3; e.y += e.vy; e.life--; }
  G.embers = G.embers.filter(e => e.life > 0);
}

