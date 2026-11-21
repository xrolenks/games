'use strict';
// Hex Isles - Drawing the flat (2D) map as SVG, plus the board effects: harvest cards, trade boat, knight chase, robbing card.
// ---------- Drawing ----------
const $ = id => document.getElementById(id);
function corners(h, k) { return h.v.map(v => (h.x + (VERT[v].x - h.x) * k).toFixed(1) + ',' + (h.y + (VERT[v].y - h.y) * k).toFixed(1)).join(' '); }
// A sheep standing on 0,0 facing right, about 20 units wide: legs, a fleece of overlapping puffs (outlined,
// shaded underneath), a dark face with ears and an eye. Used as the Wool picture and (smaller) in pastures.
const FLEECE = [[-4, -7, 3.6], [0, -8.4, 4], [4, -7, 3.6], [-5.6, -3.8, 3.2], [-1.6, -4, 3.6], [2.6, -4, 3.4]];
const SHEEP = '<g fill="#3a3030"><rect x="-5" y="-2" width="2" height="6" rx=".8"/><rect x="-1.5" y="-2" width="2" height="6.4" rx=".8"/><rect x="2" y="-2" width="2" height="6" rx=".8"/><rect x="4.6" y="-2" width="2" height="6.2" rx=".8"/></g>' +
  '<g fill="#5b524c">' + FLEECE.map(([x, y, r]) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r + .9) + '"/>').join('') + '</g>' +
  '<g fill="#f7f4ec">' + FLEECE.map(([x, y, r]) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"/>').join('') + '</g>' +
  '<path d="M-8.4-3.4q8.4 4.6 15 0" fill="none" stroke="#d6cfc1" stroke-width="2.2" stroke-linecap="round"/>' +
  '<circle cx="-2" cy="-9.6" r="1.6" fill="#fff"/>' +
  '<ellipse cx="8.4" cy="-6.6" rx="2.9" ry="3.6" fill="#3a3030"/><ellipse cx="6.4" cy="-9" rx="2.2" ry="1" fill="#3a3030" transform="rotate(-25 6.4 -9)"/><circle cx="9.3" cy="-7.4" r=".75" fill="#fff"/>';
// Small picture for each resource, drawn around 0,0 (about 20 units wide)
function glyph(t) {
  switch (t) {
    case 'wood': return '<rect x="-1.5" y="2" width="3" height="8" fill="#5a3819"/><circle cx="-4.5" cy="1" r="4.8" fill="#14502a"/><circle cx="4.5" cy="1" r="4.8" fill="#0f3f21"/><circle cx="0" cy="-4" r="6" fill="#1c6a37"/><circle cx="-2" cy="-6" r="3" fill="#3f9a5a"/>';
    case 'clay': return '<g stroke="#4e230f" stroke-width="1"><rect x="-9" y="1" width="8.5" height="5.5" fill="#d27d50"/><rect x=".5" y="1" width="8.5" height="5.5" fill="#b9633a"/><rect x="-4.2" y="-5.5" width="8.5" height="5.5" fill="#ec9c6f"/></g><path d="M-3.5-4.5h7" stroke="#ffd0b0" stroke-width="1" opacity=".8"/>';
    case 'wool': return '<g transform="translate(-.6 4)">' + SHEEP + '</g>';      // a fluffy sheep, centred
    case 'grain': return '<g stroke="#8a6412" stroke-width="1.2" fill="none"><path d="M0 10V-2M0 10L-5 0M0 10L5 0"/></g><g fill="#ffe27a" stroke="#8a6412" stroke-width=".8"><ellipse cx="0" cy="-6" rx="2.4" ry="5"/><ellipse cx="-6" cy="-3" rx="2.2" ry="4.5" transform="rotate(-25 -6 -3)"/><ellipse cx="6" cy="-3" rx="2.2" ry="4.5" transform="rotate(25 6 -3)"/></g><path d="M-3 7h6" stroke="#c0392b" stroke-width="1.6"/>';
    case 'stone': return '<polygon points="-10,8 -1,-9 3,8" fill="#e6e9ef"/><polygon points="-1,-9 10,8 3,8" fill="#8891a1"/><polygon points="-10,8 -1,-9 10,8" fill="none" stroke="#3d4350" stroke-width="1" stroke-linejoin="round"/><polygon points="-3.6,-4 -1,-9 2,-4.4 -.5,-2.6" fill="#fff"/>';
    default: return '<polygon points="-15,11 -5,-8 0,-8 2,11" fill="#4a3530"/><polygon points="0,-8 5,-8 15,11 2,11" fill="#231614"/><polygon points="-15,11 -5,-8 5,-8 15,11" fill="none" stroke="#120b09" stroke-width="1" stroke-linejoin="round"/><polygon points="-5,-8 5,-8 3,-1 0,-4 -3,0" fill="#ff5a2f"/><path d="M-1-4l-2 9M2-2l3 8" stroke="#ff8a3d" stroke-width="1.2" fill="none"/><circle cx="3" cy="-13" r="3" fill="#9aa3ab" opacity=".7"/><circle cx="7" cy="-18" r="2" fill="#9aa3ab" opacity=".5"/>';
  }
}
// Picture of a resource as a thing you hold (cards, trade buttons, port signs). The board keeps glyph():
// trees on Jungle, peaks on Cliffs. Here wood is a pile of cut logs and stone a chunk of rock.
function cardGlyph(t) {
  // Forts and Guards goods
  if (t === 'paper') {
    // a scroll of paper: the sheet with writing lines, rolled ends top and bottom, tied with a red ribbon
    return '<path d="M-7-7H7V7H-7Z" fill="#fbf4df" stroke="#7a6a44" stroke-width="1"/><path d="M-4.5-3.5h9M-4.5-.5h9M-4.5 2.5h6" stroke="#a89a74" stroke-width=".9"/>' +
      '<rect x="-9" y="-10" width="18" height="4" rx="2" fill="#e8dcb8" stroke="#7a6a44" stroke-width="1"/><rect x="-9" y="6" width="18" height="4" rx="2" fill="#e8dcb8" stroke="#7a6a44" stroke-width="1"/>' +
      '<path d="M5-8.5l2 4M5-8.5l-1 4.5" stroke="#c62828" stroke-width="1.3" stroke-linecap="round"/>';
  }
  if (t === 'cloth') {
    // a bolt of cloth: the roll seen from the side with a loose length draping down in front
    return '<path d="M-9-6H6V3H-9Z" fill="#4a7fc8" stroke="#1f3a66" stroke-width="1"/><path d="M-9-3h15M-9 0h15" stroke="#9ec2f0" stroke-width=".8"/>' +
      '<ellipse cx="6" cy="-1.5" rx="3" ry="4.5" fill="#3d6bb0" stroke="#1f3a66" stroke-width="1"/><ellipse cx="6" cy="-1.5" rx="1.4" ry="2.2" fill="none" stroke="#9ec2f0" stroke-width=".7"/>' +
      '<path d="M-9 3Q-6 9-1 8T6 3V8Q2 11-3 10.5T-9 8Z" fill="#7aa7e0" stroke="#1f3a66" stroke-width="1"/>';
  }
  if (t === 'coin') {
    // a little stack of gold coins with one standing coin in front
    const flat = y => '<ellipse cx="-2" cy="' + y + '" rx="7" ry="2.4" fill="#e0b13a" stroke="#6a4a0e" stroke-width=".9"/>';
    return flat(6) + flat(3.5) + flat(1) + flat(-1.5) +
      '<circle cx="4" cy="1" r="6" fill="#f2cf5b" stroke="#6a4a0e" stroke-width="1"/><circle cx="4" cy="1" r="4" fill="none" stroke="#c08a1e" stroke-width=".9"/><path d="M4-1.6v5.2M2.6-.6h2.8" stroke="#8a5f12" stroke-width="1.1"/>';
  }
  if (t === 'wood') {
    // one log on its side: bark body, a light streak, and the cut end with rings on the left
    const log = (x1, x2, y, r) => '<rect x="' + x1 + '" y="' + (y - r) + '" width="' + (x2 - x1) + '" height="' + 2 * r + '" rx="' + r + '" fill="#8a5524" stroke="#4a2c10" stroke-width=".8"/>' +
      '<path d="M' + (x1 + 3) + ' ' + (y - r * .35) + 'H' + (x2 - 2) + '" stroke="#b07636" stroke-width=".9" stroke-linecap="round"/>' +
      '<ellipse cx="' + x1 + '" cy="' + y + '" rx="' + r * .75 + '" ry="' + r + '" fill="#f0cf95" stroke="#4a2c10" stroke-width=".8"/>' +
      '<ellipse cx="' + x1 + '" cy="' + y + '" rx="' + r * .4 + '" ry="' + r * .55 + '" fill="none" stroke="#b88a4f" stroke-width=".7"/>' +
      '<circle cx="' + x1 + '" cy="' + y + '" r=".5" fill="#8a5524"/>';
    return log(-8, 9, 6.5, 2.8) + log(-6, 10, 1.2, 2.8) + log(-9, 6, -4.1, 2.8);
  }
  if (t === 'stone') {
    // a chunky boulder: lit top, mid front, shaded right side, a crack and a shine
    return '<polygon points="-8,-1 -3,-7 4,-8 2,-1 -3,1" fill="#d3d8e0"/>' +
      '<polygon points="4,-8 9,-2 10,6 4,9 2,-1" fill="#7a8292"/>' +
      '<polygon points="-10,7 -8,-1 -3,1 2,-1 4,9 -5,9" fill="#a3aab6"/>' +
      '<polygon points="-10,7 -8,-1 -3,-7 4,-8 9,-2 10,6 4,9 -5,9" fill="none" stroke="#3d4350" stroke-width="1" stroke-linejoin="round"/>' +
      '<path d="M-4 3l2 2-1 2.5M6 0l1.5 3" stroke="#5d6472" stroke-width=".9" fill="none" stroke-linecap="round"/>' +
      '<polygon points="-5,-3.5 -2.5,-6.3 1,-6.6 -2,-2.8" fill="#fff" opacity=".6"/>';
  }
  return glyph(t);
}
// Scenery scattered on a land tile (around the number disc), back row first: [x, y, size]
const SCENE = [[0, -34, .8], [-29, -19, .85], [29, -19, .85], [-30, 13, .85], [30, 13, .85], [-13, 31, .7], [13, 31, .7]];
// A Fields tile is one continuous wheat field: rows of stalks from back to front (front rows bigger and
// drawn over the ones behind, like looking across a real field), clipped to the tile, swaying in the wind.
function wheat(i) {
  const h = HEX[i], k = TILE - .02;
  const pts = h.v.map(v => ((VERT[v].x - h.x) * k).toFixed(1) + ',' + ((VERT[v].y - h.y) * k).toFixed(1)).join(' ');
  let s = i * 97 + 13;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;      // same field every time for this tile
  const f = n => n.toFixed(1);
  let out = '<clipPath id="wc' + i + '"><polygon points="' + pts + '"/></clipPath><g clip-path="url(#wc' + i + ')">';
  out += '<polygon points="' + pts + '" fill="#8a6219"/>';      /* the soil between the rows */
  let row = 0;
  // Each stalk: a thin stem, then a crisp ear (a pointed seed head with a dark outline, a lit centre line
  // and two fine whiskers). Clear shapes with outlines read sharply even when the board is small.
  for (let y = -S + 4; y <= S + 14; y += 7, row++) {
    const d = (y + S) / (2 * S), sc = .85 + .4 * d;      /* d: 0 at the back, 1 at the front */
    let stem = '', ear = '', lit = '', awn = '';
    for (let x = -S - 6 + r() * 4; x < S + 6; x += 4.9 * sc) {
      const bx = x + (r() - .5) * 1.6, tall = (9.5 + r() * 3) * sc, lean = (r() - .5) * 2.2, tx = bx + lean, ty = y - tall;
      if (nearDisc(Math.min(bx, tx) - 2, ty - 3, Math.max(bx, tx) + 2, y)) continue;      /* a clear patch round the number */
      const x0 = bx + lean * .62, y0 = y - tall * .62, w = 1.75 * sc, xm = (x0 + tx) / 2, ym = (y0 + ty) / 2;
      stem += 'M' + f(bx) + ' ' + f(y) + 'L' + f(x0) + ' ' + f(y0);
      ear += 'M' + f(x0) + ' ' + f(y0) + 'Q' + f(xm - 2 * w) + ' ' + f(ym) + ' ' + f(tx) + ' ' + f(ty) + 'Q' + f(xm + 2 * w) + ' ' + f(ym) + ' ' + f(x0) + ' ' + f(y0) + 'Z';
      lit += 'M' + f(x0 - .3 * w) + ' ' + f(y0 - 1) + 'L' + f(tx - .3 * w) + ' ' + f(ty + 1.2);
      awn += 'M' + f(tx) + ' ' + f(ty + .6) + 'l' + f(-1.4 * sc + lean * .3) + ' ' + f(-3 * sc) + 'M' + f(tx) + ' ' + f(ty + .6) + 'l' + f(1.2 * sc + lean * .3) + ' ' + f(-3.2 * sc);
    }
    const ec = d < .35 ? '#d4a63a' : d < .7 ? '#e6bb4b' : '#f2cb5a';     /* rows further back look a little darker */
    out += '<rect x="' + (-S - 8) + '" y="' + f(y - 2.2) + '" width="' + (2 * S + 16) + '" height="3.4" fill="rgba(60,35,5,.45)"/>';
    if (stem) out += '<g class="sway" style="' + sync(3400, row * 190) + '"><path d="' + stem + '" stroke="#8f6418" stroke-width="' + f(.7 * sc) + '" fill="none"/>' +
      '<path d="' + awn + '" stroke="#c99a32" stroke-width="' + f(.35 * sc) + '" fill="none"/>' +
      '<path d="' + ear + '" fill="' + ec + '" stroke="#7a5310" stroke-width="' + f(.45 * sc) + '" stroke-linejoin="round"/>' +
      '<path d="' + lit + '" stroke="#fff6c4" stroke-width="' + f(.55 * sc) + '" stroke-linecap="round" fill="none" opacity=".9"/></g>';
  }
  // soft light from the top left and shade towards the front edge, so the field reads as a raised block
  return out + '<polygon points="' + pts + '" fill="url(#g-fieldlight)"/></g>';
}
// Does the box x0..x1, y0..y1 (tile units, 0,0 = tile centre) come within DISCGAP of the number disc?
// Scenery inside that ring is left out so the number always stands in a clear patch.
const DISCGAP = 22;
const nearDisc = (x0, y0, x1, y1, gap) => Math.hypot(Math.max(x0 - 1, 1 - x1, 0), Math.max(y0 - 2, 2 - y1, 0)) < (gap || DISCGAP);      // disc (with shadow) centred near 1,2
// A Jungle tile is one thick forest, built like the wheat field: rows of trees from back to front, front rows
// bigger, back rows darker. Leafy trees and pines mixed. Only the trunks have to stand on the tile, so the
// crowns of the back row rise over the tile behind (it's drawn earlier), which makes the forest look tall.
// Each row is a few paths (one per colour), so a tile of ~80 trees stays cheap to redraw.
function forest(i) {
  const h = HEX[i], k = TILE - .02, R = S * TILE - 5, r3 = Math.sqrt(3);
  const pts = h.v.map(v => ((VERT[v].x - h.x) * k).toFixed(1) + ',' + ((VERT[v].y - h.y) * k).toFixed(1)).join(' ');
  let s = i * 131 + 7;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;      // same forest every time for this tile
  const f = n => n.toFixed(1);
  const oval = (x, y, rx, ry) => 'M' + f(x - rx) + ' ' + f(y) + 'a' + f(rx) + ' ' + f(ry) + ' 0 1 0 ' + f(2 * rx) + ' 0a' + f(rx) + ' ' + f(ry) + ' 0 1 0 ' + f(-2 * rx) + ' 0';
  const tri = p => 'M' + p.map(([x, y]) => f(x) + ' ' + f(y)).join('L') + 'Z';
  let ground = '<clipPath id="fc' + i + '"><polygon points="' + pts + '"/></clipPath><g clip-path="url(#fc' + i + ')">' +
    '<polygon points="' + pts + '" fill="#123d22" opacity=".45"/>';      /* the shady forest floor, with ferns and moss in the clearing */
  for (let n = 0; n < 14; n++) ground += '<ellipse cx="' + f((r() - .5) * 70) + '" cy="' + f((r() - .5) * 70) + '" rx="' + f(5 + r() * 7) + '" ry="' + f(2.5 + r() * 3) + '" fill="#2f7a45" opacity=".35"/>';
  let trees = '', row = 0;
  for (let y = -S * .82; y <= S * .92; y += 7.5, row++) {
    const d = (y + S) / (2 * S), sc = .75 + .4 * d;      /* d: 0 at the back, 1 at the front */
    const pal = d < .33 ? ['#0e3a1f', '#16502b', '#2a7342'] : d < .66 ? ['#12472a', '#1d6436', '#3a9152'] : ['#155231', '#227440', '#4ea866'];
    let sh = '', tr = '', dk = '', md = '', lt = '';
    for (let x = -S + r() * 4; x < S; x += (6.2 + r() * 2) * sc) {
      const bx = x + (r() - .5) * 2, by = y + (r() - .5) * 2, z = sc * (.85 + r() * .3), pine = r() < .35;
      if (Math.abs(bx) > R * r3 / 2 || Math.abs(by) > R - Math.abs(bx) / r3) continue;      /* trunk must be on the tile */
      if (nearDisc(bx - 5.5 * z, by - 19 * z, bx + 6 * z, by, 18.5)) continue;      /* no part of the tree touches the number disc */
      sh += oval(bx + 2 * z, by + .5 * z, 5 * z, 1.6 * z);
      tr += 'M' + f(bx - .8 * z) + ' ' + f(by) + 'h' + f(1.6 * z) + 'v' + f(-5 * z) + 'h' + f(-1.6 * z) + 'Z';
      if (pine) {
        for (let j = 0; j < 3; j++) {      /* three tiers, the left part lit */
          const yb = by - (2.5 + j * 4.5) * z, w = (5.5 - j * 1.3) * z, top = yb - (8 - j * .8) * z;
          dk += tri([[bx - w, yb], [bx, top], [bx + w, yb]]);
          md += tri([[bx - w, yb], [bx, top], [bx + w * .15, yb]]);
        }
        lt += tri([[bx - 1.2 * z, by - 15 * z], [bx, by - 19.2 * z], [bx + .3 * z, by - 15 * z]]);
      } else {      /* a round leafy crown: shaded back, mid front, a lit spot top left */
        dk += oval(bx + 1.8 * z, by - 8 * z, 4.6 * z, 4.6 * z) + oval(bx - 2.6 * z, by - 6.5 * z, 3.6 * z, 3.6 * z);
        md += oval(bx - .8 * z, by - 9.5 * z, 4.4 * z, 4.4 * z);
        lt += oval(bx - 2.2 * z, by - 11.3 * z, 2.2 * z, 2.2 * z);
      }
    }
    if (dk) trees += '<g class="sway tree" style="' + sync(5200, row * 260) + '"><path d="' + sh + '" fill="rgba(0,0,0,.28)"/><path d="' + tr + '" fill="#4a2e14"/>' +
      '<path d="' + dk + '" fill="' + pal[0] + '"/><path d="' + md + '" fill="' + pal[1] + '"/><path d="' + lt + '" fill="' + pal[2] + '"/></g>';
  }
  return ground + '</g>' + trees;
}
// A Pasture tile: grass (lighter patches and tufts), a post-and-rail fence round a paddock with a gate in
// the front, and sheep inside, some dipping their heads to graze now and then. Back fence first, then the
// sheep from back to front, then the front fence, so everything overlaps the right way.
function pasture(i) {
  const h = HEX[i], k = TILE - .02, F = .86;
  const C = h.v.map(v => [(VERT[v].x - h.x), (VERT[v].y - h.y)]);
  const pts = C.map(([x, y]) => (x * k).toFixed(1) + ',' + (y * k).toFixed(1)).join(' ');
  let s = i * 173 + 29;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;      // same pasture every time for this tile
  const f = n => n.toFixed(1);
  let out = '<clipPath id="pc' + i + '"><polygon points="' + pts + '"/></clipPath><g clip-path="url(#pc' + i + ')">';
  for (let n = 0; n < 9; n++) out += '<ellipse cx="' + f((r() - .5) * 80) + '" cy="' + f((r() - .5) * 80) + '" rx="' + f(8 + r() * 10) + '" ry="' + f(4 + r() * 5) + '" fill="#c4ea8c" opacity=".35"/>';
  let tuft = '';
  for (let n = 0; n < 70; n++) { const x = (r() - .5) * 92, y = (r() - .5) * 92; tuft += 'M' + f(x) + ' ' + f(y) + 'l-1.2-2.6M' + f(x) + ' ' + f(y) + 'l.2-3M' + f(x) + ' ' + f(y) + 'l1.4-2.4'; }
  out += '<path d="' + tuft + '" stroke="#4f8a2c" stroke-width=".7" stroke-linecap="round" fill="none"/></g>';
  // the fence: one stretch per side of the paddock (a hexagon F of the tile), the front-most side has a gate
  const P = C.map(([x, y]) => [x * F, y * F]);
  const sides = P.map((a, j) => [a, P[(j + 1) % 6]]);
  const gate = sides.reduce((g, sd, j) => (sd[0][1] + sd[1][1] > sides[g][0][1] + sides[g][1][1] ? j : g), 0);
  const stretch = (a, b) => {      // rails from a to b with posts along them
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 8));
    let g = '<path d="M' + f(a[0]) + ' ' + f(a[1] + .5) + 'L' + f(b[0]) + ' ' + f(b[1] + .5) + '" stroke="rgba(0,0,0,.2)" stroke-width="2.2"/>';
    for (const dy of [5.6, 2.8]) g += '<path d="M' + f(a[0]) + ' ' + f(a[1] - dy) + 'L' + f(b[0]) + ' ' + f(b[1] - dy) + '" stroke="#5a3a18" stroke-width="1.7" stroke-linecap="round"/><path d="M' + f(a[0]) + ' ' + f(a[1] - dy - .3) + 'L' + f(b[0]) + ' ' + f(b[1] - dy - .3) + '" stroke="#c49058" stroke-width=".8" stroke-linecap="round"/>';
    for (let q = 0; q <= n; q++) {
      const x = a[0] + (b[0] - a[0]) * q / n, y = a[1] + (b[1] - a[1]) * q / n;
      g += '<rect x="' + f(x - .9) + '" y="' + f(y - 7.5) + '" width="1.8" height="7.8" rx=".4" fill="#8a5a2b" stroke="#4a2e14" stroke-width=".5"/><rect x="' + f(x - .9) + '" y="' + f(y - 7.5) + '" width=".7" height="7.8" fill="#b98250"/>';
    }
    return g;
  };
  const side = j => {
    const [a, b] = sides[j];
    if (j !== gate) return stretch(a, b);
    const m = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];      // an open gap in the middle
    return stretch(a, m(.36)) + stretch(m(.64), b);
  };
  const back = [], front = [];
  sides.forEach((sd, j) => (sd[0][1] + sd[1][1] < 0 ? back : front).push(j));
  out += back.map(side).join('');
  // sheep: scattered inside the paddock, never near the number disc or each other
  const flock = [], R = S * F - 5, r3 = Math.sqrt(3);
  for (let tries = 0; flock.length < 7 && tries < 600; tries++) {
    const x = (r() - .5) * 2 * R, y = (r() - .5) * 2 * R, d = (y + S) / (2 * S), z = .5 + .2 * d;
    if (Math.abs(x) > R * r3 / 2 - 6 || Math.abs(y) > R - Math.abs(x) / r3 - 1) continue;
    if (nearDisc(x - 10 * z, y - 12 * z, x + 11 * z, y, 18)) continue;
    if (flock.some(o => Math.abs(o.x - x) < 11 && Math.abs(o.y - y) < 6)) continue;
    flock.push({x, y, z, flip: r() < .5, graze: r() < .6});
  }
  flock.sort((a, b) => a.y - b.y).forEach((o, n) => {
    out += '<ellipse cx="' + f(o.x + 1) + '" cy="' + f(o.y + .5) + '" rx="' + f(10 * o.z) + '" ry="' + f(2.4 * o.z) + '" fill="rgba(0,0,0,.25)"/>';
    out += '<g transform="translate(' + f(o.x) + ' ' + f(o.y - 4.4 * o.z) + ') scale(' + (o.flip ? -o.z : o.z).toFixed(2) + ' ' + o.z.toFixed(2) + ')">' +
      (o.graze ? '<g class="graze" style="' + sync(7000, i * 900 + n * 1300) + '">' + SHEEP + '</g>' : SHEEP) + '</g>';
  });
  return out + front.map(side).join('');
}
// Flat-map scenery pictures (2026-11-18): a big brick stack on a pallet (Mudflats) and a mine (Cliffs), centred like glyph()
const BRICKS = (() => {
  let s = '<rect x="-13" y="7" width="26" height="2.6" rx=".6" fill="#9a7044" stroke="#4a2e14" stroke-width=".7"/>';
  [[0, 4], [1, 3], [2, 2], [3, 1]].forEach(([row, n]) => { for (let q = 0; q < n; q++) {
    const x = (q - (n - 1) / 2) * 6.2 - 2.9, y = 3.2 - row * 4;
    s += '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="5.8" height="3.8" rx=".4" fill="' + ['#d27d50', '#b9633a', '#c46e43'][(q + row) % 3] + '" stroke="#4e230f" stroke-width=".7"/><path d="M' + (x + .6).toFixed(1) + ' ' + (y + .7) + 'h4.6" stroke="#ffd0b0" stroke-width=".6" opacity=".7"/>';
  } });
  return s;
})();
const MINE = '<path d="M-17 10C-17 0-12-9-4-12C3-15 11-11 15-3C17 2 17 6 17 10Z" fill="#8f8a84" stroke="#3d4350" stroke-width="1"/><path d="M4-13C11-11 16-4 17 10H7Z" fill="#6f6a64"/>' +
  '<path d="M-6 10V1Q0-7 6 1V10Z" fill="#0b0806"/><rect x="-8" y="-1" width="2.2" height="11" fill="#6a4a2a"/><rect x="5.8" y="-1" width="2.2" height="11" fill="#5a3d22"/><rect x="-9" y="-3" width="18" height="2.6" rx=".5" fill="#7a5634" stroke="#3a2614" stroke-width=".5"/>' +
  '<rect class="flick" x="-1" y=".2" width="2" height="2.6" rx=".4" fill="#ffc45a"/>' +
  '<path d="M-3 10L-9 18M3 10L9 18" stroke="#7a8088" stroke-width="1.1"/><path d="M-4.2 12h8.4M-5.6 14h11.2M-7 16h14" stroke="#6a4a2a" stroke-width="1"/>' +
  '<rect x="-4.4" y="9.6" width="8.8" height="4.6" rx=".8" fill="#5a5f66" stroke="#2a2a2e" stroke-width=".7"/><circle cx="-2.6" cy="14.6" r="1.2" fill="#2a2a2e"/><circle cx="2.6" cy="14.6" r="1.2" fill="#2a2a2e"/>' +
  '<circle cx="-1.6" cy="9.2" r="1.7" fill="#a2a5ab"/><circle cx="1.4" cy="9" r="1.6" fill="#8d9096"/><circle cx="0" cy="8" r="1.3" fill="#b3b6bc"/>';
