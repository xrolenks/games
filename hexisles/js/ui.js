'use strict';
// Hex Isles - Saving, and the screen: render(), windows, buttons, menus, the hand, trade offers.
// ---------- Saving ----------
function save() { if (NET.role === 'guest') return; try { localStorage.setItem(SAVEKEY, JSON.stringify(G)); } catch (e) {} netMark(); }
function load() {
  try {
    const g = JSON.parse(localStorage.getItem(SAVEKEY));
    if (!g || g.ver !== 1 || !Array.isArray(g.hex) || g.hex.length !== HEX.length || !Array.isArray(g.pl)) return false;
    if (g.fire || !g.deck) return false;      // (a game from the old removed volcano mode: start fresh)
    // older saves: Fruit became Grain, Fish became Wool (2026-11-17), the middle land was called 'volcano' (until 2026-11-21),
    // and there were no ports
    const OLD = {fruit: 'grain', fish: 'wool', volcano: 'lair'};
    const fix = o => { for (const k in OLD) if (o && k in o) { o[OLD[k]] = (o[OLD[k]] || 0) + o[k]; delete o[k]; } };
    g.hex.forEach(h => { if (OLD[h.t]) h.t = OLD[h.t]; });
    g.pl.forEach(P => fix(P.res));
    knightsToCorners(g);      // (knights stood on roads until 2026-11-19)
    (g.ports || []).forEach(o => { if (OLD[o.r]) o.r = OLD[o.r]; });
    if (g.offer) { fix(g.offer.give); fix(g.offer.get); }
    // older Forts and Guards saves (2026-11-18): one kind called "goods" (becomes Paper), then Carvings/Rugs/Silver
    const OLDG = {goods: 'paper', carving: 'paper', rug: 'cloth', silver: 'coin'};
    if (g.fg) g.pl.forEach(P => { for (const k in OLDG) if (P.res[k] != null) { P.res[OLDG[k]] = (P.res[OLDG[k]] || 0) + P.res[k]; delete P.res[k]; } GOODS.forEach(k => { P.res[k] = P.res[k] || 0; }); });
    if (g.gd) for (const e in g.gd) if (g.gd[e].a == null) g.gd[e].a = 1;      // guards from before activation existed were always on duty
    if (g.timer) g.tEnd = Date.now() + g.timer * 1000;      // after a reload the turn gets a fresh clock
    G = g; if (!G.ports) G.ports = makePorts();
    VIEW = Math.max(0, G.pl.findIndex(p => !p.bot)); return true;
  } catch (e) { return false; }
}

