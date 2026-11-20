'use strict';
// Fatal Fists - menu screens, fighter select, buttons, keys, touch
// ===== Screens =====
const SCREENS = ['title', 'level', 'select', 'help', 'online', 'pause', 'end'];
function show(name) {
  G.screen = name === 'pause' ? 'game' : name;
  G.paused = name === 'pause';
  for (const s of SCREENS) $('s-' + s).classList.toggle('on', s === name);
  document.body.classList.toggle('playing', name === 'game');
  for (const k in keys) keys[k] = false;
  if (name === 'select') buildSelect();
  const first = name !== 'game' && $('s-' + name).querySelector('button');
  if (first && !document.body.classList.contains('touch')) first.focus();
}
function showEnd() {
  G.phase = 'over';
  const w = G.wins[0] >= 2 ? 0 : 1, l = 1 - w;
  const wf = G.fighters[w], lf = G.fighters[l];
  if (G.mode === '1p') $('endTitle').textContent = w === 0 ? 'You win!' : 'You lose';
  else if (G.mode === 'online') $('endTitle').textContent = w === NET.side ? 'You win!' : 'You lose';
  else $('endTitle').textContent = 'Player ' + (w + 1) + ' wins!';
  $('endSub').textContent = wf.def.name + ' beat ' + lf.def.name + ', ' + G.wins[w] + '–' + G.wins[l] + ' in rounds.';
  show('end');
}
function togglePause() {
  if (G.screen !== 'game' || !G.fighters || G.phase === 'over') return;
  if (NET.role === 'guest') return netSend({t: 'pause', v: !G.paused});      // the host pauses for both
  show(G.paused ? 'game' : 'pause');
}

// character select
const roster = $('roster');
function buildSelect() {
  roster.innerHTML = '';
  FIGHTERS.forEach((d, i) => {
    const b = document.createElement('button');
    b.className = 'fcard'; b.style.setProperty('--c', d.shirt);
    b.innerHTML = '<canvas width="220" height="280"></canvas><b>' + d.name + '</b><small>' + d.title + '<br>' + d.desc + '</small>' +
      '<div class="stat"><span>Speed</span><i><em style="width:' + Math.round(d.speed / 4.2 * 100) + '%"></em></i></div>' +
      '<div class="stat"><span>Power</span><i><em style="width:' + Math.round(d.power / 1.25 * 100) + '%"></em></i></div>';
    const pc = b.querySelector('canvas').getContext('2d');
    pc.setTransform(2, 0, 0, 2, 0, 0);
    drawFighter(pc, d, P.idle, 52, 132, 1, 0.82, false);
    b.onclick = () => pick(i);
    b.onmouseenter = () => { G.cursor = i; markSelect(); };
    roster.appendChild(b);
  });
  markSelect();
}
function markSelect() {
  [...roster.children].forEach((b, i) => {
    b.classList.toggle('cur', i === G.cursor);
    const old = b.querySelector('.badge'); if (old) old.remove();
    if (G.mode === '2p' && G.picker === 1 && i === G.picks[0]) {
      const s = document.createElement('span'); s.className = 'badge'; s.textContent = 'P1'; b.appendChild(s);
    }
  });
  if (G.mode === 'online') {
    const mine = NET.picked[NET.side], theirs = NET.picked[1 - NET.side];
    $('pickWho').textContent = mine ? 'Waiting for your friend to pick…' : theirs ? 'Your friend has picked. Your turn!' : 'Pick your fighter';
  } else $('pickWho').textContent = G.mode === '1p' ? 'Pick your fighter' : (G.picker === 0 ? 'Player 1, pick a fighter' : 'Player 2, pick a fighter');
  $('selHint').textContent = document.body.classList.contains('touch') ? 'Tap a fighter.' :
    (G.picker === 0 ? 'A / D to choose, J or Enter to pick.' : '← / → to choose, Numpad 1 or Enter to pick.');
}
function pick(i) {
  if (G.mode === 'online') {
    if (NET.picked[NET.side]) return;
    SFX_RAW.select();
    G.picks[NET.side] = i; G.cursor = i;
    NET.picked[NET.side] = true;
    netSend({t: 'pick', i});
    markSelect();
    netTryStart();
    return;
  }
  SFX.select();
  G.picks[G.picker] = i;
  if (G.mode === '1p') {
    let o; do { o = rnd(FIGHTERS.length); } while (o === i);
    G.picks[1] = o;
    startMatch();
  } else if (G.picker === 0) {
    G.picker = 1; markSelect();
  } else startMatch();
}

