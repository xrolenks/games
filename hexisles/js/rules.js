'use strict';
// Hex Isles - Game rules and state: rules data, board geometry, ports, game modes, progress cards, the game state G, placement rules and act(), the one place the game changes.
// ---------- Rules data ----------
const S = 50;                         // hex size (centre to corner) in board units
const HW = Math.sqrt(3) * S;          // hex width
const ROWS = [3, 4, 5, 4, 3];         // hexes in each row of the island: 19 lands (Rick's choice, 2026-11-18; was 4-5-6-5-4, 24 lands)
const RES = ['wood', 'clay', 'wool', 'grain', 'stone'];
const RN = {wood: 'Wood', clay: 'Clay', wool: 'Wool', grain: 'Grain', stone: 'Stone', paper: 'Paper', cloth: 'Cloth', coin: 'Coin'};
// Forts and Guards goods (Rick, 2026-11-18; first named Carvings/Rugs/Silver, renamed once everyday words were allowed):
// forts on Jungle make Paper, on Pasture Cloth, on Cliffs Coin. GOODSOF = land resource -> the goods its forts make.
const GOODS = ['paper', 'cloth', 'coin'], GOODSOF = {wood: 'paper', wool: 'cloth', stone: 'coin'};
// the kinds of card in a hand: Forts and Guards adds the goods, which aren't a land's resource
const KINDS = () => G && G.fg ? RES.concat(GOODS) : RES;
const LAND = {wood: 'Jungle', clay: 'Mudflat', wool: 'Pasture', grain: 'Fields', stone: 'Cliffs', lair: "Bandits' Lair"};
const landName = t => LAND[t];      // (the middle land, 'lair', is the bandit's home)
// Each land's colours: [top (light), top (dark), side of the tile]
const COL = {paper: ['#f3ead2', '#c9b88e', '#7a6a44'], cloth: ['#7aa7e0', '#3d6bb0', '#1f3a66'], coin: ['#f2cf5b', '#c08a1e', '#6a4a0e'], wood: ['#46a565', '#27703f', '#16442a'], clay: ['#d98458', '#a5532d', '#6a3117'], wool: ['#a6d86f', '#6aa83f', '#3e6b22'], grain: ['#f5db72', '#d9ab33', '#8f6c1a'], stone: ['#b3bac6', '#7b8392', '#4a515e'], lair: ['#66504a', '#392823', '#1d1310']};
const TILES = {wood: 4, clay: 3, wool: 4, grain: 4, stone: 3, lair: 1};
const NUMS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];      // one per land except the middle one
const COST = {road: {wood: 1, clay: 1}, town: {wood: 1, clay: 1, wool: 1, grain: 1}, fort: {stone: 3, grain: 2}, card: {wool: 1, grain: 1, stone: 1}, guard: {wool: 1, stone: 1}, train: {grain: 1, stone: 1}, activate: {grain: 1}, gchase: {}, kmove: {},
  // Forts and Guards: upgrading a fort with goods
  keep: {paper: 1, cloth: 1, stone: 2}, citadel: {coin: 2, paper: 1, cloth: 1, grain: 1},
  // a wall (Forts and Guards): 2 Clay (Rick's rule, 2026-11-18)
  wall: {clay: 2}};
// Progress cards (Classic mode): how many of each are in the deck, and what they do.
// (In the code the bandit is still called "storm": G.storm, phase 'storm', {t:'storm'}.)
const CARDS = {
  // names (Rick, 2026-11-18): Knight, Victory Point, Road Building, Year of Plenty (were Guard, Landmark, Trailblazer, Bounty)
  k: {n: 'Knight', q: 14, d: 'Chase the bandit to any other land.'},
  p: {n: 'Victory Point', q: 5, d: 'Worth 1 point. Kept secret; never played.'},
  r: {n: 'Road Building', q: 2, d: 'Build 2 roads for free.'},
  h: {n: 'Year of Plenty', q: 2, d: 'Take any 2 resources.'},
  m: {n: 'Tribute', q: 2, d: 'Name a resource: every other player gives you all of theirs.'}
};
const HANDMAX = 7;    // on a 7, players holding more than this discard half (rounded down)
const WIN = 10, FGWIN = 13, BANK = 4, MAXROADS = 15;     // BANK: resources the bank wants for 1 (ports are cheaper)
const winAt = () => G && G.fg ? FGWIN : WIN;      // points needed to win: 13 in Forts and Guards (Rick's rule, 2026-11-18)
// Player colours. PCOL[seat] is the colour in use; since 2026-11-20 (Rick's request) players pick their own from COLORS
// in the new-game window or the online lobby (no two the same), stored per game in G.col, and useColors() copies them
// into PCOL whenever the game changes (render). Older saves without G.col keep DEFCOL.
const COLORS = [['Red', '#ff5d5d'], ['Blue', '#4da3ff'], ['White', '#f2f2f2'], ['Purple', '#c58cff'], ['Green', '#4fcf6a'], ['Orange', '#ff9a3c'],
  ['Yellow', '#ffd84a'], ['Black', '#34343c'], ['Pink', '#ff7ac6'], ['Teal', '#2ec4b6'], ['Brown', '#a8683a']];
const DEFCOL = ['#ff5d5d', '#4da3ff', '#f2f2f2', '#c58cff'];
const PCOL = DEFCOL.slice();
const colorName = c => (COLORS.find(k => k[1] === c) || ['Colour'])[0];
// a list of colours for the seats: keep each wanted one if it's on the palette and not taken, else the first free one
function fixColors(want, n) {
  const out = [];
  for (let i = 0; i < n; i++) { const c = want && want[i]; out.push(COLORS.some(k => k[1] === c) && !out.includes(c) ? c : null); }
  for (let i = 0; i < n; i++) if (!out[i]) out[i] = [DEFCOL[i]].concat(COLORS.map(k => k[1])).find(x => !out.includes(x));
  return out;
}
function useColors() {
  const want = G && G.col ? G.col : DEFCOL;
  let changed = false;
  for (let i = 0; i < 4; i++) { const c = want[i] || DEFCOL[i]; if (PCOL[i] !== c) { PCOL[i] = c; changed = true; } }
  if (changed && D3.recolor) D3.recolor();      // (3D: player materials are made again in the new colours)
  return changed;
}
const DEFNAMES = ['You', 'Coral', 'Drift', 'Marlo'];
const SAVEKEY = 'hexisles-auto';

// ---------- Board geometry (built once) ----------
const HEX = [], VERT = [], EDGE = [];   // HEX {x,y,v[6]}  VERT {x,y,h[],n[],e[]}  EDGE {a,b}
(function buildGeo() {
  const vk = {}, ek = {};
  ROWS.forEach((n, r) => {
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * HW, y = (r - 2) * 1.5 * S, h = {x, y, v: []}, hi = HEX.length;
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 180 * (60 * k - 90), vx = x + S * Math.cos(a), vy = y + S * Math.sin(a);
        const key = Math.round(vx) + ',' + Math.round(vy);
        if (!(key in vk)) { vk[key] = VERT.length; VERT.push({x: vx, y: vy, h: [], n: [], e: []}); }
        h.v.push(vk[key]); VERT[vk[key]].h.push(hi);
      }
      for (let k = 0; k < 6; k++) {
        const a = h.v[k], b = h.v[(k + 1) % 6], key = Math.min(a, b) + '-' + Math.max(a, b);
        if (!(key in ek)) {
          ek[key] = EDGE.length; EDGE.push({a, b});
          VERT[a].n.push(b); VERT[b].n.push(a); VERT[a].e.push(ek[key]); VERT[b].e.push(ek[key]);
        }
      }
      HEX.push(h);
    }
  });
})();

// HEXN[i][k] = the hex next to hex i in direction k (0 east, then clockwise), or -1 for sea
const HEXN = HEX.map(h => [0, 1, 2, 3, 4, 5].map(k => {
  const a = Math.PI / 3 * k, x = h.x + HW * Math.cos(a), y = h.y + HW * Math.sin(a);
  return HEX.findIndex(o => Math.abs(o.x - x) < 2 && Math.abs(o.y - y) < 2);
}));

// ---------- Ports ----------
// COAST = the edges on the outside of the island, in order around it (each with its one hex)
const COAST = [];
EDGE.forEach((e, i) => {
  const hs = HEX.map((h, k) => k).filter(k => HEX[k].v.includes(e.a) && HEX[k].v.includes(e.b));
  if (hs.length === 1) COAST.push({e: i, h: hs[0], ang: Math.atan2(VERT[e.a].y + VERT[e.b].y, VERT[e.a].x + VERT[e.b].x)});
});
COAST.sort((a, b) => a.ang - b.ang);
// G.ports = [{e: coast edge, r: a resource (2 for 1) or 'any' (3 for 1)}]: one per resource plus four 'any',
// spread evenly round the coast. A town or fort on either end of the edge uses the port.
function makePorts() {
  const kinds = shuffle(RES.concat(['any', 'any', 'any', 'any']));
  for (let tries = 0; ; tries++) {
    const off = rnd(COAST.length), ports = kinds.map((r, k) => ({e: COAST[(off + Math.round(k * COAST.length / kinds.length)) % COAST.length].e, r}));
    const ends = ports.flatMap(o => [EDGE[o.e].a, EDGE[o.e].b]);
    if (new Set(ends).size === ends.length || tries > 60) return ports;       // no two ports share a corner
  }
}
function portAt(v) { return (G.ports || []).find(o => EDGE[o.e].a === +v || EDGE[o.e].b === +v); }
// How many of resource r player p must give for 1 of anything: 4 at the bank, 3 with an 'any' port, 2 with that resource's port
function rate(p, r) {
  // Forts and Knights goods: 2 for 1 from Trade level 3 (PERKAT); before that like resources (4, or 3 with an 'any' port)
  if (GOODS.includes(r) && perk(p, 'trd')) return GOODSRATE;
  if (G.fleetT === p || (G.mkt && G.mkt.p === p && G.mkt.r === r)) return 2;      // Trade Fleet / Market Day cards, this turn
  let n = BANK;
  for (const v in G.b) {
    const o = G.b[v].p === p && portAt(v);
    if (o) n = Math.min(n, o.r === r ? 2 : o.r === 'any' ? 3 : BANK);
  }
  return n;
}
// The port player p trades r through at rate n (2 = that resource's port, 3 = an 'any' port)
function usedPort(p, r, n) {
  for (const v in G.b) {
    const o = G.b[v].p === p && portAt(v);
    if (o && (n === 2 ? o.r === r : o.r === 'any')) return o;
  }
  return null;
}