// ---------- Windows and buttons ----------
const RULES = "<b>Town</b> = 1 point. <b>Fort</b> (upgrades a town) = 2 points. First to <b>10 points</b> wins. Towns can't sit right next to each other. <b>Trade:</b> 4 for 1 with the bank; build on a <b>port</b> for 3 for 1, or 2 for 1 for the resource on its sign.";
const CARDRULES = 'A <b>7</b> moves the <b>bandit</b>: anyone holding more than 7 resources discards half, then the roller puts the bandit on a land, which gives nothing while he is there. <b>Progress cards</b>: play one per turn (before or after rolling), but not on the turn you buy it.';
// Picking a resource for a card (PICK = {title, text, cb}); the Science bonus pick uses the same window
let PICK = null;
function openPick(title, text, cb) { PICK = {title, text, cb}; render(); }
// Discarding after a 7: whose discard this screen is choosing (DWHO) and what they picked so far (DSEL)
let DWHO = -1, DSEL = {};
// The robbing window: the mover picks who to rob (phase 'rob'), then the robbed player picks a card (phase 'give')
function fillRob(human) {
  const busy = chasing();      // wait until the Guard's knight has chased the bandit off
  const rob = !busy && G.phase === 'rob' && human && G.rob, give = !busy && G.phase === 'give' && G.rob && mySeat(G.rob.from);
  $('m-rob').hidden = !(rob || give);
  if (rob) {
    $('r-title').textContent = 'Rob someone';
    $('r-text').textContent = 'The bandit is on their land. Pick who hands you a card. They choose which one.';
    $('r-opts').innerHTML = G.rob.opts.map(i => '<button data-p="' + i + '"><i class="dot" style="background:' + PCOL[i] + '"></i>' + esc(G.pl[i].name) + '<br><b>' + cards(i) + ' cards</b></button>').join('');
  } else if (give) {
    const v = G.rob.from, R = G.pl[v].res;
    $('r-title').textContent = G.pl[v].name + ': you\'re robbed!';
    $('r-text').textContent = G.pl[G.rob.by].name + ' robbed you. Pick which card to hand over.';
    $('r-opts').innerHTML = KINDS().filter(r => R[r] > 0).map(r => '<button data-r="' + r + '">' + ico(r) + RN[r] + '<br><b>' + R[r] + '</b></button>').join('');
  }
}
$('r-opts').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.p != null) go({t: 'rob', p: +b.dataset.p});
  else if (b.dataset.r) go({t: 'give', r: b.dataset.r});
};
// Science level 3 bonus picks waiting (G.spick = {seat: picks}): which seat this screen picks for now, or -1.
// Shown between moves (roll or main phase), so it never covers a discard, a robbery or a raid pick.
let SWHO = -1;
function sciWho() {
  if (!G || !G.spick || !['roll', 'main'].includes(G.phase)) return -1;
  if (NET.role) return G.spick[NET.seat] ? NET.seat : -1;
  const k = Object.keys(G.spick).find(s => G.pl[s] && !G.pl[s].bot);
  return k == null ? -1 : +k;
}
function discardWho() {
  if (!G || G.phase !== 'discard' || !G.disc) return -1;
  if (NET.role) return G.disc[NET.seat] ? NET.seat : -1;
  const k = Object.keys(G.disc)[0];
  return k == null ? -1 : +k;
}
function fillDisc(p) {
  if (DWHO !== p) { DWHO = p; DSEL = {}; }
  const need = G.disc[p], R = G.pl[p].res, got = RES.reduce((s, r) => s + (DSEL[r] || 0), 0);
  $('d-title').textContent = G.pl[p].name + ': discard ' + need;
  $('d-text').textContent = 'A 7 was rolled and this hand has more than ' + handMax(p) + ' cards, so half must go. Tap what to throw away (' + got + ' of ' + need + ' picked).';
  $('d-res').innerHTML = KINDS().filter(r => R[r] != null).map(r => '<button data-r="' + r + '"' + (R[r] - (DSEL[r] || 0) < 1 || got >= need ? ' disabled' : '') + '>' + ico(r) + RN[r] + ' ' + (R[r] - (DSEL[r] || 0)) + (DSEL[r] ? '<br>−' + DSEL[r] : '') + '</button>').join('');
  $('d-ok').disabled = got !== need;
}
const MODEHINT = ['A 7 moves the bandit, who robs a player there, and progress cards bring surprises.', 'Classic plus a third die: raiders sail in, and when they land, the knights on duty must match the number of forts or a fort gets sacked, so more forts means more knights. Forts make Paper, Cloth and Coin to improve Science, Trade and Politics, which win progress cards when the Sea die shows their face. First to 13 points wins.'];
let FGMODE = false;     // mode picked for the next game: true = Forts and Guards, false = Classic
function fillMode(id, canPick) {
  const el = $(id);
  el.innerHTML = '<span style="flex:1">Mode</span>' + ['Classic', 'Forts and Knights'].map((n, i) => '<button data-f="' + i + '"' + (!!i === FGMODE ? ' class="on"' : '') + (canPick ? '' : ' disabled') + '>' + n + '</button>').join('');
  el.nextElementSibling.textContent = MODEHINT[+FGMODE];
  fillLevel(id === 's-mode' ? 's-level' : 'l-level', canPick);
  fillTimer(id === 's-mode' ? 's-timer' : 'l-timer', canPick);      // (js/timer.js)
  fillPack(id === 's-mode' ? 's-pack' : 'l-pack');                  // (js/packs.js: everyone picks their own look)
}
// How well the computer players play (G.lvl): 0 Easy, 1 Normal, 2 Hard. Remembered for next time.
const LEVELS = ['Easy', 'Normal', 'Hard'];
const LEVELHINT = ['Computer players make mistakes, skip turns now and then and rarely trade.',
  'Computer players build sensibly and trade with the bank.',
  'Computer players offer you trades, race for the longest route, save up for forts and send the bandit after the leader.'];
