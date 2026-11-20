'use strict';
// Hex Isles - How to play: a short tutorial (Rick's request, 2026-11-19). A real Classic game, You against one Easy
// computer player (Coral), with a coach box (#coach) over the map that explains each step. G.tut = {s: step number}
// (saved with the game, so a reload carries on); null when it's over or skipped. Steps with `done` wait for the player
// to do something (checked on every render); the others have a Next button. `hi` = the button to make glow (.coach-hi),
// `enter` runs once when the step starts. Ending the first turn early jumps to the last step.
const tutMine = k => Object.values(G[k]).filter(x => (x.p != null ? x.p : x) === 0).length;      // my buildings ('b') or roads ('r')
const TUT = [
  {t: 'Welcome to Hex Isles!', x: 'This quick tour walks you through your first turns in a real game against Coral, a computer player. You score points by building towns and forts. The first to 10 points wins.'},
  {t: 'The island', x: 'Each land makes one resource: Jungle gives Wood, Mudflats Clay, Pastures Wool, Fields Grain and Cliffs Stone. The Bandits\' Lair in the middle makes nothing. The number on a land is the dice total that makes it pay. More dots under the number means it comes up more often, so 6 and 8 are the best.'},
  {t: 'Place your first town', x: 'Towns sit on corners where lands meet, and collect from every land they touch. A corner touching three lands with good numbers is a strong start. Tap a glowing corner.', done: () => tutMine('b') >= 1},
  {t: 'Add a road', x: 'Roads run along the edges and let you build further out. Tap a glowing line next to your town.', done: () => tutMine('r') >= 1},
  {t: 'Your second town', x: 'Coral places two towns, then it\'s your turn again. Your second town pays out straight away: one card for each land it touches. Tap a glowing corner when it\'s your turn.', done: () => tutMine('b') >= 2},
  {t: 'One more road', x: 'Tap a glowing line next to your new town.', done: () => tutMine('r') >= 2},
  {t: 'Roll the dice', x: 'Every turn starts with a roll. Each land showing the rolled number pays 1 card to every town on its corners (a fort gets 2). Tap the dice.', hi: 'dice', enter: tutRig, done: () => (G.rolls || 0) >= 1},
  {t: 'Your cards', x: 'Your resource cards are at the bottom. You spend them to build. Each build button shows its cost as little coloured chips; hold the pointer over one to see which cards you still need.', hi: 'hand'},
  {t: 'Build a road', x: 'A road costs 1 Wood and 1 Clay. The tutorial has made sure you have them. Tap Road, then tap a glowing line.', hi: 'b-road', enter: tutGive, done: () => tutMine('r') >= 3},
  {t: 'Towns and forts', x: 'A new town costs Wood, Clay, Wool and Grain and is worth 1 point. It must touch one of your roads, and no two towns can be on neighbouring corners. Later, turn a town into a fort (3 Stone + 2 Grain): 2 points, and it collects twice as much.', hi: 'b-town'},
  {t: 'Trading', x: 'Missing something? Tap Trade to swap 4 of one card for 1 of any other with the bank, or offer a deal to the other players. A town on a port (the wooden jetties round the coast) gets a better rate.', hi: 'b-trade'},
  {t: 'Sevens and the bandit', x: 'A roll of 7 pays nobody. Anyone holding more than 7 cards throws away half, then the roller moves the bandit to a land. That land pays nothing while he\'s there, and the roller robs one card from someone who lives there.'},
  {t: 'Progress cards', x: 'Card costs Wool, Grain and Stone and gives you a progress card: a Knight to chase the bandit away, free roads, free resources, or a secret point. Play one per turn, before or after you roll, but not on the turn you bought it.', hi: 'b-buy'},
  {t: 'End your turn', x: 'When you\'re done, tap End turn. Then Coral takes a turn.', hi: 'b-end', done: () => G.tn > 0},
  {t: 'You\'re ready!', x: 'Bonus points: the longest unbroken road route (at least 5 roads) and the most Knights played (at least 3) are worth 2 points each. Keep playing this game against Coral, or tap New game any time.', last: true}
];
const TUTEND = TUT.length - 1;
function startTutorial() {
  closeNet(); netUnmark();
  newGame([{name: 'You', bot: false}, {name: 'Coral', bot: true}], false, 0, 0);
  G.tut = {s: 0};
  $('m-setup').hidden = true; $('m-win').hidden = true;
  save(); render();
}
// first roll: pick dice that pay one of your lands, so the harvest shows
function tutRig() {
  let best = 0, bn = 0;
  G.hex.forEach((h, i) => {
    if (!h.n || i === G.storm) return;
    const k = HEX[i].v.filter(v => G.b[v] && G.b[v].p === 0).length * pips(h.n);
    if (k > best) { best = k; bn = h.n; }
  });
  if (bn) G.fix = [Math.max(1, bn - 6), Math.min(6, bn - 1)];
}
function tutGive() { const R = G.pl[0].res; R.wood = Math.max(R.wood, 1); R.clay = Math.max(R.clay, 1); }
function tutGo(s) {
  G.tut.s = s;
  if (TUT[s].enter) TUT[s].enter();
  save();
}
// called at the end of render(): move on when a step is done, then draw the coach box
function tutDraw() {
  const box = $('coach');
  document.querySelectorAll('.coach-hi').forEach(e => e.classList.remove('coach-hi'));
  if (!G || !G.tut || NET.role) { box.hidden = true; return; }
  for (let k = 0; k < TUT.length; k++) {
    const s = G.tut.s;
    if (s < TUTEND && s > 5 && G.tn > 0) { tutGo(TUTEND); continue; }      // ended the turn early: straight to the end
    if (TUT[s].done && TUT[s].done()) { tutGo(s + 1); continue; }
    break;
  }
  const T = TUT[G.tut.s];
  box.hidden = false;
  $('ch-title').textContent = T.t;
  $('ch-step').textContent = (G.tut.s + 1) + ' / ' + TUT.length;
  $('ch-text').textContent = T.x;
  $('ch-next').hidden = !!T.done;
  $('ch-next').textContent = T.last ? 'Finish' : 'Next';
  $('ch-skip').hidden = !!T.last;
  if (T.hi && $(T.hi)) $(T.hi).classList.add('coach-hi');
}
$('ch-next').onclick = () => {
  if (!G || !G.tut) return;
  if (TUT[G.tut.s].last) { G.tut = null; save(); render(); return; }
  tutGo(G.tut.s + 1); render();
};
$('ch-skip').onclick = () => { if (G) { G.tut = null; save(); render(); } };
$('s-tut').onclick = startTutorial;