// ---------- Forts and Guards mode (G.fg) ----------
// Hex Isles' own advanced mode (Rick's request, 2026-11-18).
// a wall goes once on your own fort
function okWall(p, v) { return !!G.fg && !!G.b[v] && G.b[v].p === p && !G.b[v].w && G.b[v].l === 2; }
// It is Classic (bandit, progress cards) plus a third die, the blue Sea die (G.sea = its face 1-6, SEAFACE says
// what each face is): 3 raider faces move the raider fleet one step closer (G.fleet, 0 to FLEETMAX), 2 calm
// faces do nothing, 1 treasure face gives everyone with a fort 1 resource from a land beside one of their forts.
// When the fleet arrives, raid(): raid strength = forts on the island, defence = every guard's strength.
// Defence wins: the player with the most guard strength gets a Hero badge (P.hero, +1 point each, kept);
// a tie gives each tied player 2 resources instead. Raiders win: among players with a fort that has no wall,
// the one(s) with the least guard strength each lose a fort (back to a town). Then the fleet starts again.
// Guards (G.gd = {corner: {p, s: 1-3, a}}) stand on corners at the end of their owner's roads (on roads until 2026-11-19): hire for Wool + Stone (strength 1),
// train for Grain + Stone (strength 2). Walls here only raise the discard limit (see handMax); Keeps and Citadels are raid-proof.
const GOODSRATE = 2;      // with Trade level 3, the bank gives 1 card for 2 goods (see rate())
// Sea die faces (Rick, 2026-11-18): 3 raider faces and one face per improvement track (it was 3 raid, 2 calm, 1 treasure)
const FLEETMAX = 7, MAXGUARDS = 6, SEAFACE = [null, 'raid', 'raid', 'raid', 'sci', 'trd', 'pol'];
// --- Improvement tracks (Rick, 2026-11-18; they replaced Keeps and Citadels) ---
// Each player has a level 0-5 in each track (P.imp = {sci, trd, pol}). Going up to level N costs N of the track's
// goods, and needs at least one fort. When the Sea die shows a track's face, everyone whose level in that track + 1
// is at least the red die's number draws a progress card (Rick's rule).
// Castles (Rick, 2026-11-18; they replaced the level-5 banners): each track has one castle, G.castle[k] = {p, v, perm}.
// The first to reach level 4 turns one of their forts into it (G.b[v].c = k): +CASTLEPTS points, can't be sacked.
// Someone else reaching level 5 takes it onto one of their own forts, unless it's already permanent; it becomes
// permanent once its owner is at level 5. A fort holds one castle; with no free fort, the claim waits until one is built.
const TRACKS = {sci: {n: 'Science', g: 'paper', c: '#4a9be0'}, trd: {n: 'Trade', g: 'cloth', c: '#3fb27f'}, pol: {n: 'Politics', g: 'coin', c: '#e0a83a'}};
const TRACKMAX = 5, CASTLEAT = 4, BANNERPTS = 2, CASTLEPTS = 2;      // (BANNERPTS: banners only exist in older saves)
// Level 3 bonuses (Rick, 2026-11-19), one per track, from level PERKAT up:
// Science: a roll (not a 7) that gives you nothing lets you take 1 resource of your choice (G.spick, sciPick);
// Trade: the bank takes your goods 2 for 1 (otherwise 4 for 1, or 3 at an 'any' port, see rate());
// Politics: a strength-2 knight can be trained once more into a mighty knight, strength 3 (okTrain).
const PERKAT = 3;
const PERK = {sci: 'a roll that gives you nothing (not a 7): take 1 resource you choose', trd: 'trade goods 2 for 1 with the bank', pol: 'train knights once more: mighty knights, strength 3'};
const perk = (p, k) => !!G.fg && imp(p, k) >= PERKAT;
// Science bonus: player i takes resource r for one of their pending picks
function sciPick(i, r) {
  if (!G.spick || !G.spick[i] || !RES.includes(r)) return false;
  G.pl[i].res[r]++;
  if (--G.spick[i] <= 0) delete G.spick[i];
  say(G.pl[i].name + ' took 1 ' + RN[r] + ' (Science bonus).');
  return true;
}
const freeForts = p => Object.keys(G.b).filter(v => G.b[v].p === p && G.b[v].l === 2 && !G.b[v].c).map(Number);
// which castle (track key) player p should claim now, or null: first to CASTLEAT, or taking a non-permanent one at TRACKMAX
function castleDue(p) {
  if (!G.fg) return null;
  G.castle = G.castle || {};
  for (const k in TRACKS) {
    const lv = imp(p, k), C = G.castle[k];
    if (C && C.p === p) { if (lv >= TRACKMAX && !C.perm) { C.perm = true; say(G.pl[p].name + "'s " + TRACKBLD[k] + ' is now permanent.'); } continue; }
    if ((!C && lv >= CASTLEAT) || (C && !C.perm && lv >= TRACKMAX)) return k;
  }
  return null;
}
// put track k's castle on fort v of player p (moving it from whoever had it)
// (2026-11-20: each track's castle looks like its own building: TRACKBLD names it in messages)
const TRACKBLD = {sci: 'Grand Library', trd: 'Grand Market', pol: 'Mighty Castle'};
function placeCastle(p, k, v) {
  const C = G.castle[k];
  if (C && G.b[C.v]) delete G.b[C.v].c;
  G.b[v].c = k;
  G.castle[k] = {p, v, perm: imp(p, k) >= TRACKMAX};
  // taken from someone (Rick, 2026-11-20): every screen plays the takeover (G.takefx, js/flair.js takeFx)
  if (C && G.b[C.v]) G.takefx = {n: (G.takefx ? G.takefx.n : 0) + 1, k, from: C.v, fp: C.p, to: v, p};
  say(C ? G.pl[p].name + ' took the ' + TRACKBLD[k] + ' from ' + G.pl[C.p].name + '!' : G.pl[p].name + ' built the ' + TRACKBLD[k] + ' (' + TRACKS[k].n + '): +' + CASTLEPTS + ' points!');
}
// after improving or building a fort: claim any castle that's due. One free fort, or a computer player: placed at once;
// otherwise the player picks the fort (phase 'castle', G.cpick = k, then {t:'castle', v}).
function castleCheck(p) {
  for (let guard = 0; guard < 3; guard++) {
    const k = castleDue(p), free = k ? freeForts(p) : [];
    if (!k || !free.length) return;
    if (free.length === 1 || G.pl[p].bot) { placeCastle(p, k, free.sort((a, b) => vScore(b) - vScore(a))[0]); continue; }
    G.cpick = k; G.phase = 'castle'; return;
  }
}
const imp = (p, k) => ((G.pl[p].imp || {})[k]) || 0;
const hasFort = p => Object.values(G.b).some(b => b.p === p && b.l === 2);
// The top progress card; when the deck is empty, the played cards (G.used) are shuffled back in first
// (Forts and Knights hands out free cards, so the 25-card deck would run dry). Victory Points are kept, so never return.
function drawCard() {
  if (!G.deck) return null;
  if (!G.deck.length && G.used && G.used.length) { G.deck = shuffle(G.used); G.used = []; say('The played progress cards were shuffled back into the deck.'); }
  return G.deck.length ? G.deck.pop() : null;
}
const okImprove = (p, k) => !!G.fg && !!TRACKS[k] && hasFort(p) && imp(p, k) < TRACKMAX;
const impCost = (p, k) => Math.max(0, imp(p, k) + 1 - (G.pl[p].mason ? 1 : 0));      // (Master Mason card: one less)
const canImprove = (p, k) => okImprove(p, k) && (G.pl[p].res[TRACKS[k].g] || 0) >= impCost(p, k);
const guards = () => G.gd || {};
// Guards start inactive (g.a falsy) and only active ones defend (Rick's rule, 2026-11-18): activating costs 1 Grain;
// an active guard can chase the bandit to another land, which makes it inactive again.
function guardPow(p) { let s = 0; const g = guards(); for (const e in g) if (g[e].p === p && g[e].a) s += g[e].s; return s; }
function guardCount(p) { let n = 0; const g = guards(); for (const e in g) if (g[e].p === p) n++; return n; }
function fortCount() { let n = 0; for (const v in G.b) if (G.b[v].l === 2) n++; return n; }
// Goods and fort upgrades (Rick's request, 2026-11-18). A fort on a rolled Jungle, Pasture or Cliffs gives 1 resource +
// 1 of that land's goods (P.res.paper / cloth / coin, see GOODSOF) instead of 2 resources. Goods upgrade your fort to a Keep (G.b[v].u = 1: +1 point, 1 defence) and then a Citadel
// (u = 2: +1 more point, 2 defence). Keeps and Citadels are never sacked. The bank swaps 2 goods for 1 resource.
// Goods count toward the 7-card limit; each wall (on a fort, once, 2 Clay) raises your limit by 2.
function defence(p) { let s = guardPow(p); for (const v in G.b) if (G.b[v].p === p && G.b[v].u) s += G.b[v].u; return s; }
const islandDefence = () => G.pl.reduce((s, _, i) => s + defence(i), 0);
// Keeps and Citadels were removed on 2026-11-18 (the improvement tracks replaced them): none can be built now, but
// ones in older saves still count (G.b[v].u: points, defence, can't be sacked)
const okKeep = () => false, okCitadel = () => false;
function wallCount(p) { let n = 0; for (const v in G.b) if (G.b[v].p === p && G.b[v].w) n++; return n; }
const handMax = p => HANDMAX + (G.fg ? 2 * wallCount(p) : 0);      // more than this on a 7: discard half
const handSize = p => KINDS().reduce((s, r) => s + (G.pl[p].res[r] || 0), 0);
// Knights stand on corners (Rick, 2026-11-19; they were on roads): an empty corner (no town, fort or knight) at the end
// of one of your roads. G.gd is keyed by corner since then (G.gdv = 1; older saves are moved over by knightsToCorners).
const knightSpot = (p, v) => !!VERT[v] && !G.b[v] && !guards()[v] && VERT[v].e.some(e => G.r[e] === p);
function okGuard(p, v) { return !!G.fg && knightSpot(p, v) && guardCount(p) < MAXGUARDS; }
function knightsToCorners(g) {      // an older save's knights were keyed by road: put each on a free end of its road
  if (!g.gd || g.gdv) return;
  const old = g.gd, b = g.b || {}; g.gd = {}; g.gdv = 1;
  for (const e in old) {
    const E = EDGE[e]; if (!E) continue;
    const v = [E.a, E.b].concat(VERT.map((_, x) => x)).find(x => !b[x] && !g.gd[x] && VERT[x].e.some(k => (g.r || {})[k] === old[e].p));
    if (v != null) g.gd[v] = old[e];
  }
}
// strength 1 → 2; with Politics level 3, 2 → 3 (a mighty knight)
function okTrain(p, e) { const g = guards()[e]; return !!G.fg && !!g && g.p === p && (g.s === 1 || (g.s === 2 && perk(p, 'pol'))); }
function okActivate(p, e) { const g = guards()[e]; return !!G.fg && !!g && g.p === p && !g.a; }
// chasing the bandit off: the knight must stand on a corner of the bandit's land (Rick, 2026-11-19), and the bandit must be awake
function okChase(p, v) { const g = guards()[v]; return !!G.fg && !!g && g.p === p && !!g.a && G.storm != null && banditAwake() && VERT[v].h.includes(G.storm); }
// Forts and Knights: the bandit sleeps in its lair until the raiders first attack (Rick, 2026-11-19): no moving it on a 7
const banditAwake = () => !G.fg || (G.raids || 0) > 0;
// Moving a knight (Rick, 2026-11-19): a knight on duty walks along its owner's roads to another empty corner (no
// town, fort or knight on it, nor on the corners it passes), then rests. kmoveTo(p, v) = where knight v can go.
function kmoveTo(p, v) {
  const g = guards()[v];
  if (!G.fg || !g || g.p !== p || !g.a) return [];
  const seen = new Set([+v]), out = [], q = [+v];
  while (q.length) {
    const a = q.shift();
    for (const e of VERT[a].e) {
      if (G.r[e] !== p) continue;
      const b = EDGE[e].a === a ? EDGE[e].b : EDGE[e].a;
      if (seen.has(b)) continue;
      seen.add(b);
      if (G.b[b] && G.b[b].p === p) { q.push(b); continue; }      // (through your own towns)
      if (G.b[b] || guards()[b]) continue;                          // (blocked)
      out.push(b); q.push(b);
    }
  }
  return out;
}
const okMove = (p, v) => kmoveTo(p, v).length > 0;
function seaDie() {
  const n = 1 + rnd(6), f = SEAFACE[n];
  G.sea = n;
  if (TRACKS[f]) {      // a track face: progress cards for everyone whose level + 1 reaches the red die
    const red = G.dice[1], got = [];
    G.pl.forEach((Q, i) => {
      if (imp(i, f) + 1 < red) return;
      if (G.decks ? drawFG(i, f) : (c => c && Q.cards.push({c, n: G.tn}))(drawCard())) got.push(Q.name);      // (older saves: the one deck)
    });
    say('Sea die: ' + TRACKS[f].n + ' (red ' + red + '). ' + (got.length ? got.join(', ') + (got.length > 1 ? ' each draw' : ' draws') + ' a progress card.' : 'Nobody\'s ' + TRACKS[f].n + ' is high enough for a card.'));
  }
  if (f === 'raid') {
    G.fleet = (G.fleet || 0) + 1;
    if (G.fleet >= FLEETMAX) raid(); else say('Sea die: the raiders sail closer (' + G.fleet + ' of ' + FLEETMAX + ').');
  }
}
function raid() {
  G.fleet = 0; G.raids = (G.raids || 0) + 1;
  // the 3D landing animation (2026-11-19, Rick's request): every screen plays it when n changes (raidFx).
  // r = how it went ('home' nothing to raid, 'won' the knights won, 'away' only castles, 'lost' forts sacked),
  // v = the sacked forts (filled by sackFort), w = still waiting for players to choose which fort they lose
  G.raidfx = {n: ((G.raidfx || {}).n || 0) + 1, r: 'home', v: [], w: false};
  const str = fortCount(), pw = G.pl.map((_, i) => defence(i)), def = pw.reduce((a, b) => a + b, 0);
  say('The raiders landed! Forts on the island: ' + str + '. Defence: ' + def + '.');
  if (!str) { say('With no forts to raid, the raiders sailed home.'); return; }
  G.raidfx.r = def >= str ? 'won' : 'lost';
  // after the attack every knight on duty is worn out and goes back to resting (Rick, 2026-11-19). k = the ones who
  // fought, so the 3D battle still shows them marching out before they lie down.
  G.raidfx.k = Object.keys(guards()).filter(v => G.gd[v].a).map(Number);
  raidFight(str, def, pw);
  if (G.raidfx.k.length) { G.raidfx.k.forEach(v => { G.gd[v].a = 0; }); say('Worn out from the battle, every knight on duty goes back to rest.'); }
}
function raidFight(str, def, pw) {
  if (def >= str) {
    const top = Math.max(...pw), lead = pw.map((x, i) => x === top ? i : -1).filter(i => i >= 0);
    if (lead.length === 1) { const P = G.pl[lead[0]]; P.hero = (P.hero || 0) + 1; say('The knights drove them off! ' + P.name + ' is a Hero of the Isles: +1 point.'); }
    else {      // a tie for the most defence: each tied player takes a progress card from the track of their choice (Rick's rule)
      say('The knights drove them off! ' + lead.map(i => G.pl[i].name).join(' and ') + ' share the glory: a progress card each, from the track of their choice.');
      const ask = [];
      lead.forEach(i => {
        if (!G.decks) { const c = drawCard(); if (c) G.pl[i].cards.push({c, n: G.tn}); }      // (older saves: the one deck)
        else if (G.pl[i].bot) tpickDo2(i, bestTrack(i));
        else ask.push(i);
      });
      if (ask.length) { G.tpick = ask; G.tpNext = G.phase; G.phase = 'tpick'; }
    }
    return;
  }
  const at = G.pl.map((_, i) => i).filter(i => sackable(i).length);
  if (!at.length) { G.raidfx.r = 'away'; say('The raiders couldn\'t break into the castles, and sailed away.'); return; }
  // the player(s) with the least defence each lose a fort of their choice (Rick's rule, 2026-11-18). Computer players and
  // anyone with just one fort that can be sacked lose it at once; the others pick (phase 'sack', G.sack = seats still to
  // pick, G.sackNext = the phase to go back to afterwards).
  const low = Math.min(...at.map(i => pw[i])), pick = [];
  at.filter(i => pw[i] === low).forEach(i => {
    const f = sackable(i);
    if (f.length === 1 || G.pl[i].bot) sackFort(i, f.sort((a, b) => vScore(a) - vScore(b))[0]);
    else pick.push(i);
  });
  if (pick.length) { G.raidfx.w = true; G.sack = pick; G.sackNext = G.phase; G.phase = 'sack'; say('Raiders! ' + pick.map(i => G.pl[i].name).join(' and ') + (pick.length > 1 ? ' must each' : ' must') + ' choose a fort to lose.'); }
}
// forts the raiders can take from player i: plain forts (not castles, nor Keeps/Citadels from older saves; walls don't help)
const sackable = i => Object.keys(G.b).filter(v => G.b[v].p === i && G.b[v].l === 2 && !G.b[v].u && !G.b[v].c).map(Number);
function sackFort(i, v) { G.b[v].l = 1; if (G.raidfx && G.raidfx.v) G.raidfx.v.push(+v); say('The raiders sacked a fort: ' + G.pl[i].name + ' loses it, and it\'s a town again.'); }
// ---------- Forts and Knights progress cards (Rick, 2026-11-18) ----------
// 54 cards: 18 per track (Rick, 2026-11-18). One deck per track (G.decks[k], made in newGame; played cards go to G.usedT[k] and are shuffled back in when that deck
// runs out). Inspired by the expansion Rick pointed at, with Hex Isles' own names, pictures (CARDART) and wording, and
// adapted to our pieces. Classic's deck isn't used in this mode (G.deck stays an empty list, which still means "bandit on").
// need: what the player chooses when playing it ('res', 'goods', 'player' (FGTARGET says who qualifies), 'dice').
// when 'roll': played before rolling. vp: scores 1 point the moment it's drawn (P.vp) and isn't kept.
const FGCARDS = {
  star: {tr: 'sci', q: 2, n: 'Stargazer', d: 'Play before you roll: choose what the two number dice show.', need: 'dice', when: 'roll'},
  mason: {tr: 'sci', q: 2, n: 'Master Mason', d: 'Your next track improvement costs one goods less.'},
  wallb: {tr: 'sci', q: 2, n: 'Wall Builder', d: 'A free wall on your best fort without one.'},
  canal: {tr: 'sci', q: 2, n: 'Canal Digger', d: 'Take 2 Grain for each Fields land beside your towns and forts.'},
  healer: {tr: 'sci', q: 2, n: 'Healer', d: 'Upgrade your best town to a fort for just 2 Stone and 1 Grain.'},
  mine: {tr: 'sci', q: 2, n: 'Deep Mine', d: 'Take 2 Stone for each Cliffs land beside your towns and forts.'},
  survey: {tr: 'sci', q: 2, n: 'Surveyor', d: 'Build 2 roads for free.'},
  armour: {tr: 'sci', q: 2, n: 'Armourer', d: 'Train up to 2 of your knights for free.'},
  press: {tr: 'sci', q: 2, n: 'Printing Press', d: '1 point, scored the moment you draw it.', vp: true},
  dues: {tr: 'trd', q: 2, n: 'Harbour Dues', d: 'Every other player gives you 1 goods, if they have any.'},
  dealer: {tr: 'trd', q: 2, n: 'Shrewd Dealer', d: 'Take 2 random cards from a player with more points than you.', need: 'player'},
  market: {tr: 'trd', q: 5, n: 'Market Day', d: 'Pick a resource: for the rest of this turn the bank takes it 2 for 1.', need: 'res'},
  fleet: {tr: 'trd', q: 2, n: 'Trade Fleet', d: 'For the rest of this turn, every resource trade with the bank is 2 for 1.'},
  levy: {tr: 'trd', q: 4, n: 'Resource Levy', d: 'Name a resource: every other player gives you up to 2 of it.', need: 'res'},
  guild: {tr: 'trd', q: 3, n: 'Guild Charter', d: 'Name a goods: every other player gives you 1 of it.', need: 'goods'},
  magi: {tr: 'pol', q: 2, n: 'Magistrate', d: 'Move the bandit, then take a random card from every other player on that land.'},
  charter: {tr: 'pol', q: 2, n: 'Royal Charter', d: '1 point, scored the moment you draw it.', vp: true},
  turn: {tr: 'pol', q: 2, n: 'Turncoat', d: "Another player's strongest knight comes over to a corner by one of your roads.", need: 'player'},
  plot: {tr: 'pol', q: 3, n: 'Plotter', d: "Another player's strongest knight on duty goes to rest.", need: 'player'},
  fire: {tr: 'pol', q: 2, n: 'Firebrand', d: 'Every other player with at least as many points as you discards half their hand.'},
  snoop: {tr: 'pol', q: 3, n: 'Snoop', d: 'Take a random progress card from another player.', need: 'player'},
  rally: {tr: 'pol', q: 2, n: 'Rally Call', d: 'Put all your resting knights on duty for free.'},
  feast: {tr: 'pol', q: 2, n: 'Grand Feast', d: 'Every player with more points than you gives you 2 random cards.'}
};
const CINFO = c => CARDS[c] || FGCARDS[c];
function fgDecks() {
  const d = {sci: [], trd: [], pol: []};
  for (const c in FGCARDS) for (let i = 0; i < FGCARDS[c].q; i++) d[FGCARDS[c].tr].push(c);
  for (const k in d) shuffle(d[k]);
  return d;
}
// draw track k's top card for player p (Printing Press / Royal Charter score at once); false if the deck is empty
function drawFG(p, k) {
  const D = G.decks[k];
  if (!D.length && G.usedT[k].length) { G.decks[k] = shuffle(G.usedT[k]); G.usedT[k] = []; say('The played ' + TRACKS[k].n + ' cards were shuffled back into their deck.'); return drawFG(p, k); }
  if (!D.length) return false;
  const c = D.pop(), P = G.pl[p];
  if (FGCARDS[c].vp) { P.vp = (P.vp || 0) + 1; say(P.name + ' drew the ' + FGCARDS[c].n + ': +1 point!'); }
  else P.cards.push({c, n: G.tn});
  return true;
}
// who a 'player' card can pick
const FGTARGET = {
  dealer: (p, i) => pubScore(i) > pubScore(p) && handSize(i) > 0,
  turn: (p, i) => guardCount(i) > 0,
  plot: (p, i) => guardPow(i) > 0,
  snoop: (p, i) => G.pl[i].cards.length > 0
};
const fgTargets = (p, c) => G.pl.map((_, i) => i).filter(i => i !== p && FGTARGET[c](p, i));
const cheapFort = {stone: 2, grain: 1};
// can player p play card c right now? (besides the one-card-per-turn rule)
function fgCan(p, c) {
  const I = FGCARDS[c]; if (!I || I.vp) return false;
  if (I.when === 'roll') return G.phase === 'roll';
  if ((G.phase !== 'main' && G.phase !== 'roll') || G.offer) return false;      // (before rolling too, Rick 2026-11-19)
  if (c === 'magi' && !banditAwake()) return false;      // (the bandit sleeps until the first raid)
  if (I.need === 'player') return fgTargets(p, c).length > 0;
  if (c === 'mason') return Object.keys(TRACKS).some(k => okImprove(p, k)) && !G.pl[p].mason;
  if (c === 'wallb') return spots(p, 'wall').length > 0;
  if (c === 'healer') return spots(p, 'fort').length > 0 && Object.keys(cheapFort).every(r => G.pl[p].res[r] >= cheapFort[r]);
  if (c === 'survey') return spots(p, 'road').length > 0;
  if (c === 'armour') return spots(p, 'train').length > 0;
  if (c === 'rally') return spots(p, 'activate').length > 0;
  return true;
}
// move up to n random cards (resources or goods) from player a to player b; returns how many moved
function takeRandom(a, b, n) {
  let got = 0;
  for (let k = 0; k < n; k++) {
    const held = KINDS().flatMap(r => Array(G.pl[a].res[r] || 0).fill(r));
    if (!held.length) break;
    const r = held[rnd(held.length)];
    G.pl[a].res[r]--; G.pl[b].res[r] = (G.pl[b].res[r] || 0) + 1; got++;
  }
  return got;
}
const landsOf = (p, t) => { const hs = new Set(); for (const v in G.b) if (G.b[v].p === p) VERT[v].h.forEach(h => { if (G.hex[h].t === t && !(h === G.storm)) hs.add(h); }); return hs.size; };
const strongest = (i, onDuty) => Object.keys(guards()).filter(e => G.gd[e].p === i && (!onDuty || G.gd[e].a)).sort((x, y) => G.gd[y].s - G.gd[x].s || (G.gd[y].a || 0) - (G.gd[x].a || 0))[0];
// play Forts and Knights card a.c for player p (already checked: in hand, not bought this turn, one per turn)
function playFG(p, a) {
  const c = a.c, P = G.pl[p], I = FGCARDS[c], others = G.pl.map((_, i) => i).filter(i => i !== p), N = P.name + ' played ' + I.n;
  if (c === 'star') {
    if (![a.d1, a.d2].every(x => Number.isInteger(x) && x >= 1 && x <= 6)) return false;
    G.fix = [a.d1, a.d2]; say(N + ': the next roll will be ' + a.d1 + ' and ' + a.d2 + '.');
  }
  if (c === 'mason') { P.mason = true; say(N + ': their next improvement costs one goods less.'); }
  if (c === 'wallb') { const v = spots(p, 'wall').sort((x, y) => vScore(y) - vScore(x))[0]; G.b[v].w = 1; say(N + ' and built a wall for free.'); }
  if (c === 'canal' || c === 'mine') {
    const r = c === 'canal' ? 'grain' : 'stone', n = 2 * landsOf(p, r); P.res[r] += n;
    say(N + ' and took ' + n + ' ' + RN[r] + '.');
  }
  if (c === 'healer') {
    const v = spots(p, 'fort').sort((x, y) => vScore(y) - vScore(x))[0];
    for (const r in cheapFort) P.res[r] -= cheapFort[r];
    G.b[v].l = 2; say(N + ' and raised a fort for 2 Stone and 1 Grain.'); castleCheck(p);
  }
  if (c === 'survey') { G.free = 2; say(N + ': 2 free roads.'); }
  if (c === 'armour') { const es = spots(p, 'train').slice(0, 2); es.forEach(e => { G.gd[e].s++; }); say(N + ' and trained ' + es.length + (es.length > 1 ? ' knights.' : ' knight.')); }
  if (c === 'dues') {
    let n = 0;
    others.forEach(i => { const g = GOODS.slice().sort((x, y) => (G.pl[i].res[y] || 0) - (G.pl[i].res[x] || 0))[0]; if (G.pl[i].res[g] > 0) { G.pl[i].res[g]--; P.res[g]++; n++; } });
    say(N + ' and collected ' + n + ' goods.');
  }
  if (c === 'dealer' || c === 'turn' || c === 'plot' || c === 'snoop') {
    if (!fgTargets(p, c).includes(a.p)) return false;
    const T = G.pl[a.p];
    if (c === 'dealer') say(N + ' and took ' + takeRandom(a.p, p, 2) + ' cards from ' + T.name + '.');
    if (c === 'plot') { G.gd[strongest(a.p, true)].a = 0; say(N + ': one of ' + T.name + "'s knights goes to rest."); }
    if (c === 'snoop') { const k = rnd(T.cards.length), x = T.cards.splice(k, 1)[0]; P.cards.push({c: x.c, n: G.tn}); say(N + ' and took a progress card from ' + T.name + '.'); }
    if (c === 'turn') {
      const e = strongest(a.p, false), g = G.gd[e]; delete G.gd[e];
      const to = VERT.map((_, x) => x).filter(x => knightSpot(p, x))[0];
      if (to != null && guardCount(p) < MAXGUARDS) { G.gd[to] = {p, s: g.s, a: g.a}; say(N + ': one of ' + T.name + "'s knights came over to their side!"); }
      else say(N + ': one of ' + T.name + "'s knights deserted (with nowhere to stand, they left the island).");
    }
  }
  if (c === 'market') { if (!RES.includes(a.r)) return false; G.mkt = {p, r: a.r}; say(N + ': ' + RN[a.r] + ' trades 2 for 1 this turn.'); }
  if (c === 'fleet') { G.fleetT = p; say(N + ': every bank trade is 2 for 1 this turn.'); }
  if (c === 'levy') {
    if (!RES.includes(a.r)) return false;
    let n = 0; others.forEach(i => { const k = Math.min(2, G.pl[i].res[a.r]); G.pl[i].res[a.r] -= k; n += k; }); P.res[a.r] += n;
    say(N + ' and collected ' + n + ' ' + RN[a.r] + '.');
  }
  if (c === 'guild') {
    if (!GOODS.includes(a.r)) return false;
    let n = 0; others.forEach(i => { if (G.pl[i].res[a.r] > 0) { G.pl[i].res[a.r]--; n++; } }); P.res[a.r] += n;
    say(N + ' and collected ' + n + ' ' + RN[a.r] + '.');
  }
  if (c === 'magi') { G.phase = 'storm'; G.magi = true; say(N + ': the bandit is on the move.'); }
  if (c === 'fire') {
    const hit = others.filter(i => pubScore(i) >= pubScore(p));
    hit.forEach(i => { const n = Math.floor(handSize(i) / 2); for (let k = 0; k < n; k++) { const held = KINDS().flatMap(r => Array(G.pl[i].res[r] || 0).fill(r)); G.pl[i].res[held[rnd(held.length)]]--; } });
    say(N + (hit.length ? ': ' + hit.map(i => G.pl[i].name).join(' and ') + ' lose half their hand.' : ', but nobody had as many points.'));
  }
  if (c === 'rally') { const es = spots(p, 'activate'); es.forEach(e => { G.gd[e].a = 1; }); say(N + ': ' + es.length + (es.length > 1 ? ' knights are' : ' knight is') + ' now on duty.'); }
  if (c === 'feast') {
    let n = 0; others.filter(i => pubScore(i) > pubScore(p)).forEach(i => { n += takeRandom(i, p, 2); });
    say(N + ' and received ' + n + ' cards.');
  }
  return true;
}
// raid tie (Rick's rule): each tied player draws a card from the track of their choice. Computer players pick their
// highest track at once; people pick in phase 'tpick' (G.tpick = seats still to pick, G.tpNext = phase to go back to).
const bestTrack = i => Object.keys(TRACKS).sort((a, b) => imp(i, b) - imp(i, a))[0];
// --- Progress card limit (Forts and Knights; Rick, 2026-11-19) ---
// A player may keep at most PCMAX progress cards (point cards score at once and aren't kept). Someone who goes over
// when it isn't their turn must throw one away straight away: the game waits for them (G.cdisc = those seats;
// computer players throw away at once). On your own turn you may hold more, but must be back to PCMAX to end it.
const PCMAX = 4;
function cardToss(i, c) {
  const P = G.pl[i], k = P.cards.findIndex(x => x.c === c);
  if (k < 0 || !FGCARDS[c]) return false;
  P.cards.splice(k, 1); G.usedT[FGCARDS[c].tr].push(c);
  say(P.name + ' threw away a progress card (' + PCMAX + ' is the most you can keep).');
  return true;
}
const botToss = i => G.pl[i].cards.slice().sort((x, y) => (fgCan(i, y.c) ? 1 : 0) - (fgCan(i, x.c) ? 1 : 0))[0].c;      // (one it can't use now)
function cardLimit() {
  if (!G || !G.decks || G.phase === 'setup' || G.phase === 'over') { if (G) G.cdisc = null; return; }
  G.pl.forEach((P, i) => { if (i !== G.turn && P.bot) while (P.cards.length > PCMAX) cardToss(i, botToss(i)); });
  const w = G.pl.map((_, i) => i).filter(i => i !== G.turn && G.pl[i].cards.length > PCMAX);
  G.cdisc = w.length ? w : null;
}
function cardDiscard(i, c) {      // {t:'cdisc', c, p}: throw a card away when over the limit (out of turn, or before ending your turn)
  if (!G.decks || !G.pl[i] || G.pl[i].cards.length <= PCMAX) return false;
  return cardToss(i, c);
}
function tpickDo2(i, k) { if (!drawFG(i, k)) say('The ' + TRACKS[k].n + ' deck is empty.'); else say(G.pl[i].name + ' took a ' + TRACKS[k].n + ' card.'); }
function tpickDo(i, k) {
  if (G.phase !== 'tpick' || !G.tpick || !G.tpick.includes(i) || !TRACKS[k]) return false;
  tpickDo2(i, k);
  G.tpick = G.tpick.filter(q => q !== i);
  if (!G.tpick.length) { G.phase = G.tpNext || 'main'; G.tpick = null; }
  return true;
}
function tpickWho() {
  if (!G || G.phase !== 'tpick' || !G.tpick) return -1;
  if (NET.role) return G.tpick.includes(NET.seat) ? NET.seat : -1;
  const i = G.tpick.find(q => !G.pl[q].bot);
  return i == null ? -1 : i;
}
// a victim's pick ({t:'sack', v}, out of turn): when everyone has picked, the game goes back to the phase it was in
function sackPick(i, v) {
  if (G.phase !== 'sack' || !G.sack || !G.sack.includes(i) || !sackable(i).includes(v)) return false;
  sackFort(i, v); G.sack = G.sack.filter(q => q !== i);
  if (!G.sack.length) { G.phase = G.sackNext || 'main'; G.sack = null; if (G.raidfx) G.raidfx.w = false; }
  return true;
}

