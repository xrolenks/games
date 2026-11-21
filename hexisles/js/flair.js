'use strict';
// Hex Isles - visual flair (Rick's requests, 2026-11-19). Rick's rule: decoration is for the 3D island; the flat map stays
// simple for players who want speed. So dust, sparkles and weather only run in 3D; the "+N" chips and the award banner
// (they tell you something) show in both.
// - dustFx: a puff of dust when a piece lands (keys from noteDrops in draw2d.js; 3D only)
// - harvestPop: "+N" chips rising from every town/fort that collects on a roll, and sparkles over the lands that paid
// - awardFx: a banner when Longest route or Most Knights changes hands; its badge then flies to the new holder's panel
// - weatherFx: every few turns (about 1 turn in 3, the same on every screen: worked out from the game id and turn),
//   a rain shower followed by a rainbow, or clouds drifting over with their shadows
// (The gold shine along the longest route and the see-through preview under the pointer are drawn by draw2d.js and
// board3d.js.) All of it is just for show: nothing here changes the game.

// where board point (x, y) shows on the screen, in page pixels (3D: h = the height above the sea)
function boardPt(x, y, h) {
  if (D3.on) return D3.screen(x, h == null ? TOP : h, y);
  const svg = $('board'), m = svg.getScreenCTM && svg.getScreenCTM();
  if (!m) return null;
  const p = svg.createSVGPoint(); p.x = x; p.y = y;
  const q = p.matrixTransform(m); return [q.x, q.y];
}
function inView(P) {
  if (!P) return false;
  const R = $('view').getBoundingClientRect();
  return P[0] > R.left && P[0] < R.right && P[1] > R.top && P[1] < R.bottom;
}
const fxEl = (cls, html) => { const d = document.createElement('div'); d.className = cls; if (html) d.innerHTML = html; document.body.appendChild(d); return d; };