function scene(t, i) {
  if (t === 'grain') return wheat(i);
  if (t === 'wood') return forest(i);
  if (t === 'wool') return pasture(i);
  const item = k => {
    if (t === 'clay' && (i + k) % 2) return '<ellipse cx="0" cy="4" rx="9" ry="4" fill="#7c3c1c" opacity=".55"/><path d="M-6 3l4 2 3-3 5 2" stroke="#5a2a14" stroke-width="1" fill="none"/>';
    if (t === 'clay') return BRICKS;                            // a big stack of bricks on a pallet
    if (t === 'stone' && k === (i % 2 ? 3 : 4)) return MINE;    // a mine on one front side
    return glyph(t);
  };
  return SCENE.map(([x, y, sc], k) => '<ellipse cx="' + x + '" cy="' + (y + 8 * sc).toFixed(1) + '" rx="' + (8 * sc).toFixed(1) + '" ry="' + (2.6 * sc).toFixed(1) + '" fill="rgba(0,0,0,.22)"/>' + '<g transform="translate(' + x + ' ' + y + ') scale(' + sc + ')">' + item(k) + '</g>').join('');
}
// Shared paint for the board: a gradient per land, the number discs, and a blur for the island's shadow
const DEFS = '<defs>' + Object.keys(COL).map(t => '<linearGradient id="g-' + t + '" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="' + COL[t][0] + '"/><stop offset="1" stop-color="' + COL[t][1] + '"/></linearGradient>').join('') +
  '<linearGradient id="g-fieldlight" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#fff6c8" stop-opacity=".22"/><stop offset=".55" stop-color="#fff6c8" stop-opacity="0"/><stop offset="1" stop-color="#3a2405" stop-opacity=".3"/></linearGradient>' +
  '<radialGradient id="g-tok" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e3d3a6"/></radialGradient>' +
  '<filter id="f-soft" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur stdDeviation="7"/></filter></defs>';
const ico = t => '<svg class="ico" viewBox="-12 -12 24 24" aria-hidden="true">' + cardGlyph(t) + '</svg>';
// A fort (feet at y 9), and its upgrades in Forts and Guards: a Keep adds a tall turret with a flag behind it,
// a Citadel has two towers with gold roofs and a big banner.
const FORT2D = c => '<polygon points="-10,9 -10,-9 -6,-9 -6,-5 -2,-5 -2,-9 2,-9 2,-5 6,-5 6,-9 10,-9 10,9" fill="' + c + '"/><polygon points="2,-9 2,-5 6,-5 6,-9 10,-9 10,9 1,9 1,-5" fill="rgba(0,0,0,.28)"/><path d="M-10-9h4M-2-9h4" stroke="rgba(255,255,255,.6)" stroke-width="1.6"/><path d="M-3 9v-6a3 3 0 0 1 6 0v6z" fill="rgba(0,0,0,.6)"/><polygon points="-10,9 -10,-9 -6,-9 -6,-5 -2,-5 -2,-9 2,-9 2,-5 6,-5 6,-9 10,-9 10,9" fill="none" stroke="#111" stroke-width="2" stroke-linejoin="round"/>';
const TURRET2D = (x, c, top) => '<polygon points="' + [x, -5, x, top, x + 2.4, top, x + 2.4, top + 3, x + 3.4, top + 3, x + 3.4, top, x + 5.6, top, x + 5.6, top + 3, x + 6.6, top + 3, x + 6.6, top, x + 9, top, x + 9, -5].join(',') + '" fill="' + c + '" stroke="#111" stroke-width="1.8" stroke-linejoin="round"/>' +
  '<rect x="' + (x + 5.6) + '" y="' + (top + 3) + '" width="3.4" height="' + (-8 - top) + '" fill="rgba(0,0,0,.25)"/><rect x="' + (x + 3.3) + '" y="' + (top + 6) + '" width="2.4" height="3.4" rx="1.2" fill="rgba(0,0,0,.6)"/>';
const KEEP2D = c => TURRET2D(1, c, -24) + '<path d="M5.5-24v-7" stroke="#111" stroke-width="1.3"/><path d="M5.5-31l6 2-6 2z" fill="' + c + '" stroke="#111" stroke-width=".8"/>' + FORT2D(c);
const CITADEL2D = c => TURRET2D(-12.5, c, -22) + TURRET2D(3.5, c, -22) +
  '<polygon points="-13.5,-22 -8,-32 -2.5,-22" fill="#e8b84a" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/><polygon points="2.5,-22 8,-32 13.5,-22" fill="#e8b84a" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/>' +
  '<path d="M-8-32v-3M8-32v-3" stroke="#111" stroke-width="1.2"/><path d="M0-9V-38" stroke="#111" stroke-width="1.5"/><path d="M0-38h11l-3 4 3 4H0z" fill="' + c + '" stroke="#111" stroke-width="1"/><circle cx="4.5" cy="-34" r="1.6" fill="#e8b84a"/>' +
  '<g transform="scale(1.15 1)">' + FORT2D(c) + '</g>';