// ---------- Game state ----------
let G = null;        // the whole game (saved as JSON)
let MODE = null;     // what the player is placing: 'road' | 'town' | 'fort' | null
let VIEW = 0;        // whose hand is shown (last human to play)
let BOTT = null;     // timer for computer players
const BOTPACE = 1300;      // ms between a computer player's moves (was 700; slowed down on Rick's request, 2026-11-19)
let TGIVE = null;    // trade window: resource being given
const D3 = {on: false};   // the 3D board (see "3D board" near the end): on = it is showing instead of the flat map
let NET = {role: null};   // wifi game: role 'host' | 'guest', seat = which player this screen is

const rnd = n => Math.floor(Math.random() * n);
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pips = n => n ? 6 - Math.abs(7 - n) : 0;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

// ---------- Fair board (always on, Rick's request 2026-11-19) ----------
// Every new island is shuffled until it passes these checks (the counts below are "problems"; 0 = fair):
// lands: no two of the same kind side by side. Numbers: no 6/8 next to another 6/8, no number next to the same number,
// no 2 next to a 12, the four 6s and 8s on four different kinds of land, and every kind of land gets a fair share of
// dice dots (its lands average 2.5 to 4 dots). If nothing perfect turns up in time, the least-bad island is used.
const NEXTTO = HEX.map((_, i) => HEXN[i].filter(j => j > i));      // each pair of neighbouring hexes once
function landProblems(t) { let n = 0; t.forEach((x, i) => NEXTTO[i].forEach(j => { if (x === t[j] && x !== 'lair') n++; })); return n; }
function numProblems(hex) {
  let n = 0;
  hex.forEach((h, i) => NEXTTO[i].forEach(j => {
    const a = h.n, b = hex[j].n;
    if (a && b && (a === b || (pips(a) === 5 && pips(b) === 5) || (pips(a) === 1 && pips(b) === 1))) n += 3;
  }));
  const hot = hex.filter(h => pips(h.n) === 5).map(h => h.t);
  n += hot.length - new Set(hot).size;
  for (const r of RES) {
    const L = hex.filter(h => h.t === r), avg = L.reduce((s, h) => s + pips(h.n), 0) / L.length;
    if (avg < 2.5 || avg > 4) n++;
  }
  return n;
}
function dealIsland() {
  const kinds = [];
  for (const t in TILES) for (let i = 0; i < TILES[t]; i++) kinds.push(t);
  // lands: shuffle, then keep swapping two lands at random whenever that doesn't make things worse, until none match
  const lands = shuffle(kinds);
  let best = landProblems(lands);
  for (let k = 0; k < 4000 && best > 0; k++) {
    const i = rnd(lands.length), j = rnd(lands.length);
    [lands[i], lands[j]] = [lands[j], lands[i]];
    const s = landProblems(lands);
    if (s <= best) best = s; else [lands[i], lands[j]] = [lands[j], lands[i]];
  }
  let hex = null; best = 1e9;
  for (let k = 0; k < 30000 && best > 0; k++) {
    const nums = shuffle(NUMS.slice()), h = lands.map(t => ({t, n: t === 'lair' ? 0 : nums.pop()})), s = numProblems(h);
    if (s < best) { best = s; hex = h; }
  }
  return hex;
}