// --- dust when a piece lands ---
function dustAt(x, y, big) {
  const P = boardPt(x, y);
  if (!inView(P)) return;
  const box = fxEl('dust'); box.style.left = P[0] + 'px'; box.style.top = P[1] + 'px';
  const n = big ? 11 : 8, R = big ? 36 : 26;
  for (let k = 0; k < n; k++) {
    const s = document.createElement('i'), a = k / n * Math.PI * 2 + Math.random() * .5, d = R * (.7 + Math.random() * .5), w = (big ? 13 : 10) * (.8 + Math.random() * .4);
    s.style.width = s.style.height = w + 'px';
    box.appendChild(s);
    s.animate([
      {transform: 'translate(-50%,-50%) scale(.4)', opacity: .95},
      {transform: 'translate(calc(-50% + ' + (Math.cos(a) * d).toFixed(1) + 'px), calc(-50% + ' + (Math.sin(a) * d * .45 - 8).toFixed(1) + 'px)) scale(1.7)', opacity: 0}
    ], {duration: 650 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards'});
  }
  setTimeout(() => box.remove(), 1100);
}
// keys that just changed on the board ('b' + corner, 'r'/'g' + edge, 'w' + corner): puff when the piece lands
function dustFx(keys) {
  if (!D3.on || keys.length > 8) return;      // (3D only: the flat map stays simple; a whole new board arriving at once: no puffs)
  keys.forEach(k => {
    const t = k[0], n = +k.slice(1);
    if (!'brgw'.includes(t) || !Number.isInteger(n)) return;
    const [x, y] = t === 'r' ? edgeMid(n) : [VERT[n].x, VERT[n].y];      // (knights 'g' stand on corners too)
    setTimeout(() => { if (G) dustAt(x, y, t === 'b' || t === 'w'); }, DROPMS * .68);      // as it hits the ground
  });
}

// --- harvest: "+N" chips over each collecting building, sparkles over the paying lands ---
function harvestPop(hs) {
  const at = {};      // corner -> [{r, n}]
  hs.forEach(i => {
    const t = G.hex[i].t;
    HEX[i].v.forEach(v => {
      const b = G.b[v]; if (!b) return;
      const g = G.fg && b.l === 2 && GOODSOF[t];
      (at[v] = at[v] || []).push({r: t, n: b.l - (g ? 1 : 0)});
      if (g) at[v].push({r: g, n: 1});
    });
    // sparkles: little gold stars twinkling up over the land (3D only)
    for (let k = 0; k < (D3.on ? 9 : 0); k++) {
      const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 32, P = boardPt(HEX[i].x + Math.cos(a) * d, HEX[i].y + Math.sin(a) * d * .8, TOP + 4);
      if (!inView(P)) continue;
      const s = fxEl('spk', '✦'); s.style.left = P[0] + 'px'; s.style.top = P[1] + 'px';
      s.animate([{transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 0}, {transform: 'translate(-50%,-90%) scale(1.2) rotate(90deg)', opacity: 1, offset: .35},
        {transform: 'translate(-50%,-220%) scale(.3) rotate(200deg)', opacity: 0}], {duration: 1100, delay: k * 70, easing: 'ease-out', fill: 'both'});
      setTimeout(() => s.remove(), 1300 + k * 70);
    }
  });
  Object.keys(at).forEach(v => {
    const P = boardPt(VERT[v].x, VERT[v].y, TOP + 18);
    if (!inView(P)) return;
    at[v].forEach((c, k) => {
      const d = fxEl('hpop', ico(c.r) + '<b>+' + c.n + '</b>');
      d.style.cssText = 'left:' + P[0] + 'px;top:' + P[1] + 'px;--a:' + COL[c.r][0];
      d.animate([{transform: 'translate(-50%,-20%) scale(.4)', opacity: 0}, {transform: 'translate(-50%,-110%) scale(1.1)', opacity: 1, offset: .2},
        {transform: 'translate(-50%,-160%) scale(1)', opacity: 1, offset: .75}, {transform: 'translate(-50%,-210%) scale(.9)', opacity: 0}],
        {duration: 1600, delay: k * 180, easing: 'ease-out', fill: 'both'});
      setTimeout(() => d.remove(), 1900 + k * 180);
    });
  });
}

// --- the bandit blocks a land (Rick, 2026-11-20): a red "Blocked" chip rises over it (both maps; see harvestFx) ---
function blockPop(i) {
  const P = boardPt(HEX[i].x, HEX[i].y, TOP + 30);
  if (!inView(P)) return;
  const d = fxEl('hpop blk', ico(G.hex[i].t) + '<b>Blocked</b>');
  d.style.cssText = 'left:' + P[0] + 'px;top:' + P[1] + 'px;--a:#ff5a4a';
  d.animate([{transform: 'translate(-50%,-20%) scale(.4)', opacity: 0}, {transform: 'translate(-50%,-110%) scale(1.15)', opacity: 1, offset: .15},
    {transform: 'translate(-50%,-140%) scale(1)', opacity: 1, offset: .75}, {transform: 'translate(-50%,-180%) scale(.9)', opacity: 0}],
    {duration: 1800, easing: 'ease-out', fill: 'both'}).onfinish = () => d.remove();
  setTimeout(() => d.remove(), 2100);
}

// --- a track building taken from someone (Rick, 2026-11-20): G.takefx from placeCastle (rules.js) ---
// Every screen plays it when its counter changes (never on load): a banner at the top, the building at the old fort
// sinks away (draw2d.js piece / board3d.js takeStep, timed by TAKE), its badge flies over to the new owner's fort, and
// the new one grows up there.
let SEENTAKE = null;
function takeFx() {
  const f = G.takefx, now = {id: G.id, n: f ? f.n : 0}, was = SEENTAKE;
  SEENTAKE = now;
  if (!was || was.id !== now.id || now.n === was.n || !f || !G.pl[f.p] || !G.pl[f.fp] || !VERT[f.from] || !VERT[f.to]) return;
  TAKE = {k: f.k, from: f.from, fp: f.fp, to: f.to, p: f.p, t: Date.now(), id: G.id};
  delete FELL['b' + f.from]; delete FELL['b' + f.to];      // (no ordinary drop: the takeover shows the change)
  drawBoard();
  const d = fxEl('awardpop', '<div class="aic">' + AWICON.castle(f.k, false) + '</div><div><b>' + TRACKBLD[f.k] + ' taken!</b><small>' + esc(G.pl[f.p].name) + ' took it from ' + esc(G.pl[f.fp].name) + ' (' + TRACKS[f.k].n + ' level ' + TRACKMAX + ')</small></div>');
  d.style.setProperty('--c', PCOL[f.p]); d.style.top = '16%';
  d.animate([{opacity: 0, transform: 'translate(-50%,-50%) scale(.5)'}, {opacity: 1, transform: 'translate(-50%,-50%) scale(1.06)', offset: .06},
    {opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .1}, {opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .85},
    {opacity: 0, transform: 'translate(-50%,-50%) scale(.96)'}], {duration: TAKEMS, easing: 'ease-out', fill: 'both'}).onfinish = () => d.remove();
  setTimeout(() => d.remove(), TAKEMS + 300);
  if (D3.on) { setTimeout(() => { if (G) dustAt(VERT[f.from].x, VERT[f.from].y, true); }, TAKEMS * .2); setTimeout(() => { if (G) dustAt(VERT[f.to].x, VERT[f.to].y, true); }, TAKEMS * .66); }
  // the badge flies from the old fort to the new one in an arc
  setTimeout(() => {
    const A = boardPt(VERT[f.from].x, VERT[f.from].y, TOP + 20), B = boardPt(VERT[f.to].x, VERT[f.to].y, TOP + 20);
    if (!A || !B) return;
    const b = fxEl('awfly', AWICON.castle(f.k, false)), up = Math.min(A[1], B[1]) - 110;
    b.style.setProperty('--accent', TRACKS[f.k].c);
    b.animate([{transform: 'translate(' + A[0] + 'px,' + A[1] + 'px) translate(-50%,-50%) scale(.5)', opacity: 0}, {transform: 'translate(' + A[0] + 'px,' + (A[1] - 30) + 'px) translate(-50%,-50%) scale(1)', opacity: 1, offset: .15},
      {transform: 'translate(' + (A[0] + B[0]) / 2 + 'px,' + up + 'px) translate(-50%,-50%) scale(1.15) rotate(12deg)', offset: .55},
      {transform: 'translate(' + B[0] + 'px,' + B[1] + 'px) translate(-50%,-50%) scale(.6)', opacity: .9}], {duration: TAKEMS * .35, easing: 'ease-in-out', fill: 'both'}).onfinish = () => b.remove();
    setTimeout(() => b.remove(), TAKEMS * .4);
  }, TAKEMS * .3);
  setTimeout(() => { if (G) render(); }, TAKEMS + 60);      // (afterwards: the board as it is now)
}

// --- award banner ---
let SEENAW = null, AWBUSY = 0;
function awardFx() {
  const now = {id: G.id, lr: G.lr == null ? -1 : G.lr, la: G.la == null ? -1 : G.la};
  const was = SEENAW; SEENAW = now;
  if (!was || was.id !== now.id) return;      // (never on load or a new game)
  [['lr', 'route', 'Longest route'], ['la', 'army', 'Most Knights']].forEach(([k, ic, name]) => {
    if (now[k] < 0 || now[k] === was[k]) return;
    const wait = Math.max(0, AWBUSY - Date.now());
    AWBUSY = Date.now() + wait + 2600;
    setTimeout(() => awardPop(now[k], ic, name, was[k]), wait);
  });
}
function awardPop(p, ic, name, from) {
  if (!G || !G.pl[p]) return;
  const P = G.pl[p];
  const d = fxEl('awardpop', '<div class="aic">' + AWICON[ic] + '</div><div><b>' + name + '!</b><small>' + esc(P.name) + (from >= 0 && G.pl[from] ? ' takes it from ' + esc(G.pl[from].name) : ' claims it') + ': +' + AWARD + ' points</small></div>');
  d.style.setProperty('--c', PCOL[p]);
  d.animate([{opacity: 0, transform: 'translate(-50%,-50%) scale(.5)'}, {opacity: 1, transform: 'translate(-50%,-50%) scale(1.08)', offset: .1},
    {opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .18}, {opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .8},
    {opacity: 0, transform: 'translate(-50%,-50%) scale(.96)'}], {duration: 2400, easing: 'ease-out', fill: 'both'});
  // the badge flies from the banner to the new holder's panel, which gives a little bounce
  setTimeout(() => {
    const A = d.querySelector('.aic').getBoundingClientRect(), to = document.querySelector('#players .pl:nth-child(' + (p + 1) + ')');
    if (to && A.width) {
      const B = to.getBoundingClientRect(), f = fxEl('awfly', AWICON[ic]);
      d.querySelector('.aic').style.visibility = 'hidden';      // (the badge leaves the banner)
      const x0 = A.left + A.width / 2, y0 = A.top + A.height / 2, x1 = B.right - 20, y1 = B.top + B.height / 2;
      f.animate([{transform: 'translate(' + x0 + 'px,' + y0 + 'px) translate(-50%,-50%) scale(1)'}, {transform: 'translate(' + (x0 + x1) / 2 + 'px,' + (Math.min(y0, y1) - 60) + 'px) translate(-50%,-50%) scale(.8)', offset: .5},
        {transform: 'translate(' + x1 + 'px,' + y1 + 'px) translate(-50%,-50%) scale(.45)', opacity: .9}], {duration: 750, easing: 'ease-in-out', fill: 'both'}).onfinish = () => {
        f.remove(); to.animate([{transform: 'scale(1)'}, {transform: 'scale(1.06)', boxShadow: '0 0 18px ' + PCOL[p]}, {transform: 'scale(1)'}], {duration: 380});
      };
      setTimeout(() => f.remove(), 1000);
    }
  }, 1500);
  setTimeout(() => d.remove(), 2500);
}

// --- the winner's celebration (Rick, 2026-11-20) ---
// When a game is won (never on load): a big "<name> won!" banner with a trophy in the winner's colour, and on the 3D
// island fireworks while the camera circles it (D3.party). The win window waits until it's over (WINUNTIL, dice.js).
let SEENWIN = null, WINUNTIL = 0;
const WINMS = 7000, WINMS2D = 3200;      // (the flat map stays simple: just the banner)
function winFx() {
  const now = {id: G.id, over: G.phase === 'over'};
  const was = SEENWIN; SEENWIN = now;
  if (!was || was.id !== now.id || was.over || !now.over || !G.pl[G.win]) return;
  const p = G.win, P = G.pl[p], ms = D3.on ? WINMS : WINMS2D;
  WINUNTIL = Date.now() + ms;
  if (D3.on && D3.party) D3.party(p);
  const old = $('winpop'); if (old) old.remove();
  const d = fxEl('', '<svg viewBox="' + CARDART.p.vb + '">' + CARDART.p.svg(PCOL[p]) + '</svg><div>' + esc(P.name) + ' won!</div><small>' + score(p) + ' points</small>');
  d.id = 'winpop'; d.style.setProperty('--c', PCOL[p]);
  d.animate([
    {opacity: 0, transform: 'translate(-50%,-50%) scale(.4)'},
    {opacity: 1, transform: 'translate(-50%,-50%) scale(1.12)', offset: .07},
    {opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .12},
    {opacity: 1, transform: 'translate(-50%,-50%) scale(1.03)', offset: .5},
    {opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .88},
    {opacity: 0, transform: 'translate(-50%,-70%) scale(.95)'}
  ], {duration: ms, easing: 'ease-in-out', fill: 'both'}).onfinish = () => d.remove();
  setTimeout(() => d.remove(), ms + 300);      // (in case the finish event never comes: hidden tab)
}

// --- weather, every few turns ---
const hash01 = s => { let h = 2166136261; for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };
let SEENWX = null, WXEND = 0;
function weatherFx() {
  const now = {id: G.id, tn: G.tn || 0};
  const was = SEENWX; SEENWX = now;
  if (!was || was.id !== now.id || now.tn === was.tn || G.phase === 'over' || G.tut || !D3.on) return;      // (3D only)
  if (Date.now() < WXEND || hash01(G.id + ':' + now.tn) > .32) return;      // about 1 turn in 3
  clouds();      // (rain and the rainbow are off for now, Rick 2026-11-20; was: 55% rain(), else clouds())
}
function wxLayer() {
  let L = $('wx');
  if (!L) { L = document.createElement('div'); L.id = 'wx'; $('view').appendChild(L); }
  return L;
}
// a shower: the light dims, rain streaks fall for a few seconds, then a rainbow shows and fades
function rain() {
  const L = wxLayer(), W = L.clientWidth, H = L.clientHeight, MS = 7000;
  if (!W || !H) return;
  WXEND = Date.now() + MS + 6000;
  const tint = document.createElement('div'); tint.className = 'wxtint'; L.appendChild(tint);
  tint.animate([{opacity: 0}, {opacity: 1, offset: .15}, {opacity: 1, offset: .8}, {opacity: 0}], {duration: MS, fill: 'both'}).onfinish = () => tint.remove();
  const c = document.createElement('canvas'); c.width = W; c.height = H; c.className = 'wxrain'; L.appendChild(c);
  const x = c.getContext('2d'), drops = Array.from({length: Math.round(W * H / 2600)}, () => ({x: Math.random() * W * 1.2, y: Math.random() * H, v: 9 + Math.random() * 7, l: 10 + Math.random() * 12}));
  const t0 = performance.now();
  (function step(t) {
    const p = (t - t0) / MS;
    if (p >= 1 || !c.isConnected) { c.remove(); return; }
    const a = Math.min(1, p * 6, (1 - p) * 5);
    x.clearRect(0, 0, W, H); x.strokeStyle = 'rgba(215,232,255,' + (.75 * a).toFixed(3) + ')'; x.lineWidth = 1.6; x.beginPath();
    drops.forEach(d => { d.y += d.v; d.x -= d.v * .25; if (d.y > H) { d.y = -d.l; d.x = Math.random() * W * 1.2; } x.moveTo(d.x, d.y); x.lineTo(d.x + d.l * .25, d.y - d.l); });
    x.stroke();
    requestAnimationFrame(step);
  })(t0);
  setTimeout(rainbow, MS - 1500);
}
function rainbow() {
  const L = wxLayer(), d = document.createElement('div');
  d.className = 'wxbow';
  d.innerHTML = '<svg viewBox="0 0 200 100" preserveAspectRatio="none">' + ['#ff4d4d', '#ff9a3c', '#ffe066', '#5fd36b', '#4aa8ff', '#6c63ff', '#b066ff'].map((c, k) =>
    '<path d="M' + (8 + k * 4) + ' 100A' + (92 - k * 4) + ' ' + (92 - k * 4) + ' 0 0 1 ' + (192 - k * 4) + ' 100" fill="none" stroke="' + c + '" stroke-width="4.2"/>').join('') + '</svg>';
  L.appendChild(d);
  d.animate([{opacity: 0}, {opacity: .4, offset: .2}, {opacity: .4, offset: .75}, {opacity: 0}], {duration: 6000, fill: 'both'}).onfinish = () => d.remove();
}
// clouds: a few drift across the island, each with its shadow sliding over the land below it
const CLOUD = '<svg viewBox="0 0 120 60"><path d="M18 50a14 14 0 0 1 2-28a20 20 0 0 1 36-12a18 18 0 0 1 32 6a16 16 0 0 1 14 34z" fill="#fff"/><path d="M18 50h84a16 16 0 0 0 4-10q-40 10-90 4z" fill="#dfe8f2"/></svg>';
function clouds() {
  // (2026-11-19, Rick: these flat clouds didn't look right over the 3D island; real 3D clouds with shadows instead)
  if (D3.on && D3.clouds) { WXEND = Date.now() + 22000; D3.clouds(18000); return; }
  const L = wxLayer(), W = L.clientWidth, H = L.clientHeight;
  if (!W || !H) return;
  const n = 2 + Math.floor(Math.random() * 2), MS = 18000;
  WXEND = Date.now() + MS + 4000;
  for (let k = 0; k < n; k++) {
    const y = H * (.08 + Math.random() * .4), s = .8 + Math.random() * .6, w = 150 * s, delay = k * 2600 + Math.random() * 1500, dur = MS - k * 1500;
    const sh = document.createElement('div'); sh.className = 'wxshade'; sh.style.cssText = 'width:' + w * 1.1 + 'px;height:' + w * .45 + 'px;top:' + (y + 120 * s) + 'px';
    const c = document.createElement('div'); c.className = 'wxcloud'; c.style.cssText = 'width:' + w + 'px;top:' + y + 'px'; c.innerHTML = CLOUD;
    L.appendChild(sh); L.appendChild(c);
    [c, sh].forEach(el => el.animate([{transform: 'translateX(' + -w * 1.3 + 'px)', opacity: 0}, {opacity: 1, offset: .1}, {opacity: 1, offset: .9}, {transform: 'translateX(' + (W + w * .3) + 'px)', opacity: 0}],
      {duration: dur, delay, easing: 'linear', fill: 'both'}).onfinish = () => el.remove());
  }
}
