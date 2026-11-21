'use strict';
// Hex Isles - Turn timer (Rick's request, 2026-11-19). Picked before the game (new-game window or the online lobby):
// G.timer = seconds per turn, 0 = off. Each person's turn gets a fresh clock (G.tEnd = when it runs out, G.tkey = which
// turn it belongs to). A computer player's turn has no clock, unless it is waiting for people (discards, a robbed card,
// a raid pick). When time runs out, the computer finishes the turn for them (timeUp). Only the host (or the one screen)
// runs out the clock; wifi guests just show it.
const TIMES = [0, 15, 30, 60, 90, 120];
const timeName = s => !s ? 'Off' : s < 60 ? s + ' sec' : s === 90 ? '1½ min' : s / 60 + ' min';
let TIMER = 0;
try { const v = +localStorage.getItem('hexisles-timer'); if (TIMES.includes(v)) TIMER = v; } catch (e) {}
function setTimer(v) { TIMER = v; try { localStorage.setItem('hexisles-timer', v); } catch (e) {} }
// A slider (Rick, 2026-11-20; were buttons): its steps are the places in TIMES, Off at the far left.
// No description line under it (Rick removed it, 2026-11-20).
function fillTimer(id, canPick) {
  const el = $(id), i = Math.max(0, TIMES.indexOf(TIMER));
  let r = el.querySelector('input');
  if (!r) {      // (built once, so dragging isn't interrupted when the window is refilled)
    el.innerHTML = '<span>Turn timer</span><input type="range" min="0" max="' + (TIMES.length - 1) + '" step="1" aria-label="Turn timer"><b class="tval"></b>';
    r = el.querySelector('input');
  }
  r.value = i; r.disabled = !canPick;
  el.querySelector('.tval').textContent = timeName(TIMER);
  r.setAttribute('aria-valuetext', timeName(TIMER));
}
['s-timer', 'l-timer'].forEach(id => {
  $(id).oninput = e => {
    if (e.target.tagName !== 'INPUT' || (id === 'l-timer' && NET.role !== 'host')) return;
    setTimer(TIMES[+e.target.value]);
    if (id === 's-timer') fillTimer(id, true); else sendLobby();
  };
});

// moves that wait for people who aren't the player whose turn it is
const WAITS = ['discard', 'give', 'sack', 'tpick'];
const turnKey = () => G.phase === 'setup' ? 's' + G.su.k : 't' + G.tn;      // changes when the next turn (or setup placement) starts
function clockKey() { return turnKey() + (G.pl[G.turn].bot && WAITS.includes(G.phase) ? G.phase : ''); }
// is the clock running? (a person's turn, or a computer's turn waiting for people)
function clockOn() { return !!(G && G.timer && !G.tut && !G.boot && G.phase !== 'over' && (!G.pl[G.turn].bot || WAITS.includes(G.phase) || G.cdisc)); }
// after every move: a new turn (or a new wait) gets a full clock
function clockCheck() {
  if (!G || !G.timer) return;
  const k = clockKey();
  if (k !== G.tkey) { G.tkey = k; G.tEnd = Date.now() + G.timer * 1000; }
}
// seconds left (wifi guests correct for the host's clock with NET.skew, set from each state message)
function timeLeft() { return Math.max(0, (G.tEnd - (Date.now() + (NET.role === 'guest' ? NET.skew || 0 : 0))) / 1000); }

// time ran out: the computer picks for anyone being waited on, and finishes the turn of a person who ran out
function timeUp() {
  const p = G.turn, P = G.pl[p], k0 = turnKey();
  say("Time's up" + (P.bot ? '' : ' for ' + P.name) + '!');
  for (let k = 0; k < 40 && G.phase !== 'over' && turnKey() === k0; k++) if (!timeStep(p)) break;
  G.tkey = null; clockCheck();
  MODE = null; CHOOSE = null; PICK = null;
  save(); render();
}
function timeStep(p) {      // one move made for them; false when there's nothing left to do
  if (G.cdisc) { G.cdisc.forEach(i => { while (G.pl[i].cards.length > PCMAX) cardToss(i, botToss(i)); }); G.cdisc = null; return true; }      // (too many progress cards)
  if (G.decks && G.pl[p].cards.length > PCMAX && !G.pl[p].bot && G.phase === 'main') { cardToss(p, botToss(p)); return true; }
  if (G.phase === 'discard') {
    for (const s in G.disc) autoDiscard(+s, G.disc[s]);
    G.disc = {}; G.phase = sevenPhase(); return true;
  }
  if (G.phase === 'give') return giveCard(G.rob.from, botGive(G.rob.from));
  if (G.phase === 'sack') { G.sack.slice().forEach(i => sackPick(i, sackable(i).sort((a, b) => vScore(a) - vScore(b))[0])); return true; }
  if (G.phase === 'tpick') { G.tpick.slice().forEach(i => tpickDo(i, bestTrack(i))); return true; }
  if (G.pl[p].bot) return false;      // a computer's own turn carries on by itself
  if (G.offer) { G.offer = null; say('The trade offer was taken back.'); return true; }
  let a;
  if (G.phase === 'setup') a = G.su.step === 'town' ? {t: 'town', v: bestOf(spots(p, 'town'), p)} : {t: 'road', e: bestRoad(p, spots(p, 'road'), true)};
  else if (G.phase === 'roll') a = {t: 'roll'};
  else if (G.phase === 'storm') a = {t: 'storm', h: botStorm(p)};
  else if (G.phase === 'rob') a = {t: 'rob', p: botRob(p)};
  else if (G.phase === 'castle') a = {t: 'castle', v: freeForts(p).sort((x, y) => vScore(y) - vScore(x))[0]};
  else a = {t: 'end'};
  return act(a);
}

// the clock in the bar (next to the dice): a ring that empties, and the seconds left
function drawClock() {
  const el = $('clock'), on = clockOn() && G.tEnd;
  el.hidden = !on;
  if (!on) return;
  const left = timeLeft(), s = Math.ceil(left), f = Math.min(1, left / G.timer), who = WAITS.includes(G.phase) ? null : G.turn;
  const html = '<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="cb"/><circle cx="18" cy="18" r="15" class="cf" stroke-dasharray="' + (94.25 * f).toFixed(2) + ' 94.25"/></svg><b>' + (s >= 60 ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : s) + '</b>';
  if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
  el.style.setProperty('--c', who == null ? '#ffcf5a' : PCOL[who]);
  el.classList.toggle('low', s <= 5);
  el.title = (who == null ? 'Waiting for players' : G.pl[who].name + "'s turn") + ': ' + s + ' seconds left';
}
setInterval(() => {
  if (!G) return;
  drawClock();
  if (NET.role !== 'guest' && clockOn() && G.tEnd && Date.now() >= G.tEnd) timeUp();
  if (CHOOSE && !myTurn()) { CHOOSE = null; render(); }      // time ran out with a card window open
}, 250);
