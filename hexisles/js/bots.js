'use strict';
// Hex Isles - Computer players: what they build, trade, rob and play.
// ---------- Computer players ----------
function vScore(v, p) {
  let s = 0; const kinds = new Set();
  VERT[v].h.forEach(h => { const x = G.hex[h]; s += pips(x.n); if (x.n) kinds.add(x.t); });
  kinds.forEach(k => { s += p != null && !ownsLand(p, k) ? 1.5 : .5; });
  if (portAt(v)) s += 1.5;
  return s;
}
function ownsLand(p, t) { for (const v in G.b) if (G.b[v].p === p && VERT[v].h.some(h => G.hex[h].t === t)) return true; return false; }
function openSpot(v) { return !G.b[v] && !VERT[v].n.some(n => G.b[n]); }
// How good is the corner v as a place to head for? (best open spot nearby, less for each step away)
function reach(v, p) {
  const dist = {[v]: 0}, q = [v]; let best = -99;
  while (q.length) {
    const c = q.shift();
    if (openSpot(c)) best = Math.max(best, vScore(c, p) - 3 * dist[c]);
    if (dist[c] < 4) VERT[c].n.forEach(n => { if (!(n in dist) && !(G.b[n] && G.b[n].p !== p)) { dist[n] = dist[c] + 1; q.push(n); } });
  }
  return best;
}
function mine(v, p) { return (G.b[v] && G.b[v].p === p) || VERT[v].e.some(e => G.r[e] === p); }
function bestRoad(p, list, setup) {
  let best = null, bs = -1e9;
  list.forEach(e => {
    [EDGE[e].a, EDGE[e].b].forEach(v => {
      if (setup ? v === G.su.v : mine(v, p)) return;
      const s = reach(v, p) + Math.random() * (lvl() === 0 ? 6 : 1);      // Easy wanders more
      if (s > bs) { bs = s; best = e; }
    });
  });
  return best == null ? list[0] : best;
}
// the best spot in a list (Easy adds a lot of chance, so it often settles for a worse one)
function bestOf(list, p) { const k = list.map(v => [v, vScore(v, p) + (lvl() === 0 ? Math.random() * 5 : 0)]); return k.sort((a, b) => b[1] - a[1])[0][0]; }
// Hard: the road that makes p's longest route longest, if building it gets p within one road of the award (or wins it)
function routeRoad(p, roads) {
  if (G.lr === p || !canPay(p, 'road') || roadCount(p) >= MAXROADS) return null;
  const others = Math.max(0, ...G.pl.map((_, i) => i === p ? 0 : roadLen(i))), target = Math.max(ROUTEMIN, others + 1);
  let best = null, bl = roadLen(p);
  roads.forEach(e => { G.r[e] = p; const l = roadLen(p); delete G.r[e]; if (l > bl) { bl = l; best = e; } });
  return best != null && bl >= 3 && bl + 1 >= target ? best : null;
}
function botMain(p) {
  const P = G.pl[p], L = lvl(), forts = spots(p, 'fort'), towns = spots(p, 'town'), roads = spots(p, 'road');
  if (L === 0 && G.free === 0 && Math.random() < .5) return null;      // Easy: sometimes just ends the turn
  if (G.decks && !G.played && (L > 0 || Math.random() < .5)) {               // Forts and Knights cards: play one that helps now
    const ready = [...new Set(P.cards.filter(x => x.n < G.tn).map(x => x.c))].filter(c => fgCan(p, c));
    const top = c => fgTargets(p, c).sort((x, y) => pubScore(y) - pubScore(x))[0];
    const others = r => G.pl.reduce((s, Q, i) => s + (i === p ? 0 : Q.res[r] || 0), 0);
    for (const c of ready) {
      if (['canal', 'mine', 'dues', 'rally', 'armour', 'wallb', 'healer', 'feast'].includes(c)) return {t: 'card', c};
      if (c === 'survey' && roads.length) return {t: 'card', c};
      if (c === 'fire' && G.pl.some((_, i) => i !== p && pubScore(i) >= pubScore(p) && handSize(i) > 3)) return {t: 'card', c};
      if (c === 'magi' && G.storm != null && HEX[G.storm].v.some(v => G.b[v] && G.b[v].p === p)) return {t: 'card', c};
      if (c === 'mason' && Object.keys(TRACKS).some(k => okImprove(p, k) && (P.res[TRACKS[k].g] || 0) >= imp(p, k))) return {t: 'card', c};
      if (FGCARDS[c].need === 'player') return {t: 'card', c, p: top(c)};
      if (c === 'levy') { const r = RES.slice().sort((x, y) => others(y) - others(x))[0]; if (others(r) >= 2) return {t: 'card', c, r}; }
      if (c === 'guild') { const r = GOODS.slice().sort((x, y) => others(y) - others(x))[0]; if (others(r) >= 1) return {t: 'card', c, r}; }
    }
  }
  if (G.deck && !G.played && (L > 0 || Math.random() < .5)) {               // play a progress card if one is ready
    const can = c => P.cards.some(x => x.c === c && x.n < G.tn);
    const others = r => G.pl.reduce((s, Q, i) => s + (i === p ? 0 : Q.res[r]), 0);
    const low = RES.slice().sort((x, y) => P.res[x] - P.res[y]), rich = L === 0 ? RES[rnd(5)] : RES.slice().sort((x, y) => others(y) - others(x))[0];
    if (can('k')) return {t: 'card', c: 'k'};
    if (can('r') && roads.length && roadCount(p) <= MAXROADS - 2) return {t: 'card', c: 'r'};
    if (can('h')) return {t: 'card', c: 'h', r1: low[0], r2: low[1]};
    if (can('m') && (L === 0 || others(rich) >= 3)) return {t: 'card', c: 'm', r: rich};
  }
  if (G.free > 0 && roads.length) return {t: 'road', e: L === 2 ? routeRoad(p, roads) ?? bestRoad(p, roads, false) : bestRoad(p, roads, false)};
  if (G.fg && (L > 0 || Math.random() < .4)) {      // Forts and Guards: get ready for the raiders
    const myForts = Object.keys(G.b).filter(v => G.b[v].p === p && G.b[v].l === 2), near = (G.fleet || 0) >= FLEETMAX - 3;
    const short = fortCount() > islandDefence(), weak = myForts.length && defence(p) <= Math.min(...G.pl.map((_, i) => defence(i)));
    // the bandit sits on one of its lands: send a guard on duty after it, unless the island needs every guard for a raid soon
    const hit = G.storm != null && HEX[G.storm].v.some(v => G.b[v] && G.b[v].p === p), ch = spots(p, 'gchase');
    if (hit && ch.length && !(near && short)) return {t: 'gchase', v: ch[0]};      // (knights: corners)
    // (a knight must stand by the bandit's land to chase it: walk one there, if a spare Grain can wake it up again)
    if (hit && !ch.length && banditAwake() && !(near && short) && (P.res.grain || 0) >= 1 && G.botMoved !== G.rolls) {
      for (const v of spots(p, 'kmove')) {
        const to = kmoveTo(p, v).find(x => VERT[x].h.includes(G.storm));
        if (to != null) { G.botMoved = G.rolls; return {t: 'kmove', v, to}; }
      }
    }
    if (hit && spots(p, 'activate').some(v => VERT[v].h.includes(G.storm)) && canPay(p, 'activate')) return {t: 'activate', v: spots(p, 'activate').find(v => VERT[v].h.includes(G.storm))};
    if (myForts.length && (short || defence(p) < myForts.length || (near && weak))) {
      const act = spots(p, 'activate'), hire = spots(p, 'guard'), train = spots(p, 'train');
      if (act.length && canPay(p, 'activate')) return {t: 'activate', v: act[0]};      // a resting guard is cheaper to use than a new one
      if (hire.length && canPay(p, 'guard')) return {t: 'guard', v: hire.sort((a, b) => okTown(p, a) - okTown(p, b))[0]};      // (keep good town spots free)
      if (train.length && canPay(p, 'train')) return {t: 'train', v: train.sort((x, y) => G.gd[x].s - G.gd[y].s)[0]};      // (strength 1s before mighty ones)
    }
    // a wall when the hand is near the discard limit (walls raise it by 2)
    if (handSize(p) >= handMax(p) - 1 && canPay(p, 'wall')) {
      const w = myForts.find(v => !G.b[v].w);
      if (w != null) return {t: 'wall', v: +w};
    }
    // improve a track when it can (cheapest first); Easy only sometimes
    const tr = Object.keys(TRACKS).filter(k => canImprove(p, k)).sort((a, b) => imp(p, a) - imp(p, b));
    if (tr.length && (L > 0 || Math.random() < .5)) return {t: 'improve', k: tr[0]};
    // goods it can't use (its track is maxed out, or it has no fort): sell them to the bank (4 for 1, or 2 with Trade level 3)
    const spare = Object.keys(TRACKS).map(k => TRACKS[k].g).find(g => {
      const k = Object.keys(TRACKS).find(x => TRACKS[x].g === g);
      return (P.res[g] || 0) >= rate(p, g) && (!okImprove(p, k) || P.res[g] > TRACKMAX + 1);
    });
    if (spare) return {t: 'trade', give: spare, get: RES.slice().sort((x, y) => P.res[x] - P.res[y])[0]};
  }
  if (forts.length && canPay(p, 'fort')) return {t: 'fort', v: bestOf(forts)};
  if (towns.length && canPay(p, 'town')) return {t: 'town', v: bestOf(towns, p)};
  if (L === 2 && roads.length) { const e = routeRoad(p, roads); if (e != null) return {t: 'road', e}; }      // Hard: race for the longest route
  const room = VERT.some((_, v) => openSpot(v));
  let goal = towns.length ? 'town' : roads.length && room ? 'road' : forts.length ? 'fort' : null;
  // Hard: save up for a fort once it holds some of the stone and grain for one
  if (L === 2 && forts.length && P.res.stone >= 2 && P.res.grain >= 1) goal = 'fort';
  if (goal) {
    if (goal === 'road' && canPay(p, 'road')) return {t: 'road', e: bestRoad(p, roads, false)};
    const need = COST[goal], miss = RES.filter(r => P.res[r] < (need[r] || 0));
    // Hard: first ask the other players for a 1-for-1 swap (once per turn)
    if (L === 2 && miss.length && G.offered !== G.rolls) {
      const spare = RES.filter(r => !miss.includes(r) && P.res[r] - (need[r] || 0) >= 1).sort((x, y) => P.res[y] - P.res[x])[0];
      if (spare) { G.offered = G.rolls; return {t: 'offer', give: {[spare]: 1}, get: {[miss[0]]: 1}}; }
    }
    const give = RES.find(r => P.res[r] - (need[r] || 0) >= rate(p, r));
    if (miss.length && give && (L > 0 || Math.random() < .25)) return {t: 'trade', give, get: miss[0]};      // Easy rarely trades
  }
  // nothing better to do (or the hand is getting big): buy a progress card
  if (G.deck && (G.deck.length || (G.used || []).length) && canPay(p, 'card') && (!goal || cards(p) > 5)) return {t: 'buy'};
  return null;
}
// Where a computer player puts the bandit: the land that hurts the others most and itself least.
// Easy mostly picks at random; Hard aims at whoever is ahead.
function botStorm(p) {
  let best = -1, bs = -1e9;
  const L = lvl();
  G.hex.forEach((h, i) => {
    if (i === G.storm) return;
    let s = Math.random() * (L === 0 ? 12 : 1);
    HEX[i].v.forEach(v => { const b = G.b[v]; if (b) s += (b.p === p ? -2 : 1) * b.l * pips(h.n) * (L === 2 && b.p !== p ? 1 + pubScore(b.p) / 3 : 1); });
    if (s > bs) { bs = s; best = i; }
  });
  return best;
}
function botStep() {
  BOTT = null;
  if (!G || G.phase === 'over' || !G.pl[G.turn].bot) return;
  if (G.cdisc) return;      // (waiting for a person to throw away a progress card)
  if (G.boot) return;       // (online: waiting for everyone's island; the host re-renders, and so restarts this, when it's over)
  const p = G.turn, P = G.pl[p];
  if (G.offer && G.offer.from === p) {      // a bot's own trade offer: take the first yes, or wait a bit for people, then take it back
    const o = offerFix(G.offer);
    if (o.yes.length) { go({t: 'confirm', p: o.yes[0]}); return; }
    o.w = (o.w || 0) + 1;
    if (o.w < 12) { BOTT = setTimeout(botStep, 700); return; }
    go({t: 'cancel'}); return;
  }
  let a;
  if (G.phase === 'setup') a = G.su.step === 'town' ? {t: 'town', v: bestOf(spots(p, 'town'), p)} : {t: 'road', e: bestRoad(p, spots(p, 'road'), true)};
  else if (G.phase === 'discard') return;            /* waiting for humans to discard */
  else if (G.phase === 'sack') return;               /* waiting for raid victims to pick a fort */
  else if (G.phase === 'tpick') return;              /* waiting for tied defenders to pick a track */
  else if (G.phase === 'storm') a = {t: 'storm', h: botStorm(p)};
  else if (G.phase === 'rob') a = {t: 'rob', p: botRob(p)};
  else if (G.phase === 'castle') a = {t: 'castle', v: freeForts(p).sort((x, y) => vScore(y) - vScore(x))[0]};
  else if (G.phase === 'give') return;              /* waiting for the robbed person to pick a card */
  else if (G.phase === 'roll') a = {t: 'roll'};
  else a = botMain(p) || {t: 'end'};
  if (!go(a)) go({t: 'end'});
}

