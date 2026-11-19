'use strict';
// Hex Isles - Online play (PeerJS): hosting, joining, sending moves, reloading mid-game.
// ---------- Wifi multiplayer (PeerJS) ----------
// The host's browser runs the real game. Guests send their moves ({t:'act',a}) to the host,
// and the host sends everyone the whole game ({t:'state',g,seat}) after every change.
const PEERJS = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const ROOM = 'hexisles-room-', CODEAB = 'ABCDEFGHJKLMNPQRSTUVWXYZ', NAMEKEY = 'hexisles-name';
function loadPeer(cb) {
  if (window.Peer) return cb();
  const s = document.createElement('script');
  s.src = PEERJS; s.onload = cb;
  s.onerror = () => netFail('Could not load the multiplayer helper. Check your internet connection.');
  document.head.appendChild(s);
}
function myName() {
  const n = $('n-name').value.trim() || 'Player';
  try { localStorage.setItem(NAMEKEY, n); } catch (e) {}
  return n;
}
function netFail(msg) {      // something went wrong before we got into a room
  closeNet(); netUnmark(); $('m-lobby').hidden = true; $('m-net').hidden = false; $('n-msg').textContent = msg;
}
function closeNet() { try { if (NET.peer) NET.peer.destroy(); } catch (e) {} NET = {role: null}; }
function leaveNet() {
  const guest = NET.role === 'guest';
  closeNet(); netUnmark(); $('m-lobby').hidden = true;
  if (G) G.pl.forEach(P => { if (P.wait) { P.bot = true; delete P.wait; } });
  if (guest) { G = null; if (!load()) $('board').innerHTML = ''; }
  render(); openSetup();
}
function newClick() {
  if (!NET.role) return openSetup();
  NET.msg = NET.role === 'guest' ? 'Only the host can start a new game.' : NET.msg;
  $('m-win').hidden = true; $('m-lobby').hidden = false;
  if (NET.role === 'host') sendLobby(); else fillLobby();
}

// --- lobby window (host and guests) ---
function maxBots() { return 3 - NET.conns.length; }
function lobbyNames() {
  NET.bots = Math.max(0, Math.min(NET.bots, maxBots()));
  return [NET.name].concat(NET.conns.map(c => c.name), DEFNAMES.slice(1, 1 + NET.bots));
}
function fillLobby() {
  const host = NET.role === 'host', names = NET.names || [];
  $('l-codebox').hidden = !host; $('l-code').textContent = NET.ready ? NET.code : '…';
  $('l-msg').textContent = NET.msg || '';
  $('l-names').innerHTML = names.map((n, i) => '<div class="row"><i style="background:' + PCOL[i] + '"></i><span>' + esc(n) + '</span></div>').join('');
  $('l-bots').hidden = !host;
  if (host) $('l-bots').innerHTML = '<span style="flex:1">Computer players</span>' + [0, 1, 2, 3].map(n => '<button data-n="' + n + '"' + (n === NET.bots ? ' class="on"' : '') + (n > maxBots() ? ' disabled' : '') + '>' + n + '</button>').join('');
  fillMode('l-mode', host);
  $('l-start').hidden = !host; $('l-start').disabled = !NET.ready || names.length < 2;
  $('l-rejoin').hidden = !(NET.role === 'guest' && NET.lost);
  $('l-cancel').hidden = !(G && NET.inGame && !NET.lost);
}
function sendLobby() {
  NET.names = lobbyNames();
  NET.conns.forEach(c => { if (c.open) c.send({t: 'lobby', names: NET.names, fire: FIRE, lvl: LEVEL}); });
  fillLobby();
}

