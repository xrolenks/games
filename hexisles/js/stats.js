'use strict';
// Hex Isles - End-of-game stats (Rick's request, 2026-11-19), shown in the win window (#w-stats).
// Collected during the game in G.st (made by newGame; older saves have none and only get the points table):
// dice = how often each total 2-12 was rolled, tr = trades per player (bank + player trades), got = cards each
// player harvested from rolls, pts = everyone's score after each turn (for the graph).
function stat(a, had) {
  const S = G && G.st;
  if (!S) return;
  if (a.t === 'roll' && G.dice) {
    S.dice[G.dice[0] + G.dice[1]]++;
    G.pl.forEach((_, i) => { const d = handSize(i) - had[i]; if (d > 0) S.got[i] += d; });
  }
  if (a.t === 'trade') S.tr[G.turn]++;
  if (a.t === 'confirm') { S.tr[G.turn]++; S.tr[a.p]++; }
  if (a.t === 'end' || (G.phase === 'over' && !S.done)) {
    S.pts.push(G.pl.map((_, i) => score(i)));
    if (G.phase === 'over') S.done = true;
  }
}
// where player p's points came from: [[label, points], ...] (adds up to score(p))
function pointsOf(p) {
  const P = G.pl[p], out = [];
  let towns = 0, forts = 0, up = 0;
  for (const v in G.b) if (G.b[v].p === p) { if (G.b[v].l === 2) forts++; else towns++; up += G.b[v].u || 0; }
  out.push(['Towns', towns], ['Forts', forts * 2]);
  out.push(['Progress cards', (P.cards || []).filter(x => x.c === 'p').length + (P.vp || 0)]);
  out.push(['Longest route', G.lr === p ? AWARD : 0]);
  if (!G.fg) out.push(['Most Knights', G.la === p ? AWARD : 0]);
  if (G.fg) {
    out.push(['Castles', Object.values(G.castle || {}).filter(C => C.p === p).length * CASTLEPTS]);
    out.push(['Raid defender', P.hero || 0]);
  }
  const old = up + Object.values(G.banner || {}).filter(q => q === p).length * BANNERPTS;      // older saves only
  if (old) out.push(['Other', old]);
  return out;
}
function fillStats() {
  const S = G.st, n = G.pl.length, order = G.pl.map((_, i) => i).sort((a, b) => score(b) - score(a));
  const dot = i => '<i class="dot" style="background:' + PCOL[i] + '"></i>';
  // points table: one row per player, one column per kind of points
  const cols = pointsOf(0).map(x => x[0]);
  let h = '<h3>Where the points came from</h3><div class="wscroll"><table class="wst"><tr><th></th>' + cols.map(c => '<th>' + c + '</th>').join('') + '<th>Total</th></tr>';
  order.forEach(i => {
    h += '<tr' + (i === G.win ? ' class="win"' : '') + '><td>' + dot(i) + esc(G.pl[i].name) + '</td>' + pointsOf(i).map(x => '<td' + (x[1] ? '' : ' class="z"') + '>' + x[1] + '</td>').join('') + '<td><b>' + score(i) + '</b></td></tr>';
  });
  h += '</table></div>';
  if (S) {
    // cards harvested and trades
    h += '<h3>Cards and trades</h3><div class="wscroll"><table class="wst"><tr><th></th><th>Cards harvested</th><th>Trades</th></tr>' +
      order.map(i => '<tr><td>' + dot(i) + esc(G.pl[i].name) + '</td><td>' + S.got[i] + '</td><td>' + S.tr[i] + '</td></tr>').join('') + '</table></div>';
    // dice rolls: a bar per total, with a tick for how often it "should" come up
    const rolls = S.dice.reduce((s, x) => s + x, 0), top = Math.max(1, ...S.dice, ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(t => rolls * (6 - Math.abs(7 - t)) / 36));
    h += '<h3>Dice rolls <small>(' + rolls + ' rolls; the line is what luck alone would give)</small></h3><div class="wdice">';
    for (let t = 2; t <= 12; t++) {
      const fair = rolls * (6 - Math.abs(7 - t)) / 36;
      h += '<div title="' + t + ' was rolled ' + S.dice[t] + ' times (about ' + fair.toFixed(1) + ' expected)"><span class="bar' + (t === 7 ? ' seven' : '') + '" style="height:' + (S.dice[t] / top * 100) + '%"><em>' + (S.dice[t] || '') + '</em></span><span class="fair" style="bottom:calc(16px + (100% - 16px) * ' + (fair / top).toFixed(3) + ')"></span><b>' + t + '</b></div>';
    }
    h += '</div>';
    // points over time: a line per player
    const P = S.pts, W = 300, H = 120, most = Math.max(winAt(), ...P.flat()), xs = k => (P.length < 2 ? 0 : k / (P.length - 1) * W), ys = v => H - v / most * H;
    h += '<h3>Points over the game</h3><svg class="wgraph" viewBox="-14 -6 ' + (W + 20) + ' ' + (H + 20) + '" aria-label="Points after each turn">' +
      '<line x1="0" x2="' + W + '" y1="' + ys(winAt()) + '" y2="' + ys(winAt()) + '" class="goal"/><text x="-4" y="' + (ys(winAt()) + 3) + '">' + winAt() + '</text><text x="-4" y="' + (H + 3) + '">0</text>' +
      G.pl.map((_, i) => '<polyline fill="none" stroke="' + PCOL[i] + '" stroke-width="' + (i === G.win ? 3 : 2) + '" stroke-linejoin="round" points="' + P.map((r, k) => xs(k).toFixed(1) + ',' + ys(r[i] || 0).toFixed(1)).join(' ') + '"/>').join('') + '</svg>';
  }
  $('w-stats').innerHTML = h;
}
