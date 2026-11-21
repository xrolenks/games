'use strict';
// Hex Isles - Visual packs (Rick's request, 2026-11-20). A pack only changes how the island LOOKS, never the rules,
// so it is not part of the game (G): each screen keeps its own pick in localStorage, and online players can each
// choose a different one. Picked in the new-game window and the online lobby ("Look").
// Day and Night replaced the old day-to-night cycle (and its Settings checkbox).
// `time` is the 3D island's time of day (0 morning, .25 noon, .5 sunset, .75 night; see setDay in board3d.js).
// Bigger packs later (space, steampunk...) should get their own file, loaded only when picked, so packs nobody
// uses never download or slow the game.
const PACKS = [
  {id: 'day', name: 'Day', time: .25, hint: 'Bright sunshine over the island.'},
  {id: 'night', name: 'Night', time: .75, hint: 'Moonlight and stars: town windows and torches glow, and the lighthouse lamp shines.'}
];
const PACKKEY = 'hexisles-pack';
let PACK = 'day';
try { const v = localStorage.getItem(PACKKEY); if (PACKS.some(p => p.id === v)) PACK = v; } catch (e) {}
const packOf = () => PACKS.find(p => p.id === PACK) || PACKS[0];
function setPack(id) {
  PACK = id;
  try { localStorage.setItem(PACKKEY, id); } catch (e) {}
  document.body.dataset.pack = id;      // (CSS: the flat map's night tint)
}
document.body.dataset.pack = PACK;
function fillPack(id) {      // everyone can pick their own, so the buttons are never disabled
  const el = $(id);
  el.innerHTML = '<span style="flex:1">Look</span>' + PACKS.map(p => '<button data-k="' + p.id + '"' + (p.id === PACK ? ' class="on"' : '') + '>' + p.name + '</button>').join('');
  el.nextElementSibling.textContent = packOf().hint + (id === 'l-pack' ? ' Everyone picks their own look.' : '');
}
['s-pack', 'l-pack'].forEach(id => { $(id).onclick = e => { const b = e.target.closest('button'); if (b) { setPack(b.dataset.k); fillPack(id); } }; });