// The track buildings (Rick, 2026-11-20), feet at y 9 like a fort: walls in the player's colour (c), roofs in the
// track's colour (r); permanent (owner at level 5) = grander, with gold trim.
const S2 = 'stroke="#111" stroke-linejoin="round"';
function LIBRARY2D(c, r, perm) {      // Science: a grand library with columns, a pediment and a dome
  const trim = perm ? '#e8b84a' : '#f4efe3';
  return (perm ? [-1, 1].map(s => '<rect x="' + (s < 0 ? -19 : 11) + '" y="-5" width="8" height="12" fill="' + c + '" ' + S2 + ' stroke-width="1.2"/><path d="M' + (s < 0 ? -19 : 11) + '-5a4 4 0 0 1 8 0z" fill="' + r + '" ' + S2 + ' stroke-width="1"/><rect x="' + (s < 0 ? -16.2 : 13.8) + '" y="-1" width="2.4" height="4" fill="rgba(0,0,0,.55)"/>').join('') : '') +
    '<rect x="-4.4" y="-22" width="8.8" height="4" fill="' + c + '" ' + S2 + ' stroke-width="1"/><path d="M-5.4-22a5.4 5.4 0 0 1 10.8 0z" fill="' + (perm ? '#e8b84a' : r) + '" ' + S2 + ' stroke-width="1.1"/>' +
    '<path d="M0-27.4v-3" stroke="#7a5410" stroke-width="1"/><circle cy="-31" r="1.1" fill="#e8b84a" stroke="#7a5410" stroke-width=".5"/>' +
    (perm ? '<path d="M5-19l6-5" stroke="#7a5410" stroke-width="2.4" stroke-linecap="round"/><path d="M5-19l6-5" stroke="#e8b84a" stroke-width="1.5" stroke-linecap="round"/>' : '') +
    '<rect x="-11" y="-10" width="22" height="15" fill="' + c + '" ' + S2 + ' stroke-width="1.4"/><rect x="2" y="-10" width="9" height="15" fill="rgba(0,0,0,.2)"/>' +
    '<polygon points="-13,-11 0,-18 13,-11" fill="' + r + '" ' + S2 + ' stroke-width="1.3"/><rect x="-12.5" y="-11.5" width="25" height="2.6" fill="' + trim + '" ' + S2 + ' stroke-width=".9"/>' +
    [-10, -5.6, -1.2, 3.2, 7.6].map(x => '<rect x="' + x + '" y="-8.9" width="2.2" height="13.6" fill="#f4efe3" ' + S2 + ' stroke-width=".6"/>').join('') +
    '<rect x="-1" y="-1" width="2" height="6" fill="rgba(0,0,0,.6)"/>' +
    '<rect x="-14" y="4.5" width="28" height="4.5" fill="#efe8da" ' + S2 + ' stroke-width="1.2"/><path d="M-14 6.7h28" stroke="rgba(0,0,0,.2)" stroke-width=".8"/>';
}
function MARKET2D(c, r, perm) {      // Trade: a busy market: a hall, striped stalls with goods, shoppers
  const stall = (x, aw, k) => '<rect x="' + (x - 4) + '" y="2" width="8" height="5" fill="#8a5a32" ' + S2 + ' stroke-width=".8"/>' +
    '<path d="M' + (x - 3.4) + ' 2v-6M' + (x + 3.4) + ' 2v-6" stroke="#5a3a1c" stroke-width=".9"/>' +
    '<path d="M' + (x - 5) + '-4h10l-1.2 3h-7.6z" fill="' + aw + '" ' + S2 + ' stroke-width=".8"/><path d="M' + (x - 2.5) + '-4l-.6 3M' + x + '-4v3M' + (x + 2.5) + '-4l.6 3" stroke="#fff" stroke-width="1.1" opacity=".8"/>' +
    ['#c0392b', '#f39c12', '#7fb03a', '#8e5bc8'].map((g, q) => '<circle cx="' + (x - 2.7 + q * 1.8) + '" cy="1.4" r=".95" fill="' + g + '" stroke="#111" stroke-width=".3"/>').join('');
  const folk = (x, y, col) => '<rect x="' + (x - 1) + '" y="' + (y - 3) + '" width="2" height="3.4" rx=".8" fill="' + col + '" stroke="#111" stroke-width=".4"/><circle cx="' + x + '" cy="' + (y - 4.1) + '" r="1.1" fill="#d9a877" stroke="#111" stroke-width=".4"/>';
  return '<ellipse cx="0" cy="6" rx="16" ry="5" fill="#cfc4ad" stroke="#8f8470" stroke-width=".8"/>' +
    (perm ? '<rect x="-15" y="-26" width="5" height="22" fill="' + c + '" ' + S2 + ' stroke-width="1.1"/><polygon points="-16,-26 -12.5,-31 -9,-26" fill="' + r + '" ' + S2 + ' stroke-width="1"/><path d="M-14.2-20h3.4l.4 3h-4.2z" fill="#e8b84a" stroke="#7a5410" stroke-width=".5"/>' : '') +
    '<rect x="-8" y="-10" width="16" height="10" fill="' + c + '" ' + S2 + ' stroke-width="1.3"/><polygon points="-10,-10 0,-17 10,-10" fill="' + r + '" ' + S2 + ' stroke-width="1.2"/>' +
    '<rect x="-1.5" y="-6" width="3" height="6" fill="rgba(0,0,0,.6)"/><rect x="-6" y="-7" width="2.4" height="2.4" fill="rgba(0,0,0,.5)"/><rect x="3.6" y="-7" width="2.4" height="2.4" fill="rgba(0,0,0,.5)"/>' +
    stall(-9.5, r) + stall(9.5, c) + (perm ? stall(0, r) : '') +
    folk(-3.5, 8, '#2e86c1') + folk(4, 7.6, '#8e44ad') + (perm ? folk(-13.5, 8.4, '#27ae60') + folk(13.4, 8.2, '#d68910') : '') +
    '<path d="M13.5 3.5h3.4v4.6h-3.4z" fill="#8a5a32" stroke="#111" stroke-width=".6"/>';
}
function CASTLE2D(c, r, perm) {      // Politics: a mighty castle: a tall keep, curtain walls, round towers with tall roofs
  const top = perm ? -30 : -24;
  const tower = x => '<rect x="' + (x - 3.2) + '" y="-9" width="6.4" height="18" fill="' + c + '" ' + S2 + ' stroke-width="1.2"/><rect x="' + x + '" y="-9" width="3.2" height="18" fill="rgba(0,0,0,.22)"/>' +
    '<polygon points="' + (x - 4.2) + ',-9 ' + x + ',-18 ' + (x + 4.2) + ',-9" fill="' + r + '" ' + S2 + ' stroke-width="1.1"/><rect x="' + (x - .8) + '" y="-5" width="1.6" height="3" fill="rgba(0,0,0,.6)"/>' +
    (perm ? '<path d="M' + x + '-18v-4" stroke="#111" stroke-width=".8"/><path d="M' + x + '-22h3.4l-1 1.3 1 1.3H' + x + 'z" fill="' + c + '" stroke="#111" stroke-width=".5"/>' : '');
  return '<rect x="-6" y="' + top + '" width="12" height="' + (-top) + '" fill="' + c + '" ' + S2 + ' stroke-width="1.3"/><rect x="0" y="' + top + '" width="6" height="' + (-top) + '" fill="rgba(0,0,0,.2)"/>' +
    [-6, -2, 2].map(x => '<rect x="' + x + '" y="' + (top - 2.4) + '" width="2.4" height="2.4" fill="' + c + '" ' + S2 + ' stroke-width=".8"/>').join('') +
    '<rect x="-1.2" y="' + (top + 6) + '" width="2.4" height="3.4" rx="1.2" fill="rgba(0,0,0,.6)"/>' +
    '<path d="M0 ' + (top - 2.4) + 'v-8" stroke="#111" stroke-width="1.2"/><path d="M0 ' + (top - 10.4) + 'h8l-2.4 3 2.4 3H0z" fill="' + c + '" stroke="#111" stroke-width=".8"/>' +
    (perm ? '<path d="M-6 ' + (top - 2.4) + 'l1.5-3.4 1.5 2 1.5-3 1.5 3 1.5-3 1.5 3 1.5-2 1.5 3.4z" fill="#e8b84a" stroke="#7a5410" stroke-width=".6" stroke-linejoin="round"/>' : '') +
    '<polygon points="-12,9 -12,-4 -10,-4 -10,-6 -7.5,-6 -7.5,-4 -4.5,-4 -4.5,-6 -2,-6 -2,-4 2,-4 2,-6 4.5,-6 4.5,-4 7.5,-4 7.5,-6 10,-6 10,-4 12,-4 12,9" fill="' + c + '" ' + S2 + ' stroke-width="1.4"/>' +
    '<path d="M-3 9v-6a3 3 0 0 1 6 0v6z" fill="rgba(0,0,0,.65)"/><path d="M-2 3.4v5.6M0 2.2v6.8M2 3.4v5.6M-3 5.5h6" stroke="#9aa1ab" stroke-width=".55"/>' +
    tower(-12) + tower(12);
}
const TRACK2D = {sci: LIBRARY2D, trd: MARKET2D, pol: CASTLE2D};
// a stone wall round a building: the back half is drawn behind it, the front half in front (with battlements)
const WALL2D = half => {
  const d = half === 'back' ? 'M-19 4A19 11 0 0 1 19 4' : 'M19 4A19 11 0 0 1-19 4';
  return '<path d="' + d + '" fill="none" stroke="#111" stroke-width="8.5"/><path d="' + d + '" fill="none" stroke="#b9ad94" stroke-width="5.5"/>' +
    '<path d="' + d + '" transform="translate(0 -3.2)" fill="none" stroke="#111" stroke-width="4.2" stroke-dasharray="3.2 2.6"/><path d="' + d + '" transform="translate(0 -3.2)" fill="none" stroke="#d8cfb8" stroke-width="2.2" stroke-dasharray="3.2 2.6"/>';
};
function piece(v, b) {
  const x = VERT[v].x, y = VERT[v].y, c = PCOL[b.p];
  // a little building with a lit front, a shaded side and a shadow on the ground
  const town = '<polygon points="-8,8 -8,-2 0,-10 8,-2 8,8" fill="' + c + '"/><polygon points="0,-10 8,-2 8,8 0,8" fill="rgba(0,0,0,.28)"/><polygon points="-8,-2 0,-10 8,-2 6,-2 0,-8 -6,-2" fill="rgba(255,255,255,.35)"/><rect x="-5.5" y="2" width="3.5" height="6" fill="rgba(0,0,0,.55)"/><polygon points="-8,8 -8,-2 0,-10 8,-2 8,8" fill="none" stroke="#111" stroke-width="2" stroke-linejoin="round"/>';
  // a castle (Forts and Knights): the big two-tower fort with roofs in its track's colour
  // (the flat map stays simple, Rick 2026-11-19: chimney smoke and fluttering flags are 3D only)
  // (2026-11-20: each track's castle has its own look: library, market, castle; TRACK2D)
  const perm = !!(b.c && G.castle && G.castle[b.c] && G.castle[b.c].perm);
  let body = b.l !== 2 ? town : b.c && TRACKS[b.c] ? TRACK2D[b.c](c, TRACKS[b.c].c, perm) : b.u === 2 ? CITADEL2D(c) : b.u === 1 ? KEEP2D(c) : FORT2D(c);
  // a takeover (TAKE): the new building grows up over its plain fort; the old one sinks away over the plain fort left behind
  const tk = taking() ? TAKE : null, late = tk ? '-' + (Date.now() - tk.t) + 'ms' : '';
  if (tk && +v === tk.to && b.c) body = '<g class="tkfort" style="animation-delay:' + late + '">' + FORT2D(c) + '</g><g class="tkin" style="animation-delay:' + late + '">' + body + '</g>';
  const over = tk && +v === tk.from ? '<g class="tkout" style="animation-delay:' + late + '">' + TRACK2D[tk.k](PCOL[tk.fp], TRACKS[tk.k].c, false) + '</g>' : '';
  return '<g class="deco" transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(1.1)"><ellipse cx="3" cy="9" rx="12" ry="4" fill="rgba(0,0,0,.35)"/>' + (b.w ? WALL2D('back') : '') +
    drop('b' + v, b.p + ':' + b.l + ':' + (b.u || 0) + ':' + (b.c || ''), body) + over + (b.w ? drop('w' + v, 1, WALL2D('front')) : '') + '</g>';
}
// --- Forts and Guards pictures ---
// The Sea die's faces (SEAICON by SEAFACE name), a raider ship for the board, and a guard standing on a road.
const SEAICON = {
  raid: '<path d="M-9.5 3.5h19l-3.5 5.5H-6z" fill="#3d2817" stroke="#111" stroke-width="1"/><path d="M0 4V-10.5" stroke="#111" stroke-width="1.4"/><path d="M1-10L9.5 2H1z" fill="#1d1a19" stroke="#111" stroke-width=".8"/><path d="M1.5-4.5h5" stroke="#e0302a" stroke-width="2.2"/><path d="M-1-8.5L-7.5 2H-1z" fill="#2e2a28" stroke="#111" stroke-width=".8"/>',
  calm: '<path d="M-9-3q3-3 6 0t6 0t6 0M-9 4q3-3 6 0t6 0t6 0" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
  gold: '<circle r="8" fill="#f4c443" stroke="#7a5410" stroke-width="1.5"/><circle r="5.2" fill="none" stroke="#b9861f" stroke-width="1.2"/><path d="M0-3.6l1.1 2.3 2.5.3-1.8 1.7.5 2.5L0 2l-2.3 1.2.5-2.5-1.8-1.7 2.5-.3z" fill="#7a5410"/>'
};
// track faces (Science / Trade / Politics) use the track pictures (TRACKICON, near the Improve menu)
const seaSvg = n => { const f = SEAFACE[n] || 'raid'; return '<svg viewBox="-12 -12 24 24" aria-hidden="true">' + (SEAICON[f] || TRACKICON[f]) + '</svg>'; };
const RAIDSHIP = () => SHIP.replace('#f4ecd6', '#2a2422').replace('#e6d9bc', '#3a3230').replace('#d94a3a', '#111').replaceAll('#7a4a22', '#3d2817') + '<path d="M4-23h8" stroke="#d3322c" stroke-width="2.6"/>';
// where the raider fleet is drawn: it sails from FLEETFAR (open sea, top left) to FLEETNEAR (off the coast)
const FLEETFAR = [-310, -262], FLEETNEAR = [-205, -190];
function fleetAt(k) { const t = Math.min(1, k / FLEETMAX); return [FLEETFAR[0] + (FLEETNEAR[0] - FLEETFAR[0]) * t, FLEETFAR[1] + (FLEETNEAR[1] - FLEETFAR[1]) * t]; }
const FLEETSHIPS = [[0, 0], [-36, 14], [-14, -30]];      // three ships around the fleet's spot
// A knight's picture by strength (Rick, 2026-11-19): 1 = on foot; 2 = mounted on a brown horse with a lance and a pennant
// in the player's colour; 3 = a mighty knight: gold armour on a white horse, with a pulsing golden glow (.radiant).
const GUARDBODY = (c, s) => s > 1 ? MOUNTED(c, s === 3) : FOOTMAN(c);
// The mounted knights' lance (Rick, 2026-11-19, like a real one): a tapered grip at the hand, a cone-shaped guard,
// a long thin shaft and a slim sharp point, along the line from (-3,-3.2) up to the front
const LANCEU = [16.4 / 18.9, -9.4 / 18.9];      // which way the lance points (from its back end at -3,-3.2)
// a point s along the lance and w off to its side
const LANCEAT = (s, w) => (-3 + LANCEU[0] * s - LANCEU[1] * (w || 0)).toFixed(2) + ' ' + (-3.2 + LANCEU[1] * s + LANCEU[0] * (w || 0)).toFixed(2);
function LANCE2D(gold) {
  const P = (pts, fill, sw) => '<path d="M' + pts.map(([s, w]) => LANCEAT(s, w)).join('L') + 'Z" fill="' + fill + '" stroke="#111" stroke-width="' + sw + '" stroke-linejoin="round"/>';
  const metal = gold ? '#f5c84a' : '#b8bec8', tip = gold ? '#ffe58a' : '#e8edf2';
  return P([[5.4, .5], [9.9, .64], [9.9, -.64], [5.4, -.5]], '#3a2a1c', .45) +                               // grip (the hand holds it)
    P([[12, .42], [20.6, .25], [20.6, -.25], [12, -.42]], gold ? '#e2b84a' : '#a9b0b9', .35) +               // long thin shaft, all metal (Rick, 2026-11-19)
    P([[9.8, 1.2], [10.5, 1.55], [12.3, .45], [12.3, -.45], [10.5, -1.55], [9.8, -1.2]], metal, .5) +         // cone guard, wide at the back
    P([[20.4, .3], [21.4, .8], [23.4, 0], [21.4, -.8], [20.4, -.3]], tip, .45);                               // slim sharp point
}
function MOUNTED(c, gold) {
  const coat = gold ? '#f1ece0' : '#8a5a2e', arm = gold ? '#f5c84a' : '#b8bec8', ln = gold ? '#7a5410' : '#111';
  // legs taper to the fetlock and end in dark hooves (2026-11-19, a more lifelike horse)
  const leg = x => '<path d="M' + x + ' 3.4h1.6l-.25 4.4h-1.1z" fill="' + coat + '" stroke="#111" stroke-width=".7" stroke-linejoin="round"/><rect x="' + (x + .1) + '" y="7.7" width="1.35" height="1.2" rx=".3" fill="#2b2522" stroke="#111" stroke-width=".5"/>';
  const maneC = gold ? '#d9cfb8' : '#2a1a10';
  return (gold ? '<g class="radiant"><circle cy="-1" r="14.5" fill="#ffd95e" opacity=".16"/><circle cy="-1" r="10" fill="#ffe58a" opacity=".24"/>' +
      [0, 45, 90, 135, 180, 225, 270, 315].map(a => '<path d="M0-12.5v-3" transform="translate(0 -1) rotate(' + a + ')" stroke="#ffd95e" stroke-width="1.3" stroke-linecap="round"/>').join('') + '</g>' : '') +
    '<ellipse cx="1" cy="9" rx="10" ry="2.6" fill="rgba(0,0,0,.4)"/>' +
    leg(-5.8) + leg(-3.8) + leg(3) + leg(5) +
    '<path d="M-6.6 0q-3.2 1.8-2.4 6.4" fill="none" stroke="' + (gold ? '#d9cfb8' : '#3a2412') + '" stroke-width="1.8" stroke-linecap="round"/>' +      // tail
    '<path d="M4.4-.4L8.4-6l2.4 1.3L7.2 2.4z" fill="' + coat + '" stroke="#111" stroke-width=".8" stroke-linejoin="round"/>' +      // neck
    '<ellipse cx="7" cy="1.4" rx="7.4" ry="3.5" transform="translate(-6 0)" fill="' + coat + '" stroke="#111" stroke-width=".9"/>' +      // body
    '<ellipse cx="10.4" cy="-5" rx="2.8" ry="1.5" transform="rotate(28 10.4 -5)" fill="' + coat + '" stroke="#111" stroke-width=".8"/>' +      // head
    '<path d="M8.6-6.4l.3-2 1.2 1.4" fill="' + coat + '" stroke="#111" stroke-width=".6"/><circle cx="10.6" cy="-5.6" r=".45" fill="#111"/>' +
    '<path d="M4.5-1.3Q6.2-4.4 8.6-6.9" stroke="' + maneC + '" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +      // mane along the top of the neck
    '<circle cx="12.5" cy="-3.7" r=".3" fill="#111"/>' +      // nostril
    // the mighty knight's horse wears gold armour (Rick, 2026-11-19): chest and rump plates, neck plates and a face plate
    (gold ? '<g fill="none" stroke="#7a5410" stroke-linecap="round"><path d="M6.2-1.6Q8.9-.2 7.6 3" stroke-width="2.1"/><path d="M-3.2-1.8Q-6.2-1.6-6.4 1.4" stroke-width="2.1"/>' +
      '<path d="M5.6-2.1L8.3.3M6.8-3.8L9.4-1.9" stroke-width="1.5"/></g>' +
      '<g fill="none" stroke="#f5c84a" stroke-linecap="round"><path d="M6.2-1.6Q8.9-.2 7.6 3" stroke-width="1.4"/><path d="M-3.2-1.8Q-6.2-1.6-6.4 1.4" stroke-width="1.4"/>' +
      '<path d="M5.6-2.1L8.3.3M6.8-3.8L9.4-1.9" stroke-width=".9"/></g>' +
      '<ellipse cx="10.9" cy="-5.1" rx="2.2" ry=".72" transform="rotate(28 10.9 -5.1)" fill="#f5c84a" stroke="#7a5410" stroke-width=".4"/><circle cx="10.6" cy="-5.7" r=".42" fill="#111"/>'
      // (2026-11-20, Rick: more armour) a strength-2 horse: steel chest and face plates, a rump cloth in the player's colour
      : '<path d="M-3.2-1.8Q-6.2-1.6-6.4 1.4" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round"/><path d="M-3.2-1.8Q-6.2-1.6-6.4 1.4" fill="none" stroke="' + c + '" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M6.2-1.6Q8.9-.2 7.6 3" fill="none" stroke="#3a3f47" stroke-width="2.1" stroke-linecap="round"/><path d="M6.2-1.6Q8.9-.2 7.6 3" fill="none" stroke="#c9ced6" stroke-width="1.4" stroke-linecap="round"/>' +
        '<ellipse cx="10.9" cy="-5.1" rx="2.2" ry=".72" transform="rotate(28 10.9 -5.1)" fill="#c9ced6" stroke="#3a3f47" stroke-width=".4"/><circle cx="10.6" cy="-5.7" r=".42" fill="#111"/>') +
    '<path d="M-3.6-1.9h6.6v4.6q-3.3 1.5-6.6 0z" fill="' + c + '" stroke="#111" stroke-width=".8"/>' +      // saddle cloth in the player's colour
    '<path d="M-2.2-1.6V-8.2Q.3-9.9 2.8-8.2V-1.6Z" fill="' + arm + '" stroke="' + ln + '" stroke-width=".9"/>' +      // body armour
    '<path d="M-1.2-1.6V-7.7Q.3-8.5 1.8-7.7V-1.6Z" fill="' + c + '" stroke="#111" stroke-width=".45"/><path d="M.3-6.2l.8.8-.8.8-.8-.8z" fill="#e8b84a" stroke="#6a4a0e" stroke-width=".2"/>' +      // surcoat in the player's colour (2026-11-20)
    '<circle cx="-.9" cy="-8" r="1.3" fill="' + arm + '" stroke="' + ln + '" stroke-width=".5"/>' +      // shoulder plate
    '<path d="M-1.2-8L-1.5-7.4" stroke="' + arm + '" stroke-width="1.6" stroke-linecap="round"/>' +      // left arm (to the shield's hand)
    '<path d="M1.8-7.4Q3.4-7.6 3.9-6.8" stroke="' + arm + '" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="4" cy="-7" r=".9" fill="' + arm + '" stroke="#111" stroke-width=".4"/>' +      // right arm holding the lance (steel gauntlet)
    '<circle cx=".3" cy="-10.6" r="2.3" fill="#d9a877" stroke="#111" stroke-width=".8"/><path d="M-2.3-11a2.6 2.6 0 0 1 5.2 0Z" fill="' + arm + '" stroke="' + ln + '" stroke-width=".8"/>' +
    '<circle cx="1.5" cy="-10.3" r=".5" fill="#1d1610"/><path d="M.8-11.3l1.4.3" stroke="#1d1610" stroke-width=".45" stroke-linecap="round"/>' +      // eye and brow (looking ahead)
    // the mighty knight's grizzled grey beard and lighter moustache (Rick, 2026-11-19)
    (gold ? '<path d="M-.6-9.8q.4 3.4 3.4 1.4q.7-.7.3-1.6q-1.7.7-3.7.2z" fill="#8f8a84" stroke="#111" stroke-width=".4" stroke-linejoin="round"/><path d="M-.1-8.7l.3.8M.9-8.3l.2.9M1.9-8.7l.3.6" stroke="#c9c4bb" stroke-width=".3"/>' +
      '<path d="M1.5-9.6q.8-.5 1.5.1" stroke="#c9c4bb" stroke-width=".7" fill="none" stroke-linecap="round"/>' : '') +
    '<path d="M.3-13.4q2.2-2.8 4.4-1.8" stroke="' + (gold ? '#fff6d0' : c) + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +      // plume
    LANCE2D(gold) +      // lance (no pennant since 2026-11-19, Rick's request)
    // shield: smaller and higher (Rick, 2026-11-19), clear of the leg and the saddle cloth
    // (2026-11-19: a proper shield with a rim and a boss, held in the left hand)
    '<path d="M-5.3-9.8h3.8v2.6q0 2.2-1.9 3.2q-1.9-1-1.9-3.2z" fill="' + c + '" stroke="' + (gold ? '#b8860b' : '#9aa1aa') + '" stroke-width=".55"/><path d="M-5.3-9.8h3.8v2.6q0 2.2-1.9 3.2q-1.9-1-1.9-3.2z" fill="none" stroke="' + ln + '" stroke-width=".25"/>' +
    '<circle cx="-3.4" cy="-7.7" r=".6" fill="' + (gold ? '#f5c84a' : '#c9ced6') + '" stroke="#111" stroke-width=".3"/>' +
    '<circle cx="-1.55" cy="-7.4" r=".7" fill="' + arm + '" stroke="#111" stroke-width=".35"/>';      // the gauntlet gripping it
}
// (FOOTMAN is only strength 1 now: stronger knights ride, MOUNTED)
const FOOTMAN = c => '<ellipse cx="1.5" cy="7.5" rx="7.5" ry="2.6" fill="rgba(0,0,0,.4)"/>' +
  // armour (Rick, 2026-11-20): a steel body under a surcoat in the player's colour with a gold badge, a belt
  '<path d="M-4 7.5V-1Q0-4 4-1V7.5Z" fill="#b8bec8" stroke="#111" stroke-width="1.2"/>' +
  '<path d="M-2.5-2.2Q0-3 2.5-2.2V7.5H-2.5Z" fill="' + c + '" stroke="#111" stroke-width=".6"/><path d="M0-.6l1 1-1 1-1-1z" fill="#e8b84a" stroke="#6a4a0e" stroke-width=".25"/>' +
  '<path d="M-4 3.2H4" stroke="#3a2a1c" stroke-width="1"/><path d="M1-2.6Q4-1.4 4-1V7.5H1Z" fill="rgba(0,0,0,.22)"/>' +
  // the sword (Rick, 2026-11-20: a sword instead of the spear), point up, leaning out a little: steel blade with a
  // groove, gold crossguard, leather grip and gold pommel; the hand (drawn after) covers the grip
  '<g transform="rotate(14 6 4.3)"><path d="M5.2 2.7V-6.6L6-8.6l.8 2V2.7z" fill="#e8edf2" stroke="#4b525c" stroke-width=".5" stroke-linejoin="round"/>' +
  '<path d="M6-7V2.2" stroke="#9aa1ab" stroke-width=".35"/><rect x="5.45" y="3.4" width="1.1" height="2.3" fill="#3a2a1c"/>' +
  '<rect x="3.9" y="2.5" width="4.2" height="1.1" rx=".45" fill="#e8b84a" stroke="#6a4a0e" stroke-width=".4"/><circle cx="6" cy="6.2" r=".75" fill="#e8b84a" stroke="#6a4a0e" stroke-width=".35"/></g>' +
  // arms (2026-11-19, Rick: "eyes and arms like the bandit"); armoured since 2026-11-20: steel arms and gauntlets,
  // shoulder plates; the right hand holds the sword
  '<path d="M-3.4-.6L-2.8 1.6" stroke="#111" stroke-width="2.9" stroke-linecap="round"/><path d="M-3.4-.6L-2.8 1.6" stroke="#c9ced6" stroke-width="1.9" stroke-linecap="round"/>' +
  '<path d="M3.4-.6L5.8 3.8" stroke="#111" stroke-width="2.9" stroke-linecap="round"/><path d="M3.4-.6L5.8 3.8" stroke="#c9ced6" stroke-width="1.9" stroke-linecap="round"/>' +
  '<circle cx="6" cy="4.3" r="1.2" fill="#9aa1ab" stroke="#111" stroke-width=".5"/>' +
  '<path d="M-5.2.2Q-5.2-2.4-2.4-2.2L-2.6.4Z" fill="#c9ced6" stroke="#111" stroke-width=".55"/><path d="M5.2.2Q5.2-2.4 2.4-2.2L2.6.4Z" fill="#a9b0b9" stroke="#111" stroke-width=".55"/>' +
  '<path d="M-.2-7.9q1.2-5 5.2-4q-2.8.4-3.6 4.1z" fill="' + c + '" stroke="#111" stroke-width=".5"/>' +      // plume in the player's colour
  '<circle cy="-4.5" r="3.2" fill="#d9a877" stroke="#111" stroke-width="1"/><path d="M-3.7-5a3.7 3.7 0 0 1 7.4 0Z" fill="#b8bec8" stroke="#111" stroke-width=".9"/>' +
  '<path d="M-3.9-5.2H3.9" stroke="#111" stroke-width="1.5" stroke-linecap="round"/><path d="M-3.8-5.2H3.8" stroke="#d4d9e0" stroke-width=".8" stroke-linecap="round"/>' +      // helmet rim
  '<circle cx="-1.2" cy="-3.9" r=".6" fill="#1d1610"/><circle cx="1.2" cy="-3.9" r=".6" fill="#1d1610"/>' +      // eyes
  '<path d="M-2-4.9l1.4.3M2-4.9l-1.4.3" stroke="#1d1610" stroke-width=".55" stroke-linecap="round"/>' +      // brows
  '<path d="M0-5.2V-2.9" stroke="#111" stroke-width="1.1" stroke-linecap="round"/><path d="M0-5.1V-3" stroke="#c9ced6" stroke-width=".55" stroke-linecap="round"/>' +      // nose guard
  // shield (2026-11-19): flat top, pointed bottom, a steel rim and boss, gripped by the left hand at its edge
  '<path d="M-8.2-1.6h5.6v4.6q0 3.2-2.8 4.5q-2.8-1.3-2.8-4.5z" fill="' + c + '" stroke="#9aa1aa" stroke-width="1"/><path d="M-8.2-1.6h5.6v4.6q0 3.2-2.8 4.5q-2.8-1.3-2.8-4.5z" fill="none" stroke="#111" stroke-width=".45"/>' +
  '<circle cx="-5.4" cy="2" r="1.1" fill="#c9ced6" stroke="#111" stroke-width=".45"/>' +
  '<circle cx="-2.6" cy="2.2" r="1.15" fill="#d9a877" stroke="#111" stroke-width=".5"/>';
