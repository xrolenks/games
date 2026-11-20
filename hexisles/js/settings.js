'use strict';
// Hex Isles - The "Your turn" pop-up and the Settings menu.
// ---------- "Your turn" pop-up and the settings menu (2026-11-19, Rick's request) ----------
// When a turn starts on this screen (same moment as the turn chime: your roll, or your setup placement),
// big "Your turn" text grows in over the page in your colour, stays a moment and fades out (TURNMS).
// Same screen with more than one person: the player's name is shown under it. Never on the first draw or a load.
// The gear button in the header opens #setpop; "Show Your turn" is kept in localStorage key TURNKEY ('0' = off).
const TURNKEY = 'hexisles-turnpop', TURNMS = 2600;
let TURNON = true, TSEEN = null;
try { TURNON = localStorage.getItem(TURNKEY) !== '0'; } catch (e) {}
function turnPop() {
  const s = {id: G.id, turn: G.turn, mine: myTurn(), phase: G.phase};
  const was = TSEEN; TSEEN = s;
  if (!was || was.id !== s.id || !TURNON) return;
  if (!(s.mine && (!was.mine || was.turn !== s.turn) && (G.phase === 'roll' || G.phase === 'setup'))) return;
  const old = $('turnpop'); if (old) old.remove();
  const humans = G.pl.filter(P => !P.bot).length, P = G.pl[G.turn];
  const d = document.createElement('div');
  d.id = 'turnpop'; d.style.setProperty('--c', PCOL[G.turn]);
  d.innerHTML = 'Your turn' + (!NET.role && humans > 1 ? '<small>' + esc(P.name) + '</small>' : '');
  document.body.appendChild(d);
  d.animate([
    {opacity: 0, transform: 'translate(-50%,-50%) scale(.6)'},
    {opacity: 1, transform: 'translate(-50%,-50%) scale(1.08)', offset: .12},
    {opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .2},
    {opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .7},
    {opacity: 0, transform: 'translate(-50%,-58%) scale(1)'}
  ], {duration: TURNMS, easing: 'ease-out', fill: 'both'}).onfinish = () => d.remove();
  setTimeout(() => d.remove(), TURNMS + 300);      // in case the finish event never comes (hidden tab)
}
$('set-turn').checked = TURNON;
$('set-turn').onchange = e => { TURNON = e.target.checked; try { localStorage.setItem(TURNKEY, TURNON ? '1' : '0'); } catch (x) {} if (!TURNON && $('turnpop')) $('turnpop').remove(); };
// Day and night on the 3D island (2026-11-19): on by default; '0' in DAYKEY = always daytime
const DAYKEY = 'hexisles-daynight';
let DAYON = true;
try { DAYON = localStorage.getItem(DAYKEY) !== '0'; } catch (e) {}
$('set-day').checked = DAYON;
$('set-day').onchange = e => { DAYON = e.target.checked; try { localStorage.setItem(DAYKEY, DAYON ? '1' : '0'); } catch (x) {} };
$('setbtn').onclick = () => { const p = $('setpop'); p.hidden = !p.hidden; $('setbtn').setAttribute('aria-expanded', String(!p.hidden)); };
document.addEventListener('pointerdown', e => { if (!e.target.closest('#sets')) { $('setpop').hidden = true; $('setbtn').setAttribute('aria-expanded', 'false'); } }, true);