let LEVEL = 1;
try { const v = localStorage.getItem('hexisles-level'); if (v === '0' || v === '2') LEVEL = +v; } catch (e) {}
function fillLevel(id, canPick) {
  const el = $(id);
  el.innerHTML = '<span style="flex:1">Computers</span>' + LEVELS.map((n, i) => '<button data-l="' + i + '"' + (i === LEVEL ? ' class="on"' : '') + (canPick ? '' : ' disabled') + '>' + n + '</button>').join('');
  el.nextElementSibling.textContent = LEVELHINT[LEVEL];
}
function setLevel(v) { LEVEL = v; try { localStorage.setItem('hexisles-level', v); } catch (e) {} }
let SCOUNT = 3;
const SCFG = DEFNAMES.map((n, i) => ({name: n, bot: i > 0, c: DEFCOL[i]}));
// colours picked last time (Rick, 2026-11-20: players choose their colour), remembered in localStorage
const COLKEY = 'hexisles-colors';
try { const s = JSON.parse(localStorage.getItem(COLKEY)); if (Array.isArray(s)) fixColors(s, 4).forEach((c, i) => { SCFG[i].c = c; }); } catch (e) {}
// The colour picker: a round colour button on a player's row opens a row of swatches under it; colours another
// player already has are crossed out. CPICK = the row whose swatches are open (-1: none). Shared with the lobby.
let CPICK = -1;
const cdot = (i, c, can) => '<button class="cdot" data-cp="' + i + '" style="background:' + c + '" title="' + colorName(c) + (can ? ': tap to change' : '') + '" aria-label="Colour: ' + colorName(c) + '"' + (can ? '' : ' disabled') + '></button>';
const cpal = (i, mine, taken) => '<div class="cpal">' + COLORS.map(([n, c]) => '<button data-pc="' + c + '" data-pi="' + i + '" style="background:' + c + '" title="' + n + (taken.includes(c) ? ' (taken)' : '') + '" aria-label="' + n + '"' +
  (c === mine ? ' class="on"' : '') + (taken.includes(c) ? ' disabled' : '') + '></button>').join('') + '</div>';
function fillSetup() {
  $('s-count').innerHTML = '<span style="flex:1">Players</span>' + [2, 3, 4].map(n => '<button data-n="' + n + '"' + (n === SCOUNT ? ' class="on"' : '') + '>' + n + '</button>').join('');
  const used = fixColors(SCFG.slice(0, SCOUNT).map(c => c.c), SCOUNT);
  used.forEach((c, i) => { SCFG[i].c = c; });
  $('s-rows').innerHTML = SCFG.slice(0, SCOUNT).map((c, i) => '<div class="row">' + cdot(i, c.c, true) + '<input data-i="' + i + '" maxlength="12" value="' + esc(c.name) + '" aria-label="Player ' + (i + 1) + ' name"><button data-b="' + i + '">' + (c.bot ? 'Computer' : 'Human') + '</button></div>' +
    (CPICK === i ? cpal(i, c.c, used.filter((u, k) => k !== i)) : '')).join('');
  $('s-cancel').hidden = !G;
  fillMode('s-mode', true);
}
function openSetup() { fillSetup(); $('m-win').hidden = true; $('m-setup').hidden = false; }
function fillTrade() {
  const R = G.pl[G.turn].res;
  const p = G.turn;
  if (TGIVE && R[TGIVE] < rate(p, TGIVE)) TGIVE = null;
  $('t-give').innerHTML = KINDS().map(r => '<button data-g="' + r + '"' + (!(R[r] >= rate(p, r)) ? ' disabled' : '') + (r === TGIVE ? ' class="on"' : '') + '>' + ico(r) + RN[r] + ' (' + R[r] + ')<br><b>' + rate(p, r) + ' for 1</b></button>').join('');
  const gets = KINDS();      // (Forts and Knights: any trade can get goods too; Classic: KINDS() is just the resources)
  $('t-get').innerHTML = gets.map(r => '<button data-t="' + r + '"' + (!TGIVE || r === TGIVE ? ' disabled' : '') + '>' + ico(r) + RN[r] + '</button>').join('');
  // offer to players: tap a resource to add one to that side
  RES.forEach(r => { if ((OG[r] || 0) > R[r]) OG[r] = R[r]; });
  const tag = n => n ? '<br><b>×' + n + '</b>' : '';
  $('o-give').innerHTML = RES.map(r => '<button data-r="' + r + '"' + (R[r] - (OG[r] || 0) < 1 || OW[r] ? ' disabled' : '') + (OG[r] ? ' class="on"' : '') + '>' + ico(r) + RN[r] + tag(OG[r]) + '</button>').join('');
  $('o-want').innerHTML = RES.map(r => '<button data-r="' + r + '"' + (OG[r] ? ' disabled' : '') + (OW[r] ? ' class="on"' : '') + '>' + ico(r) + RN[r] + tag(OW[r]) + '</button>').join('');
  $('o-send').disabled = !(cleanRes(OG) && cleanRes(OW));
}
// Offer being built in the trade window: what I give (OG) and what I want (OW)
let OG = {}, OW = {};
// The trade offer panel (#offers). Can this screen act for seat p? Wifi: only your own seat. Same screen: any human.
const mySeat = p => NET.role ? NET.seat === p : !!G.pl[p] && !G.pl[p].bot;
const cardsRow = res => RES.filter(r => res[r]).map(r => '<span class="oc" style="--a:' + COL[r][0] + ';--b:' + COL[r][1] + '" title="' + res[r] + ' ' + RN[r] + '">' + ico(r) + '<b>' + res[r] + '</b></span>').join('');
function fillOffers() {
  const box = $('offers'), o = G.offer && G.phase === 'main' ? offerFix(G.offer) : null;
  box.hidden = !o;
  if (!o) return;
  const boss = mySeat(o.from);       /* this screen belongs to the player who made the offer */
  let h = '<div class="oh"><i style="background:' + PCOL[o.from] + '"></i><b>' + esc(G.pl[o.from].name) + '</b> offers</div>';
  h += '<div class="ot"><div>' + cardsRow(o.give) + '</div><span>for</span><div>' + cardsRow(o.get) + '</div></div>';
  G.pl.forEach((P, i) => {
    if (i === o.from) return;
    const st = offerState(o, i);
    let right = '<em class="s-' + (st || 'wait') + '">' + (st === 'yes' ? '✓ Accepted' : st === 'no' ? '✗ Declined' : st === 'x' ? 'Turned down' : 'Thinking…') + '</em>';
    if (st === 'yes' && boss) right = '<em class="s-yes">Accepted</em><button class="ok" data-ok="' + i + '" title="Trade with ' + esc(P.name) + '"' + (has(i, o.get) ? '' : ' disabled') + '>✓</button><button class="no" data-x="' + i + '" title="Turn ' + esc(P.name) + ' down">✗</button>';
    else if (!st && mySeat(i)) right = '<em class="s-wait q">Accept?</em><button class="ok" data-yes="' + i + '" title="Accept"' + (has(i, o.get) ? '' : ' disabled') + '>✓</button><button class="no" data-no="' + i + '" title="Decline">✗</button>';
    h += '<div class="or"><i style="background:' + PCOL[i] + '"></i><span>' + esc(P.name) + '</span>' + right + '</div>';
  });
  if (boss) h += '<button class="ocancel">Take it back</button>';
  box.innerHTML = h;
}