// fg: Forts and Guards mode (false = Classic)
// timer: seconds per turn (0 = no turn timer; see js/timer.js)
function newGame(cfg, fg, level, timer) {
  const hex = dealIsland();
  G = {
    ver: 1, id: Date.now() + '-' + rnd(1e6), hex, fg: !!fg, lvl: [0, 1, 2].includes(level) ? level : 1,
    timer: TIMES.includes(timer) ? timer : 0,
    st: {dice: Array(13).fill(0), tr: cfg.map(() => 0), got: cfg.map(() => 0), pts: [cfg.map(() => 0)]},      // end-of-game stats (js/stats.js)
    pl: cfg.map(c => ({name: c.name, bot: !!c.bot, res: {wood: 0, clay: 0, wool: 0, grain: 0, stone: 0}})),
    col: fixColors(cfg.map(c => c.c), cfg.length),      // each player's colour (picked in the new-game window or lobby)
    ports: makePorts(),
    b: {},            // buildings by corner: {p: player, l: 1 town | 2 fort}
    r: {},            // roads by edge: player
    turn: 0, phase: 'setup', su: {k: 0, step: 'town', v: -1},
    dice: null, win: -1, log: []
  };
  {        // the bandit (G.storm, starting in its lair) and the progress card deck
    const deck = [];
    for (const c in CARDS) for (let i = 0; i < CARDS[c].q; i++) deck.push(c);
    G.deck = shuffle(deck); G.storm = hex.findIndex(h => h.t === 'lair');
    G.tn = 0; G.played = false; G.free = 0; G.disc = {};
    G.pl.forEach(P => { P.cards = []; });
  }
  if (fg) { G.deck = []; G.decks = fgDecks(); G.usedT = {sci: [], trd: [], pol: []}; }      // track decks instead of Classic's deck
  if (fg) { G.fleet = 0; G.gd = {}; G.gdv = 1; G.sea = 0; G.raids = 0; G.castle = {}; G.pl.forEach(P => { GOODS.forEach(k => { P.res[k] = 0; }); P.imp = {sci: 0, trd: 0, pol: 0}; }); }
  MODE = null; VIEW = Math.max(0, G.pl.findIndex(p => !p.bot));
  say('A new island appears. Everyone places two towns, each with a road.');
  if (fg) say('Forts and Knights: raiders are out at sea. Hire knights and put them on duty to defend the island\'s forts. The bandit sleeps until the raiders first attack. Keep at most ' + PCMAX + ' progress cards.');
  if (G.pl.some(P => P.bot)) say('Computer players: ' + LEVELS[G.lvl] + '.');
  if (G.timer) { say('Turn timer: ' + timeName(G.timer) + ' a turn.'); clockCheck(); }
}