function edgeMid(e) { const A = VERT[EDGE[e].a], B = VERT[EDGE[e].b]; return [(A.x + B.x) / 2, (A.y + B.y) / 2]; }
// on duty: full colour with a gold ring at its feet; resting (inactive): greyed out with a little "z"
function guard2D(e, g) {      // (e: the knight's corner since 2026-11-19; they used to stand on roads)
  const x = VERT[e].x, y = VERT[e].y;
  const body = g.a ? '<ellipse cx="0" cy="7.5" rx="8.5" ry="3.2" fill="none" stroke="#ffcf5a" stroke-width="1.6"/>' + GUARDBODY(PCOL[g.p], g.s)
    // resting: greyed out with a still "z" (the flat map stays simple; the floating Z's are 3D only)
    : '<g class="off">' + GUARDBODY(PCOL[g.p], g.s) + '</g><text class="zz" x="' + (g.s > 1 ? 3 : 4) + '" y="' + (g.s > 1 ? -14 : -9) + '">z</text>';
  return '<g class="deco" transform="translate(' + x.toFixed(1) + ' ' + (y - 3).toFixed(1) + ') scale(1.2)">' + drop('g' + e, g.p + ':' + g.s + ':' + (g.a ? 1 : 0), body) +
    '<title>' + esc(G.pl[g.p].name) + "'s " + (g.s === 3 ? 'mighty knight' : g.s === 2 ? 'mounted knight' : 'knight') + ' (strength ' + g.s + (g.a ? ', on duty' : ', resting: needs 1 Grain to go on duty') + ')</title></g>';
}
function seg(e, k) {
  const A = VERT[EDGE[e].a], B = VERT[EDGE[e].b];
  return 'x1="' + (A.x + (B.x - A.x) * k).toFixed(1) + '" y1="' + (A.y + (B.y - A.y) * k).toFixed(1) + '" x2="' + (B.x + (A.x - B.x) * k).toFixed(1) + '" y2="' + (B.y + (A.y - B.y) * k).toFixed(1) + '"';
}
const TILE = .93;      // land tiles are a little smaller than their hex, so sand shows between them
// --- Pieces dropping onto the map ---
// SEEN remembers what was on the board last time (key -> value). Anything new or changed gets a
// start time in FELL, and drop() wraps it in a group that plays the CSS "fall" animation.
const DROPMS = 650;
let SEEN = null; const FELL = {};
function noteDrops() {
  const now = {};
  for (const e in G.r) now['r' + e] = G.r[e];
  for (const v in G.b) { now['b' + v] = G.b[v].p + ':' + G.b[v].l + ':' + (G.b[v].u || 0) + ':' + (G.b[v].c || ''); if (G.b[v].w) now['w' + v] = 1; }
  if (G.deck) now.storm = G.storm;
  for (const e in guards()) now['g' + e] = G.gd[e].p + ':' + G.gd[e].s + ':' + (G.gd[e].a ? 1 : 0);
  const landed = [];
  if (SEEN && SEEN.id === G.id) for (const k in now) if (SEEN.now[k] !== now[k]) { FELL[k] = Date.now(); landed.push(k); }
  SEEN = {id: G.id, now};
  if (landed.length) dustFx(landed);      // a puff of dust as each lands (js/flair.js)
}
function drop(key, val, inner) {
  const age = Date.now() - (FELL[key] || 0);
  return age < DROPMS ? '<g class="fall" style="animation-delay:-' + age + 'ms">' + inner + '</g>' : inner;
}
// The bandit (matches the 3D one): wide hat with a feather, red bandana, long coat, a sack of loot and a lantern
const BANDIT = '<ellipse cx="2" cy="17" rx="14" ry="4.5" fill="rgba(0,0,0,.45)"/>' +
  '<ellipse cx="-10" cy="-5" rx="5.5" ry="6.5" fill="#a88a58" stroke="#3a2a14" stroke-width="1.2"/><path d="M-8-11l2-3" stroke="#3a2a14" stroke-width="1.4"/>' +       // sack behind the shoulder
  '<path d="M-10 17C-11 6-8-2-5-4H5C8-2 11 6 10 17Z" fill="#6a3320" stroke="#1c0e08" stroke-width="1.5" stroke-linejoin="round"/><path d="M2-4H5C8-2 11 6 10 17H3Z" fill="rgba(0,0,0,.25)"/>' +
  '<rect x="-1.8" y="-3" width="3.6" height="9" fill="#d8c7a0"/><rect x="-9.6" y="6" width="19.2" height="2.6" fill="#2a1a10"/><rect x="-1.4" y="5.6" width="2.8" height="3.4" fill="#e8b84a"/>' +
  '<path d="M-7.5-5H7.5L10.5 1.5H-10.5Z" fill="#3b4834" stroke="#141a12" stroke-width="1.2" stroke-linejoin="round"/>' +                                              // shoulder cape
  '<path d="M8-2L12 6" stroke="#6a3320" stroke-width="4" stroke-linecap="round"/><circle cx="12" cy="7" r="1.8" fill="#d9a877"/>' +                                    // arm and hand
  '<path d="M10.6 9h3.8l-.6-1.6h-2.6z" fill="#555c63"/><rect class="flick" x="10.4" y="9" width="4.2" height="5" rx=".6" fill="#ffc45a" stroke="#555c63" stroke-width=".9"/>' +   // lantern
  '<circle cx="0" cy="-10" r="7" fill="#d9a877" stroke="#1c0e08" stroke-width="1.5"/>' +
  '<path d="M-7-10.5H7A7 7 0 0 1-7-10.5Z" fill="#b02a26" stroke="#1c0e08" stroke-width="1.2"/>' +                                                                     // bandana
  '<circle cx="-2.6" cy="-12" r="1.1" fill="#1d1610"/><circle cx="2.6" cy="-12" r="1.1" fill="#1d1610"/><path d="M-4.6-14.6l3.4 1.2M4.6-14.6l-3.4 1.2" stroke="#1d1610" stroke-width="1.1" stroke-linecap="round"/>' +
  '<path d="M5-20c4-4 8-5 10-4c-3 1-6 3-9 5z" fill="#e9dcb4" stroke="#7a6a44" stroke-width=".7"/>' +                                                                 // feather
  '<path d="M-6-17.5C-6-24-4.5-26 0-26S6-24 6-17.5Z" fill="#3a2a1c" stroke="#120c08" stroke-width="1.3"/><rect x="-6" y="-20" width="12" height="2.2" fill="#8a1f1f"/>' +
  '<ellipse cx="0" cy="-17.5" rx="13.5" ry="2.8" fill="#3a2a1c" stroke="#120c08" stroke-width="1.3"/>';