$('board').addEventListener('click', e => {
  const t = e.target.closest('.hit'), what = placing();
  if (!t || !what) return;
  if (t.dataset.h != null) go({t: 'storm', h: +t.dataset.h});
  else if (t.dataset.e != null) go({t: 'road', e: +t.dataset.e});
  else if (GMODES.includes(what)) knightTap(what, +t.dataset.v);      // (knights stand on corners)
  else go({t: upWhat(what, +t.dataset.v), v: +t.dataset.v, p: what === 'sack' ? sackWho() : undefined});      // (p: which raid victim picked)
});
$('dice').onclick = () => { if (myTurn() && G.phase === 'roll') go({t: 'roll'}); };
$('b-end').onclick = () => {      // (Forts and Knights: over the progress card limit, throw cards away first)
  if (G.decks && G.pl[G.turn].cards.length > PCMAX) return tossChoose(G.turn, () => go({t: 'end'}));
  go({t: 'end'});
};
['road', 'town', 'fort', 'wall'].forEach(w => { $('b-' + w).onclick = () => { MODE = MODE === w ? null : w; render(); }; });
// --- the Guards button and its menu (Forts and Knights) ---
const GMODES = ['guard', 'train', 'activate', 'kmove', 'gchase'];
const GMENU = {
  guard: ['Hire a knight', 'Stands on a corner by one of your roads, off duty'],
  train: ['Train a knight', 'Strength 1 → 2'],
  activate: ['Put on duty', 'Only knights on duty defend against raids'],
  kmove: ['Move a knight', 'A knight on duty walks along your roads to an empty corner, then rests'],
  gchase: ['Chase the bandit', 'A knight on duty on the bandit\'s land sends it away, then rests']
};
function knightTap(what, v) {      // a tap on a glowing corner in a knights mode (both boards)
  if (what !== 'kmove') return go({t: what, v});
  if (KFROM == null) { KFROM = v; return render(); }
  const from = KFROM; KFROM = null; MODE = null; go({t: 'kmove', v: from, to: v});
}
// Moving a knight takes two taps: the knight (KFROM), then where it goes. gSpots = the glowing corners for a knights mode.
let KFROM = null;
const gSpots = what => what === 'kmove' && KFROM != null ? kmoveTo(G.turn, KFROM) : spots(G.turn, what);
let GMOPEN = false;
function fillGuards(p, main) {
  if (MODE !== 'kmove' || !main) KFROM = null;
  const all = Object.values(guards()).filter(g => g.p === VIEW), on = all.filter(g => g.a).length;
  const b = $('b-guards'), can = m => main && spots(p, m).length > 0 && canPay(p, m);
  const html = '<svg class="bi" viewBox="-12 -12 24 24" aria-hidden="true">' + BICON.guard + '</svg><span>Knights<small>' + (all.length ? on + ' of ' + all.length + ' on duty' : 'none yet') + '</small></span>';
  if (b.dataset.l !== html) { b.innerHTML = html; b.dataset.l = html; }
  b.disabled = !GMODES.some(can);
  b.classList.toggle('on', GMODES.includes(MODE) || GMOPEN);
  if (b.disabled) GMOPEN = false;
  const M = $('gmenu');
  M.style.setProperty('--pc', PCOL[G.pl[VIEW] ? VIEW : 0]);      // the guard pictures are in the player's colour
  M.hidden = !GMOPEN;
  if (!GMOPEN) return;
  M.innerHTML = GMODES.map(m => '<button data-m="' + m + '"' + (can(m) ? '' : ' disabled') + '><svg viewBox="-12 -12 24 24" aria-hidden="true">' + (m === 'train' ? BICON.train : m === 'kmove' ? BICON.guard + '<path d="M3 8h8m-3-3l3 3-3 3" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' : m === 'gchase' ? '<g transform="scale(.5) translate(0 4)">' + BANDIT + '</g>' : BICON.guard) + '</svg><span>' + GMENU[m][0] + '<small>' + (m === 'train' && perk(p, 'pol') ? 'Strength 1 → 2 → 3 (mighty)' : GMENU[m][1]) + '</small></span><span class="cost">' + costChips(m) + '</span></button>').join('');
  // above the Guards button, kept on screen
  const R = b.getBoundingClientRect(), W = M.offsetWidth, H = M.offsetHeight;
  M.style.left = Math.max(6, Math.min(innerWidth - W - 6, R.left + R.width / 2 - W / 2)) + 'px';
  M.style.top = Math.max(6, R.top - H - 8) + 'px';
}
$('b-guards').onclick = () => {
  IMOPEN = false;
  if (GMODES.includes(MODE)) { MODE = null; KFROM = null; GMOPEN = false; } else GMOPEN = !GMOPEN;
  render();
};
$('gmenu').onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; MODE = b.dataset.m; KFROM = null; GMOPEN = false; render(); };
document.addEventListener('pointerdown', e => { if (GMOPEN && !e.target.closest('#gmenu, #b-guards')) { GMOPEN = false; $('gmenu').hidden = true; if (G) render(); } }, true);
// --- the Improve button and its menu (Forts and Knights): Science / Trade / Politics, levels 0-5 ---
// a little picture per track, also used on the Sea die: a book (Science), scales (Trade), a crown (Politics)
const TRACKICON = {
  sci: '<path d="M-9-7q4.5-2 9 0v14q-4.5-2-9 0z" fill="#e8f1fb" stroke="#1d3e66" stroke-width="1"/><path d="M9-7q-4.5-2-9 0v14q4.5-2 9 0z" fill="#cfe1f5" stroke="#1d3e66" stroke-width="1"/><path d="M-7-3.5h5M-7-.5h5M-7 2.5h4M2-3.5h5M2-.5h5" stroke="#4a9be0" stroke-width=".8"/>',
  trd: '<path d="M0-9v15M-6 7h12" stroke="#1f5a40" stroke-width="1.6" stroke-linecap="round"/><path d="M-8-5h16" stroke="#1f5a40" stroke-width="1.4"/><path d="M-11 1a3 1.6 0 0 0 6 0l-3-6zM5 1a3 1.6 0 0 0 6 0l-3-6z" fill="#7fd6a8" stroke="#1f5a40" stroke-width=".9"/><circle cy="-9.5" r="1.4" fill="#e8b84a"/>',
  pol: '<path d="M-8 5l-1.5-10 5 4.5L0-8l4.5 7.5 5-4.5L8 5z" fill="#ffd95e" stroke="#6a4a0e" stroke-width="1" stroke-linejoin="round"/><rect x="-8" y="4.5" width="16" height="3.4" rx=".8" fill="#e0a83a" stroke="#6a4a0e" stroke-width=".9"/><circle cx="-4" cy="6.2" r=".9" fill="#c62828"/><circle cx="0" cy="6.2" r=".9" fill="#2a6fb0"/><circle cx="4" cy="6.2" r=".9" fill="#2e8b57"/>'
};
let IMOPEN = false;
function fillImprove(p, main) {
  const b = $('b-imp'), me = G.pl[VIEW] ? VIEW : p;
  const html = '<svg class="bi" viewBox="-12 -12 24 24" aria-hidden="true"><g transform="translate(-6 -4) scale(.5)">' + TRACKICON.sci + '</g><g transform="translate(6 -4) scale(.5)">' + TRACKICON.trd + '</g><g transform="translate(0 5) scale(.5)">' + TRACKICON.pol + '</g></svg>' +
    '<span>Improve<small>' + Object.keys(TRACKS).map(k => k.charAt(0).toUpperCase() + imp(me, k)).join(' ') + '</small></span>';
  if (b.dataset.l !== html) { b.innerHTML = html; b.dataset.l = html; }
  const can = k => main && canImprove(p, k);
  b.disabled = !(main && Object.keys(TRACKS).some(k => okImprove(p, k)));
  b.classList.toggle('on', IMOPEN);
  if (b.disabled) IMOPEN = false;
  const M = $('imenu');
  M.hidden = !IMOPEN;
  if (!IMOPEN) return;
  M.innerHTML = Object.keys(TRACKS).map(k => {
    const T = TRACKS[k], lv = imp(p, k), max = lv >= TRACKMAX, C = (G.castle || {})[k];
    const pips = '<span class="pips" style="--t:' + T.c + '">' + Array.from({length: TRACKMAX}, (_, i) => '<i' + (i < lv ? ' class="on"' : '') + '></i>').join('') + '</span>';
    const who = C ? (C.p === p ? 'you' : G.pl[C.p].name) + (C.perm ? ' (permanent)' : '') : 'nobody yet';
    const note = (max ? 'Top level' : 'Level ' + (lv + 1) + ': card when red ≤ ' + Math.min(6, lv + 2)) + ' · Castle: ' + who +
      '<br>' + (lv >= PERKAT ? '✓ ' : 'Level ' + PERKAT + ': ') + PERK[k];      // the level 3 bonus (Rick, 2026-11-19)
    return '<button data-k="' + k + '"' + (can(k) ? '' : ' disabled') + '><svg viewBox="-12 -12 24 24" aria-hidden="true">' + TRACKICON[k] + '</svg><span>' + T.n + ' <b style="color:' + T.c + '">' + lv + '</b>/5<small>' + note + '</small>' + pips + '</span>' +
      '<span class="cost">' + (max ? '' : ('<i style="--a:' + COL[T.g][0] + '"></i>').repeat(impCost(p, k))) + '</span></button>';
  }).join('') + '<small style="color:var(--dim);font-size:.7rem;padding:0 4px">Level N costs N ' + Object.values(TRACKS).map(T => RN[T.g]).join(' / ') + '. First to level ' + CASTLEAT + ' turns a fort into that track\'s castle (+' + CASTLEPTS + ' points, never sacked); level ' + TRACKMAX + ' takes it from someone at level ' + CASTLEAT + ' and keeps it for good. You need a fort.</small>';
  const R = b.getBoundingClientRect(), W = M.offsetWidth, H = M.offsetHeight;
  M.style.left = Math.max(6, Math.min(innerWidth - W - 6, R.left + R.width / 2 - W / 2)) + 'px';
  M.style.top = Math.max(6, R.top - H - 8) + 'px';
}
$('b-imp').onclick = () => { IMOPEN = !IMOPEN; GMOPEN = false; render(); };
$('imenu').onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; go({t: 'improve', k: b.dataset.k}); };
document.addEventListener('pointerdown', e => { if (IMOPEN && !e.target.closest('#imenu, #b-imp')) { IMOPEN = false; $('imenu').hidden = true; if (G) render(); } }, true);
$('b-trade').onclick = () => { MODE = null; TGIVE = null; OG = {}; OW = {}; $('m-trade').hidden = false; render(); };
$('t-close').onclick = () => { $('m-trade').hidden = true; };
['road', 'town', 'fort', 'wall'].forEach(w => { $('b-' + w).innerHTML = buildLabel(w); });
$('b-buy').innerHTML = buildLabel('card', ' ');
$('b-trade').innerHTML = '<svg class="bi" viewBox="-12 -12 24 24" aria-hidden="true"><path d="M-8-4h13M2-8l4 4-4 4M8 4H-5M-2 0l-4 4 4 4" fill="none" stroke="#111" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M-8-4h13M2-8l4 4-4 4M8 4H-5M-2 0l-4 4 4 4" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Trade</span>';
$('actions').addEventListener('mousemove', e => { const b = e.target.closest('[data-cost]'); if (b) showTip(b.dataset.cost, e.clientX, e.clientY); else hideTip(); });
$('actions').addEventListener('mouseleave', hideTip);
// phones have no hover: a tap on a build button shows its cost for a moment (the buttons have no cost chips since 2026-11-20)
let TIPT = 0;
$('actions').addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  const b = e.target.closest('[data-cost]'); if (!b) return;
  const r = b.getBoundingClientRect(); TIPW = null; showTip(b.dataset.cost, r.left + r.width / 2, r.top);
  clearTimeout(TIPT); TIPT = setTimeout(hideTip, 2000);
});
$('o-give').onclick = e => { const b = e.target.closest('button'); if (b) { OG[b.dataset.r] = (OG[b.dataset.r] || 0) + 1; fillTrade(); } };
$('o-want').onclick = e => { const b = e.target.closest('button'); if (b) { OW[b.dataset.r] = (OW[b.dataset.r] || 0) + 1; fillTrade(); } };
$('o-clear').onclick = () => { OG = {}; OW = {}; fillTrade(); };
$('o-send').onclick = () => { const a = {t: 'offer', give: OG, get: OW}; OG = {}; OW = {}; $('m-trade').hidden = true; go(a); };
$('offers').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (d.yes != null) go({t: 'accept', p: +d.yes});
  else if (d.no != null) go({t: 'decline', p: +d.no});
  else if (d.ok != null) go({t: 'confirm', p: +d.ok});
  else if (d.x != null) go({t: 'reject', p: +d.x});
  else if (b.classList.contains('ocancel')) go({t: 'cancel'});
};
$('log').onclick = () => { const L = $('log'); L.classList.toggle('open'); L.scrollTop = L.scrollHeight; };
$('t-give').onclick = e => { const b = e.target.closest('button'); if (b) { TGIVE = b.dataset.g; fillTrade(); } };
$('t-get').onclick = e => { const b = e.target.closest('button'); if (b && TGIVE && go({t: 'trade', give: TGIVE, get: b.dataset.t})) { TGIVE = null; $('m-trade').hidden = true; } };      // a finished bank trade closes the window (Rick, 2026-11-19)
$('p-res').innerHTML = RES.map(r => '<button data-r="' + r + '">' + ico(r) + RN[r] + '</button>').join('');
$('p-res').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if (PICK) { const cb = PICK.cb; PICK = null; render(); cb(b.dataset.r); }
  else if (SWHO >= 0) go({t: 'spick', p: SWHO, r: b.dataset.r});
};
$('p-cancel').onclick = () => { PICK = null; render(); };
$('d-res').onclick = e => { const b = e.target.closest('button'); if (b && DWHO >= 0) { DSEL[b.dataset.r] = (DSEL[b.dataset.r] || 0) + 1; fillDisc(DWHO); } };
$('d-reset').onclick = () => { DSEL = {}; if (DWHO >= 0) fillDisc(DWHO); };
$('d-ok').onclick = () => { const a = {t: 'discard', p: DWHO, res: DSEL}; DSEL = {}; DWHO = -1; go(a); };
$('b-buy').onclick = () => go({t: 'buy'});
// --- the "choose one" window (#m-choose) ---
// CHOOSE = {title, text, opts: [{v, html, off}], cb} while a card is being played. The raid-tie track pick (phase 'tpick')
// uses the same window and can't be cancelled.
let CHOOSE = null, CHNOW = null;
function openChoose(title, text, opts, cb) { CHOOSE = {title, text, opts, cb}; render(); }
// too many progress cards (Forts and Knights): who this screen picks a card to throw away for, or -1
function cdWho() {
  if (!G || !G.cdisc) return -1;
  if (NET.role) return G.cdisc.includes(NET.seat) ? NET.seat : -1;
  const i = G.cdisc.find(q => !G.pl[q].bot);
  return i == null ? -1 : i;
}
// the cards as buttons with their pictures, for throwing one away
const tossOpts = i => [...new Set(G.pl[i].cards.map(x => x.c))].map(c => { const A = CARDART[c], n = G.pl[i].cards.filter(x => x.c === c).length;
  return {v: c, html: '<svg viewBox="' + A.vb + '" style="width:44px;height:44px">' + A.svg(PCOL[i]) + '</svg><br>' + CINFO(c).n + (n > 1 ? ' ×' + n : '')}; });