// buttons
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  const lv = e.target.closest('[data-level]');
  if (lv) { G.level = settings.level = +lv.dataset.level; saveSettings(); SFX.select(); G.picker = 0; show('select'); return; }
  if (!go) return;
  SFX_RAW.select();
  const g = go.dataset.go;
  if (G.mode === 'online' && NET.role) {      // online: some buttons act for both players
    if (g === 'resume') return NET.role === 'guest' ? netSend({t: 'pause', v: false}) : show('game');
    if (g === 'restart') return NET.role === 'guest' ? netSend({t: 'rematch'}) : netStart();
    if (g === 'select') { netSend({t: 'select'}); return netToSelect(); }
    if (g === 'back-select' || g === 'title') { netLeave(); G.fighters = null; return show('title'); }
  }
  if (g === 'online') { netMsg(''); show('online'); }
  else if (g === 'leave') { closeNet(); show('title'); }
  else if (g === '1p') { G.mode = '1p'; show('level'); }
  else if (g === '2p') { G.mode = '2p'; G.picker = 0; show('select'); }
  else if (g === 'back-select') { if (G.mode === '2p' && G.picker === 1) { G.picker = 0; markSelect(); } else show(G.mode === '1p' ? 'level' : 'title'); }
  else if (g === 'select') { G.picker = 0; show('select'); }
  else if (g === 'resume') show('game');
  else if (g === 'restart') startMatch();
  else if (g === 'title') { G.fighters = null; show('title'); }
  else if (g === 'help') show('help');
});
function updateMute() { $('muteBtn').textContent = 'Sound: ' + (settings.muted ? 'off' : 'on'); }
$('muteBtn').onclick = () => { settings.muted = !settings.muted; saveSettings(); updateMute(); SFX.select(); };
updateMute();
$('pauseBtn').onclick = () => togglePause();

// keyboard
const GAMEKEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Quote', 'Slash']);
addEventListener('keydown', e => {
  ac();
  if (!e.repeat) tapped.add(e.code);
  keys[e.code] = true;
  if (G.screen === 'game') {
    if (GAMEKEYS.has(e.code)) e.preventDefault();
    if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); togglePause(); }
    if (G.paused) menuKeys(e);
    return;
  }
  if (G.screen === 'select') {
    const n = FIGHTERS.length;
    if (['KeyA', 'ArrowLeft', 'KeyW', 'ArrowUp'].includes(e.code)) { G.cursor = (G.cursor + n - 1) % n; markSelect(); SFX.move(); e.preventDefault(); }
    else if (['KeyD', 'ArrowRight', 'KeyS', 'ArrowDown'].includes(e.code)) { G.cursor = (G.cursor + 1) % n; markSelect(); SFX.move(); e.preventDefault(); }
    else if (['KeyJ', 'KeyF', 'Enter', 'Space', 'Numpad1', 'Comma'].includes(e.code)) { e.preventDefault(); pick(G.cursor); }
    else if (e.code === 'Escape') document.querySelector('[data-go="back-select"]').click();
    return;
  }
  menuKeys(e);
});
function menuKeys(e) {
  if (e.target && e.target.tagName === 'INPUT') return;      // typing a room code
  const scr = document.querySelector('.screen.on');
  if (!scr) return;
  const btns = [...scr.querySelectorAll('button')];
  const i = btns.indexOf(document.activeElement);
  if (['KeyS', 'ArrowDown'].includes(e.code)) { e.preventDefault(); btns[(i + 1) % btns.length].focus(); SFX.move(); }
  else if (['KeyW', 'ArrowUp'].includes(e.code)) { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); SFX.move(); }
  else if (e.code === 'KeyJ' && i >= 0) { e.preventDefault(); btns[i].click(); }
  else if (e.code === 'Escape') {
    const back = scr.querySelector('[data-go="title"]');
    if (scr.id === 's-pause') show('game'); else if (back && scr.id !== 's-end') back.click();
  }
}
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'game' && !G.paused && G.fighters && G.phase !== 'over') togglePause();
});

// touch
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');
document.querySelectorAll('#touch [data-k]').forEach(btn => {
  const k = btn.dataset.k;
  const down = e => {
    e.preventDefault(); ac();
    if (btn.setPointerCapture) try { btn.setPointerCapture(e.pointerId); } catch (_) {}
    if (!keys[k]) tapped.add(k);
    keys[k] = true; btn.classList.add('on');
  };
  const up = () => { keys[k] = false; btn.classList.remove('on'); };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('lostpointercapture', up);
  btn.addEventListener('contextmenu', e => e.preventDefault());
});
addEventListener('pointerdown', () => ac(), {once: true});