// The bandits' lair (the middle land, with no number), drawn round the tile's middle.
// Back to front: a rocky hill with a timber-framed cave, torches, barrels, a tent, a campfire with smoke, a chest of gold.
const LAIR = (() => {
  const flame = (x, y, k) => '<path class="flick" style="animation-delay:-' + k + 's" d="M' + x + ' ' + y + 'c-3-2-3-6 0-10c1 3 3 4 3 7s-1 3-3 3z" fill="#ff8a2a"/><path class="flick" style="animation-delay:-' + (k + .2) + 's" d="M' + x + ' ' + y + 'c-1.4-1-1.4-3.5 0-5.5c.6 2 1.6 2.5 1.6 4s-.6 1.5-1.6 1.5z" fill="#ffe08a"/>';
  let s = '<path d="M-35-4L-31-21L-21-33L-7-39L8-38L22-32L32-20L35-4Z" fill="#6f675f" stroke="#2d2723" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M8-38L22-32L32-20L35-4L14-4L12-22Z" fill="#544d47"/><path d="M-31-21L-21-33L-12-35L-19-24Z" fill="#8b837a"/>' +
    '<path d="M-24-12l5-6M18-28l6 4M26-12l4-5" stroke="#3f3934" stroke-width="1.2" fill="none"/>' +
    '<path d="M-9-4V-19Q0-30 9-19V-4Z" fill="#0b0806"/>' +                                                       // the cave mouth
    '<rect x="-12" y="-24" width="3" height="20" fill="#6a4a2a"/><rect x="9" y="-24" width="3" height="20" fill="#5a3d22"/><rect x="-14" y="-27" width="28" height="4" rx="1" fill="#7a5634" stroke="#3a2614" stroke-width=".8"/>';
  [-18, 18].forEach((x, k) => { s += '<rect x="' + (x - .8) + '" y="-12" width="1.6" height="11" fill="#5a3d22"/>' + flame(x, -12, k * .3); });     // torches
  s += '<g stroke="#3a2614" stroke-width=".8"><rect x="-33" y="-2" width="7" height="9" rx="2" fill="#7a5230"/><rect x="-27" y="1" width="6.5" height="8" rx="2" fill="#6b4728"/></g>' +   // barrels
    '<path d="M-33 1h7M-33 4.5h7M-27 3.5h6.5M-27 6.5h6.5" stroke="#3a2614" stroke-width=".7"/>';
  s += '<path d="M14 15L24 -2L34 15Z" fill="#b39a6c" stroke="#5a4a30" stroke-width="1" stroke-linejoin="round"/><path d="M24-2L34 15H27Z" fill="#8f7a55"/><path d="M21 15L24 7L27 15Z" fill="#2a2016"/>';     // tent
  const fx = -20, fy = 22;      // campfire: stones, crossed logs, flames, drifting smoke
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; s += '<ellipse cx="' + (fx + Math.cos(a) * 7).toFixed(1) + '" cy="' + (fy + Math.sin(a) * 3.5).toFixed(1) + '" rx="2.4" ry="1.8" fill="#8a837c" stroke="#3f3934" stroke-width=".6"/>'; }
  s += '<path d="M' + (fx - 6) + ' ' + (fy + 1) + 'L' + (fx + 6) + ' ' + (fy - 2) + 'M' + (fx - 6) + ' ' + (fy - 2) + 'L' + (fx + 6) + ' ' + (fy + 1) + '" stroke="#5a3a20" stroke-width="2.4" stroke-linecap="round"/>';
  s += '<g transform="translate(' + fx + ' ' + (fy + 1) + ') scale(1.5)">' + flame(0, 0, .1) + '</g>';
  [0, 1.3, 2.6].forEach(k => { s += '<circle class="smoke" style="animation-delay:-' + k + 's" cx="' + fx + '" cy="' + (fy - 14) + '" r="4" fill="#9aa3ab"/>'; });
  s += '<g stroke="#2e1c0c" stroke-width=".9"><rect x="6" y="19" width="14" height="9" rx="1" fill="#6b4322"/><path d="M6 22a7 4 0 0 1 14 0Z" fill="#56351a"/></g>' +    // chest of gold
    '<rect x="8.5" y="18.5" width="2" height="9.5" fill="#e8b84a"/><rect x="15.5" y="18.5" width="2" height="9.5" fill="#e8b84a"/><rect x="12" y="22.5" width="2" height="2.5" fill="#e8b84a"/>' +
    '<g fill="#f4cc5a" stroke="#9a7420" stroke-width=".6"><ellipse cx="25" cy="27" rx="5" ry="2.6"/><ellipse cx="23" cy="24.5" rx="2" ry="1"/><ellipse cx="27" cy="24" rx="2" ry="1"/><ellipse cx="22" cy="31" rx="1.8" ry=".9"/><ellipse cx="29" cy="30.5" rx="1.8" ry=".9"/></g>';
  return s;
})();
// Where a port sits: the middle of its coast edge (mx, my), the way out to sea (nx, ny), along the coast
// (tx, ty), and its angle. The jetty runs out from the beach; DOCK = how far out its platform's middle is,
// BERTH = just past the platform's end (boats start and finish their trips out at sea beyond it).
const JETTY = 6, DOCK = JETTY + 25, BERTH = JETTY + 44;
// The two walkways, in the jetty's own frame (x along the coast, y out to sea, 0,0 = JETTY out from the edge's middle):
// from the beach by each corner of the edge (the corners are at x ±S/2, y -JETTY) to the back corners of the platform
const PORTWALK = [[-20, -5, -8.5, 18.5], [20, -5, 8.5, 18.5]];
function portGeo(o) {
  const A = VERT[EDGE[o.e].a], B = VERT[EDGE[o.e].b], h = HEX[COAST.find(c => c.e === o.e).h];
  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, d = Math.hypot(mx - h.x, my - h.y), nx = (mx - h.x) / d, ny = (my - h.y) / d;
  return {mx, my, nx, ny, tx: -ny, ty: nx, ang: Math.atan2(ny, nx) * 180 / Math.PI - 90};
}
// A port: a wooden jetty of planks on pilings, from the beach out to a platform, with the port's sign on it
function port(o) {
  const g = portGeo(o), any = o.r === 'any', f = n => n.toFixed(1);
  // drawn with the jetty pointing down (+y = out to sea), then turned to face out from its coast edge
  // two walkways, one from each corner of the coast edge (the two town spots the port serves), meeting at the platform
  let j = '';
  PORTWALK.forEach(([x0, y0, x1, y1]) => {
    const len = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
    let w = '<rect x="-1" y="-6.5" width="' + f(len + 2) + '" height="13" rx="2" fill="rgba(0,0,0,.28)" transform="translate(2.5 3)"/>';
    for (let d = 0, n = 0; d < len; d += 2.6, n++) w += '<rect x="' + f(d) + '" y="-4.6" width="2.3" height="9.2" fill="' + (n % 2 ? '#a97a42' : '#bb8c52') + '" stroke="#5a3d1c" stroke-width=".4"/>';
    [len * .3, len * .75].forEach(d => [-5.4, 5.4].forEach(s => { w += '<circle cx="' + f(d) + '" cy="' + s + '" r="1.9" fill="#4a2e14"/><circle cx="' + f(d - .5) + '" cy="' + (s - .5) + '" r=".9" fill="#9a6a38"/>'; }));
    j += '<g transform="translate(' + x0 + ' ' + y0 + ') rotate(' + f(a) + ')">' + w + '</g>';
  });
  j += '<rect x="-13.5" y="16" width="27" height="18" rx="2" fill="rgba(0,0,0,.28)" transform="translate(2.5 3)"/>';
  for (let x = -12, n = 0; x < 12; x += 2.6, n++) j += '<rect x="' + f(x) + '" y="17" width="2.3" height="15.5" fill="' + (n % 3 ? '#b4864d' : '#c49559') + '" stroke="#5a3d1c" stroke-width=".4"/>';
  j += '<rect x="-12.2" y="17" width="24.4" height="15.6" rx=".8" fill="none" stroke="#4a2e14" stroke-width="1.1"/>';
  [[-12.6, 17.5], [12.6, 17.5], [-12.6, 32.3], [12.6, 32.3]].forEach(([x, y]) => {
    j += '<circle cx="' + x + '" cy="' + y + '" r="1.9" fill="#4a2e14"/><circle cx="' + (x - .5) + '" cy="' + (y - .5) + '" r=".9" fill="#9a6a38"/>';
  });
  let s = '<g transform="translate(' + f(g.mx + g.nx * JETTY) + ' ' + f(g.my + g.ny * JETTY) + ') rotate(' + f(g.ang) + ')">' + j + '</g>';
  // the sign stands upright on the platform
  s += '<g transform="translate(' + f(g.mx + g.nx * DOCK) + ' ' + f(g.my + g.ny * DOCK) + ')"><ellipse cx="1.5" cy="3" rx="11" ry="10" fill="rgba(0,0,0,.35)"/><circle r="10" fill="' + (any ? '#f6ecd0' : COL[o.r][0]) + '" stroke="#3a2a14" stroke-width="1.6"/>';
  s += any ? '<text y="3.4" style="font:700 9.5px system-ui,sans-serif;text-anchor:middle;fill:#2a2212">3:1</text>'
    : '<g transform="translate(0 -3) scale(.48)">' + cardGlyph(o.r) + '</g><text y="7.8" style="font:700 7px system-ui,sans-serif;text-anchor:middle;fill:#111;stroke:#fff;stroke-width:2;paint-order:stroke">2:1</text>';
  return '<g class="deco">' + s + '</g><title>' + (any ? 'Port: 3 of anything for 1' : 'Port: 2 ' + RN[o.r] + ' for 1') + '</title></g>';
}
// --- The moving sea ---
// The board is rebuilt on every render, which would restart CSS animations. sync(ms) gives each one a
// negative delay matching the clock, so after a rebuild it carries on from where it was.
const sync = (ms, off) => 'animation-delay:-' + ((Date.now() + (off || 0)) % ms) + 'ms';
const ISLE = Math.max(...VERT.map(v => Math.hypot(v.x, v.y)));      // how far the island reaches from the middle
const SPARKS = [];      // fixed twinkle spots out at sea (same every game)
for (let k = 0, a = 7; SPARKS.length < 34 && k < 400; k++) {
  a = (a * 9301 + 49297) % 233280; const x = a / 233280 * 1000 - 500;
  a = (a * 9301 + 49297) % 233280; const y = a / 233280 * 860 - 400;
  if (Math.hypot(x, y) > ISLE + 50) SPARKS.push([x, y, (k * 577) % 4000]);
}
const SEADEFS = '<pattern id="p-wave" width="60" height="34" patternUnits="userSpaceOnUse"><path d="M4 10q6-5 12 0t12 0M34 27q6-5 12 0t12 0" fill="none" stroke="#bfeaf7" stroke-width="1.6" stroke-linecap="round" opacity=".35"/></pattern>' +
  '<pattern id="p-wave2" width="60" height="44" patternUnits="userSpaceOnUse"><path d="M18 20q5-4 10 0t10 0" fill="none" stroke="#9fd8ea" stroke-width="1.3" stroke-linecap="round" opacity=".25"/></pattern>';
function sea(sand) {
  let s = '<rect class="deco wave" style="' + sync(11000) + '" x="-700" y="-560" width="1400" height="1200" fill="url(#p-wave)"/>';
  s += '<rect class="deco wave b" style="' + sync(17000) + '" x="-700" y="-560" width="1400" height="1200" fill="url(#p-wave2)"/>';
  SPARKS.forEach(([x, y, o]) => { s += '<ellipse class="deco spark" style="' + sync(4000, o) + '" cx="' + x.toFixed(0) + '" cy="' + y.toFixed(0) + '" rx="3.5" ry="1.4"/>'; });
  // shallow water round the coast, then two rings of foam breaking on the beach, half a wave apart
  s += '<g class="deco" transform="translate(0 9)" fill="none" stroke-linejoin="round"><g stroke="rgba(110,205,225,.18)" stroke-width="64">' + sand + '</g><g stroke="rgba(130,215,232,.22)" stroke-width="40">' + sand + '</g></g>';
  s += '<g class="deco" transform="translate(0 9)"><g class="foam" style="' + sync(3600) + '">' + sand + '</g><g class="foam" style="' + sync(3600, 1800) + '">' + sand + '</g></g>';
  return s;
}
// --- Harvest effect ---
// After a roll's dice stop, the lands that paid out glow (HARV, drawn by drawBoard) and one little card per
// resource flies from each land to whoever got it: your hand, or that player's profile.
// A track building taken from someone (Rick, 2026-11-20; G.takefx, started by takeFx in flair.js): TAKE = {k, from, fp,
// to, p, t, id}. Over TAKEMS: the old owner's building shakes (0-12%), sinks into the ground (12-40%) back to a plain
// fort, its badge flies across (30-65%), and the new owner's grows up out of the ground (62-85%). Both maps.
let TAKE = null;
const TAKEMS = 4200;
const taking = () => !!(TAKE && G && G.id === TAKE.id && Date.now() - TAKE.t < TAKEMS);
let HARV = null, BLOCK = null;
const BLOCKMS = 1600;      // how long the red glow and the bandit's hops last
const blocking = () => !!(BLOCK && G && BLOCK.h === G.storm && Date.now() > BLOCK.t && Date.now() < BLOCK.t + BLOCKMS);
function harvestFx() {
  const sum = G.dice[0] + G.dice[1];
  if (sum === 7) return;
  const hs = [];
  G.hex.forEach((h, i) => { if (h.n === sum && i !== G.storm) hs.push(i); });
  // the bandit blocks its land (Rick, 2026-11-20): when its number comes up and a town or fort there misses out, the
  // land glows red instead of gold, the bandit hops on the spot, and a "Blocked" chip rises (BLOCK; both maps)
  const sb = G.deck && G.hex[G.storm] && G.hex[G.storm].n === sum && HEX[G.storm].v.some(v => G.b[v]) ? G.storm : -1;
  if (sb >= 0) {
    BLOCK = {h: sb, t: Date.now() + DICEMS};
    setTimeout(() => { if (G) { drawBoard(); blockPop(sb); } }, DICEMS);
    setTimeout(() => { if (G) drawBoard(); }, DICEMS + BLOCKMS + 50);      // (the flat map's glow and hop end)
  }
  if (!hs.length) return;
  HARV = {h: hs, t: Date.now() + DICEMS};
  setTimeout(() => {
    if (!G) return;
    drawBoard();
    harvestPop(hs);      // "+N" chips and sparkles (js/flair.js)
    const lands = document.querySelectorAll('#board .hex');
    let k = 0;
    hs.forEach(i => {
      const r = G.hex[i].t, A = D3.on ? D3.rect(i) : lands[i] && lands[i].getBoundingClientRect();
      if (!A) return;
      HEX[i].v.forEach(v => {
        const b = G.b[v]; if (!b) return;
        const hand = $('hand'), mine = b.p === VIEW && hand.offsetParent;
        const to = (mine ? hand : document.querySelector('#players .pl:nth-child(' + (b.p + 1) + ')'));
        if (!to) return;
        const B = to.getBoundingClientRect(), x0 = A.left + A.width / 2, y0 = A.top + A.height / 2, x1 = B.left + B.width / 2, y1 = B.top + B.height / 2;
        for (let n = 0; n < Math.min(3, b.l); n++) {
          const c = document.createElement('div');
          c.className = 'fly'; c.style.cssText = '--a:' + COL[r][0] + ';--b:' + COL[r][1];
          c.innerHTML = ico(r);
          document.body.appendChild(c);
          const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 80;      // arc up over the board
          c.animate([
            {transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.2)', opacity: 0},
            {transform: 'translate(' + x0 + 'px,' + (y0 - 18) + 'px) scale(1.15)', opacity: 1, offset: .2},
            {transform: 'translate(' + mx + 'px,' + my + 'px) scale(1) rotate(' + (b.p % 2 ? 12 : -12) + 'deg)', offset: .55},
            {transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.55)', opacity: .9}
          ], {duration: 1000, delay: k * 110, easing: 'ease-in-out', fill: 'both'}).onfinish = () => {
            c.remove();
            to.animate([{transform: 'scale(1)'}, {transform: 'scale(1.04)'}, {transform: 'scale(1)'}], {duration: 220});
          };
          setTimeout(() => c.remove(), 1300 + k * 110);      /* in case the finish event never comes (hidden tab) */
          k++;
        }
      });
    });
  }, DICEMS);
}
// --- Port trade boat ---
// G.ship = {n: counter, e: port edge, p: trader, give, get, k: how many given}. When n changes (on every screen,
// never on load) a boat sails in from the open sea to the port's jetty, a crate of what was bought goes onto the
// platform (and a card flies to the trader), a crate of what was paid goes aboard, and the boat turns and sails off.
// The trade boat on the flat map (bow to the right): wake, ropes from the masthead to the bowsprit and stern, mast with a
// crow's nest and flag, two sails, a stern cabin with a lit window and a lantern, railings, a hull with a stripe and portholes.
const SHIP = '<path d="M-27 1q-4 2-8 0M-26 5q-5 2-10 0" stroke="#e9f7ff" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".7"/>' +
  '<ellipse cx="0" cy="3" rx="21" ry="4.5" fill="rgba(0,20,40,.3)"/>' +
  '<path d="M2-36L27-9M2-36L-17-14" stroke="#5a3d22" stroke-width=".6"/>' +
  '<path d="M18-5L28-10" stroke="#4a2e14" stroke-width="1.4" stroke-linecap="round"/>' +
  '<path d="M2-6V-36" stroke="#4a2e14" stroke-width="1.8"/><path d="M2-36l7 2.2-7 2.2Z" fill="#d94a3a"/>' +
  '<path d="M3.5-34Q17-22 3.5-9Z" fill="#f4ecd6" stroke="#8a7a5a" stroke-width=".8"/><path d="M.5-31Q-11-21 .5-10Z" fill="#e6d9bc" stroke="#8a7a5a" stroke-width=".8"/>' +
  '<rect x="-.4" y="-30.5" width="4.8" height="2.4" rx=".6" fill="#7a4a22" stroke="#3a2210" stroke-width=".7"/>' +
  '<rect x="-19" y="-12.5" width="9" height="6.5" fill="#6a3e1c" stroke="#3a2210" stroke-width=".9"/><rect x="-19.8" y="-13.6" width="10.6" height="1.6" rx=".5" fill="#c9a46a" stroke="#3a2210" stroke-width=".6"/>' +
  '<rect x="-16.2" y="-10.8" width="3.2" height="2.6" fill="#ffd27a" stroke="#3a2210" stroke-width=".5"/><circle cx="-20.6" cy="-14.6" r="1.2" fill="#ffc45a" stroke="#555c63" stroke-width=".5"/>' +
  '<path d="M-9-8.6H17M-8-6V-8.6M-3-6V-8.6M7-6V-8.6M12-6V-8.6M17-6V-8.6" stroke="#4a2e14" stroke-width=".8"/>' +
  '<path d="M-20-6H20L15 3.5H-15.5Z" fill="#7a4a22" stroke="#3a2210" stroke-width="1.2" stroke-linejoin="round"/>' +
  '<path d="M-18.5-3H18.5" stroke="#c9a46a" stroke-width="1.4"/>' + [-9, -3, 3, 9].map(x => '<circle cx="' + x + '" cy=".6" r="1.1" fill="#2a1a0c" stroke="#c9a46a" stroke-width=".4"/>').join('');
const crate = (r, k) => '<rect x="-6.5" y="-12" width="13" height="12" rx="1.4" fill="#c08a4a" stroke="#5a3a18" stroke-width="1"/><path d="M-6.5-12l13 12M6.5-12l-13 12" stroke="#a87436" stroke-width=".8"/>' +
  '<circle cy="-6" r="5.2" fill="' + COL[r][0] + '" stroke="#5a3a18" stroke-width=".7"/><g transform="translate(0 -6) scale(.34)">' + cardGlyph(r) + '</g>' +
  (k > 1 ? '<text x="7.5" y="-10" style="font:800 6px system-ui,sans-serif;fill:#fff;stroke:#111;stroke-width:1.6;paint-order:stroke">×' + k + '</text>' : '');