function say(t) { G.log.push(t); if (G.log.length > 40) G.log.shift(); G.said = (G.said || 0) + 1; }      // G.said counts lines ever said (sounds use it)
function setupOrder() { const a = G.pl.map((_, i) => i); return a.concat(a.slice().reverse()); }
// --- Awards: longest route and most Storm Callers played, 2 points each ---
const ROUTEMIN = 5, CALLMIN = 3, AWARD = 2;
// Longest unbroken chain of p's roads (no road used twice; another player's town, fort or knight cuts it:
// knights block roads since 2026-11-19, Rick's rule)
const cutsRoute = (p, v) => (G.b[v] && G.b[v].p !== p) || (guards()[v] && guards()[v].p !== p);
function roadLen(p) {
  let best = 0; const used = new Set();
  const walk = (v, len) => {
    best = Math.max(best, len);
    if (len && cutsRoute(p, v)) return;
    for (const e of VERT[v].e) {
      if (G.r[e] !== p || used.has(e)) continue;
      used.add(e); walk(EDGE[e].a === v ? EDGE[e].b : EDGE[e].a, len + 1); used.delete(e);
    }
  };
  for (const e in G.r) if (G.r[e] === p) { walk(EDGE[e].a, 0); walk(EDGE[e].b, 0); }
  return best;
}
// the roads (edges) of player p's longest unbroken route, for the gold shine on the board (same walk as roadLen)
function routeEdges(p) {
  let best = []; const used = [];
  const walk = v => {
    if (used.length > best.length) best = used.slice();
    if (used.length && cutsRoute(p, v)) return;
    for (const e of VERT[v].e) {
      if (G.r[e] !== p || used.includes(e)) continue;
      used.push(e); walk(EDGE[e].a === v ? EDGE[e].b : EDGE[e].a); used.pop();
    }
  };
  for (const e in G.r) if (G.r[e] === p) { walk(EDGE[e].a); walk(EDGE[e].b); }
  return best;
}
function callers(p) { return G.pl[p].kn || 0; }      // Storm Callers played
// Who should hold an award: the holder keeps it until someone has strictly more; nobody below the minimum
function holder(cur, val, min) {
  const n = G.pl.map((_, i) => val(i));
  if (cur != null && cur >= 0 && n[cur] < min) cur = -1;
  const top = Math.max(...n);
  if (top < min) return -1;
  if (cur >= 0 && n[cur] === top) return cur;
  const lead = n.map((x, i) => x === top ? i : -1).filter(i => i >= 0);
  return lead.length === 1 ? lead[0] : (cur >= 0 ? cur : -1);       // a tie for the lead changes nothing
}
function awards() {
  const lr = holder(G.lr, roadLen, ROUTEMIN), la = G.deck ? holder(G.la, callers, CALLMIN) : -1;
  if (lr !== (G.lr == null ? -1 : G.lr)) say(lr < 0 ? 'Nobody has the longest route now.' : 'Longest route goes to ' + G.pl[lr].name + ' (' + roadLen(lr) + ' roads): +' + AWARD + ' points.');
  if (la >= 0 && la !== G.la) say('Most Knights goes to ' + G.pl[la].name + ' (' + callers(la) + ' played): +' + AWARD + ' points.');
  G.lr = lr; G.la = la;
}
function pubScore(p) { let s = (G.lr === p ? AWARD : 0) + (G.la === p ? AWARD : 0) + (G.pl[p].hero || 0) + Object.values(G.banner || {}).filter(q => q === p).length * BANNERPTS + Object.values(G.castle || {}).filter(C => C.p === p).length * CASTLEPTS + (G.pl[p].vp || 0); for (const v in G.b) if (G.b[v].p === p) s += G.b[v].l + (G.b[v].u || 0); return s; }    // what everyone can see
function score(p) { return pubScore(p) + (G.pl[p].cards || []).filter(x => x.c === 'p').length; }      // plus secret Landmark cards
function autoDiscard(p, n) {
  const R = G.pl[p].res;
  for (let i = 0; i < n; i++) R[KINDS().slice().sort((a, b) => (R[b] || 0) - (R[a] || 0))[0]]--;
  say(G.pl[p].name + ' discarded ' + n + ' cards.');
}
function discard(p, res) {
  if (G.phase !== 'discard' || !G.disc || !G.disc[p] || !res) return false;
  const R = G.pl[p].res; let sum = 0;
  for (const r of KINDS()) { const k = res[r] || 0; if (!Number.isInteger(k) || k < 0 || k > (R[r] || 0)) return false; sum += k; }
  if (sum !== G.disc[p]) return false;
  KINDS().forEach(r => { R[r] -= res[r] || 0; });
  say(G.pl[p].name + ' discarded ' + sum + ' cards.');
  delete G.disc[p];
  if (!Object.keys(G.disc).length) G.phase = sevenPhase();
  return true;
}
// Progress cards can be played before rolling (Rick, 2026-11-19, both modes). If one sends the bandit off (or makes a
// castle pick), the turn goes back to the roll afterwards: G.back = 'roll' until the dice are rolled.
const backPhase = () => G.back || 'main';
// after a 7 (and any discards): move the bandit, unless it's still asleep (Forts and Knights, before the first raid)
function sevenPhase() {
  if (banditAwake()) return 'storm';
  say('The bandit sleeps in its lair until the raiders first attack.');
  return backPhase();
}
function cards(p) { return RES.reduce((s, r) => s + G.pl[p].res[r], 0); }
// --- Robbing (Classic) ---
// After moving the bandit, the mover picks who to rob among the other players with a town or fort on that
// land who hold cards (phase 'rob', G.rob = {opts}; skipped when only one could be robbed). Then the robbed
// player picks which card to hand over (phase 'give', G.rob = {by, from}). Computer players answer at once.
function robOpts(p, h) { return [...new Set(HEX[h].v.map(v => G.b[v] && G.b[v].p).filter(q => q != null && q !== p && handSize(q) > 0))]; }
function startGive(p, v) {
  G.rob = {by: p, from: v}; G.phase = 'give';
  say(G.pl[p].name + ' robbed ' + G.pl[v].name + '.');
  if (G.pl[v].bot) giveCard(v, botGive(v));
}
function giveCard(v, r) {
  if (G.phase !== 'give' || !G.rob || G.rob.from !== v || !KINDS().includes(r) || !(G.pl[v].res[r] >= 1)) return false;
  const T = G.pl[G.rob.by];
  G.pl[v].res[r]--; T.res[r] = (T.res[r] || 0) + 1;
  G.robfx = {n: (G.robfx ? G.robfx.n : 0) + 1, from: v, to: G.rob.by, r};      // the card flies from one player to the other (robFx)
  say(G.pl[v].name + ' handed ' + T.name + ' a card.');
  G.rob = null; G.phase = backPhase();
  return true;
}
function botGive(v) {      // which card a computer player gives up: the one it has most of (Easy: any)
  const R = G.pl[v].res, held = KINDS().filter(r => R[r] > 0);
  return lvl() === 0 ? held[rnd(held.length)] : held.sort((a, b) => R[b] - R[a])[0];
}
function botRob(p) {       // who a computer player robs: Easy anyone, Normal the biggest hand, Hard the leader
  const o = G.rob.opts, L = lvl();
  if (L === 0) return o[rnd(o.length)];
  return o.slice().sort((a, b) => (L === 2 ? (pubScore(b) - pubScore(a)) * 100 : 0) + cards(b) - cards(a))[0];
}
function roadCount(p) { let n = 0; for (const e in G.r) if (G.r[e] === p) n++; return n; }
function canPay(p, what) { const c = COST[what]; return Object.keys(c).every(r => G.pl[p].res[r] >= c[r]); }
function pay(p, what) { const c = COST[what]; for (const r in c) G.pl[p].res[r] -= c[r]; }