function tossChoose(i, then) {      // your own turn, over the limit: throw cards away until you're back to PCMAX, then `then`
  openChoose('Too many progress cards', 'You can keep ' + PCMAX + '. Pick one to throw away' + (then ? ', then your turn ends.' : '.'), tossOpts(i), c => {
    if (!go({t: 'cdisc', c, p: i})) return;
    if (G.pl[i].cards.length > PCMAX) tossChoose(i, then); else if (then) then();
  });
}
function fillChoose() {
  const tw = tpickWho(), cw = tw >= 0 ? -1 : cdWho();
  const C = cw >= 0 ? {fixed: true, title: G.pl[cw].name + ': too many progress cards', text: 'You can keep ' + PCMAX + '. Pick one to throw away.', opts: tossOpts(cw), cb: c => go({t: 'cdisc', c, p: cw})} : tw >= 0 ? {fixed: true, title: G.pl[tw].name + ': pick a track', text: 'You tied for the most defence. Take a progress card from one of these decks:',
    opts: Object.keys(TRACKS).map(k => ({v: k, html: '<svg viewBox="-12 -12 24 24" style="width:30px;height:30px">' + TRACKICON[k] + '</svg><br>' + TRACKS[k].n + '<br><b>' + (G.decks[k].length + G.usedT[k].length) + ' cards</b>'})),
    cb: k => go({t: 'tpick', k, p: tw})} : CHOOSE;
  CHNOW = C;
  $('m-choose').hidden = !C;
  if (!C) return;
  $('c-title').textContent = C.title; $('c-text').textContent = C.text;
  $('c-opts').innerHTML = C.opts.map((o, i) => '<button data-i="' + i + '"' + (o.off ? ' disabled' : '') + '>' + o.html + '</button>').join('');
  $('c-cancel').hidden = !!C.fixed;
}
$('c-opts').onclick = e => {
  const b = e.target.closest('button'); if (!b || !CHNOW) return;
  const C = CHNOW, o = C.opts[+b.dataset.i];
  if (!C.fixed) CHOOSE = null;
  C.cb(o.v); render();
};
$('c-cancel').onclick = () => { CHOOSE = null; render(); };
// playing a Forts and Knights card: ask for what it needs, then send the move
function playFGClick(c) {
  const I = FGCARDS[c], p = G.turn;
  if (I.need === 'res') return openPick(I.n, I.d, r => go({t: 'card', c, r}));
  if (I.need === 'goods') return openChoose(I.n, I.d, GOODS.map(g => ({v: g, html: ico(g) + RN[g]})), r => go({t: 'card', c, r}));
  if (I.need === 'player') return openChoose(I.n, I.d, fgTargets(p, c).map(i => ({v: i, html: '<i class="dot" style="background:' + PCOL[i] + '"></i>' + esc(G.pl[i].name) + '<br><b>' + pubScore(i) + ' pts</b>'})), i => go({t: 'card', c, p: i}));
  if (I.need === 'dice') {
    const n = k => [1, 2, 3, 4, 5, 6].map(v => ({v, html: '<b style="font-size:1.2rem">' + v + '</b>'}));
    return openChoose(I.n, 'Choose the white die.', n(), d1 => openChoose(I.n, 'White ' + d1 + '. Now choose the red die.', n(), d2 => go({t: 'card', c, d1, d2})));
  }
  if (go({t: 'card', c}) && c === 'survey') { MODE = 'road'; render(); }
}
$('mycards').onclick = e => {
  const b = e.target.closest('button[data-c]'); if (!b || b.disabled) return;
  const c = b.dataset.c;
  if (FGCARDS[c]) return playFGClick(c);
  if (c === 'k') go({t: 'card', c});
  if (c === 'r' && go({t: 'card', c})) { MODE = 'road'; render(); }
  if (c === 'h') openPick('Year of Plenty', 'Pick your first resource.', r1 => openPick('Year of Plenty', 'Now pick your second resource.', r2 => go({t: 'card', c, r1, r2})));
  if (c === 'm') openPick('Tribute', 'Pick a resource. Every other player gives you all they have of it.', r => go({t: 'card', c, r}));
};
$('newbtn').onclick = () => newClick();      // (newClick is in online.js, loaded later)
$('w-new').onclick = () => newClick();
$('w-look').onclick = () => { $('m-win').hidden = true; };
$('s-cancel').onclick = () => { $('m-setup').hidden = true; };
$('s-count').onclick = e => { const b = e.target.closest('button'); if (b) { SCOUNT = +b.dataset.n; fillSetup(); } };
$('s-rows').addEventListener('input', e => { if (e.target.dataset.i != null) SCFG[+e.target.dataset.i].name = e.target.value; });
$('s-rows').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.cp != null) { CPICK = CPICK === +b.dataset.cp ? -1 : +b.dataset.cp; fillSetup(); return; }      // open/close that row's colours
  if (b.dataset.pc) {      // a colour picked
    SCFG[+b.dataset.pi].c = b.dataset.pc; CPICK = -1;
    try { localStorage.setItem(COLKEY, JSON.stringify(SCFG.map(c => c.c))); } catch (x) {}
    fillSetup(); return;
  }
  if (b.dataset.b != null) { const c = SCFG[+b.dataset.b]; c.bot = !c.bot; fillSetup(); }
};
$('s-go').onclick = () => {
  const cfg = SCFG.slice(0, SCOUNT).map((c, i) => ({name: c.name.trim() || DEFNAMES[i], bot: c.bot, c: c.c}));
  netUnmark(); newGame(cfg, FGMODE, LEVEL, TIMER); $('m-setup').hidden = true; save(); render();
};
$('s-mode').onclick = e => { const b = e.target.closest('button'); if (b) { FGMODE = b.dataset.f === '1'; fillSetup(); } };
$('l-mode').onclick = e => { const b = e.target.closest('button'); if (b && NET.role === 'host') { FGMODE = b.dataset.f === '1'; sendLobby(); } };
$('s-level').onclick = e => { const b = e.target.closest('button'); if (b) { setLevel(+b.dataset.l); fillSetup(); } };
$('l-level').onclick = e => { const b = e.target.closest('button'); if (b && NET.role === 'host') { setLevel(+b.dataset.l); sendLobby(); } };

