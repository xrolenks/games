'use strict';
// Fatal Fists - online play (PeerJS)
// ===== Online play (PeerJS) =====
// The host's browser runs the real fight. The guest sends its keys ({t:'in'}) whenever they change,
// and the host sends back a snapshot of the fight ({t:'snap'}) every frame, plus the sounds and sparks
// that happened. Room codes are 4 letters; the PeerJS id is ROOM + code.
const PEERJS = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const ROOM = 'fatalfists-room-', CODEAB = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
function loadPeer(cb) {
  if (window.Peer) return cb();
  const s = document.createElement('script');
  s.src = PEERJS; s.onload = cb;
  s.onerror = () => netMsg('Could not load the online helper. Check your internet connection.');
  document.head.appendChild(s);
}
function netMsg(t) { $('netMsg').textContent = t; }
function netSend(d) { if (NET.conn && NET.conn.open) try { NET.conn.send(d); } catch (e) {} }
function netEvent(e) { if (NET.role === 'host' && NET.conn && G.fighters) NET.ev.push(e); }
function closeNet() {
  try { if (NET.conn) NET.conn.close(); } catch (e) {}
  try { if (NET.peer) NET.peer.destroy(); } catch (e) {}
  clearTimeout(NET.timer);
  NET = {role: null, rheld: {}, rpress: []};
  if (G.mode === 'online') G.mode = '2p';
  $('codeBox').hidden = true;
}
function newNet(role) {
  closeNet();
  NET = {role, side: role === 'host' ? 0 : 1, rheld: {}, rpress: [], ev: [], picked: [false, false], lastIn: ''};
}
function hostOnline() {
  newNet('host');
  netMsg('Opening a room…');
  loadPeer(hostOpen);
}
function hostOpen() {
  if (NET.role !== 'host') return;
  NET.code = '';
  for (let i = 0; i < 4; i++) NET.code += CODEAB[rnd(CODEAB.length)];
  const peer = NET.peer = new Peer(ROOM + NET.code);
  peer.on('open', () => {
    $('roomCode').textContent = NET.code; $('codeBox').hidden = false;
    netMsg('Waiting for your friend to join…');
  });
  peer.on('connection', c => {
    if (NET.conn) {      // someone is already in this room
      c.on('open', () => { c.send({t: 'full'}); setTimeout(() => c.close(), 500); });
      return;
    }
    NET.conn = c;
    c.on('open', () => { netSend({t: 'hello'}); netReady(); });
    c.on('data', netData);
    c.on('close', netLost);
    c.on('error', netLost);
  });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
  peer.on('error', e => {
    if (NET.conn) return;
    if (e.type === 'unavailable-id') { peer.destroy(); hostOpen(); }      // code taken: pick another
    else netMsg('Could not open a room (' + e.type + ').');
  });
}
function joinOnline() {
  const code = $('joinCode').value.trim().toUpperCase();
  if (code.length !== 4) return netMsg('Type the 4-letter room code first.');
  newNet('guest');
  netMsg('Joining room ' + code + '…');
  loadPeer(() => {
    if (NET.role !== 'guest') return;
    const peer = NET.peer = new Peer();
    peer.on('open', () => {
      const c = NET.conn = peer.connect(ROOM + code, {reliable: true});
      c.on('open', netReady);
      c.on('data', netData);
      c.on('close', netLost);
      c.on('error', netLost);
    });
    peer.on('error', e => {
      if (e.type === 'peer-unavailable') { closeNet(); netMsg('No room with code ' + code + '. Check the code and try again.'); }
      else if (!NET.started) { closeNet(); netMsg('Could not connect (' + e.type + ').'); }
    });
    NET.timer = setTimeout(() => { if (NET.role === 'guest' && !NET.started) { closeNet(); netMsg('Could not reach that room. Try again.'); } }, 15000);
  });
}
function netReady() {      // both sides: connected, go and pick fighters
  if (NET.started) return;
  NET.started = true;
  clearTimeout(NET.timer);
  G.mode = 'online';
  netMsg('');
  SFX_RAW.fight();
  netToSelect();
}
function netToSelect() {
  NET.picked = [false, false];
  G.fighters = null; G.picker = 0;
  show('select');
}
function netLost() {
  if (!NET.role) return;
  const wasIn = NET.started;
  closeNet();
  G.fighters = null;
  show('online');
  netMsg(wasIn ? 'The connection was lost, or your friend left.' : 'Could not connect.');
}
function netLeave() {      // tell the other player, then hang up (forget the room first so our own hang-up isn't "lost")
  netSend({t: 'bye'});
  const old = NET;
  NET = {role: null, rheld: {}, rpress: []};
  G.mode = '2p';
  $('codeBox').hidden = true;
  setTimeout(() => {
    try { if (old.conn) old.conn.close(); } catch (e) {}
    try { if (old.peer) old.peer.destroy(); } catch (e) {}
  }, 300);
}
function netTryStart() {      // host: start once both fighters are picked
  if (NET.role !== 'host' || !NET.picked[0] || !NET.picked[1]) return;
  netStart();
}
function netStart() {
  startMatch();
  netSend({t: 'start', picks: G.picks});
}
function netData(d) {
  if (!d || !NET.role) return;
  if (d.t === 'full') { closeNet(); netMsg('That room already has two players.'); return; }
  if (d.t === 'bye') { netLost(); return; }
  if (d.t === 'hello') { netReady(); return; }
  if (d.t === 'pick') {
    const other = 1 - NET.side;
    NET.picked[other] = true;
    if (NET.role === 'host') G.picks[1] = d.i;
    if (G.screen === 'select') markSelect();
    netTryStart();
    return;
  }
  if (d.t === 'select') { netToSelect(); return; }
  if (NET.role === 'host') {
    if (d.t === 'in') {
      const h = {};
      BTNS.forEach((b, i) => { h[b] = !!(d.h & (1 << i)); });
      NET.rheld = h;
      for (const p of d.p || []) if (PRESSABLE.includes(p)) NET.rpress.push(p);
    } else if (d.t === 'pause') {
      if (G.screen === 'game' && G.fighters && G.phase !== 'over' && d.v !== G.paused) show(d.v ? 'pause' : 'game');
    } else if (d.t === 'rematch') netStart();
  } else {
    if (d.t === 'start') {
      G.picks = d.picks;
      G.fighters = [makeFighter(FIGHTERS[d.picks[0]], 0), makeFighter(FIGHTERS[d.picks[1]], 1)];
      G.fighters.forEach(resetFighter);
      G.phase = 'intro'; G.wins = [0, 0]; G.parts = []; G.projectiles = [];
      show('game');
    } else if (d.t === 'snap') applySnap(d);
  }
}
const r1 = v => Math.round(v * 10) / 10;
function hostTick() {      // host: send the fight to the guest
  if (!NET.conn || !G.fighters || (G.screen !== 'game' && G.screen !== 'end')) return;
  netSend({
    t: 'snap',
    f: G.fighters.map(f => [FIGHTERS.indexOf(f.def), r1(f.x), r1(f.y), f.face, f.hp, r1(f.trail), f.state, f.t, f.move,
      f.onGround, f.flash, f.cd, f.combo, f.comboShow, r1(f.walkPhase), f.blockLow]),
    p: G.projectiles.map(p => [r1(p.x), r1(p.y), p.vx, FIGHTERS.indexOf(p.owner.def), p.t, p.r]),
    g: [G.phase, G.timer, G.wins, G.round, G.msg, G.sub, G.msgT, r1(G.shake), G.paused],
    ev: NET.ev.splice(0),
  });
}
function guestTick() {      // guest: send our keys when they change
  if (G.screen !== 'game' || G.paused) return;
  const inp = humanInput(KEYMAP);
  let bits = 0;
  BTNS.forEach((b, i) => { if (inp.held[b]) bits |= 1 << i; });
  if (bits !== NET.lastIn || inp.press.length) { NET.lastIn = bits; netSend({t: 'in', h: bits, p: inp.press}); }
}
function applySnap(d) {
  if (!G.fighters || (G.screen !== 'game' && G.screen !== 'end')) return;
  d.f.forEach((a, i) => {
    const f = G.fighters[i];
    f.def = FIGHTERS[a[0]];
    [, f.x, f.y, f.face, f.hp, f.trail, f.state, f.t, f.move, f.onGround, f.flash, f.cd, f.combo, f.comboShow, f.walkPhase, f.blockLow] = a;
  });
  G.projectiles = d.p.map(a => ({x: a[0], y: a[1], vx: a[2], s: FIGHTERS[a[3]].special, t: a[4], r: a[5]}));
  const was = G.phase;
  [G.phase, G.timer, G.wins, G.round, G.msg, G.sub, G.msgT, G.shake] = d.g;
  for (const e of d.ev) {
    if (e[0] === 's') SFX_RAW[e[1]](...e[2]);
    else if (e[0] === 'spark') spark(e[1], e[2], e[3], e[4]);
    else if (e[0] === 'dust') dust(e[1], e[2]);
  }
  if (G.phase === 'over' && was !== 'over') { showEnd(); return; }
  const paused = d.g[8];
  if (G.screen === 'game' && G.phase !== 'over' && paused !== G.paused) show(paused ? 'pause' : 'game');
}
$('hostBtn').onclick = () => { SFX_RAW.select(); hostOnline(); };
$('joinBtn').onclick = () => { SFX_RAW.select(); joinOnline(); };
$('joinCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });
$('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinOnline(); });