// ---------- Where can things go? ----------
function okTown(p, v, setup) {
  if (G.b[v] || VERT[v].n.some(n => G.b[n]) || guards()[v]) return false;      // (a knight's corner is taken too)
  return setup || VERT[v].e.some(e => G.r[e] === p);
}
function okRoad(p, e, setup) {
  if (e in G.r) return false;
  const ends = [EDGE[e].a, EDGE[e].b];
  if (setup) return ends.includes(G.su.v);
  // (another player's town, fort or knight on that corner blocks building on past it)
  return ends.some(v => G.b[v] ? G.b[v].p === p : cutsRoute(p, v) ? false : VERT[v].e.some(x => G.r[x] === p));
}
function okFort(p, v) { return !!G.b[v] && G.b[v].p === p && G.b[v].l === 1; }
function spots(p, what) {
  const setup = G.phase === 'setup';
  if (what === 'road') return roadCount(p) >= MAXROADS && !setup ? [] : EDGE.map((_, e) => e).filter(e => okRoad(p, e, setup));
  if (what === 'town') return VERT.map((_, v) => v).filter(v => okTown(p, v, setup));
  if (what === 'wall') return VERT.map((_, v) => v).filter(v => okWall(p, v));
  if (what === 'castle') return freeForts(p);
  if (what === 'sack') return sackable(p);
  if (what === 'keep') return VERT.map((_, v) => v).filter(v => okKeep(p, v));
  if (what === 'citadel') return VERT.map((_, v) => v).filter(v => okCitadel(p, v));
  if (what === 'upgrade') return spots(p, 'keep').filter(() => canPay(p, 'keep')).concat(spots(p, 'citadel').filter(() => canPay(p, 'citadel')));
  if (what === 'guard') return VERT.map((_, v) => v).filter(v => okGuard(p, v));      // (knights: corners, see knightSpot)
  if (what === 'train') return VERT.map((_, v) => v).filter(v => okTrain(p, v));
  if (what === 'activate') return VERT.map((_, v) => v).filter(v => okActivate(p, v));
  if (what === 'gchase') return VERT.map((_, v) => v).filter(v => okChase(p, v));
  if (what === 'kmove') return VERT.map((_, v) => v).filter(v => okMove(p, v));      // (knights that can move; where to: kmoveTo)
  return VERT.map((_, v) => v).filter(v => okFort(p, v));
}