// --- host ---
function hostStart() {
  const name = myName();
  closeNet();
  NET = {role: 'host', seat: 0, name, conns: [], bots: 0, code: '', ready: false, inGame: false, msg: 'Opening a room…'};
  $('m-net').hidden = true; $('m-setup').hidden = true; $('m-lobby').hidden = false; sendLobby();
  loadPeer(hostOpen);
}
function hostOpen() {
  if (NET.role !== 'host') return;
  if (!NET.resume) { NET.code = ''; for (let i = 0; i < 4; i++) NET.code += CODEAB[rnd(CODEAB.length)]; }
  const peer = NET.peer = new Peer(ROOM + NET.code);
  peer.on('open', () => {
    NET.ready = true; NET.msg = 'Waiting for players…'; sendLobby();
    if (NET.resume) {      // back after a reload: same code, give everyone time to rejoin
      NET.resume = false;
      if (G.pl.some(P => P.wait)) { say('Room ' + NET.code + ' is open again.'); setTimeout(hostWaitOver, WAITMS); }
      save(); render();
    }
  });
  peer.on('connection', c => {
    c.on('data', d => hostData(c, d));
    c.on('close', () => hostDrop(c));
    c.on('error', () => hostDrop(c));
  });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
  peer.on('error', e => {
    if (NET.ready) return;
    // after a reload the old room can take a few seconds to free up: keep trying the same code
    if (NET.resume && NET.tries++ < RETRIES) { peer.destroy(); setTimeout(hostOpen, 2000); return; }
    if (NET.resume) {      // still no luck: carry on with a new code
      NET.resume = false;
      if (e.type !== 'unavailable-id') { hostWaitOver(); return netFail('Could not reopen the room (' + e.type + '). The others are computer players for now.'); }
      peer.destroy(); hostOpen(); say('The old room code was lost. The new code is ' + NET.code + '.'); setTimeout(hostWaitOver, WAITMS); return;
    }
    if (e.type === 'unavailable-id') { peer.destroy(); hostOpen(); }      // code already in use: pick another
    else netFail('Could not open a room (' + e.type + ').');
  });
}
function hostData(c, d) {
  if (NET.role !== 'host' || !d) return;
  if (d.t === 'hello' && !NET.conns.includes(c)) {
    let name = String(d.name || 'Player').slice(0, 12);
    // someone who dropped out comes back to their old seat
    const back = NET.inGame ? G.pl.findIndex(P => P.gone && P.name === name) : -1;
    if (back >= 0) {
      c.name = name; c.seat = back; NET.conns.push(c);
      G.pl[back].gone = false; G.pl[back].bot = false; delete G.pl[back].wait; say(name + ' is back.');
      c.send({t: 'you', name}); save(); render(); return;
    }
    if (NET.conns.length >= 3) { c.send({t: 'full'}); return; }
    const taken = lobbyNames(); let k = 2; const base = name;
    while (taken.includes(name)) name = base.slice(0, 10) + ' ' + k++;
    c.name = name; c.seat = -1; NET.conns.push(c);
    c.send({t: 'you', name}); sendLobby();
    if (NET.inGame) c.send({t: 'state', g: G, seat: -1});       // game already running: they watch until the next one
  }
  if (d.t === 'act' && NET.inGame && c.seat >= 0 && d.a) {
    try { if (act(d.a, c.seat)) { save(); render(); } } catch (e) {}
  }
}
function hostDrop(c) {
  const k = NET.conns ? NET.conns.indexOf(c) : -1;
  if (NET.role !== 'host' || k < 0) return;
  NET.conns.splice(k, 1);
  if (NET.inGame && G.pl[c.seat] && G.phase !== 'over') {
    seatGone(c.seat);
    say(c.name + ' lost connection. A computer plays for them until they rejoin.');
    save(); render();
  }
  sendLobby();
}
// A computer takes over seat s until that player joins again
function seatGone(s) {
  const P = G.pl[s];
  P.gone = true; P.bot = true; delete P.wait;
  if (G.offer && G.offer.from === s) G.offer = null;      // their trade offer goes with them
  else if (G.offer) answer(s, 'decline');
  if (G.phase === 'discard' && G.disc[s]) {      // they owed a discard: do it for them
    autoDiscard(s, G.disc[s]); delete G.disc[s];
    if (!Object.keys(G.disc).length) G.phase = 'storm';
  }
  if (G.phase === 'give' && G.rob && G.rob.from === s) giveCard(s, botGive(s));      // they were being robbed: pick for them
  if (G.phase === 'tpick' && G.tpick && G.tpick.includes(s)) tpickDo(s, bestTrack(s));      // they had a track card to pick
  if (G.phase === 'sack' && G.sack && G.sack.includes(s)) sackPick(s, sackable(s).sort((a, b) => vScore(a) - vScore(b))[0]);      // they owed a fort to the raiders
}