// A Guard card: a knight lands on the bandit's land and chases the bandit to the new one, then vanishes.
// G.chase = {n counter, from, to, p}; played when n changes, never on load. 3D: D3.chase; flat map: chase2D.
let SEENCHASE = null;
function chaseFx() {
  const n = G.chase ? G.chase.n : 0, fresh = SEENCHASE !== null && n !== SEENCHASE && G.chase;
  SEENCHASE = n;
  if (!fresh) return;
  if (D3.on && D3.chase) D3.chase(G.chase); else chase2D(G.chase);
}
// A raid (2026-11-19, Rick's request; 3D only, pure show): the fleet sails up to the beach, then flees (the knights
// won) or waits until everyone has chosen a fort to lose and pillages them. G.raidfx = {n counter, r, v, w} (see raid()).
let SEENRAID = null;
function raidFx() {
  const n = G.raidfx ? G.raidfx.n : 0, fresh = SEENRAID !== null && n !== SEENRAID && G.raidfx;
  SEENRAID = n;
  if (fresh && D3.on && D3.raid) D3.raid(G.raidfx);
}
// Robbing (2026-11-19, Rick's request): the handed-over card lifts out of the robbed player's hand (or profile)
// and flies in an arc to the robber's hand (or profile). G.robfx = {n counter, from, to, r}; played when n
// changes, on every screen, never on load. Only the two players involved see which resource it is; everyone
// else sees the card's back. Runs in render() before the hand is redrawn, so the card is still there to start from.
let SEENROB = null;
function robFx() {
  const f = G.robfx, n = f ? f.n : 0, fresh = SEENROB !== null && n !== SEENROB && f;
  SEENROB = n;
  if (!fresh || !G.pl[f.from] || !G.pl[f.to]) return;
  const hand = $('hand'), shown = hand.offsetParent;
  const spot = p => p === VIEW && shown ? hand : document.querySelector('#players .pl:nth-child(' + (p + 1) + ')');
  const from = f.from === VIEW && shown ? [...hand.querySelectorAll('.rc[data-r="' + f.r + '"]')].pop() || hand : spot(f.from), to = spot(f.to);
  if (!from || !to) return;
  const see = NET.role ? NET.seat === f.from || NET.seat === f.to : !G.pl[f.from].bot || !G.pl[f.to].bot;      // same screen: any human there may look
  const A = from.getBoundingClientRect(), B = to.getBoundingClientRect();
  const x0 = A.left + A.width / 2, y0 = A.top + A.height / 2, x1 = B.left + B.width / 2, y1 = B.top + B.height / 2;
  const c = document.createElement('div');
  c.className = 'fly big' + (see ? '' : ' back');
  if (see) { c.style.cssText = '--a:' + COL[f.r][0] + ';--b:' + COL[f.r][1]; c.innerHTML = ico(f.r); }
  document.body.appendChild(c);
  const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 110, tilt = x1 > x0 ? 14 : -14;
  c.animate([
    {transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(1)', opacity: 1},
    {transform: 'translate(' + x0 + 'px,' + (y0 - 40) + 'px) scale(1.25) rotate(' + (-tilt / 2) + 'deg)', opacity: 1, offset: .22},
    {transform: 'translate(' + mx + 'px,' + my + 'px) scale(1.1) rotate(' + tilt + 'deg)', offset: .6},
    {transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.6)', opacity: .9}
  ], {duration: 1300, easing: 'ease-in-out', fill: 'both'}).onfinish = () => {
    c.remove();
    to.animate([{transform: 'scale(1)'}, {transform: 'scale(1.05)'}, {transform: 'scale(1)'}], {duration: 240});
  };
  if (from !== hand && from.classList.contains('pl')) from.animate([{transform: 'translateX(0)'}, {transform: 'translateX(-4px)'}, {transform: 'translateX(4px)'}, {transform: 'translateX(0)'}], {duration: 300});      // the robbed profile flinches
  setTimeout(() => c.remove(), 1600);      // in case the finish event never comes (hidden tab)
}
const CHASE2MS = 3800;
let CHASE2 = null;       // {end}: while the flat-map chase plays, drawBoard leaves the bandit out
const chase2Busy = () => !!CHASE2 && Date.now() < CHASE2.end;
const chasing = () => chase2Busy() || !!(D3.on && D3.chasing && D3.chasing());      // the rob window waits for either
// The knight on the flat map, in player p's colours, feet at 0,17 like BANDIT; its sword arm (.k-arm) turns at the shoulder
const knight2D = c => '<ellipse cx="2" cy="17" rx="13" ry="4.5" fill="rgba(0,0,0,.45)"/>' +
  '<g stroke="#3a3f47" stroke-width="1.2"><rect x="-6" y="6" width="4.5" height="11" rx="1.5" fill="#b8bec8"/><rect x="1.5" y="6" width="4.5" height="11" rx="1.5" fill="#9aa1ab"/></g>' +
  '<rect x="-6.6" y="14" width="5.6" height="3.6" rx="1" fill="#2a1a10"/><rect x="1" y="14" width="5.6" height="3.6" rx="1" fill="#2a1a10"/>' +
  '<path d="M-9 8C-9-2-8-6-6-7H6C8-6 9-2 9 8Z" fill="#c4cad3" stroke="#3a3f47" stroke-width="1.4"/><path d="M2-7H6C8-6 9-2 9 8H3Z" fill="rgba(0,0,0,.18)"/>' +
  '<path d="M-4.5-6H4.5V9L0 11L-4.5 9Z" fill="' + c + '" stroke="#1d1d1d" stroke-width=".9"/><path d="M0-2.6l2 2-2 2-2-2z" fill="#e8b84a"/>' +
  '<path d="M-6.5-8V-18A6.5 6.5 0 0 1 6.5-18V-8Z" fill="#c4cad3" stroke="#3a3f47" stroke-width="1.4"/><rect x="-5" y="-15" width="10" height="1.8" fill="#1d1610"/><rect x="-.8" y="-15" width="1.6" height="5" fill="#1d1610"/>' +
  '<path d="M0-24C-3-30 2-34 7-31C3-30 2-27 1-24Z" fill="' + c + '" stroke="#1d1d1d" stroke-width=".8"/>' +
  '<path d="M-15-4H-5V4C-5 9-10 11-10 11C-10 11-15 9-15 4Z" fill="' + c + '" stroke="#3a3f47" stroke-width="1.4"/><circle cx="-10" cy="1" r="1.6" fill="#e8b84a"/>' +
  '<g class="k-arm" style="transform-origin:7px -5px"><path d="M7-5L10 4" stroke="#9aa1ab" stroke-width="3.6" stroke-linecap="round"/><rect x="9" y="1" width="2.2" height="4" fill="#3a2a1c"/>' +
  '<rect x="7.6" y="4.6" width="5" height="1.4" fill="#e8b84a"/><path d="M9.4 6h1.6v14l-.8 2-.8-2z" fill="#e8edf2" stroke="#6b7480" stroke-width=".6"/></g>';
// --- Progress card pictures (Rick, 2026-11-18) ---
// CARDART[code] = {col: [light, dark] card colours, vb: the picture's viewBox, svg: c => picture (c = the viewer's colour)}
const CARDART = {
  // Knight: the same knight that chases the bandit, in your colours
  k: {col: ['#6f8fb8', '#2b4366'], vb: '-19 -37 38 57', svg: c => knight2D(c)},
  // Victory Point: a gold trophy with a star
  p: {col: ['#f2c94c', '#a8741a'], vb: '-12 -12 24 24', svg: () =>
    '<path d="M-6.5-7.5h-3a3.2 3.2 0 0 0 3.6 5.2M6.5-7.5h3a3.2 3.2 0 0 1-3.6 5.2" fill="none" stroke="#6a4a0e" stroke-width="1.5"/>' +
    '<path d="M-6.5-10h13v5a6.5 6.5 0 0 1-13 0z" fill="#ffd95e" stroke="#6a4a0e" stroke-width="1"/><path d="M2-10h4.5v5a6.5 6.5 0 0 1-3 5.4z" fill="rgba(0,0,0,.15)"/>' +
    '<path d="M0-8.6l1.3 2.6 2.9.4-2.1 2 .5 2.9L0-2l-2.6 1.3.5-2.9-2.1-2 2.9-.4z" fill="#fff6c8" stroke="#b8860b" stroke-width=".5"/>' +
    '<rect x="-1.4" y="1.2" width="2.8" height="4" fill="#e0b13a" stroke="#6a4a0e" stroke-width=".7"/><rect x="-5.5" y="5" width="11" height="3.6" rx="1" fill="#8a5a2b" stroke="#4a2e14" stroke-width=".9"/>' +
    '<rect x="-3" y="5.8" width="6" height="1.8" fill="#e8b84a"/>'},
  // Road Building: two road pieces in your colour (like the ones on the board) and a hammer
  r: {col: ['#c98a58', '#7a4520'], vb: '-12 -12 24 24', svg: c => {
    const road = (x1, y1, x2, y2) => '<path d="M' + x1 + ' ' + (y1 + 1.2) + 'L' + x2 + ' ' + (y2 + 1.2) + '" stroke="rgba(0,0,0,.4)" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '" stroke="#111" stroke-width="5" stroke-linecap="round"/><path d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '" stroke="' + c + '" stroke-width="2.8" stroke-linecap="round"/>' +
      '<path d="M' + (x1 + .6) + ' ' + (y1 - .8) + 'L' + (x2 + .6) + ' ' + (y2 - .8) + '" stroke="rgba(255,255,255,.45)" stroke-width=".7" stroke-linecap="round"/>';
    return road(-9, 8, -2, -4) + road(1, 8, 9, -4) +
      '<g transform="rotate(35 4 -6)"><rect x="3.2" y="-8" width="1.6" height="11" rx=".6" fill="#8a5a2b" stroke="#3a2210" stroke-width=".6"/><rect x="0" y="-10" width="8" height="3" rx=".6" fill="#9aa1ab" stroke="#3a3f47" stroke-width=".7"/></g>' +
      '<text x="-11" y="-5" style="font:900 6.5px system-ui,sans-serif;fill:#fff;stroke:#111;stroke-width:1.5;paint-order:stroke">+2</text>';
  }},
  // Year of Plenty: an overflowing basket of resources
  h: {col: ['#86c95e', '#3e7a2a'], vb: '-12 -12 24 24', svg: () =>
    '<g transform="translate(-5 -3) scale(.42)">' + cardGlyph('grain') + '</g><g transform="translate(5 -4) scale(.4)">' + cardGlyph('wool') + '</g>' +
    '<g transform="translate(0 -6.5) scale(.36)">' + cardGlyph('wood') + '</g><g transform="translate(-1 -1.5) scale(.32)">' + cardGlyph('stone') + '</g>' +
    '<path d="M-10 0h20l-2.5 9h-15z" fill="#c08a4a" stroke="#5a3a18" stroke-width="1"/><path d="M-9 3.5h18M-8 6.5h16M-5 0l-1 9M0 0v9M5 0l1 9" stroke="#8a5a2b" stroke-width=".8"/>' +
    '<rect x="-10.6" y="-1.2" width="21.2" height="2.4" rx="1.2" fill="#d9a865" stroke="#5a3a18" stroke-width=".8"/>'},
  // Tribute: a crown with cards streaming in from both sides
  m: {col: ['#a77fd0', '#4f2d7a'], vb: '-12 -12 24 24', svg: () =>
    '<g transform="rotate(-24 -7 5)"><rect x="-10" y="1" width="6" height="8.5" rx="1" fill="#f7f1df" stroke="#111" stroke-width=".7"/></g><g transform="rotate(24 7 5)"><rect x="4" y="1" width="6" height="8.5" rx="1" fill="#f7f1df" stroke="#111" stroke-width=".7"/></g>' +
    '<path d="M-6.5 3.5h13M-6.8 6.5h13.6" stroke="none"/><path d="M-7.5 2l-1.5-9 4.5 4 4.5-6 4.5 6 4.5-4-1.5 9z" fill="#ffd95e" stroke="#6a4a0e" stroke-width="1" stroke-linejoin="round"/>' +
    '<rect x="-7.5" y="2" width="15" height="3.4" rx=".8" fill="#e0b13a" stroke="#6a4a0e" stroke-width=".9"/><circle cx="-4" cy="3.7" r="1" fill="#c62828"/><circle cx="0" cy="3.7" r="1.1" fill="#2a6fb0"/><circle cx="4" cy="3.7" r="1" fill="#2e8b57"/>' +
    '<circle cx="-9" cy="-7" r="1.2" fill="#ffd95e"/><circle cx="9" cy="-7" r="1.2" fill="#ffd95e"/><circle cx="0" cy="-9" r="1.2" fill="#ffd95e"/>'}
};
// Forts and Knights cards: blue Science, green Trade, gold Politics; each picture is drawn here
{
  const SC = ['#5d9fe0', '#24508a'], TC = ['#4fbf8a', '#1f6a48'], PC = ['#e8b84a', '#8a5a12'];
  const txt = (x, y, s) => '<text x="' + x + '" y="' + y + '" style="font:900 6.5px system-ui,sans-serif;fill:#fff;stroke:#111;stroke-width:1.5;paint-order:stroke">' + s + '</text>';
  const card = (x, y, r) => '<rect x="' + x + '" y="' + y + '" width="8" height="11" rx="1" fill="#f7f1df" stroke="#111" stroke-width=".7" transform="rotate(' + r + ' ' + (x + 4) + ' ' + (y + 5.5) + ')"/>';
  const scroll = '<rect x="-8" y="-8" width="16" height="15" rx="1.5" fill="#fbf4df" stroke="#7a6a44" stroke-width="1"/><path d="M-5-4h10M-5-1h10M-5 2h6" stroke="#a89a74" stroke-width=".8"/>';
  const add = (c, col, svg) => { CARDART[c] = {col, vb: '-12 -12 24 24', svg}; };
  add('star', SC, () => '<path d="M-6 10L-1 0L4 10M-1 0v10" stroke="#3a2a1c" stroke-width="1.2" fill="none"/><g transform="rotate(-35 -1 0)"><rect x="-9" y="-3" width="16" height="4.4" rx="1.4" fill="#c9a46a" stroke="#3a2a1c" stroke-width=".9"/><rect x="5" y="-3.6" width="3" height="5.6" rx="1" fill="#8a5a2b" stroke="#3a2a1c" stroke-width=".8"/></g>' +
    '<path d="M7-11l1.2 2.5 2.7.4-2 1.9.5 2.7L7-4.8 4.6-3.5l.5-2.7-2-1.9 2.7-.4z" fill="#fff6c8" stroke="#b8860b" stroke-width=".5"/>');
  add('mason', SC, () => '<g fill="#c1563a" stroke="#5a2410" stroke-width=".8"><rect x="-10" y="4" width="8" height="4"/><rect x="-2" y="4" width="8" height="4"/><rect x="-6" y="0" width="8" height="4"/></g><path d="M3-9l6 6-4 1-3-3z" fill="#b8bec8" stroke="#3a3f47" stroke-width=".8"/><path d="M2-4l-3 3" stroke="#6a4a24" stroke-width="2" stroke-linecap="round"/>' + txt(-11, -4, '−1'));
  add('wallb', SC, c => '<g transform="translate(0 1) scale(.58)">' + WALL2D('back') + FORT2D(c) + WALL2D('front') + '</g>');
  add('canal', SC, () => '<g transform="translate(0 -3) scale(.55)">' + cardGlyph('grain') + '</g><path d="M-11 6q3-2 6 0t6 0t6 0t6 0V11H-11z" fill="#4a9be0" stroke="#1d3e66" stroke-width=".6"/>' + txt(4, -5, '+2'));
  add('healer', SC, c => '<g transform="translate(-3 3) scale(.6)">' + FORT2D(c) + '</g><path d="M7 5V-5M3-1l4-4 4 4" stroke="#7fe0a0" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M-8-10.5v5.5M-10.75-7.75h5.5" stroke="#fff" stroke-width="2"/>');
  add('mine', SC, () => '<g transform="translate(-3 4) scale(.5)">' + cardGlyph('stone') + '</g><path d="M-6-8q8-4 14 2" stroke="#b8bec8" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M2-7l-6 14" stroke="#6a4a24" stroke-width="1.8" stroke-linecap="round"/>' + txt(4, 9, '+2'));
  add('survey', SC, c => '<rect x="-10" y="-8" width="20" height="16" rx="1.5" fill="#efe2bf" stroke="#6a5a34" stroke-width="1"/><path d="M-7 5q3-6 7-2t7-7" stroke="' + c + '" stroke-width="1.8" stroke-dasharray="2 1.6" fill="none"/><circle cx="7" cy="-4" r="1.7" fill="#c62828"/>' + txt(-9, -2, '+2'));
  add('armour', SC, () => '<path d="M-9 1h14l-2 3h-3v4h4v2h-12v-2h4v-4h-3z" fill="#4a5262" stroke="#1d2129" stroke-width=".8"/><path d="M9-11l-8 9" stroke="#e8edf2" stroke-width="1.8" stroke-linecap="round"/><path d="M0-4l3 3" stroke="#3a2a1c" stroke-width="1.6"/><circle cx="-2" cy="-1" r=".8" fill="#ffd27a"/><circle cx="-4" cy="-3" r=".6" fill="#ffd27a"/>');
  add('press', SC, () => '<rect x="-8" y="-6" width="16" height="14" fill="none" stroke="#5a3d22" stroke-width="2"/><path d="M0-11v7M-4-11h8" stroke="#5a3d22" stroke-width="2"/><rect x="-5" y="-3" width="10" height="3" fill="#8a5a2b"/><rect x="-6" y="2" width="12" height="4" fill="#fbf4df" stroke="#7a6a44" stroke-width=".7"/>' + txt(4, -6, '+1'));
  add('dues', TC, () => '<path d="M0-8v15M-4-5h8M-8 2q0 6 8 6t8-6" stroke="#0f3a24" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cy="-9.5" r="1.8" fill="none" stroke="#0f3a24" stroke-width="1.4"/><g transform="translate(6 -5) scale(.42)">' + cardGlyph('coin') + '</g>');
  add('dealer', TC, () => card(-10, -6, -12) + card(-3, -7, 8) + '<path d="M10 7H3m3-3-3 3 3 3" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>' + txt(4, -6, '2'));
  add('market', TC, () => '<path d="M-10-4l2-5h16l2 5z" fill="#f2c14e" stroke="#6a4a0e" stroke-width=".8"/><path d="M-6-9l-1 5M-2-9v5M2-9v5M6-9l1 5" stroke="#c62828" stroke-width="1.6"/><path d="M-9-4v12M9-4v12" stroke="#5a3d22" stroke-width="1.4"/><rect x="-10" y="3" width="20" height="3" fill="#8a5a2b"/><g transform="translate(0 -.5) scale(.32)">' + cardGlyph('wool') + '</g>' + txt(-4, 11, '2:1'));
  add('fleet', TC, () => '<g transform="translate(-1 5) scale(.3)">' + SHIP + '</g><g transform="translate(7 -2) scale(.24)">' + SHIP + '</g>' + txt(-11, -5, '2:1'));
  add('levy', TC, () => '<path d="M-6-4q-2-3 1-5h10q3 2 1 5q5 4 3 11h-18q-2-7 3-11z" fill="#c9a46a" stroke="#5a3a18" stroke-width="1"/><path d="M-5-4h10" stroke="#5a3a18" stroke-width="1.2"/>' + txt(-2.5, 6, '2'));
  add('guild', TC, () => scroll + '<circle cx="5" cy="6" r="3.2" fill="#c62828" stroke="#6a1010" stroke-width=".8"/><path d="M3.5 9l-1 3M6.5 9l1 3" stroke="#c62828" stroke-width="1.2"/>');
  add('magi', PC, () => '<g transform="translate(-4 2) scale(.42)">' + BANDIT + '</g><g transform="rotate(-30 6 -4)"><rect x="2" y="-7" width="8" height="4" rx="1" fill="#8a5a2b" stroke="#3a2210" stroke-width=".8"/><rect x="5.3" y="-3" width="1.4" height="8" fill="#6a4a24"/></g>');
  add('charter', PC, () => scroll + '<g transform="translate(4 5) scale(.38)">' + TRACKICON.pol + '</g>' + txt(-10, -8, '+1'));
  add('turn', PC, c => '<g transform="translate(0 3.5) scale(.42)">' + knight2D(c) + '</g><path d="M-11-6h6m-2-2 2 2-2 2M11 6H5m2-2-2 2 2 2" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>');
  add('plot', PC, () => '<path d="M-9-2q4-4 9 0q5-4 9 0q-1 5-4.5 5q-2 0-4.5-2q-2.5 2-4.5 2q-3.5 0-4.5-5z" fill="#2a2a2a" stroke="#000" stroke-width=".6"/><circle cx="-4" cy="0" r="1.3" fill="#e8b84a"/><circle cx="4" cy="0" r="1.3" fill="#e8b84a"/><path d="M6 11l4-8" stroke="#e8edf2" stroke-width="1.6"/><path d="M4.6 9.4l3 1.4" stroke="#6a4a24" stroke-width="2"/>' + '<path d="M-6-8h2l1-2" stroke="#fff" stroke-width=".8" fill="none"/>');
  add('fire', PC, () => '<path d="M-1 10l-2-12h6l-2 12z" fill="#8a5a2b" stroke="#3a2210" stroke-width=".8"/><path d="M0-2c-5-2-5-7 0-12c1 4 5 5 4 9s-2 3-4 3z" fill="#ff8a2a"/><path d="M0-3c-2-1-2-4 0-6c.6 2 2.2 2.6 2 4.4s-1 1.6-2 1.6z" fill="#ffe08a"/>');
  add('snoop', PC, () => card(-10, -8, -6) + '<circle cx="3" cy="0" r="5" fill="rgba(200,230,255,.55)" stroke="#3a2a1c" stroke-width="1.6"/><path d="M6.5 3.5l4 4" stroke="#3a2a1c" stroke-width="2.2" stroke-linecap="round"/>');
  add('rally', PC, () => '<path d="M-9 2q4-1 12-8v14q-8-6-12-6z" fill="#e0b13a" stroke="#6a4a0e" stroke-width=".9"/><path d="M-9 0v4" stroke="#6a4a0e" stroke-width="1.6"/><path d="M5-6q3 4 0 8M8-8q4 6 0 12" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round"/>');
  add('feast', PC, () => '<rect x="-10" y="3" width="20" height="2.5" fill="#8a5a2b"/><path d="M-8 5.5v5M8 5.5v5" stroke="#5a3d22" stroke-width="1.4"/><ellipse cx="0" cy="3" rx="7" ry="1.4" fill="#e8edf2"/><ellipse cx="0" cy="0" rx="5" ry="3" fill="#b5651d" stroke="#5a2a0a" stroke-width=".8"/><path d="M-8-4h3l-.6 4h-1.8zM5-4h3l-.6 4h-1.8z" fill="#e8b84a" stroke="#6a4a0e" stroke-width=".5"/>');
}
// Same timeline as the 3D one: 0-.22 the knight drops in · dust ring · sword up and shaking · .24-.34 the bandit jumps in fright ·
// .36-.78 it bounds in three hops to its new land · .78-.86 lands · .82-1 the knight spins, shrinks and rises away
function chase2D(c) {
  const layer = $('ships'), A = HEX[c.from], B = HEX[c.to];
  if (!layer || !A || !B || c.from === c.to) return;
  CHASE2 = {end: Date.now() + CHASE2MS};
  drawBoard();      // take the bandit off the board while this copy runs
  const NS = 'http://www.w3.org/2000/svg', make = html => { const e = document.createElementNS(NS, 'g'); e.innerHTML = html; layer.appendChild(e); return e; };
  const P = (x, y, r, sx, sy) => 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (r || 0) + 'deg) scale(' + (sx == null ? 1 : sx) + ',' + (sy == null ? 1 : sy) + ')';
  const opt = {duration: CHASE2MS, fill: 'both'}, ax = A.x, ay = A.y - 4, bx = B.x, by = B.y - 4, dir = bx < ax ? -1 : 1, kx = ax - dir * 22;
  const ring = make('<ellipse rx="10" ry="4" fill="none" stroke="#fff4d6" stroke-width="2.5"/>');
  ring.animate([{offset: 0, transform: P(kx, ay + 17, 0, .2, .2), opacity: 0}, {offset: .22, transform: P(kx, ay + 17, 0, .2, .2), opacity: 0}, {offset: .23, transform: P(kx, ay + 17, 0, .3, .3), opacity: .9},
    {offset: .42, transform: P(kx, ay + 17, 0, 3.5, 3.5), opacity: 0}, {offset: 1, transform: P(kx, ay + 17, 0, 3.5, 3.5), opacity: 0}], opt);
  // the bandit: a copy that jumps, then bounds away
  const bandit = make(BANDIT), bf = [{offset: 0, transform: P(ax, ay)}, {offset: .24, transform: P(ax, ay)}, {offset: .29, transform: P(ax, ay - 14, -8)}, {offset: .34, transform: P(ax, ay)}, {offset: .36, transform: P(ax, ay)}];
  for (let i = 1; i <= 12; i++) {
    const k = i / 12, e = k * k * (3 - 2 * k);
    bf.push({offset: .36 + .42 * k, transform: P(ax + (bx - ax) * e, ay + (by - ay) * e - Math.abs(Math.sin(k * Math.PI * 3)) * 14 - Math.sin(k * Math.PI) * 18, 0, dir)});
  }
  bf.push({offset: .81, transform: P(bx, by, 0, 1.12, .85)}, {offset: .86, transform: P(bx, by)}, {offset: 1, transform: P(bx, by)});
  bandit.animate(bf, opt);
  // the knight, facing the way the bandit runs
  const kn = make(knight2D(PCOL[c.p] || '#c62828'));
  kn.animate([{offset: 0, transform: P(kx, ay - 170, 0, dir), easing: 'cubic-bezier(.55,0,1,.6)'}, {offset: .22, transform: P(kx, ay, 0, dir)}, {offset: .26, transform: P(kx, ay + 2, 0, dir * 1.15, .8)},
    {offset: .3, transform: P(kx, ay, 0, dir)}, {offset: .82, transform: P(kx, ay, 0, dir), easing: 'ease-in'}, {offset: 1, transform: P(kx, ay - 34, 360, dir * .01, .01)}], opt);
  kn.animate([{opacity: 0}, {opacity: 1, offset: .04}, {opacity: 1, offset: .88}, {opacity: 0}], opt);
  kn.querySelector('.k-arm').animate([{offset: 0, transform: 'rotate(0deg)'}, {offset: .26, transform: 'rotate(0deg)'}, {offset: .34, transform: 'rotate(-160deg)'}, {offset: .42, transform: 'rotate(-138deg)'},
    {offset: .5, transform: 'rotate(-165deg)'}, {offset: .58, transform: 'rotate(-138deg)'}, {offset: .66, transform: 'rotate(-160deg)'}, {offset: 1, transform: 'rotate(-160deg)'}], opt);
  setTimeout(() => { ring.remove(); bandit.remove(); kn.remove(); CHASE2 = null; if (G) render(); }, CHASE2MS + 60);
}
const SHIPMS = 4800;
let SEENSHIP = null;
function shipFx() {
  const n = G.ship ? G.ship.n : 0, fresh = SEENSHIP !== null && n !== SEENSHIP && G.ship;
  SEENSHIP = n;
  if (fresh) sailShip(G.ship);
}
function sailShip(t) {
  if (D3.on) { D3.sail(t); return; }      // the 3D board has its own boat
  const o = (G.ports || []).find(q => q.e === t.e), layer = $('ships');
  if (!o || !layer) return;
  const g = portGeo(o), NS = 'http://www.w3.org/2000/svg';
  const at = (d, side) => [g.mx + g.nx * d + g.tx * side, g.my + g.ny * d + g.ty * side];
  // it ties up beside the platform (not in front, where it would hide the sign), arriving from that side and leaving the other way
  const B = at(DOCK + 14, 38), D = at(DOCK, 0), S0 = at(BERTH + 230, 190), E = at(BERTH + 240, -140), deck = -6;
  const sIn = S0[0] <= B[0] ? 1 : -1, sOut = E[0] >= B[0] ? 1 : -1;      // the boat faces the way it's going
  const tr = (P, s, dy) => 'translate(' + P[0].toFixed(1) + 'px,' + (P[1] + (dy || 0)).toFixed(1) + 'px)' + (s ? ' scaleX(' + s + ')' : '');
  // cargo rides on the front deck (15.5 units towards the bow), clear of the mast and sails; f = which way the boat faces
  const bow = (P, f) => [P[0] + f * 15.5, P[1]];
  const arc = (P, Q) => [(P[0] + Q[0]) / 2, Math.min(P[1], Q[1]) - 16];
  const IN = 'cubic-bezier(.2,.6,.3,1)', OUT = 'cubic-bezier(.6,0,.85,.6)';
  const make = html => { const e = document.createElementNS(NS, 'g'); e.innerHTML = html; layer.appendChild(e); return e; };
  const boat = make('<g class="bob">' + SHIP + '</g>'), got = make(crate(t.get, 1)), paid = make(crate(t.give, t.k));
  const opt = {duration: SHIPMS, fill: 'both'};
  // sail in (0-35%), wait while unloading and loading, turn round (60-66%), sail away (66-100%)
  boat.animate([
    {offset: 0, transform: tr(S0, sIn), easing: IN}, {offset: .35, transform: tr(B, sIn)},
    {offset: .6, transform: tr(B, sIn), easing: 'ease-in-out'}, {offset: .66, transform: tr(B, sOut), easing: OUT}, {offset: 1, transform: tr(E, sOut)}
  ], opt);
  boat.animate([{opacity: 0}, {opacity: 1, offset: .08}, {opacity: 1, offset: .9}, {opacity: 0}], opt);
  // what was bought rides in on deck, then hops onto the platform
  got.animate([
    {offset: 0, transform: tr(bow(S0, sIn), 0, deck), easing: IN}, {offset: .35, transform: tr(bow(B, sIn), 0, deck)}, {offset: .4, transform: tr(bow(B, sIn), 0, deck), easing: 'ease-out'},
    {offset: .46, transform: tr(arc(bow(B, sIn), D))}, {offset: .52, transform: tr(D)}, {offset: 1, transform: tr(D)}
  ], opt);
  got.animate([{opacity: 0}, {opacity: 1, offset: .08}, {opacity: 1, offset: .56}, {opacity: 0, offset: .62}, {opacity: 0}], opt);
  // what was paid appears on the platform, hops aboard and sails away
  paid.animate([
    {offset: 0, transform: tr(D)}, {offset: .54, transform: tr(D), easing: 'ease-out'}, {offset: .59, transform: tr(arc(D, bow(B, sOut)))},
    {offset: .64, transform: tr(bow(B, sOut), 0, deck)}, {offset: .66, transform: tr(bow(B, sOut), 0, deck), easing: OUT}, {offset: 1, transform: tr(bow(E, sOut), 0, deck)}
  ], opt);
  paid.animate([{opacity: 0}, {opacity: 0, offset: .5}, {opacity: 1, offset: .54}, {opacity: 1, offset: .9}, {opacity: 0}], opt);
  // as the bought crate is opened, its card flies to the trader's hand (or their profile)
  setTimeout(() => {
    if (!G || !got.isConnected) return;
    const A = got.getBoundingClientRect(), hand = $('hand'), mine = t.p === VIEW && hand.offsetParent;
    const to = mine ? hand : document.querySelector('#players .pl:nth-child(' + (t.p + 1) + ')');
    if (!to) return;
    const Z = to.getBoundingClientRect(), x0 = A.left + A.width / 2, y0 = A.top + A.height / 2, x1 = Z.left + Z.width / 2, y1 = Z.top + Z.height / 2;
    const c = document.createElement('div');
    c.className = 'fly'; c.style.cssText = '--a:' + COL[t.get][0] + ';--b:' + COL[t.get][1];
    c.innerHTML = ico(t.get);
    document.body.appendChild(c);
    c.animate([
      {transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.3)', opacity: 0},
      {transform: 'translate(' + x0 + 'px,' + (y0 - 20) + 'px) scale(1.15)', opacity: 1, offset: .2},
      {transform: 'translate(' + ((x0 + x1) / 2) + 'px,' + (Math.min(y0, y1) - 80) + 'px) scale(1)', offset: .55},
      {transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.55)', opacity: .9}
    ], {duration: 1000, easing: 'ease-in-out', fill: 'both'}).onfinish = () => { c.remove(); to.animate([{transform: 'scale(1)'}, {transform: 'scale(1.04)'}, {transform: 'scale(1)'}], {duration: 220}); };
    setTimeout(() => c.remove(), 1200);
  }, SHIPMS * .56);
  setTimeout(() => { boat.remove(); got.remove(); paid.remove(); }, SHIPMS + 100);
}
// the Upgrade button's mode places a Keep on a plain fort or a Citadel on a Keep
const upWhat = (what, v) => what === 'upgrade' ? (G.b[v] && G.b[v].u ? 'citadel' : 'keep') : what;
// which raid victim this screen picks a fort for: wifi = your own seat if you must pick; same screen = the first human
function sackWho() {
  if (!G || G.phase !== 'sack' || !G.sack) return -1;
  if (NET.role) return G.sack.includes(NET.seat) ? NET.seat : -1;
  const i = G.sack.find(q => !G.pl[q].bot);
  return i == null ? -1 : i;
}
function placing() {   // what the current human is placing right now, if anything
  if (G && G.phase === 'sack') return sackWho() >= 0 ? 'sack' : null;      // (a raid victim picks out of turn)
  if (!myTurn()) return null;
  return G.phase === 'setup' ? G.su.step : G.phase === 'storm' ? 'storm' : G.phase === 'castle' ? 'castle' : G.phase === 'main' ? MODE : null;
}
function drawBoard() {
  noteDrops();
  let s = DEFS.replace('</defs>', SEADEFS + '</defs>');
  // the island: a soft shadow on the sea, a sandy cliff, then the beach on top
  const sand = HEX.map(h => '<polygon points="' + corners(h, 1) + '"/>').join('');
  s += sea(sand);
  s += '<g class="deco" transform="translate(0 20)" fill="#03111c" stroke="#03111c" stroke-width="22" stroke-linejoin="round" opacity=".55" filter="url(#f-soft)">' + sand + '</g>';
  s += '<g class="deco" transform="translate(0 9)" fill="#a98f55" stroke="#a98f55" stroke-width="16" stroke-linejoin="round">' + sand + '</g>';
  s += '<g class="beach">' + sand + '</g>';
  (G.ports || []).forEach(o => { s += port(o); });
  HEX.forEach((h, i) => {
    const t = G.hex[i];
    // each land is a raised tile: its dark side shows below the lit top
    s += '<polygon class="deco" transform="translate(0 5)" points="' + corners(h, TILE) + '" fill="' + COL[t.t][2] + '"/>';
    s += '<polygon class="hex" points="' + corners(h, TILE) + '" fill="url(#g-' + t.t + ')"><title>' + landName(t.t) + (t.n ? ': gives ' + RN[t.t] + ' on a roll of ' + t.n : ': gives nothing') + '</title></polygon>';
    s += '<polygon class="deco" points="' + corners(h, TILE - .06) + '" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="1.5"/>';
    if (!t.n) { s += '<g class="deco" transform="translate(' + h.x.toFixed(1) + ' ' + h.y.toFixed(1) + ')">' + LAIR + '</g>'; return; }
    s += '<g class="deco" transform="translate(' + h.x.toFixed(1) + ' ' + h.y.toFixed(1) + ')">' + scene(t.t, i) + '</g>';
    // the number disc sits in the exact middle of the tile
    s += '<ellipse class="deco" cx="' + (h.x + 2).toFixed(1) + '" cy="' + (h.y + 4) + '" rx="16" ry="15" fill="rgba(0,0,0,.35)"/><circle class="deco" cx="' + h.x.toFixed(1) + '" cy="' + (h.y + 2.5) + '" r="15" fill="#8d7b4d"/>';
    s += '<circle class="deco tok" cx="' + h.x.toFixed(1) + '" cy="' + h.y + '" r="15"/>';
    s += '<text class="deco num' + (pips(t.n) === 5 ? ' hot' : '') + '" x="' + h.x.toFixed(1) + '" y="' + (h.y + 4) + '">' + t.n + '</text>';
    const n = pips(t.n);
    for (let k = 0; k < n; k++) s += '<circle class="deco" cx="' + (h.x + (k - (n - 1) / 2) * 4).toFixed(1) + '" cy="' + (h.y + 9.5) + '" r="1.2" fill="' + (n === 5 ? '#c62828' : '#5b4a2a') + '"/>';
  });
  if (HARV && Date.now() < HARV.t + 1600) HARV.h.forEach(i => {      // lands that just paid out glow
    s += '<polygon class="deco hglow" style="animation-delay:' + (HARV.t - Date.now()) + 'ms" points="' + corners(HEX[i], TILE) + '"/>';
  });
  if (G.deck && HEX[G.storm]) {       // the bandit, standing on the land they block
    const h = HEX[G.storm];
    s += '<polygon class="deco" points="' + corners(h, TILE) + '" fill="rgba(12,18,34,.45)"/>';
    const bl = blocking(), late = bl ? BLOCK.t - Date.now() : 0;      // (its number came up: red glow and hops, see harvestFx)
    if (bl) s += '<polygon class="deco bglow" style="animation-delay:' + late + 'ms" points="' + corners(h, TILE) + '"/>';
    if (!chase2Busy()) s += '<g class="deco" transform="translate(' + h.x.toFixed(1) + ' ' + (h.y - 4).toFixed(1) + ')">' +
      (bl ? '<g class="bhop" style="animation-delay:' + late + 'ms">' + drop('storm', G.storm, BANDIT) + '</g>' : drop('storm', G.storm, BANDIT)) + '</g>';      // (a Guard's chase draws its own)
  }
  // the longest route (2026-11-19): a plain gold edge under its roads and a thin gold line along them (still: the flat map
  // stays simple; 3D has the glowing strip)
  const route = G.lr != null && G.lr >= 0 ? routeEdges(G.lr) : [];
  route.forEach(e => { s += '<line class="deco lglow" ' + seg(e, .12) + '/>'; });
  for (const e in G.r) s += '<g class="deco">' + drop('r' + e, G.r[e], '<line transform="translate(1.5 3)" ' + seg(e, .16) + ' stroke="rgba(0,0,0,.4)" stroke-width="10" stroke-linecap="round"/><line ' + seg(e, .16) + ' stroke="#111" stroke-width="10" stroke-linecap="round"/><line ' + seg(e, .16) + ' stroke="' + PCOL[G.r[e]] + '" stroke-width="5.5" stroke-linecap="round"/><line transform="translate(-.8 -1.2)" ' + seg(e, .2) + ' stroke="rgba(255,255,255,.45)" stroke-width="1.4" stroke-linecap="round"/>') + '</g>';
  route.forEach(e => { s += '<line class="deco lroute" ' + seg(e, .2) + '/>'; });
  for (const v in G.b) s += piece(v, G.b[v]);
  for (const e in guards()) s += guard2D(e, G.gd[e]);
  if (G.fg) {      // the raider fleet out at sea, closer with every raider face of the Sea die
    const [fx, fy] = fleetAt(G.fleet || 0);
    s += '<g class="deco">' + FLEETSHIPS.map(([dx, dy], k) => '<g transform="translate(' + (fx + dx).toFixed(1) + ' ' + (fy + dy).toFixed(1) + ') scale(1.1)"><gclass="bob" style="' + sync(1700, k * 600) + '">' + RAIDSHIP() + '</g></g>').join('') +
      '<title>Raiders: ' + (G.fleet || 0) + ' of ' + FLEETMAX + ' steps to the island</title></g>';
  }
  const what = placing(), c = PCOL[G.turn];
  if (what === 'road') spots(G.turn, 'road').forEach(e => {
    s += '<line class="spot deco" ' + seg(e, .2) + ' stroke="#fff" stroke-width="7" stroke-linecap="round"/><line class="hit" data-e="' + e + '" ' + seg(e, .1) + ' stroke-width="24" stroke-linecap="round"/>';
  });
  if (GMODES.includes(what)) gSpots(what).forEach(v => {      // (knights stand on corners)
    const x = VERT[v].x, y = VERT[v].y;
    s += '<circle class="spot deco" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="13" fill="none" stroke="#fff" stroke-width="3"/><circle class="hit" data-v="' + v + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="16"/>';
  });
  if (what === 'town' || what === 'fort' || what === 'wall' || what === 'upgrade' || what === 'castle' || what === 'sack') spots(what === 'sack' ? sackWho() : G.turn, what).forEach(v => {
    const x = VERT[v].x.toFixed(1), y = VERT[v].y.toFixed(1), ring = what !== 'town';
    s += '<circle class="spot deco" cx="' + x + '" cy="' + y + '" r="' + (ring ? 19 : 9) + '" fill="' + (ring ? 'none' : '#fff') + '" stroke="' + (ring ? '#fff' : c) + '" stroke-width="3"/><circle class="hit" data-v="' + v + '" cx="' + x + '" cy="' + y + '" r="19"/>';
  });
  if (what === 'storm') HEX.forEach((h, i) => {
    if (i !== G.storm) s += '<polygon class="spot hit" data-h="' + i + '" points="' + corners(h, .9) + '" style="fill:rgba(255,255,255,.1);stroke:#fff;stroke-width:2;stroke-dasharray:6 5"/>';
  });
  s += '<g id="ghost2d" class="deco"></g>';      // the see-through preview under the pointer, on top of the spot markers (see ghostMarkup)
  $('board').innerHTML = s;
  if (D3.on) D3.update();
}
// --- see-through preview (Rick, 2026-11-19): pointing at a glowing spot shows the piece you'd build there ---
function ghostMarkup(what, d) {
  const p = G.turn;
  if (what === 'road' && d.e != null) { const e = +d.e; return '<line ' + seg(e, .16) + ' stroke="#111" stroke-width="10" stroke-linecap="round"/><line ' + seg(e, .16) + ' stroke="' + PCOL[p] + '" stroke-width="5.5" stroke-linecap="round"/>'; }
  if ((what === 'town' || what === 'fort') && d.v != null) return piece(+d.v, {p, l: what === 'fort' ? 2 : 1, w: G.b[d.v] && G.b[d.v].w});
  if (d.v != null && (what === 'guard' || what === 'train' || what === 'activate')) {
    const g = guards()[d.v] || {p, s: 1};
    return guard2D(+d.v, {p, s: what === 'train' ? g.s + 1 : g.s, a: 1});
  }
  return '';
}
$('board').addEventListener('pointerover', e => {
  const t = e.target.closest('.hit'), g = $('ghost2d');
  if (g) g.innerHTML = t && placing() ? ghostMarkup(placing(), t.dataset) : '';
});
$('board').addEventListener('pointerout', e => { const g = $('ghost2d'); if (g && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.hit'))) g.innerHTML = ''; });
// Award badges shown on a player's profile
const AWICON = {
  route: '<svg viewBox="-12 -12 24 24"><title>Longest route: +2 points</title><path d="M-8 7L-3-1L3 3L8-7" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M-8 7L-3-1L3 3L8-7" fill="none" stroke="#ffcf5a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="-8" cy="7" r="2" fill="#fff"/><circle cx="8" cy="-7" r="2" fill="#fff"/></svg>',
  army: '<svg viewBox="-12 -12 24 24"><title>Most Knights played: +2 points</title><path d="M0-9l8 3v5c0 5-3.5 8-8 10c-4.500-2-8-5-8-10v-5z" fill="#ffcf5a" stroke="#111" stroke-width="1.2"/><path d="M0-9l8 3v5c0 5-3.500 8-8 10z" fill="rgba(0,0,0,.25)"/><path d="M0-5v10M-4-1h8" stroke="#111" stroke-width="2" stroke-linecap="round"/></svg>',
  // a track's castle (Forts and Knights): a little tower in the track's colour, with a padlock once it's permanent
  castle: (k, perm) => '<svg viewBox="-12 -12 24 24"><title>' + TRACKBLD[k] + ' (' + TRACKS[k].n + '): +' + CASTLEPTS + ' points' + (perm ? ' (permanent)' : ' (can be taken at level 5)') + '</title>' +
    '<path d="M-7 10V-4h3v-3h3v3h2v-3h3v3h3v14z" fill="' + TRACKS[k].c + '" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/><path d="M-2 10V4a2 2 0 0 1 4 0v6z" fill="rgba(0,0,0,.55)"/><path d="M-1-7v-4l5 1.6-5 1.6" fill="#fff" stroke="#111" stroke-width=".6"/>' +
    (perm ? '<rect x="3.5" y="2" width="6" height="5" rx="1" fill="#ffd95e" stroke="#111" stroke-width=".8"/><path d="M4.8 2v-1.6a1.7 1.7 0 0 1 3.4 0V2" fill="none" stroke="#111" stroke-width=".9"/>' : '') + '</svg>',
  // a track's banner (older saves only): first to level 5 in Science / Trade / Politics
  banner: k => '<svg viewBox="-12 -12 24 24"><title>' + TRACKS[k].n + ' banner: +' + BANNERPTS + ' points</title><path d="M-6-10v21" stroke="#5a3d22" stroke-width="1.6"/><path d="M-6-9h13l-3 5 3 5h-13z" fill="' + TRACKS[k].c + '" stroke="#111" stroke-width="1"/><g transform="translate(.5 -4) scale(.36)">' + TRACKICON[k] + '</g></svg>',
  // Hero of the Isles (Forts and Guards): a medal, with how many when more than one
  hero: n => '<svg viewBox="-12 -12 24 24"><title>Hero of the Isles ×' + n + ': +' + n + ' point' + (n > 1 ? 's' : '') + '</title><path d="M-5-11l3 7M5-11l-3 7" stroke="#c62828" stroke-width="3"/><circle cy="3" r="7.5" fill="#ffcf5a" stroke="#111" stroke-width="1.2"/><path d="M0-1.4l1.3 2.7 3 .4-2.2 2 .6 3L0 5.3l-2.7 1.4.6-3-2.2-2 3-.4z" fill="#b8860b"/>' +
    (n > 1 ? '<text x="7" y="11" style="font:800 8px system-ui,sans-serif;fill:#fff;stroke:#111;stroke-width:2;paint-order:stroke">' + n + '</text>' : '') + '</svg>'
};
// --- Build buttons: a picture of the piece, and a pop-up above the pointer with the cards it costs ---
const BNAME = {road: 'Road', town: 'Town', fort: 'Fort', wall: 'Wall', card: 'Progress card', guard: 'Knight', train: 'Train a knight', keep: 'Keep', citadel: 'Citadel'};
const BICON = {
  road: '<path d="M-8 7L8-7" stroke="#111" stroke-width="8" stroke-linecap="round"/><path d="M-8 7L8-7" stroke="var(--pc)" stroke-width="4.5" stroke-linecap="round"/>',
  town: '<polygon points="-8,9 -8,-1 0,-9 8,-1 8,9" fill="var(--pc)" stroke="#111" stroke-width="1.8" stroke-linejoin="round"/><polygon points="0,-9 8,-1 8,9 0,9" fill="rgba(0,0,0,.28)"/><rect x="-5" y="3" width="3.5" height="6" fill="rgba(0,0,0,.55)"/>',
  fort: '<polygon points="-10,9 -10,-9 -6,-9 -6,-5 -2,-5 -2,-9 2,-9 2,-5 6,-5 6,-9 10,-9 10,9" fill="var(--pc)" stroke="#111" stroke-width="1.8" stroke-linejoin="round"/><polygon points="2,-9 2,-5 6,-5 6,-9 10,-9 10,9 1,9 1,-5" fill="rgba(0,0,0,.28)"/><path d="M-3 9v-6a3 3 0 0 1 6 0v6z" fill="rgba(0,0,0,.6)"/>',
  wall: '<circle r="8" fill="none" stroke="#111" stroke-width="6"/><circle r="8" fill="none" stroke="#d8cfb8" stroke-width="3.5" stroke-dasharray="5 2"/>',
  card: '<rect x="-7" y="-10" width="14" height="20" rx="2.5" fill="#f7f1df" stroke="#111" stroke-width="1.6" transform="rotate(-8)"/><polygon points="0,-5 1.6,-1.4 5.4,-1.2 2.4,1.2 3.4,5 0,2.8 -3.4,5 -2.4,1.2 -5.4,-1.2 -1.6,-1.4" fill="#d9a21b" transform="rotate(-8)"/>',
  guard: '<g transform="translate(0 1.5) scale(1.1)">' + GUARDBODY('var(--pc)', 1) + '</g>',
  train: '<g transform="translate(0 3) scale(.95)">' + GUARDBODY('var(--pc)', 2) + '</g>',
  keep: '<g transform="scale(.62)">' + KEEP2D('var(--pc)') + '</g>',
  citadel: '<g transform="scale(.56)">' + CITADEL2D('var(--pc)') + '</g>'
};
const costText = w => Object.keys(COST[w]).map(r => (COST[w][r] > 1 ? COST[w][r] + ' ' : '') + RN[r]).join(' + ');
const BSHORT = {card: 'Card', train: 'Train'};      // shorter names for the narrow buttons
// the cost as one little coloured chip per card (the full list shows in the hover pop-up and the tooltip)
const costChips = w => Object.keys(COST[w]).map(r => ('<i style="--a:' + COL[r][0] + '"></i>').repeat(COST[w][r])).join('');
function buildLabel(w, extra) {
  // (no cost chips on the button since 2026-11-20, Rick: smaller buttons, the cost shows in the #tip pop-up when you point
  // at it, or tap it on a phone; screen readers still get it from the hidden .sr text)
  return '<svg class="bi" viewBox="-12 -12 24 24" aria-hidden="true">' + BICON[w] + '</svg><span>' + (BSHORT[w] || BNAME[w]) + '<span class="sr">: ' + costText(w) + '</span>' + (extra ? '<small>' + extra + '</small>' : '') + '</span>';
}
let TIPW = null;
function showTip(w, x, y) {
  const T = $('tip'), R = (G && G.pl[VIEW] || {res: {}}).res;
  if (TIPW !== w) {
    let h = '<b>' + BNAME[w] + '</b> needs:<div>';
    for (const r in COST[w]) for (let k = 1; k <= COST[w][r]; k++) h += '<span class="tc ' + ((R[r] || 0) >= k ? 'have' : 'miss') + '" style="--a:' + COL[r][0] + ';--b:' + COL[r][1] + '">' + ico(r) + RN[r] + '</span>';
    T.innerHTML = h + '</div>'; T.hidden = false; TIPW = w;
    // lift the cards in the hand that would pay for it
    document.querySelectorAll('#hand .rc').forEach(c => c.classList.toggle('need', +c.dataset.k <= (COST[w][c.dataset.r] || 0)));
  }
  T.style.left = Math.max(4, Math.min(innerWidth - T.offsetWidth - 4, x - T.offsetWidth / 2)) + 'px';
  T.style.top = Math.max(4, y - T.offsetHeight - 16) + 'px';
}
function hideTip() {
  if (TIPW === null) return;
  TIPW = null; $('tip').hidden = true;
  document.querySelectorAll('#hand .rc.need').forEach(c => c.classList.remove('need'));
}
// Progress card bubble (Rick, 2026-11-19): pointing at one of your progress cards shows a speech bubble above the
// pointer with its name and what it does (and whether you can play it now). Disabled buttons don't get pointer events
// in some browsers, so the listener is on #mycards and finds the card under the pointer itself.
const CTIP = document.createElement('div'); CTIP.id = 'cardtip'; CTIP.hidden = true; document.body.appendChild(CTIP);
let CTIPC = null;
function cardTip(e) {
  const c = [...document.querySelectorAll('#mycards .pc')].find(b => { const r = b.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
  if (!c) { CTIP.hidden = true; CTIPC = null; return; }
  if (CTIPC !== c) {
    CTIPC = c;
    CTIP.innerHTML = '<b>' + c.dataset.tn + '</b><span>' + c.dataset.tip + '</span>' + (c.dataset.note ? '<em>' + c.dataset.note + '</em>' : '');
    CTIP.hidden = false;
  }
  CTIP.style.left = Math.max(6, Math.min(innerWidth - CTIP.offsetWidth - 6, e.clientX - CTIP.offsetWidth / 2)) + 'px';
  CTIP.style.top = Math.max(6, e.clientY - CTIP.offsetHeight - 18) + 'px';
  CTIP.style.setProperty('--tx', (e.clientX - parseFloat(CTIP.style.left)) + 'px');      // (the bubble's tail points at the pointer)
}
document.addEventListener('pointermove', e => { if (!CTIP.hidden || e.target.closest && e.target.closest('#mycards')) cardTip(e); });
document.addEventListener('pointerdown', () => { CTIP.hidden = true; CTIPC = null; });
// The hand: every resource is its own card, grouped by kind and fanned like cards held in a hand.
const HANDFAN = 8;      // more cards than this: the hand shows one stack per kind
const RCW = 46, FANPAD = 36;      // a resource card's width (matches .rc in style.css), and room for the tilt at the ends
function handHTML(R) {
  if (!R) return '';
  const list = []; KINDS().forEach(r => { for (let i = 0; i < (R[r] || 0); i++) list.push(r); });
  if (!list.length) return '<div class="none">No resource cards.</div>';
  const W = $('hand').clientWidth || 320;
  // a big hand (Rick, 2026-11-19: "condense the hand of cards ... to save space"): one stacked card per kind with a ×N badge
  // (FANPAD: room left at the sides for the tilted end cards, 36 since 2026-11-20; was 16 and the last card poked out)
  if (list.length > HANDFAN || (W - RCW - FANPAD) / Math.max(1, list.length - 1) < 16) {
    const kinds = KINDS().filter(r => R[r] > 0), m = kinds.length, st = Math.min(54, (W - RCW - FANPAD) / Math.max(1, m - 1)), x1 = (W - (RCW + st * (m - 1))) / 2;
    return kinds.map((r, i) => '<div class="rc' + (R[r] > 1 ? ' stack' : '') + '" data-r="' + r + '" data-k="1" style="left:' + (x1 + i * st).toFixed(1) + 'px;--a:' + COL[r][0] + ';--b:' + COL[r][1] + ';transform:rotate(' + ((m > 1 ? i / (m - 1) - .5 : 0) * Math.min(24, m * 4)).toFixed(1) + 'deg)" title="' + R[r] + ' ' + RN[r] + '">' +
      ico(r) + RN[r] + (R[r] > 1 ? '<b class="cnt">×' + R[r] + '</b>' : '') + '</div>').join('');
  }
  const n = list.length, step = Math.min(34, (W - RCW - FANPAD) / Math.max(1, n - 1));
  const x0 = (W - (RCW + step * (n - 1))) / 2, spread = Math.min(30, n * 4);
  let kth = 0;       /* which card of its kind this is (1 = first) */
  return list.map((r, i) => {
    const t = n > 1 ? i / (n - 1) - .5 : 0, first = i === 0 || list[i - 1] !== r;
    kth = first ? 1 : kth + 1;
    return '<div class="rc" data-r="' + r + '" data-k="' + kth + '" style="left:' + (x0 + i * step).toFixed(1) + 'px;--a:' + COL[r][0] + ';--b:' + COL[r][1] + ';transform:rotate(' + (t * spread).toFixed(1) + 'deg)">' + ico(r) + RN[r] + '</div>';
  }).join('');
}