// ---------- The one place the game changes ----------
// who = the player doing it (wifi: the sender's seat). Left out = whoever's turn it is.
function act(a, who) {
  const had = a && a.t === 'roll' && G ? G.pl.map((_, i) => handSize(i)) : null;      // hands before a roll (for the harvest stat)
  if (!act1(a, who)) return false;
  if (G.phase !== 'over' && G.phase !== 'setup') { awards(); if (G.phase === 'main') checkWin(G.turn); }
  cardLimit();
  stat(a, had);
  clockCheck();
  return true;
}
// --- Trading between players ---
// G.offer = {from, give, get, yes: [seats that accepted], no: [seats that said no], x: [seats the offerer turned down]}.
// The player whose turn it is offers; the others accept or decline (computer players at once). Nothing is
// swapped until the offerer picks one who accepted ({t:'confirm',p}, the tick) or turns them down ({t:'reject',p}, the cross).
// The offer closes when the trade is done, taken back, or nobody is left who might still trade.
function fmt(res) { return RES.filter(r => res[r]).map(r => res[r] + ' ' + RN[r]).join(' + '); }
function has(p, res) { return RES.every(r => G.pl[p].res[r] >= (res[r] || 0)); }
function cleanRes(o) {
  if (!o || typeof o !== 'object') return null;
  const out = {}; let n = 0;
  for (const r of RES) { const k = o[r] || 0; if (!Number.isInteger(k) || k < 0 || k > 30) return null; if (k) { out[r] = k; n += k; } }
  return n ? out : null;
}
function botLikes(i, o) {       // they must have spare cards, not lose out on count, and not help a near-winner
  const n = res => RES.reduce((s, r) => s + (res[r] || 0), 0), spare = RES.every(r => !o.get[r] || G.pl[i].res[r] > o.get[r]);
  if (lvl() === 0) return spare;                                                   // Easy: happy with any trade they can spare
  return spare && n(o.give) >= n(o.get) && pubScore(o.from) < winAt() - (lvl() === 2 ? 3 : 2);     // Hard: stops trading sooner with a leader
}
const lvl = () => G.lvl == null ? 1 : G.lvl;      // computer players' level: 0 Easy, 1 Normal, 2 Hard (older saves: Normal)
function offerFix(o) { o.yes = o.yes || []; o.x = o.x || []; return o; }       // older saves had no yes/x lists
// a player's answer so far: 'yes', 'no', 'x' (turned down by the offerer) or null (still thinking)
function offerState(o, p) { return o.yes.includes(p) ? 'yes' : o.no.includes(p) ? 'no' : o.x.includes(p) ? 'x' : null; }
function offerDone() {          // close the offer once nobody is left who could still trade
  const o = G.offer;
  if (!o.yes.length && G.pl.every((P, i) => i === o.from || offerState(o, i))) { G.offer = null; say('Nobody wanted that trade.'); }
}
function answer(p, t) {
  const o = G.offer && offerFix(G.offer);
  if (!o || G.phase !== 'main' || p === o.from || !G.pl[p] || offerState(o, p)) return false;
  if (t === 'accept') {
    if (!has(p, o.get)) return false;
    o.yes.push(p); say(G.pl[p].name + ' accepted the trade.');
  } else { o.no.push(p); say(G.pl[p].name + ' said no to the trade.'); }
  offerDone();
  return true;
}
// the offerer's tick (swap with p) or cross (turn p down)
function settle(p, ok) {
  const o = G.offer && offerFix(G.offer);
  if (!o || !Number.isInteger(p) || !o.yes.includes(p)) return false;
  if (ok) {
    if (!has(p, o.get) || !has(o.from, o.give)) return false;
    RES.forEach(r => { const a = o.give[r] || 0, b = o.get[r] || 0; G.pl[o.from].res[r] += b - a; G.pl[p].res[r] += a - b; });
    say(G.pl[o.from].name + ' gave ' + fmt(o.give) + ' to ' + G.pl[p].name + ' for ' + fmt(o.get) + '.');
    G.offer = null; return true;
  }
  o.yes.splice(o.yes.indexOf(p), 1); o.x.push(p);
  say(G.pl[o.from].name + ' turned down ' + G.pl[p].name + '.');
  offerDone();
  return true;
}
function act1(a, who) {
  if (!G || G.phase === 'over' || !a) return false;
  if (a.t === 'discard') return discard(who == null ? a.p : who, a.res);
  if (a.t === 'accept' || a.t === 'decline') return answer(who == null ? a.p : who, a.t);
  if (a.t === 'give') return giveCard(who == null ? (G.rob && G.rob.from) : who, a.r);
  if (a.t === 'sack') return sackPick(who == null ? a.p : who, a.v);
  if (a.t === 'tpick') return tpickDo(who == null ? a.p : who, a.k);
  if (a.t === 'spick') return sciPick(who == null ? a.p : who, a.r);      // Science bonus pick (any time, out of turn too)
  if (a.t === 'cdisc') return cardDiscard(who == null ? a.p : who, a.c);  // throwing away a progress card over the limit
  const p = G.turn, P = G.pl[p];
  if (who != null && who !== p) return false;
  if (G.cdisc && G.cdisc.length) return false;      // (waiting for someone to throw away a progress card)
  if (G.phase === 'setup') {
    if (a.t === 'town' && G.su.step === 'town' && okTown(p, a.v, true)) {
      // only the second town (the way back round, G.su.k >= players) gives its lands' resources (Rick's rule, 2026-11-18);
      // in Forts and Guards that second one is a fort (Rick's rule, 2026-11-18)
      const second = G.su.k >= G.pl.length, fort = second && !!G.fg;
      G.b[a.v] = {p, l: fort ? 2 : 1}; G.su.v = a.v; G.su.step = 'road';
      // (Forts and Knights: the starting fort also gives its lands' goods, as a fort does on a roll; Rick, 2026-11-19)
      if (second) VERT[a.v].h.forEach(h => { const t = G.hex[h].t; if (t === 'lair') return; P.res[t]++; if (fort && GOODSOF[t]) P.res[GOODSOF[t]] = (P.res[GOODSOF[t]] || 0) + 1; });
      say(P.name + ' founded a ' + (fort ? 'fort' : 'town') + (second ? ' and collected its first resources.' : '.'));
      return true;
    }
    if (a.t === 'road' && G.su.step === 'road' && okRoad(p, a.e, true)) {
      G.r[a.e] = p; G.su.k++; G.su.step = 'town'; G.su.v = -1;
      const ord = setupOrder();
      if (G.su.k >= ord.length) { G.phase = 'roll'; G.turn = 0; say('The island is settled. First turn: ' + G.pl[0].name + '.'); }
      else G.turn = ord[G.su.k];
      return true;
    }
    return false;
  }
  if (a.t === 'roll' && G.phase === 'roll') {
    const d = G.fix || [1 + rnd(6), 1 + rnd(6)], sum = d[0] + d[1];      // (G.fix: chosen with a Stargazer card)
    G.fix = null; G.back = null;
    G.dice = d; G.rolls = (G.rolls || 0) + 1;
    if (sum === 7) {      // big hands discard half, then the roller moves the bandit
      say(P.name + ' rolled 7.' + (banditAwake() ? ' The bandit is on the move!' : ''));
      G.disc = {};
      G.pl.forEach((Q, i) => {
        const n = handSize(i);
        if (n > handMax(i)) { if (Q.bot) autoDiscard(i, Math.floor(n / 2)); else G.disc[i] = Math.floor(n / 2); }
      });
      G.phase = Object.keys(G.disc).length ? 'discard' : sevenPhase();
      if (G.fg) seaDie();
      return true;
    }
    const got = G.pl.map(() => ({}));
    G.hex.forEach((h, i) => {
      if (h.n !== sum || i === G.storm) return;
      HEX[i].v.forEach(v => {
        const b = G.b[v]; if (!b) return;
        const k = G.fg && b.l === 2 && GOODSOF[h.t], n = b.l - (k ? 1 : 0);      // Forts and Guards: a fort makes 1 resource + 1 goods
        G.pl[b.p].res[h.t] += n; got[b.p][h.t] = (got[b.p][h.t] || 0) + n;
        if (k) { G.pl[b.p].res[k] = (G.pl[b.p].res[k] || 0) + 1; got[b.p][k] = (got[b.p][k] || 0) + 1; }
      });
    });
    const parts = got.map((g, i) => Object.keys(g).length ? G.pl[i].name + ' ' + Object.keys(g).map(r => '+' + g[r] + ' ' + RN[r]).join(' ') : '').filter(Boolean);
    say(P.name + ' rolled ' + sum + '. ' + (parts.length ? parts.join(', ') + '.' : 'Nobody got anything.'));
    G.phase = 'main';
    // Science level 3: anyone who got nothing picks a free resource (computers at once; people whenever they like, see sciWho)
    G.pl.forEach((Q, i) => {
      if (!perk(i, 'sci') || Object.keys(got[i]).length) return;
      say(Q.name + "'s Science pays off: nothing came their way, so they pick a free resource.");
      G.spick = G.spick || {}; G.spick[i] = (G.spick[i] || 0) + 1;
      if (Q.bot) sciPick(i, RES.slice().sort((x, y) => Q.res[x] - Q.res[y])[0]);
    });
    if (G.fg) seaDie();
    return true;
  }
  if (a.t === 'storm' && G.phase === 'storm' && Number.isInteger(a.h) && G.hex[a.h] && a.h !== G.storm) {
    // a Guard chases the bandit off: every screen sees G.chase.n go up and plays the knight animation (chaseFx)
    if (G.guard) { G.chase = {n: (G.chase ? G.chase.n : 0) + 1, from: G.storm, to: a.h, p}; G.guard = false; }
    G.storm = a.h; G.phase = backPhase();
    if (G.magi) {      // Magistrate card: a random card from every other player on that land, instead of robbing one
      G.magi = false;
      say(P.name + ' sent the bandit to the ' + landName(G.hex[a.h].t) + (G.hex[a.h].n ? ' (' + G.hex[a.h].n + ').' : '.'));
      const vs = robOpts(p, a.h);
      vs.forEach(i => takeRandom(i, p, 1));
      say(vs.length ? P.name + ' took a card from ' + vs.map(i => G.pl[i].name).join(' and ') + '.' : 'Nobody there to take from.');
      return true;
    }
    say(P.name + ' sent the bandit ' + (G.hex[a.h].t === 'lair' ? 'back to' : 'to') + ' the ' + landName(G.hex[a.h].t) + (G.hex[a.h].n ? ' (' + G.hex[a.h].n + ').' : '.'));
    // robbing: the mover picks one of the players with a town or fort on that land (and cards in hand)
    const opts = robOpts(p, a.h);
    if (opts.length === 1) startGive(p, opts[0]);
    else if (opts.length > 1) { G.phase = 'rob'; G.rob = {opts}; }
    return true;
  }
  if (a.t === 'rob' && G.phase === 'rob' && G.rob && G.rob.opts.includes(a.p)) { startGive(p, a.p); return true; }
  if (a.t === 'card' && G.decks && FGCARDS[a.c]) {      // a Forts and Knights progress card (see playFG)
    // (no limit per turn in Forts and Knights, Rick 2026-11-19; G.played only counts for Classic)
    const k = P.cards.findIndex(x => x.c === a.c && x.n < G.tn), before = G.phase === 'roll';       // not one drawn this turn
    if (k < 0 || !fgCan(p, a.c) || !playFG(p, a)) return false;
    P.cards.splice(k, 1); G.usedT[FGCARDS[a.c].tr].push(a.c);
    if (before && G.phase !== 'roll') G.back = 'roll';      // (it moved the bandit or asked for a castle: come back to the roll)
    return true;
  }
  if (a.t === 'castle' && G.phase === 'castle' && G.cpick && freeForts(p).includes(a.v)) {      // picking the fort for a castle
    const k = G.cpick; G.cpick = null; G.phase = backPhase();
    placeCastle(p, k, a.v); castleCheck(p);
    return checkWin(p);
  }
  if (a.t === 'card' && G.deck && CARDS[a.c] && G.phase === 'roll') return classicCard(p, a);      // (before rolling)
  if (G.phase !== 'main') return false;
  if (a.t === 'offer' && !G.offer) {
    const give = cleanRes(a.give), get = cleanRes(a.get);
    if (!give || !get || !has(p, give) || RES.some(r => give[r] && get[r])) return false;
    G.offer = {from: p, give, get, yes: [], no: [], x: []};
    say(P.name + ' offers ' + fmt(give) + ' for ' + fmt(get) + '.');
    // computer players answer straight away
    G.pl.forEach((Q, i) => { if (i !== p && Q.bot && G.offer) answer(i, has(i, get) && botLikes(i, G.offer) ? 'accept' : 'decline'); });
    return true;
  }
  if ((a.t === 'confirm' || a.t === 'reject') && G.offer) return settle(a.p, a.t === 'confirm');
  if (a.t === 'cancel' && G.offer) { G.offer = null; say(P.name + ' took the offer back.'); return true; }
  if (G.offer) return false;        /* nothing else until the offer is answered or taken back */
  if (a.t === 'road' && (G.free > 0 || canPay(p, 'road')) && roadCount(p) < MAXROADS && okRoad(p, a.e, false)) {
    if (G.free > 0) G.free--; else pay(p, 'road');
    G.r[a.e] = p; say(P.name + ' built a road.'); return true;
  }
  if (a.t === 'buy' && G.deck && (G.deck.length || (G.used || []).length) && canPay(p, 'card')) {
    pay(p, 'card'); P.cards.push({c: drawCard(), n: G.tn}); say(P.name + ' bought a progress card.'); return checkWin(p);
  }
  if (a.t === 'card' && G.deck && CARDS[a.c]) return classicCard(p, a);
  if (a.t === 'town' && canPay(p, 'town') && okTown(p, a.v, false)) {
    pay(p, 'town'); G.b[a.v] = {p, l: 1}; say(P.name + ' built a town.'); return checkWin(p);
  }
  return mainRest(p, a);
}
// Classic progress cards: one per turn, in the main phase or before rolling (Rick, 2026-11-19)
function classicCard(p, a) {
  const P = G.pl[p];
  if (G.played || a.c === 'p' || !(G.phase === 'main' || G.phase === 'roll') || G.offer) return false;
  {
    const k = P.cards.findIndex(x => x.c === a.c && x.n < G.tn);       // not one bought this turn
    if (k < 0) return false;
    if (a.c === 'h' && !(RES.includes(a.r1) && RES.includes(a.r2))) return false;
    if (a.c === 'm' && !RES.includes(a.r)) return false;
    P.cards.splice(k, 1); G.played = true;
    if (G.fg) (G.used = G.used || []).push(a.c);      // Forts and Knights: played cards can come round again (see drawCard)
    if (a.c === 'k') { if (G.phase === 'roll') G.back = 'roll'; G.phase = 'storm'; G.guard = true; P.kn = (P.kn || 0) + 1; say(P.name + ' played a Knight.'); }
    if (a.c === 'r') { G.free = 2; say(P.name + ' played Road Building: 2 free roads.'); }
    if (a.c === 'h') { P.res[a.r1]++; P.res[a.r2]++; say(P.name + ' played Year of Plenty: ' + RN[a.r1] + ' and ' + RN[a.r2] + '.'); }
    if (a.c === 'm') {
      let n = 0;
      G.pl.forEach((Q, i) => { if (i !== p) { n += Q.res[a.r]; Q.res[a.r] = 0; } });
      P.res[a.r] += n; say(P.name + ' played a Tribute and took ' + n + ' ' + RN[a.r] + ' from the others.');
    }
    return true;
  }
}
// the rest of the main-phase moves (split from act1 when Classic cards moved out, 2026-11-19)
function mainRest(p, a) {
  const P = G.pl[p];
  if (a.t === 'fort' && canPay(p, 'fort') && okFort(p, a.v)) {
    pay(p, 'fort'); G.b[a.v].l = 2; say(P.name + ' raised a fort.'); castleCheck(p); return checkWin(p);      // (a waiting castle claim can use the new fort)
  }
  if (a.t === 'wall' && canPay(p, 'wall') && okWall(p, a.v)) {
    pay(p, 'wall'); G.b[a.v].w = 1; say(P.name + ' built a wall.'); return true;
  }
  // knights: a.v = the corner (since 2026-11-19)
  if (a.t === 'guard' && canPay(p, 'guard') && okGuard(p, a.v)) {
    pay(p, 'guard'); G.gd[a.v] = {p, s: 1, a: 0}; G.gdv = 1; say(P.name + ' hired a knight.'); return true;
  }
  if (a.t === 'activate' && canPay(p, 'activate') && okActivate(p, a.v)) {
    pay(p, 'activate'); G.gd[a.v].a = 1; say(P.name + ' fed a knight and put them on duty.'); return true;
  }
  if (a.t === 'gchase' && okChase(p, a.v)) {      // an active guard chases the bandit (same as a Knight card, without the card), then rests
    G.gd[a.v].a = 0; G.phase = 'storm'; G.guard = true; say(P.name + "'s knight went after the bandit."); return true;
  }
  if (a.t === 'kmove' && kmoveTo(p, a.v).includes(+a.to)) {      // walk a knight on duty along your roads; it rests afterwards
    const g = G.gd[a.v]; delete G.gd[a.v]; g.a = 0; G.gd[a.to] = g;
    say(P.name + ' moved a knight (it rests now).'); return true;
  }
  if (a.t === 'train' && canPay(p, 'train') && okTrain(p, a.v)) {
    pay(p, 'train'); G.gd[a.v].s++; say(P.name + (G.gd[a.v].s === 3 ? ' trained a mighty knight!' : ' trained a knight.')); return true;
  }
  if (a.t === 'improve' && canImprove(p, a.k)) {      // up one level in a track: costs (new level) of its goods
    const k = a.k, lv = imp(p, k) + 1;
    P.res[TRACKS[k].g] -= impCost(p, k); P.mason = false; P.imp = P.imp || {}; P.imp[k] = lv;
    say(P.name + ' raised ' + TRACKS[k].n + ' to level ' + lv + '.');
    castleCheck(p);
    return checkWin(p);
  }
  if (a.t === 'keep' && canPay(p, 'keep') && okKeep(p, a.v)) {
    pay(p, 'keep'); G.b[a.v].u = 1; say(P.name + ' upgraded a fort to a Keep.'); return checkWin(p);
  }
  if (a.t === 'citadel' && canPay(p, 'citadel') && okCitadel(p, a.v)) {
    pay(p, 'citadel'); G.b[a.v].u = 2; say(P.name + ' raised a Citadel!'); return checkWin(p);
  }
  // bank and port trades. Forts and Knights (Rick, 2026-11-19): goods can be given (4 for 1, 3 at an 'any' port, 2 with Trade
  // level 3) and any trade can get goods too, e.g. 2 Wood at a Wood port for 1 Cloth
  if (a.t === 'trade' && KINDS().includes(a.give) && a.give !== a.get && (RES.includes(a.get) || (G.fg && GOODS.includes(a.get))) && (P.res[a.give] || 0) >= rate(p, a.give)) {
    const n = rate(p, a.give), o = n < BANK && usedPort(p, a.give, n);
    P.res[a.give] -= n; P.res[a.get] = (P.res[a.get] || 0) + 1; say(P.name + ' traded ' + n + ' ' + RN[a.give] + ' for 1 ' + RN[a.get] + (o ? ' at the port.' : '.'));
    // a port trade sends a boat (every screen sees G.ship.n go up and plays it: see shipFx)
    if (o) G.ship = {n: (G.ship ? G.ship.n : 0) + 1, e: o.e, p, give: a.give, get: a.get, k: n};
    return true;
  }
  if (a.t === 'end') {
    if (G.decks && P.cards.length > PCMAX) {      // must be back down to the limit first (computer players just throw extras away)
      if (!P.bot) return false;
      while (P.cards.length > PCMAX) cardToss(p, botToss(p));
    }
    G.turn = (G.turn + 1) % G.pl.length; G.phase = 'roll';
    if (G.deck) { G.tn++; G.played = false; G.free = 0; }
    G.mkt = null; G.fleetT = null;      // Market Day / Trade Fleet last one turn
    return true;
  }
  return false;
}
function checkWin(p) {
  if (score(p) >= winAt()) { G.phase = 'over'; G.win = p; say(G.pl[p].name + ' reached ' + winAt() + ' points and won the game!'); }
  return true;
}

// Is it this screen's turn? (wifi game: my seat; same-screen game: any human)
function myTurn() { return !!G && G.phase !== 'over' && !G.boot && (NET.role ? G.turn === NET.seat : !G.pl[G.turn].bot); }

const OUTOFTURN = ['discard', 'accept', 'decline', 'give', 'sack', 'tpick', 'spick', 'cdisc'];     // moves a player can make when it isn't their turn
// Do a move, then save and redraw. A wifi guest sends the move to the host instead.
function go(a) {
  if (G && G.boot) return false;      // (online: still waiting for everyone's island to load, see online.js)
  if (NET.role === 'guest') {
    if (!(myTurn() || OUTOFTURN.includes(a.t)) || !NET.conn || !NET.conn.open) return false;
    NET.conn.send({t: 'act', a});
    if (a.t !== 'trade') MODE = a.t === 'road' && G.free > 1 ? 'road' : null;
    return true;
  }
  if (!act(a, NET.role && OUTOFTURN.includes(a.t) ? NET.seat : undefined)) return false;
  if (a.t !== 'trade') MODE = a.t === 'road' && G.free > 0 ? 'road' : null;     /* free roads: keep placing */
  save(); render();
  return true;
}