// --- picking up after a reload ---
// While in a wifi game, each tab keeps NETKEY = {role, code, name, id: G.id, bots, at} in sessionStorage
// (per tab, survives a reload, so two tabs in one browser don't mix up). If the page is
// reloaded within RESUMEMS, the host opens the same room code again (players get WAITMS to come back
// before a computer takes their seat) and a guest rejoins on its own. Guests also keep retrying when the
// host vanishes, so a host's reload just looks like a short pause.
const NETKEY = 'hexisles-net', RESUMEMS = 20 * 60 * 1000, WAITMS = 45000, RETRIES = 20;
function netMark() {
  if (!NET.role || !NET.code || !G || !NET.inGame) return;
  try { sessionStorage.setItem(NETKEY,JSON.stringify({role: NET.role, code: NET.code, name: NET.name, id: G.id, bots: NET.bots || 0, at: Date.now()})); } catch (e) {}
}
function netUnmark() { try { sessionStorage.removeItem(NETKEY); } catch (e) {} }
setInterval(netMark, 20000);      // keeps "at" fresh during a long think
addEventListener('pagehide', () => {
  netMark();
  if (NET.role === 'host' && NET.conns) NET.conns.forEach(c => { try { if (c.open) c.send({t: 'bye'}); } catch (e) {} });
});
function netResume() {
  let h = null; try { h = JSON.parse(sessionStorage.getItem(NETKEY)); } catch (e) {}
  if (!h || !/^[A-Z]{4}$/.test(h.code || '') || Date.now() - h.at > RESUMEMS) return false;
  if (h.role === 'guest') { joinStart(h.name, h.code, true); return true; }
  if (h.role !== 'host' || !G || h.id !== G.id) return false;
  NET = {role: 'host', seat: 0, name: h.name, conns: [], bots: h.bots, code: h.code, ready: false, inGame: true, resume: true, tries: 0, msg: ''};
  G.pl.forEach((P, i) => { if (i && !P.bot) { P.gone = true; P.wait = true; } });      // the others have to reconnect
  if (G.pl.some(P => P.wait)) say('The host reloaded. Waiting for everyone to reconnect…');
  loadPeer(hostOpen);
  return true;
}
function hostWaitOver() {      // players who didn't come back in time get a computer
  if (NET.role !== 'host' || !G) return;
  let any = false;
  G.pl.forEach((P, i) => { if (P.wait) { any = true; seatGone(i); if (G.phase !== 'over') say(P.name + " didn't reconnect. A computer plays for them until they rejoin."); } });
  if (any) { save(); render(); }
}
function hostBegin() {
  const names = lobbyNames(), humans = 1 + NET.conns.length;
  if (!NET.ready || names.length < 2) return;
  NET.conns.forEach((c, i) => { c.seat = i + 1; });
  newGame(names.map((n, i) => ({name: n, bot: i >= humans})), FIRE, LEVEL);
  NET.inGame = true; $('m-lobby').hidden = true; save(); render();
}
function broadcast() {
  if (!NET.inGame) return;
  NET.conns.forEach(c => { if (c.open) c.send({t: 'state', g: G, seat: c.seat}); });
}

