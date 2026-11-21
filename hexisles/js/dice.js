'use strict';
// Hex Isles - The dice: thrown dice on the board and the dice in the bar.
// ---------- Dice ----------
// Two dice drawn with dots. G.rolls counts rolls; when it changes the dice tumble for DICEMS, then show the result.
const DOTS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]], DICEMS = 2500;      // (2500 since 2026-11-21: matches dice.wav)
let SEENROLL = null, DICET = null;
// --- Dice thrown onto the board ---
// Each die is a CSS 3D cube (#roll .d3: shadow, .lift for the bounce, .cube for the spin). It flies in from the
// left, drops, bounces twice and tumbles, and the spin ends with the rolled face on top (FACE = the cube
// turn that brings face n to the top). Each die lives on a floor tilted back like the board (floorTilt():
// the flat map's 20° lean, or the 3D camera's angle), so it lands flat on the board; the bounce is straight
// up from that floor (translateZ), the shadow lies on it, and the random twist is round the upright axis.
const FACE = {1: [0, 0], 2: [90, 0], 3: [0, -90], 4: [0, 90], 5: [-90, 0], 6: [0, 180]}, DICEHOLD = 1500;
let ROLLT = null;
function floorTilt() {
  if (D3.on && D3.three && D3.three.cam) {
    const e = D3.three.cam.matrixWorld.elements;      // e[9] = how much the camera looks along the up axis
    if (e[10] === 1 && !e[9]) return 42;      // camera not placed yet: the usual starting angle
    return Math.max(15, Math.min(60,Math.acos(Math.max(-1, Math.min(1, e[9]))) * 180 / Math.PI));
  }
  return 20;      // #board's rotateX
}
// sea: the Sea die's face (Forts and Guards), thrown as a third, blue die with pictures instead of dots
function throwDice(d, sea) {
  if (sea) d = d.concat(sea);
  const box = $('roll'), tilt = floorTilt(), H = $('view').clientHeight * .45 + 40;
  clearTimeout(ROLLT); box.getAnimations().forEach(a => a.cancel()); box.innerHTML = '';
  if (D3.on && D3.dice) { D3.dice(d); return; }      // 3D board: real 3D dice in its own light (init3D's throwDice3)
  if (D3.undice) D3.undice();
  const dots = n => { let s = ''; for (let k = 0; k < 9; k++) s += '<i' + (DOTS[n].includes(k) ? ' class="on"' : '') + '></i>'; return s; };
  const half = () => box.querySelector('.d3').offsetWidth / 2;
  const turn = (z, x, y) => 'translateZ(' + half() + 'px) rotateZ(' + z + 'deg) rotateX(' + x + 'deg) rotateY(' + y + 'deg)';
  const fly = (x, y) => 'rotateX(' + tilt.toFixed(1) + 'deg) translate(' + x + 'px,' + y + 'px)';
  const spin = () => (2 + rnd(2)) * 360 * (Math.random() < .5 ? -1 : 1);      // 2-3 full turns each way, so the longer roll keeps tumbling
  d.forEach((n, j) => {
    const w = document.createElement('div');
    const isSea = j === 2;
    w.className = 'd3' + (isSea ? ' sea' : j ? ' red' : '');
    w.innerHTML = '<div class="sh"></div><div class="lift"><div class="cube">' + [1, 2, 3, 4, 5, 6].map(k => '<div class="f f' + k + '">' + (isSea ? seaSvg(k) : dots(k)) + '</div>').join('') + '</div></div>';
    box.appendChild(w);
    const s = w.offsetWidth, fx = (d.length === 3 ? (j - 1) * 1.35 : j ? .8 : -.8) * s +(Math.random() - .5) * s * .4, fy = (Math.random() - .5) * s * .6, sx = fx - (2.4 + Math.random()) * s;
    const [ax, ay] = FACE[n], end = turn(Math.round(Math.random() * 36 - 18), ax + spin(), ay + spin());
    w.animate([{transform: fly(sx, fy)}, {transform: fly(fx, fy)}], {duration: DICEMS * .85, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both'});
    w.querySelector('.lift').animate([
      {transform: 'translateZ(' + H + 'px)', easing: 'ease-in'},
      {transform: 'translateZ(0)', offset: .32, easing: 'ease-out'},
      {transform: 'translateZ(' + (.55 * s) + 'px)', offset: .45, easing: 'ease-in'},
      {transform: 'translateZ(0)', offset: .58, easing: 'ease-out'},
      {transform: 'translateZ(' + (.15 * s) + 'px)', offset: .67, easing: 'ease-in'},
      {transform: 'translateZ(0)', offset: .75}, {transform: 'translateZ(0)'}
    ], {duration: DICEMS, fill: 'both'});
    w.querySelector('.cube').animate([{transform: turn(Math.round(Math.random() * 180 - 90), 0, 0)}, {transform: end, offset: .85}, {transform: end}], {duration: DICEMS, easing: 'cubic-bezier(.25,.6,.35,1)', fill: 'both'});
    w.querySelector('.sh').animate([{opacity: 0, transform: 'scale(.3)'}, {opacity: 1, transform: 'scale(1)', offset: .32}, {opacity: .6, transform: 'scale(.75)', offset: .45}, {opacity: 1, transform: 'scale(1)', offset: .58}, {opacity: 1, transform: 'scale(1)'}], {duration: DICEMS, fill: 'both'});
  });
  // they lie on the board a moment showing the roll, then fade away
  ROLLT = setTimeout(() => {
    box.animate([{opacity: 1}, {opacity: 0}], {duration: 350, fill: 'forwards'});
    ROLLT = setTimeout(() => { box.innerHTML = ''; box.getAnimations().forEach(a => a.cancel()); }, 360);
  }, DICEMS + DICEHOLD);
}
function dieHTML(n, cls) { let s = ''; for (let k = 0; k < 9; k++) s += '<i' + (DOTS[n].includes(k) ? ' class="on"' : '') + '></i>'; return '<div class="die' + cls + '">' + s + '</div>'; }
function drawDice(a, b, rolling) {
  const sea = G && G.fg ? '<div class="die sea' + (rolling ? ' roll' : '') + '" title="Sea die">' + seaSvg(rolling ? 1 + rnd(6) : G.sea || 1) + '</div>' : '';
  $('dice').innerHTML = dieHTML(a, rolling ? ' roll' : '') + dieHTML(b, ' red' + (rolling ? ' roll' : '')) + sea;
}
function showDice() {
  const n = G.rolls || 0, fresh = SEENROLL !== null && n !== SEENROLL && n > 0 && G.dice;
  SEENROLL = n;
  if (fresh) {
    const end = Date.now() + DICEMS;
    clearInterval(DICET);
    DICET = setInterval(() => {
      if (Date.now() >= end || !G || !G.dice) { clearInterval(DICET); DICET = null; if (G && G.dice) drawDice(G.dice[0], G.dice[1], false); return; }
      drawDice(1 + rnd(6), 1 + rnd(6), true);
    }, 90);
    drawDice(1 + rnd(6), 1 + rnd(6), true);
    throwDice(G.dice, G.fg ? G.sea : 0);
    harvestFx();
  } else if (!DICET) {
    if (G.phase === 'setup') $('dice').innerHTML = '';
    else { const d = G.dice || [3, 4]; drawDice(d[0], d[1], false); }
  }
  const can = myTurn() && G.phase === 'roll';
  $('dice').classList.toggle('ready', can); $('dice').disabled = !can;
}
function message() {
  const p = G.turn, P = G.pl[p], n = esc(P.name);
  if (G.phase === 'over') return '<b>' + esc(G.pl[G.win].name) + '</b> won the game!';
  if (G.boot) return 'Waiting for everyone\'s island to load…';      // (online, before the first turn: online.js)
  if (G.cdisc) return 'Waiting for ' + G.cdisc.map(i => '<b>' + esc(G.pl[i].name) + '</b>').join(' and ') + ' to throw away a progress card (' + PCMAX + ' is the most you can keep)…';
  if (G.phase === 'discard') return 'A 7! Waiting for ' + Object.keys(G.disc).map(i => '<b>' + esc(G.pl[i].name) + '</b>').join(' and ') + ' to discard…';
  if (G.offer) return offerFix(G.offer).yes.length && mySeat(G.offer.from) ? '<b>' + n + '</b>: tap ✓ to trade with someone who accepted, or ✗ to turn them down.' : '<b>' + n + '</b> offers ' + fmt(G.offer.give) + ' for ' + fmt(G.offer.get) + '. Waiting for answers…';
  if (G.phase === 'give') return 'Waiting for <b>' + esc(G.pl[G.rob.from].name) + '</b> to hand <b>' + n + '</b> a card…';
  if (G.phase === 'rob' && myTurn()) return '<b>' + n + '</b>: choose who to rob.';
  if (G.phase === 'tpick') {
    const w = tpickWho();
    return w >= 0 ? '<b>' + esc(G.pl[w].name) + '</b>: pick the track to take a progress card from.' : 'Waiting for ' + G.tpick.map(i => '<b>' + esc(G.pl[i].name) + '</b>').join(' and ') + ' to pick a track…';
  }
  if (G.phase === 'sack') {
    const w = sackWho();
    return w >= 0 ? '<b>' + esc(G.pl[w].name) + '</b>: the raiders won! Tap one of your glowing forts to lose (it becomes a town).'
      : 'The raiders won! Waiting for ' + G.sack.map(i => '<b>' + esc(G.pl[i].name) + '</b>').join(' and ') + ' to choose a fort to lose…';
  }
  if (G.phase === 'castle' && myTurn()) return '<b>' + n + '</b>: tap one of your glowing forts to make it the ' + (TRACKS[G.cpick] || {n: ''}).n + ' castle.';
  if (!myTurn()) return P.bot ? n + ' is thinking…' : 'Waiting for <b>' + n + '</b>…';
  if (G.phase === 'setup') return G.su.step === 'town'
    ? '<b>' + n + '</b>: tap a glowing corner to place your ' + (G.su.k < G.pl.length ? 'first town.' : (G.fg ? 'fort' : 'second town') + '. It gives you one of each resource its lands make.')
    : '<b>' + n + '</b>: now tap a glowing line to add a road.';
  if (G.phase === 'roll') return '<b>' + n + '</b>: tap the dice on the map to roll.';
  if (G.phase === 'storm') return '<b>' + n + '</b>: tap a land to send the bandit there. It gives nothing while the bandit is on it, and you rob someone who lives there.';
  if (MODE === 'road' && G.free > 0) return 'Free road: tap a glowing line (' + G.free + ' left).';
  if (MODE === 'upgrade') return 'Tap one of your glowing forts to upgrade it (fort → Keep → Citadel). Tap the button again to cancel.';
  if (MODE === 'guard') return 'Tap a glowing ring on a corner at the end of one of your roads to post a knight there. Tap the Knights button to cancel.';
  if (MODE === 'train') return 'Tap one of your glowing knights to train them (+1 strength). Tap the Knights button to cancel.';
  if (MODE === 'activate') return 'Tap one of your resting knights to feed them 1 Grain and put them on duty. Tap the Knights button to cancel.';
  if (MODE === 'gchase') return 'Tap one of your knights on duty next to the bandit\'s land to chase it away. Tap the Knights button to cancel.';
  if (MODE === 'kmove') return KFROM == null ? 'Tap one of your knights on duty to move it along your roads. Tap the Knights button to cancel.' : 'Now tap the empty corner it should walk to (it rests when it gets there). Tap the Knights button to cancel.';
  if (MODE) return 'Tap a glowing ' + (MODE === 'road' ? 'line' : MODE === 'fort' ? 'town' : MODE === 'wall' ? 'fort' : 'corner') + ' to build. Tap the button again to cancel.';
  if (G.decks && P.cards.length > PCMAX && G.phase === 'main') return '<b>' + n + '</b>: you hold ' + P.cards.length + ' progress cards. Play some, or throw extras away when you end your turn (' + PCMAX + ' is the most you can keep).';
  return '<b>' + n + '</b>: build, trade, or end your turn.';
}
function render() {
  if (!G) return;
  useColors();      // (the players' picked colours, js/rules.js)
  const p = G.turn, human = myTurn();
  if (NET.role) VIEW = NET.seat; else if (human) VIEW = p;
  drawBoard();
  $('netinfo').hidden = !NET.role; $('netinfo').textContent = NET.role ? 'Room ' + NET.code : '';
  $('players').innerHTML = G.pl.map((P, i) => '<div class="pl' + (i === p && G.phase !== 'over' ? ' cur' : '') + '" style="--c:' + PCOL[i] + '"><div class="av">' + esc(P.name.charAt(0).toUpperCase()) + '</div><div class="pi"><b>' + esc(P.name) + (NET.role && i === NET.seat ? ' (you)' : P.gone ? ' (away)' : '') + '</b><span><em>' + (G.phase === 'over' || i === VIEW ? score(i) : pubScore(i)) + ' pts</em>' + (G.fg ? ' · Defence ' + defence(i) : '') + '</span><span>' + handSize(i) + (G.deck ? ' res · ' + P.cards.length + ' cards' : ' cards') + '</span><span>Route ' + roadLen(i) + (G.deck ? ' · Knights ' + callers(i) : '') + '</span>' +
    (G.fg ? '<span>' + Object.keys(TRACKS).map(k => '<i style="font-style:normal;color:' + TRACKS[k].c + '">' + TRACKS[k].n.slice(0, 3) + ' ' + imp(i, k) + '</i>').join(' · ') + '</span>' : '') +
    '</div><div class="aw">' + (G.lr === i ? AWICON.route : '') + (G.la === i ? AWICON.army : '') + (P.hero ? AWICON.hero(P.hero) : '') +
    Object.keys(TRACKS).filter(k => (G.banner || {})[k] === i).map(k => AWICON.banner(k)).join('') +
    Object.keys(TRACKS).filter(k => (G.castle || {})[k] && G.castle[k].p === i).map(k => AWICON.castle(k, G.castle[k].perm)).join('') + '</div></div>').join('');
  sfx();      // sound effects for whatever changed since the last draw
  showDice();
  shipFx();
  chaseFx();
  raidFx();
  robFx();      // (before the hand is redrawn: the stolen card starts from where it was)
  turnPop();
  awardFx(); weatherFx(); winFx(); takeFx();      // award banner, passing weather, the winner's celebration (js/flair.js)
  const main = human && G.phase === 'main' && !G.offer;     /* while an offer is open, only the offer panel works */
  if (G.offer) MODE = null;
  $('b-end').disabled = !main;
  $('b-trade').disabled = !(main && handSize(p) > 0);
  fillOffers();
  ['road', 'town', 'fort', 'wall'].forEach(w => {
    const b = $('b-' + w);
    b.disabled = !(main && (canPay(p, w) || (w === 'road' && G.free > 0)) && spots(p, w).length);
    b.classList.toggle('on', main && MODE === w);
  });
  const deck = !!G.deck;
  $('mycards').hidden = !deck;
  $('b-buy').parentNode.hidden = !deck || !!G.decks;      // Forts and Knights: cards come from the tracks, not from buying
  $('actions').style.setProperty('--pc', PCOL[G.pl[VIEW] ? VIEW : 0]);
  TIPW = TIPW === null ? null : '';       /* the hand may have changed: rebuild an open pop-up on the next move */
  if (deck) {
    const left = G.deck.length + (G.used || []).length;      // (played cards come back in Forts and Knights)
    $('b-buy').disabled = !(main && canPay(p, 'card') && left);
    $('b-buy').lastChild.lastChild.textContent = left + ' left';
    const mine = (G.pl[VIEW] || {cards: []}).cards;
    const order = G.decks ? Object.keys(FGCARDS) : Object.keys(CARDS), vp = G.decks && G.pl[VIEW] ? G.pl[VIEW].vp || 0 : 0;
    $('mycards').innerHTML = '<div class="pch">Progress</div><div class="pcrow">' + (!mine.length && !vp ? '<span class="none">None yet</span>' : '') + order.filter(c => mine.some(x => x.c === c)).map(c => {
      const all = mine.filter(x => x.c === c), ready = all.some(x => x.n < G.tn), A = CARDART[c], I = CINFO(c);
      const face = '<svg viewBox="' + A.vb + '" aria-hidden="true">' + A.svg(PCOL[G.pl[VIEW] ? VIEW : 0]) + '</svg>' + I.n + (all.length > 1 ? '<b>×' + all.length + '</b>' : '');
      // (data-tip/data-tn: the hover bubble, see cardTip in draw2d.js)
      if (c === 'p') return '<button class="pc vp" disabled style="--a:' + A.col[0] + ';--b:' + A.col[1] + '" data-tn="' + I.n + '" data-tip="' + I.d + '" aria-label="' + I.n + ': ' + I.d + '">' + face + '</button>';
      // (before rolling too, both modes; Forts and Knights has no one-per-turn limit — Rick, 2026-11-19)
      const can = G.decks ? myTurn() && VIEW === p && ready && fgCan(p, c) : (main || (human && G.phase === 'roll' && !G.offer)) && VIEW === p && !G.played && ready;
      return '<button class="pc" data-c="' + c + '" style="--a:' + A.col[0] + ';--b:' + A.col[1] + '" data-tn="' + I.n + '" data-tip="' + I.d + '" data-note="' + (ready ? (can ? 'Tap to play it.' : '') : 'New this turn: you can play it next turn.') + '" aria-label="' + I.n + ': ' + I.d + '"' + (can ? '' : ' disabled') + '>' + face + (ready ? '' : '<em>NEW</em>') + '</button>';
    }).join('') + (vp ? '<span class="none">Point cards scored: <b style="color:var(--accent)">' + vp + '</b></span>' : '') + '</div>';
  }
  // progress cards that don't fit overlap a little instead of scrolling (Rick, 2026-11-20)
  if (deck) {
    const row = $('mycards').querySelector('.pcrow'), n = row.querySelectorAll('.pc').length;
    const mc = $('mycards');
    row.style.removeProperty('--ov'); mc.style.flex = '';
    const over = row.scrollWidth - row.clientWidth;
    if (n > 1 && over > 0) {
      // (keep the width the section got before overlapping: otherwise it shrinks with its cards and squeezes again)
      if (getComputedStyle($('handbox')).flexDirection === 'row') mc.style.flex = '0 0 ' + mc.getBoundingClientRect().width + 'px';      // (side by side only; phones stack them)
      row.style.setProperty('--ov', Math.min(38, over / (n - 1) + .5).toFixed(1) + 'px');
    }
  }
  // the resource fan, after the progress cards: it spreads its cards over whatever width #hand has left (2026-11-20)
  $('hand').innerHTML = handHTML(G.pl[VIEW] ? G.pl[VIEW].res : null);
  $('b-wall').parentNode.hidden = !G.fg;
  $('b-guards').parentNode.hidden = $('b-imp').parentNode.hidden = $('raiders').hidden = !G.fg;
  if (G.fg) { fillGuards(p, main); fillImprove(p, main); } else $('gmenu').hidden = $('imenu').hidden = true;
  if (G.fg) {      // the raider track: how close the fleet is, and forts (what they'd raid) against the island's defence
    const def = islandDefence(), str = fortCount(), f = G.fleet || 0;
    $('raiders').innerHTML = '<div class="rt"><b>Raiders</b>' + Array.from({length: FLEETMAX}, (_, k) => '<svg viewBox="-12 -12 24 24"' + (k < f ? ' class="on"' : '') + '>' + SEAICON.raid + '</svg>').join('') + '</div>' +
      '<div class="rv"><span title="Raid strength = forts on the island">Raiders <em>' + str + '</em></span><span title="Knights on duty">Defence <em class="' + (def >= str ? 'safe' : 'risk') + '">' + def + '</em></span></div>' +
      '<div>' + (f >= FLEETMAX - 1 ? 'They land on the next raider roll!' : (FLEETMAX - f) + ' raider rolls until they land.') + '</div>';
  }
  // the log over the map; its last line (gold) says what to do now
  const L = $('log'); L.innerHTML = G.log.map(t => '<div>' + esc(t) + '</div>').join('') + '<div class="now">' + message() + '</div>'; L.scrollTop = L.scrollHeight;
  if (PICK && !main && !(human && G.phase === 'roll')) PICK = null;      // (a card played before rolling can ask for a pick)
  SWHO = PICK ? -1 : sciWho();      // Forts and Knights: a Science level 3 pick waiting (js/ui.js)
  $('m-pick').hidden = !(PICK || SWHO >= 0);
  if (PICK || SWHO >= 0) {
    $('p-title').textContent = PICK ? PICK.title : G.pl[SWHO].name + ': Science bonus';
    $('p-text').textContent = PICK ? PICK.text : 'That roll gave you nothing, but your Science (level ' + PERKAT + '+) pays off. Pick one free resource.';
  }
  $('p-cancel').hidden = !PICK;
  fillRob(human);
  fillChoose();
  const dw = discardWho();
  $('m-disc').hidden = dw < 0;
  if (dw >= 0) fillDisc(dw); else DWHO = -1;
  if (G.phase !== 'main' || !human) $('m-trade').hidden = true;
  if (!$('m-trade').hidden) fillTrade();
  if (G.phase === 'over' && !render.won && Date.now() < WINUNTIL) {      // (the celebration plays first, then the window)
    clearTimeout(render.wt); render.wt = setTimeout(() => { if (G && G.phase === 'over') render(); }, WINUNTIL - Date.now() + 50);
  } else if (G.phase === 'over' && !render.won) {
    $('winpop') && $('winpop').remove();
    render.won = true;
    $('w-title').textContent = G.pl[G.win].name + ' won!';
    $('w-text').textContent = 'Final score: ' + G.pl.map((P, i) => P.name + ' ' + score(i)).join(', ') + '.';
    fillStats();      // (js/stats.js)
    $('m-win').hidden = false;
  }
  if (G.phase !== 'over') { render.won = false; $('m-win').hidden = true; }
  clearTimeout(BOTT); BOTT = null;
  if (G.phase !== 'over' && G.pl[p].bot && NET.role !== 'guest') BOTT = setTimeout(botStep, BOTPACE + (D3.on && D3.introLeft ? D3.introLeft() : 0));      // (wait for the island to assemble)
  drawClock();      // turn timer (js/timer.js)
  tutDraw();        // How to play coach box (js/tutorial.js)
  if (NET.role === 'host') broadcast();
}