// --- guest ---
// retry: rejoining a game we were in (after losing the host or reloading): failures try again a few times
function joinStart(name, code, retry, tries) {
  closeNet();
  if (code.length !== 4) { $('n-msg').textContent = 'Type the 4-letter room code.'; return; }
  tries = tries || 0;
  NET = {role: 'guest', seat: -1, name, code, names: [], inGame: false, lost: false, retry: !!retry, msg: retry ? 'Reconnecting to room ' + code + '…' + (tries ? ' (try ' + (tries + 1) + ')' : '') : 'Connecting…'};
  $('m-net').hidden = true; $('m-setup').hidden = true; $('m-lobby').hidden = false; fillLobby();
  const me = NET;
  const fail = msg => {
    if (NET !== me || NET.inGame) return;
    clearTimeout(me.wait);
    if (me.retry && tries + 1 < RETRIES) { NET.msg = 'Waiting for the host to come back…'; fillLobby(); setTimeout(() => { if (NET === me) joinStart(name, code, true, tries + 1); }, 3000); }
    else if (me.retry) { try { me.peer.destroy(); } catch (e) {} NET.lost = true; NET.msg = "Couldn't reach the host. Try again, or leave."; fillLobby(); }
    else netFail(msg);
  };
  if (retry) me.wait = setTimeout(() => fail(''), 9000);      // no answer at all: try again
  loadPeer(() => {
    if (NET !== me) return;
    const peer = NET.peer = new Peer();
    peer.on('open', () => {
      const c = NET.conn = peer.connect(ROOM + code, {reliable: true});
      c.on('open', () => { clearTimeout(me.wait); NET.msg = 'Connected. Waiting for the host to start…'; c.send({t: 'hello', name}); fillLobby(); });
      c.on('data', d => { if (NET === me) guestData(d); });      // events from an old connection are ignored
      c.on('close', () => { if (NET === me) guestLost(); });
    });
    peer.on('error', e => {
      if (NET !== me) return;
      if (e.type === 'peer-unavailable') { if (NET.inGame) guestLost(); else fail('No game found with the code ' + code + '.'); }
      else if (!NET.conn || !NET.conn.open) { if (NET.inGame) guestLost(); else fail('Could not connect (' + e.type + ').'); }
    });
  });
}
function guestData(d) {
  if (NET.role !== 'guest' || !d) return;
  if (d.t === 'you') NET.name = d.name;
  if (d.t === 'full') netFail('That game is full.');
  if (d.t === 'lobby') { NET.names = d.names; FIRE = !!d.fire; if ([0, 1, 2].includes(d.lvl)) LEVEL = d.lvl; fillLobby(); }
  if (d.t === 'state') {
    const fresh = !NET.inGame || (G && G.phase === 'over' && d.g.phase !== 'over');
    G = d.g; NET.seat = d.seat; NET.inGame = true; NET.lost = false;
    if (fresh) { MODE = null; $('m-lobby').hidden = true; }
    render(); netMark();
  }
  if (d.t === 'bye') guestLost();      // the host is closing or reloading the page
}
function guestLost() {      // lost the host mid-game: keep trying to rejoin (the host may just be reloading)
  if (NET.role !== 'guest' || NET.lost || !NET.inGame) return;
  NET.lost = true;
  const {name, code} = NET;
  try { NET.peer.destroy(); } catch (e) {}
  NET.msg = 'The host dropped out. Reconnecting…'; $('m-lobby').hidden = false; fillLobby();
  setTimeout(() => { if (NET.role === 'guest' && NET.code === code && NET.lost) joinStart(name, code, true); }, 2500);
}

$('s-net').onclick = () => {
  let n = ''; try { n = localStorage.getItem(NAMEKEY) || ''; } catch (e) {}
  if (!$('n-name').value) $('n-name').value = n;
  $('n-msg').textContent = ''; $('m-setup').hidden = true; $('m-net').hidden = false;
};
$('n-back').onclick = () => { $('m-net').hidden = true; openSetup(); };
$('n-host').onclick = hostStart;
$('n-join').onclick = () => joinStart(myName(), $('n-code').value.trim().toUpperCase());
$('n-code').onkeydown = e => { if (e.key === 'Enter') $('n-join').click(); };
$('l-bots').onclick = e => { const b = e.target.closest('button'); if (b && NET.role === 'host') { NET.bots = +b.dataset.n; sendLobby(); } };
$('l-start').onclick = hostBegin;
$('l-leave').onclick = leaveNet;
$('l-cancel').onclick = () => { $('m-lobby').hidden = true; };
$('l-rejoin').onclick = () => joinStart(NET.name, NET.code, true);

// The board's viewBox. On wide screens it is bigger than the island needs: the island looks smaller,
// with open sea round it and room along the bottom for the bar. Narrow screens keep the island tight.
const WIDE = matchMedia('(min-width:1100px)');
function fitBoard() { const vb = WIDE.matches ? '-420 -300 840 720' : '-285 -262 570 520'; $('board').setAttribute('viewBox', vb); $('ships').setAttribute('viewBox', vb); if (G) render(); }
WIDE.addEventListener('change', fitBoard);

