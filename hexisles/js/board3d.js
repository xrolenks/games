'use strict';
// Hex Isles - The 3D board (Three.js): lands, scenery, pieces, sea, sky, 3D dice and animations.
// ---------- 3D board (Three.js) ----------
// A real 3D island drawn with WebGL: raised land tiles with textures, trees, wheat, sheep, rocks and the
// bandits' lair, a sky with the sun, reflecting sea, shadows. It only draws: every click still becomes
// the same go(action) as on the flat map. The flat SVG board keeps being drawn underneath (hidden), so
// switching back is instant and the window keeps its size. Three.js comes from the internet (jsDelivr,
// pinned version, see the import map in <head>); without it the flat map is used.
const VIEWKEY = 'hexisles-view';      // localStorage: '2d' if the player switched the 3D view off
const TOP = 9;                        // height of a land tile's top (sea level is 0, the beach 3)
function want3D() { try { return localStorage.getItem(VIEWKEY) !== '2d'; } catch (e) { return true; } }
// Graphics: Fast (the default) or Fancy (Rick's request, 2026-11-20). Fast = no shadows, the sea reflects only the sky,
// and a less sharp picture (pixel ratio 1); Fancy = all of it (pixel ratio up to 1.5). Picked in Settings (settings.js),
// localStorage GFXKEY = 'fancy' (anything else = Fast). D3.gfx(fancy) switches a running island.
const GFXKEY = 'hexisles-gfx';
function gfxFancy() { try { return localStorage.getItem(GFXKEY) === 'fancy'; } catch (e) { return false; } }
// Is this screen's island still getting ready (3D still loading, or the new game's island still assembling)?
// Online games wait for everyone's island before the first turn (online.js, G.boot).
function islandBusy() { return !!(D3.loading || (D3.on && D3.introLeft && D3.introLeft() > 0)); }
function set3D(on) {
  try { localStorage.setItem(VIEWKEY, on ? '3d' : '2d'); } catch (e) {}
  // (true: the player asked for 3D, so skip the slow-graphics check. 2026-11-20: it also tries again after a failed
  // start, and says why when it still can't, instead of the button doing nothing.)
  if (on && !D3.ready) { load3D(true).then(() => { if (!D3.ready) note3D(); }); return; }
  show3D(on);
}
// A short message by the map's buttons when the 3D island can't start (2026-11-20, Rick: "the 3d button doesn't work";
// Chrome had switched WebGL off after its graphics process crashed, so no 3D was possible until it restarted).
function note3D() {
  let n = $('note3d');
  if (!n) { n = document.createElement('div'); n.id = 'note3d'; $('view').appendChild(n); }
  n.textContent = D3.nogl ? 'Chrome has switched off 3D graphics on this computer (usually after a graphics hiccup). Close Chrome completely and open it again to get the 3D island back.'
    : D3.lost ? 'The graphics chip reset, so the 3D island stopped. You\'re on the flat map now; press 3D to try again.'
    : 'The 3D island could not load. It needs an internet connection; try again in a moment.';
  n.hidden = false;
  clearTimeout(n.t); n.t = setTimeout(() => { n.hidden = true; }, 7000);
}
// Can this browser make a WebGL drawing surface at all? (No when Chrome has switched WebGL off.)
function haveGL() {
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    return true;
  } catch (e) { return false; }
}
function show3D(on) {
  D3.on = !!on && !!D3.ready;
  $('view').classList.toggle('is3d', D3.on);
  const b = $('z-3d');
  b.textContent = D3.on ? '2D' : '3D';
  b.title = D3.nogl ? 'Chrome has switched off 3D graphics. Restart Chrome to get the 3D island back.' :
    D3.failed ? 'The 3D island could not load (it needs internet)' : D3.on ? 'Switch to the flat map' :
    D3.slow ? 'This browser is drawing without the graphics chip, so the flat map is used. Press to try the 3D island anyway.' : 'Switch to the 3D island';
  if (D3.on) { D3.resize(); if (G) D3.update(); }
  applyZoom();
}
// Is the 3D island likely to be painfully slow here? (2026-11-20, all of Rick's Chrome froze on New game.)
// When Chrome can't use the graphics chip (graphics acceleration off, or a driver Chrome doesn't trust), it draws
// 3D with the processor instead, many times slower. `failIfMajorPerformanceCaveat` makes the test canvas refuse
// in that case. Then the flat map is used at start-up; pressing the 3D button (load3D(true)) still loads it.
function slowGraphics() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2', {failIfMajorPerformanceCaveat: true}) || c.getContext('webgl', {failIfMajorPerformanceCaveat: true});
    if (!gl) return true;
    const e = gl.getExtension('WEBGL_debug_renderer_info'), name = e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : '';
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    return /swiftshader|llvmpipe|software|basic render/i.test(name);
  } catch (e) { return false; }
}
async function load3D(asked) {
  if (D3.loading || D3.ready) return;
  D3.nogl = !haveGL();
  if (D3.nogl) { D3.failed = true; show3D(false); return; }
  if (!asked && slowGraphics()) { D3.slow = true; show3D(false); return; }
  D3.loading = true; D3.failed = false; $('z-3d').textContent = '…';
  try {
    const m = await Promise.all(['three', 'three/addons/objects/Water.js',
      'three/addons/controls/OrbitControls.js', 'three/addons/utils/BufferGeometryUtils.js'].map(u => import(u)));
    const t0 = performance.now();
    init3D(m[0], m[1].Water, m[2].OrbitControls, m[3]);
    D3.initMs = Math.round(performance.now() - t0);      // (for testing: how long setting up the 3D island blocked the page)
    D3.ready = true;
  } catch (e) { console.warn('The 3D board could not start:', e); D3.failed = true; }
  D3.loading = false;
  show3D(want3D());
}

function init3D(T, Water, Orbit, BU) {
  const view = $('view');
  const R = new T.WebGLRenderer({antialias: true});
  // (2026-11-20, Rick's laptop froze: sharpness is capped at 1.5x and lowered by frame() if the graphics chip can't keep up)
  let FANCY = gfxFancy();      // (Graphics setting: Fast or Fancy, see GFXKEY)
  let PR = Math.min(devicePixelRatio || 1, FANCY ? 1.5 : 1);
  // ...and the canvas never draws more than MAXPX pixels (2026-11-20: Rick's big, sharp screen made a ~4 million
  // pixel canvas, 2.5x the test browser's, and all of Chrome froze on New game). usePR() applies both limits.
  const MAXPX = 3e6;      // (gentle: Rick's maximised window keeps ~1.45x of its 1.5x; the freeze turned out to be mostly the processor)
  // Don't stop to read each shader's error report: on Rick's laptop that waited ~0.5 s for the programs to finish
  // preparing, freezing the page when a game started (2026-11-20). Only useful while writing shaders.
  R.debug.checkShaderErrors = false;
  const usePR = () => { const w = view.clientWidth || 1, h = view.clientHeight || 1; R.setPixelRatio(Math.min(PR, Math.sqrt(MAXPX / (w * h)))); };
  usePR();
  R.outputColorSpace = T.SRGBColorSpace;
  R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = .95;
  // (PCF, not PCFSoft, since 2026-11-20: Rick prefers speed over fancy shadows; soft edges sample the shadow map many
  // more times on every pixel of every frame)
  R.shadowMap.enabled = FANCY; R.shadowMap.type = T.PCFShadowMap;      // (no shadows at all on Fast)
  R.shadowMap.autoUpdate = false;      // shadows are only redrawn when something moves (see SHADOW)
  const cv = R.domElement; cv.id = 'board3d'; view.insertBefore(cv, $('roll'));
  // If the graphics chip resets (2026-11-20, Rick's laptop: "D3D11 device was removed", the map went blank), this 3D
  // island is lost for good. Then: drop it, go back to the flat map and say why; pressing 3D builds a fresh one if
  // Chrome still allows 3D.
  let DEAD = false;
  cv.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    if (DEAD) return;
    DEAD = true; D3.ready = false; D3.lost = true; HOLD = false;
    cv.remove();
    D3.nogl = !haveGL();
    show3D(false); note3D();
  });
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(36, 1, 5, 40000);
  const TIME = {value: 0};             // seconds, shared with the swaying-plants shader
  const ANISO = R.capabilities.getMaxAnisotropy();
  let SHADOW = true;

  // ----- sky, sun and light -----
  const SUN = new T.Vector3().setFromSphericalCoords(1, T.MathUtils.degToRad(52), T.MathUtils.degToRad(-145));     // high, behind on the left
  // a painted sky dome (pale at the horizon, deep blue overhead, a warm glow round the sun): it is what you see,
  // what the sea mirrors, and the soft light that fills in the shadows
  // (2026-11-19, day and night: the sky's colours, stars and the moon's disc are uniforms, changed by setDay())
  const SKYU = {sun: {value: SUN}, hor: {value: new T.Color(.55, .70, .80)}, zen: {value: new T.Color(.04, .17, .36)}, glow: {value: new T.Color(1, .85, .6)}, stars: {value: 0}};
  const skyMat = new T.ShaderMaterial({side: T.BackSide, depthWrite: false, fog: false, uniforms: SKYU,
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position.z = gl_Position.w; }',
    fragmentShader: 'uniform vec3 sun, hor, zen, glow; uniform float stars; varying vec3 vp; void main(){ float h = clamp(vp.y, 0., 1.); vec3 c = mix(hor, zen, pow(h, .5));' +
      ' float d = max(dot(vp, sun), 0.); c += glow * pow(d, 40.) * .8;' +
      ' if (stars > 0.) { vec3 q = floor(vp * 220.); float r = fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453);' +
      '   c += vec3(step(.9965, r) * (.5 + .5 * fract(r * 91.7))) * stars * smoothstep(.02, .3, vp.y);' +       // stars, brighter higher up
      '   c += glow * smoothstep(.99955, .9998, d) * stars; }' +                                                   // the moon's disc
      ' gl_FragColor = vec4(c, 1.); }'});
  const dome = new T.Mesh(new T.SphereGeometry(5000, 32, 16), skyMat);
  scene.add(dome);      // (it follows the camera, see frame())
  // the soft light from the sky comes from a picture of the sky (PMREM); remade when the time of day changes (setDay)
  const PMREM = new T.PMREMGenerator(R), envScene = new T.Scene();
  envScene.add(new T.Mesh(dome.geometry, skyMat));
  scene.environment = PMREM.fromScene(envScene).texture;
  scene.fog = new T.Fog(0x9db8ca, 2500, 9000);
  const sun = new T.DirectionalLight(0xfff0d8, 2.6);
  sun.position.copy(SUN).multiplyScalar(800); sun.castShadow = FANCY;
  sun.shadow.mapSize.set(1024, 1024);      // (was 2048 until 2026-11-20: a quarter of the work each time shadows are redrawn)
  const sc = sun.shadow.camera; sc.left = sc.bottom = -420; sc.right = sc.top = 420; sc.near = 200; sc.far = 1600;
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .5; sun.shadow.radius = 3;
  const HEMI = new T.HemisphereLight(0xd6ecff, 0x3d3324, .45);
  scene.add(sun, sun.target, HEMI);

  // ----- painted textures (no image files: made from smooth random noise) -----
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  function noise(P, seed) {      // smooth noise that wraps round every P cells, so the textures tile without seams
    // (2026-11-20: each cell's random value is worked out once into a grid, not 4 times per pixel; painting the
    // textures took 1.2 s on Rick's laptop and froze the page. Same values, same pictures.)
    const g = new Float64Array(P * P);
    for (let q = 0; q < P; q++) for (let p = 0; p < P; p++) g[q * P + p] = hash(p + seed, q - seed * 1.7);
    return (x, y) => {
      x *= P; y *= P;
      const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
      const i0 = ((i % P) + P) % P, i1 = (i0 + 1) % P, j0 = (((j % P) + P) % P) * P, j1 = ((((j + 1) % P) + P) % P) * P;
      return g[j0 + i0] * (1 - a) * (1 - b) + g[j0 + i1] * a * (1 - b) + g[j1 + i0] * (1 - a) * b + g[j1 + i1] * a * b;
    };
  }
  function fbm(P, seed) { const L = [0, 1, 2, 3].map(k => noise(P << k, seed + k * 17)); return (x, y) => (L[0](x, y) * 8 + L[1](x, y) * 4 + L[2](x, y) * 2 + L[3](x, y)) / 15; }
  const hx = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
  const mix = (a, b, t) => a.map((v, k) => v + (b[k] - v) * Math.max(0, Math.min(1, t)));
  function paint(N, fn) {
    const c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d'), im = x.createImageData(N, N), d = im.data;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const p = fn(i / N, j / N), k = (j * N + i) * 4;
      d[k] = p[0]; d[k + 1] = p[1]; d[k + 2] = p[2]; d[k + 3] = 255;
    }
    x.putImageData(im, 0, 0); return c;
  }
  const tex = (c, color, wrap) => {
    const t = new T.CanvasTexture(c);
    if (wrap !== false) t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = ANISO; if (color) t.colorSpace = T.SRGBColorSpace; return t;
  };
  const PAL = {wood: ['#173f20', '#3e7b34'], clay: ['#8a4022', '#d4855a'], wool: ['#4a9134', '#98d05e'], grain: ['#6e4a1c', '#b8892e'],
    stone: ['#606268', '#b3b4b8'], lair: ['#1d1816', '#4a3d37'], sand: ['#c9ad74', '#f0dfae']};
  const LTEX = {};
  Object.keys(PAL).forEach((t, n) => {
    const a = hx(PAL[t][0]), b = hx(PAL[t][1]), big = fbm(4, n * 10 + 1), fine = fbm(16, n * 10 + 5), crack = fbm(6, n * 10 + 9);
    LTEX[t] = tex(paint(256, (x, y) => {
      const f = fine(x, y);
      let k = big(x, y) * .8 + f * .55 - .2;
      if (t === 'grain') k = k * .55 + .45 * (.5 + .5 * Math.sin((y * 16 + big(x, y) * 1.5) * Math.PI * 2));      // furrows
      let col = mix(a, b, k);
      if ((t === 'clay' || t === 'stone' || t === 'lair') && Math.abs(crack(x, y) - .5) < .013) col = col.map(v => v * .5);     // cracks
      if (t === 'wood' && f > .66) col = mix(col, [107, 90, 42], .5);          // leaf litter on the forest floor
      if (t === 'wool' && f > .72) col = mix(col, [236, 226, 140], .4);        // little flowers
      return col;
    }), true);
  });
  // the sea's ripples: a "normal map" (which way each spot of the surface faces), made from noise
  const wh = fbm(4, 77);
  const waves = tex(paint(256, (x, y) => {
    const e = 1 / 256, dx = (wh(x + e, y) - wh(x - e, y)) * 14, dy = (wh(x, y + e) - wh(x, y - e)) * 14, l = Math.hypot(dx, dy, 1);
    return [(-dx / l * .5 + .5) * 255, (-dy / l * .5 + .5) * 255, (1 / l * .5 + .5) * 255];
  }));
  // pictures drawn as SVG (number discs, port signs, crates) turned into textures
  const SVGT = {};
  function svgTex(key, svg, w, h) {
    if (SVGT[key]) return SVGT[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h || w;
    const t = SVGT[key] = tex(c, true, false), img = new Image();
    img.onload = () => { c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); t.needsUpdate = true; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + (h || w) + '"'));
    return t;
  }
  const tokTex = n => {
    const p = pips(n), hot = p === 5;
    let s = '<svg viewBox="-16 -16 32 32"><defs><radialGradient id="g" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e3d3a6"/></radialGradient></defs>' +
      '<rect x="-16" y="-16" width="32" height="32" fill="#cdbb8a"/><circle r="15.3" fill="url(#g)"/><circle r="14" fill="none" stroke="#b9a777" stroke-width=".5"/>' +
      '<text y="4.8" text-anchor="middle" style="font:800 14px system-ui,sans-serif" fill="' + (hot ? '#c62828' : '#2a2212') + '">' + n + '</text>';
    for (let k = 0; k < p; k++) s += '<circle cx="' + ((k - (p - 1) / 2) * 3.2) + '" cy="9.8" r="1.1" fill="' + (hot ? '#c62828' : '#5b4a2a') + '"/>';
    return svgTex('n' + n, s + '</svg>', 256);
  };
  const signTex = r => svgTex('s' + r, '<svg viewBox="-11 -11 22 22"><circle r="10" fill="' + (r === 'any' ? '#f6ecd0' : COL[r][0]) + '" stroke="#3a2a14" stroke-width="1.6"/>' +
    (r === 'any' ? '<text y="3.4" style="font:700 9.5px system-ui,sans-serif;text-anchor:middle;fill:#2a2212">3:1</text>'
      : '<g transform="translate(0 -3) scale(.48)">' + cardGlyph(r) + '</g><text y="7.8" style="font:700 7px system-ui,sans-serif;text-anchor:middle;fill:#111;stroke:#fff;stroke-width:2;paint-order:stroke">2:1</text>') + '</svg>', 128);
  const crateTex = (r, k) => svgTex('c' + r + k, '<svg viewBox="-6.5 -12 13 12">' + crate(r, k) + '</svg>', 128);

  // ----- materials -----
  const std = o => new T.MeshStandardMaterial(Object.assign({roughness: .85}, o));
  function sway(m, amp, speed) {      // plants lean in the wind: the higher up a point is, the further it moves
    m.onBeforeCompile = sh => {
      sh.uniforms.uTime = TIME;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' +
        'float sw = sin(uTime * ' + speed.toFixed(2) + ' + instanceMatrix[3].x * .07 + instanceMatrix[3].z * .045) * ' + amp.toFixed(3) + ' * max(position.y, 0.);\n' +
        'transformed.x += sw; transformed.z += sw * .6;');
    };
    m.customProgramCacheKey = () => 'sway' + amp + '/' + speed;
    return m;
  }
  const M3 = {
    bark: std({roughness: 1}), pine: sway(std({roughness: .9}), .03, 1.1), leaf: sway(std({roughness: .8}), .03, 1.3),
    rock: std({roughness: .92, flatShading: true}), cut: std({roughness: .9}),
    crystal: std({roughness: .15, metalness: .1, flatShading: true, emissive: 0x3a5cff, emissiveIntensity: 1}), snow: std({roughness: .55, flatShading: true}),
    wheat: sway(std({roughness: .6}), .2, 1.8), grass: sway(std({roughness: .9}), .14, 2.2), reed: sway(std({}), .15, 1.9),
    wood: std({roughness: .9}), fleece: std({roughness: 1}), dark: std({roughness: .8}),
    brick: std({roughness: .95}), puddle: std({roughness: .05, metalness: .2}), mud: std({roughness: 1}), metal: std({roughness: .4, metalness: .7}),
    stone: std({color: 0x9a948a, roughness: .95}), door: std({color: 0x1d1610, roughness: .9}), pole: std({color: 0x5a3d22}),
    skin: std({color: 0xd9a877, roughness: .6}), hat: std({color: 0x3a2a1c}), red: std({color: 0x8a1f1f}),
    // the bandit
    coat: std({color: 0x6a3320, side: T.DoubleSide}), boot: std({color: 0x2a1a10, roughness: .7}), pants: std({color: 0x3a3d46}), shirt: std({color: 0xd8c7a0}),
    mantle: std({color: 0x3b4834, roughness: .95}), mask: std({color: 0xb02a26}), feather: std({color: 0xe9dcb4}), sack: std({color: 0xa88a58, roughness: 1}),
    glow: std({color: 0x553300, emissive: 0xffc45a, emissiveIntensity: 1.8}),
    // the bandits' lair
    gold: std({color: 0xe8b84a, roughness: .3, metalness: .85}), cloth: std({roughness: 1}),
    // the Guard's knight
    steel: std({color: 0xb8bec8, roughness: .35, metalness: .8}), shine: std({color: 0xe8edf2, roughness: .15, metalness: .95}),
    fire: sway(std({color: 0x401400, emissive: 0xff7a1e, emissiveIntensity: 2.4}), .12, 6),
    ring: std({color: 0xd8cfb8, roughness: .95}), hull: std({color: 0x7a4a22}), deck: std({color: 0xc9a46a}),
    sail: std({color: 0xf4ecd6, side: T.DoubleSide, roughness: .9}), flag: std({color: 0xd94a3a, side: T.DoubleSide}),
    disc: std({color: 0x8d7b4d, roughness: .8}), sand: std({map: LTEX.sand, roughness: 1}),
    ember: std({color: 0x2a0a00, emissive: 0xff5a14, emissiveIntensity: 2}),      // the kiln's glowing mouth
    spot: new T.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: .85, depthWrite: false}),
    hit: new T.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false}),
    stormFill: new T.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: .14, depthWrite: false})
  };
  LTEX.sand.repeat.set(1 / 45, 1 / 45);
  const PM = {};
  function pm3(p, k) {      // a player's colour: 'wall' (a bit lighter), 'roof' (darker) or 'flag' (as it is)
    if (PM[p + k]) return PM[p + k];
    const c = new T.Color(PCOL[p]);
    if (k === 'wall') c.lerp(new T.Color(0xffffff), .3);
    if (k === 'roof') c.multiplyScalar(.6);
    return PM[p + k] = std({color: c, roughness: k === 'roof' ? .7 : .6, side: k === 'flag' ? T.DoubleSide : T.FrontSide});
  }

  // ----- shapes used again and again -----
  function hexShape(r) {      // a pointy-top hexagon; y is flipped so it lands the right way round once laid flat
    const sh = new T.Shape();
    for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 90), x = r * Math.cos(a), y = -r * Math.sin(a); k ? sh.lineTo(x, y) : sh.moveTo(x, y); }
    sh.closePath(); return sh;
  }
  const extr = (r, depth, bev) => new T.ExtrudeGeometry(hexShape(r), {depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 1}).rotateX(-Math.PI / 2);
  function lumpy(detail, amp, flat) {     // a ball with a bumpy surface (tree crowns, rocks)
    let g = new T.IcosahedronGeometry(1, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv');
    g = BU.mergeVertices(g);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k), s = 1 + (hash(x * 7.1 + z * 3.3, y * 5.7 - x) - .5) * 2 * amp;
      p.setXYZ(k, x * s, y * s, z * s);
    }
    if (flat) g = g.toNonIndexed();
    g.computeVertexNormals(); return g;
  }
  const sph = (x, y, z, r, seg) => new T.SphereGeometry(r, seg || 10, 7).translate(x, y, z);
  const cyl = (r1, r2, h, seg, y) => new T.CylinderGeometry(r1, r2, h, seg).translate(0, y == null ? h / 2 : y, 0);
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const G3 = {
    tile: extr(S * TILE - 2, 4, 2).translate(0, 3, 0),          // from y 1 to TOP
    trunk: cyl(.35, .5, 1, 6),
    pine: BU.mergeGeometries([[.5, .5, .3], [.4, .45, .58], [.28, .4, .84]].map(([r, h, y]) => new T.ConeGeometry(r, h, 9).translate(0, y, 0))),
    crown: lumpy(2, .14), rock: lumpy(1, .3, true),
    crystal: BU.mergeGeometries([cyl(.42, .5, 1.6, 6), new T.ConeGeometry(.42, .7, 6).translate(0, 1.95, 0)]),     // a six-sided crystal with a point
    // a wheat stalk with a plump ear on top (made wide so the fields read as wheat from high up, Rick's request 2026-11-19)
    stalk: BU.mergeGeometries([cyl(.06, .09, .74, 4).deleteAttribute('uv'),
      new T.LatheGeometry([[0, 0], [.26, .05], [.36, .17], [.3, .3], [0, .42]].map(([x, y]) => new T.Vector2(x, y)), 6).translate(0, .7, 0).deleteAttribute('uv')]),
    tuft: new T.ConeGeometry(.5, 1, 4).translate(0, .5, 0), reed: new T.ConeGeometry(.15, 1, 4).translate(0, .5, 0),
    kiln: new T.LatheGeometry([[0, 0], [6.4, 0], [6.6, 1.5], [6.1, 4.5], [4.8, 7.2], [2.6, 8.9], [0, 9.4]].map(([x, y]) => new T.Vector2(x, y)), 20),
    rim: new T.TorusGeometry(1, .22, 6, 24).rotateX(Math.PI / 2),
    // the bandits' lair: a tent (a three-sided prism, ridge on top, 1.73 wide, 1.5 high), a flame, a barrel, a coin
    tent: new T.CylinderGeometry(1, 1, 1, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).translate(0, .5, 0),
    flame: new T.ConeGeometry(1, 2.6, 8).translate(0, 1.3, 0),
    barrel: new T.LatheGeometry([[0, 0], [.85, 0], [1, .5], [.85, 1], [0, 1]].map(([x, y]) => new T.Vector2(x, y)), 14),
    coin: cyl(1, 1, .3, 12, 0),
    post: box(1, 1, 1).translate(0, .5, 0), cube: box(1, 1, 1), puddle: cyl(1, 1, .2, 20, 0), pile: cyl(.5, .5, 1, 6),
    fleece: BU.mergeGeometries([sph(0, 3.4, 0, 2.5), sph(-1.7, 3.2, 1.1, 1.9), sph(1.7, 3.2, 1.1, 1.9), sph(-1.7, 3.2, -1.1, 1.9), sph(1.7, 3.2, -1.1, 1.9), sph(0, 4.6, 0, 1.9), sph(-2.6, 3.6, 0, 1.7)]),
    sheepd: BU.mergeGeometries([sph(3.6, 4.1, 0, 1.35), sph(3.2, 4.9, .9, .5, 6), sph(3.2, 4.9, -.9, .5, 6)].concat([[-1.6, .9], [1.6, .9], [-1.6, -.9], [1.6, -.9]].map(([x, z]) => cyl(.35, .3, 2.2, 6).translate(x, 0, z)))),
    disc: cyl(14.5, 15.2, 3, 40), face: new T.CircleGeometry(14.4, 48),
    // the stone base under a town/fort: from y 2 up to TOP + 1, where the house starts (not TOP, or its top would
    // flicker against the land tile's top: z-fighting)
    found: cyl(8, 9, TOP - 1, 6, (TOP + 3) / 2), found2: cyl(10.5, 11.5, TOP - 1, 6, (TOP + 3) / 2),
    house: box(9, 7, 9), tower: box(13, 13, 13), cren: box(3, 3.2, 3), chim: box(1.6, 4, 1.6), door: box(2.4, 4, .4), gate: box(3.6, 6, .4), flag: box(6, 3.6, .25), flagL: box(6, 3.6, .25).translate(3, 0, 0), mast: cyl(.3, .3, 9, 6, 0),
    roof: new T.ExtrudeGeometry(new T.Shape([new T.Vector2(-6.2, 0), new T.Vector2(6.2, 0), new T.Vector2(0, 5.5)]), {depth: 10.4, bevelEnabled: false}).translate(0, 0, -5.2),
    // a ring of stone wall (a thick band, 6 high) with battlements on top
    wall: new T.LatheGeometry([new T.Vector2(14.5, 0), new T.Vector2(17.5, 0), new T.Vector2(17.5, 6), new T.Vector2(14.5, 6), new T.Vector2(14.5, 0)], 36), merlon: box(2.8, 2.4, 3),
    turret: box(7, 24, 7), goldCone: new T.ConeGeometry(5.6, 8, 4).rotateY(Math.PI / 4), spotRing: new T.TorusGeometry(17, 1.6, 8, 40).rotateX(Math.PI / 2), spotDisc: cyl(6.5, 6.5, 1.4, 24, 0),
    townRing: new T.TorusGeometry(7.2, 1.1, 8, 32).rotateX(Math.PI / 2), crate: box(8, 8, 8), ball: new T.SphereGeometry(1, 14, 10)
  };
  const flatHex = (r, hole) => { const s = hexShape(r); if (hole) s.holes.push(hexShape(hole)); return new T.ShapeGeometry(s).rotateX(-Math.PI / 2); };
  G3.hexFill = flatHex(S * .9); G3.hexRing = flatHex(S * .9, S * .84);
  const rng = s => () => (s = (s * 9301 + 49297) % 233280) / 233280;      // same scenery every time for a tile
  const inHex = (x, z, r) => Math.abs(x) <= r * .866 && Math.abs(z) + Math.abs(x) * .577 <= r;

  // ----- the beach and the sea (the same in every game) -----
  const beachParts = [];
  HEX.forEach(h => {
    beachParts.push(extr(S + 1, 6, 1.6).translate(h.x, -4.6, h.y));                                   // sand, top at y 3
    beachParts.push(new T.CylinderGeometry(S + 6, S + 30, 16, 6, 1, true).toNonIndexed().translate(h.x, -6, h.y));     // sloping into the water
  });
  const beach = new T.Mesh(BU.mergeGeometries(beachParts), M3.sand); beach.receiveShadow = true; scene.add(beach);
  // The sea's reflection means drawing the whole scene a second time, so it is kept cheap:
  // - a small reflection picture (256 x 256; the ripples blur it anyway),
  // - redrawn only every 3rd frame (see RF; was every other until 2026-11-20),
  // - things too small or see-through to notice in it (wheat, grass, reeds, smoke, the foam) go on layer 1,
  //   which the main camera sees but the reflection camera does not (see noRef).
  const water = new Water(new T.PlaneGeometry(40000, 40000), {textureWidth: 256, textureHeight: 256, waterNormals: waves, sunDirection: SUN.clone(),
    sunColor: 0xfff2dd, waterColor: 0x0a5878, distortionScale: 2.2, fog: true});
  water.rotation.x = -Math.PI / 2; water.material.uniforms.size.value = 1.4; scene.add(water);
  let RF = 0;
  const reflect = water.onBeforeRender;
  // (every 3rd frame since 2026-11-20: it costs the most. On Fast graphics the island is hidden while it's drawn, so
  // the sea only mirrors the sky: nearly free, and the ripples hid the island's reflection anyway.)
  water.onBeforeRender = function (...a) {
    if (RF % 3) return;
    if (FANCY) { reflect.apply(this, a); return; }
    const sv = stat.visible, dv = dyn.visible; stat.visible = dyn.visible = false;
    reflect.apply(this, a);
    stat.visible = sv; dyn.visible = dv;
  };
  const noRef = o => { if (o) o.layers.set(1); return o; };
  cam.layers.enable(1);
  // shallow turquoise water and breaking foam round the island, painted onto see-through sheets
  const SPAN = 1000, CN = 1024, w2p = v => (v + SPAN / 2) / SPAN * CN;
  function island(x, r, fill) {
    x.fillStyle = fill; x.beginPath();
    HEX.forEach(h => { for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 90), px = w2p(h.x + r * Math.cos(a)), py = w2p(h.y + r * Math.sin(a)); k ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); });
    x.fill();
  }
  const sheet = (draw, y) => {
    const c = document.createElement('canvas'); c.width = c.height = CN; draw(c.getContext('2d'));
    const m = new T.Mesh(new T.PlaneGeometry(SPAN, SPAN).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({map: tex(c, true, false), transparent: true, depthWrite: false}));
    m.position.y = y; scene.add(noRef(m)); return m;
  };
  // Clear shallow water (2026-11-19, Rick's pick): near the beach you see the sandy bottom, rocks and weed through the
  // water, light ripples (caustics) playing over it and the shadows of fish darting about (see frame()).
  const onLand = (x, z, pad) => HEX.some(h => Math.hypot(x - h.x, z - h.y) < S * .87 + pad);      // (roughly: on or near the island)
  const SHALLOW = sheet(x => {
    x.filter = 'blur(40px)'; island(x, S + 75, 'rgba(30,160,175,.5)');
    x.filter = 'blur(12px)'; island(x, S + 44, 'rgba(206,196,148,.55)');          // the sandy bottom near the beach
    x.filter = 'blur(1.5px)';
    const r = rng(777);
    for (let n = 0; n < 900; n++) {                                                   // rocks and clumps of weed on the bottom
      const c = COAST[Math.floor(r() * COAST.length)], h = HEX[c.h], [mx, mz] = edgeMid(c.e), d = Math.hypot(mx - h.x, mz - h.y);
      const out = 22 + r() * 34, x0 = mx + (mx - h.x) / d * out + (r() - .5) * 40, z0 = mz + (mz - h.y) / d * out + (r() - .5) * 40;
      if (onLand(x0, z0, 14)) continue;
      const px = w2p(x0), py = w2p(z0), s = (1 + r() * 2.4) * CN / SPAN;
      if (r() < .6) {
        x.fillStyle = 'rgba(70,78,70,' + (.25 + r() * .25).toFixed(2) + ')'; x.beginPath(); x.ellipse(px, py, s, s * (.6 + r() * .3), r() * 3, 0, 7); x.fill();
        x.fillStyle = 'rgba(190,200,180,.25)'; x.beginPath(); x.ellipse(px - s * .25, py - s * .25, s * .45, s * .3, 0, 0, 7); x.fill();
      } else {
        x.strokeStyle = 'rgba(40,110,60,' + (.3 + r() * .25).toFixed(2) + ')'; x.lineWidth = 1.2; x.beginPath();
        for (let q = 0; q < 4; q++) { const a = r() * 6.28; x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * s, py + Math.sin(a) * s, px + Math.cos(a + .5) * s * 2, py + Math.sin(a + .5) * s * 2); }
        x.stroke();
      }
    }
    x.filter = 'blur(14px)'; island(x, S + 32, 'rgba(80,210,200,.4)');               // a turquoise wash on top: it's all under water
  }, .3);
  const foam = sheet(x => { x.filter = 'blur(3px)'; island(x, S + 16, '#fff'); x.globalCompositeOperation = 'destination-out'; x.filter = 'blur(4px)'; island(x, S + 8, '#000'); }, .5);
  // light ripples: a tiling pattern of bright wavy lines, shown only in the shallow band (alphaMap) and drifting (frame())
  const cA = fbm(4, 301), cB = fbm(4, 517);
  const caust = tex(paint(256, (x, y) => { const v = Math.pow(Math.max(0, 1 - Math.abs(cA(x, y) - .5) * 9), 3) + Math.pow(Math.max(0, 1 - Math.abs(cB(x, y) - .5) * 9), 3) * .7; return [v * 255, v * 255, v * 235]; }));
  caust.repeat.set(SPAN / 70, SPAN / 70);
  const band = document.createElement('canvas'); band.width = band.height = CN;
  { const x = band.getContext('2d'); x.filter = 'blur(16px)'; island(x, S + 52, '#fff'); x.globalCompositeOperation = 'destination-out'; x.filter = 'blur(3px)'; island(x, S + 6, '#000'); }
  const CAUST = new T.Mesh(new T.PlaneGeometry(SPAN, SPAN).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({map: caust, alphaMap: tex(band, false, false), transparent: true,
    depthWrite: false, blending: T.AdditiveBlending, opacity: .3}));
  CAUST.position.y = .42; scene.add(noRef(CAUST));
  // fish shadows: 5 little schools swimming round the island in the shallow band, now and then darting ahead
  const FISHLOOP = COAST.map(c => { const h = HEX[c.h], [mx, mz] = edgeMid(c.e), d = Math.hypot(mx - h.x, mz - h.y); return [mx + (mx - h.x) / d * 34, mz + (mz - h.y) / d * 34]; });
  const FISHLEN = [0]; FISHLOOP.forEach((p, k) => { const q = FISHLOOP[(k + 1) % FISHLOOP.length]; FISHLEN.push(FISHLEN[k] + Math.hypot(q[0] - p[0], q[1] - p[1])); });
  function loopAt(u, side) {      // a point on the fish's loop round the island (u: 0-1 of the way round), pushed out by `side`
    const L = FISHLEN[FISHLEN.length - 1], d = ((u % 1) + 1) % 1 * L;
    let k = 0; while (FISHLEN[k + 1] < d) k++;
    const p = FISHLOOP[k], q = FISHLOOP[(k + 1) % FISHLOOP.length], f = (d - FISHLEN[k]) / (FISHLEN[k + 1] - FISHLEN[k]);
    const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1;
    return [p[0] + dx * f + dz / l * side, p[1] + dz * f - dx / l * side, Math.atan2(-dz, dx)];
  }
  const fishTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 32; const x = c.getContext('2d');
    x.fillStyle = '#062a30'; x.filter = 'blur(1.5px)'; x.beginPath(); x.ellipse(28, 16, 20, 7, 0, 0, 7); x.fill();
    x.beginPath(); x.moveTo(44, 16); x.lineTo(60, 7); x.lineTo(57, 16); x.lineTo(60, 25); x.closePath(); x.fill(); return tex(c, false, false); })();
  const FISHMAT = new T.MeshBasicMaterial({map: fishTex, transparent: true, opacity: .4, depthWrite: false});
  const FISH = [], fishGeo = new T.PlaneGeometry(9, 4.5).rotateX(-Math.PI / 2).rotateY(Math.PI);      // (head towards +x)
  for (let s = 0; s < 5; s++) for (let k = 0; k < 4; k++) {
    const m = new T.Mesh(fishGeo, FISHMAT); m.userData = {u: s / 5 + k * .006, side: (k % 2 ? 4 : -4) + (s % 2 ? 8 : -6), sp: .006 + s * .0015, k: s * 1.7 + k * .3, s};
    m.position.y = .48; scene.add(noRef(m)); FISH.push(m);
  }

  // ----- day and night (2026-11-19, Rick's pick) -----
  // The time of day moves on a little every turn: a full day (morning, noon, sunset, night) takes 4 rounds.
  // Each key: where the sun (or the moon, at night) is, the light, the sky's colours, the haze, the sea, stars,
  // and `n`, how much it's night (town windows and torches light up, the lighthouse lamp brightens).
  const DAYK = [
    {pol: 64, az: -112, sun: 0xffd9b4, si: 2.2, hemi: .42, hor: [.86, .75, .68], zen: [.2, .38, .64], glow: [1, .78, .55], fog: 0xc2b8b4, exp: .95, sea: 0x0d5a78, sunc: 0xffe0c0, stars: 0, n: 0},      // morning
    {pol: 52, az: -145, sun: 0xfff0d8, si: 2.6, hemi: .45, hor: [.55, .70, .80], zen: [.04, .17, .36], glow: [1, .85, .6], fog: 0x9db8ca, exp: .95, sea: 0x0a5878, sunc: 0xfff2dd, stars: 0, n: 0},      // noon (the old look)
    {pol: 75, az: -185, sun: 0xffa262, si: 2.2, hemi: .34, hor: [1, .56, .32], zen: [.16, .18, .42], glow: [1, .55, .25], fog: 0xc49478, exp: .93, sea: 0x1a4c66, sunc: 0xffa060, stars: .08, n: .4},  // sunset
    {pol: 48, az: -125, sun: 0xa9bcff, si: .8, hemi: .22, hor: [.08, .11, .22], zen: [.01, .02, .07], glow: [.8, .85, 1], fog: 0x141c2e, exp: .88, sea: 0x05223a, sunc: 0xc8d4ff, stars: 1, n: 1}           // night: moonlight
  ];
  const DAY = {cur: null, n: 0, env: -1};
  const lerpN = (a, b, f) => a + (b - a) * f, cA3 = new T.Color(), cB3 = new T.Color();
  const lerpC = (a, b, f, out) => out.copy(cA3.set(a)).lerp(cB3.set(b), f);
  function setDay(d) {      // d: days since the start (0 = morning, .25 noon, .5 sunset, .75 night)
    const x = ((d % 1) + 1) % 1 * 4, i = Math.floor(x) % 4, A = DAYK[i], B = DAYK[(i + 1) % 4], f0 = x - Math.floor(x), f = f0 * f0 * (3 - 2 * f0);
    SUN.setFromSphericalCoords(1, T.MathUtils.degToRad(lerpN(A.pol, B.pol, f)), T.MathUtils.degToRad(lerpN(A.az, B.az, f)));
    sun.position.copy(SUN).multiplyScalar(800);
    lerpC(A.sun, B.sun, f, sun.color); sun.intensity = lerpN(A.si, B.si, f); HEMI.intensity = lerpN(A.hemi, B.hemi, f);
    ['hor', 'zen', 'glow'].forEach(k => SKYU[k].value.setRGB(...A[k].map((v, j) => lerpN(v, B[k][j], f))));
    SKYU.stars.value = lerpN(A.stars, B.stars, f);
    lerpC(A.fog, B.fog, f, scene.fog.color);
    R.toneMappingExposure = lerpN(A.exp, B.exp, f);
    const wu = water.material.uniforms;
    wu.sunDirection.value.copy(SUN); lerpC(A.sunc, B.sunc, f, wu.sunColor.value); lerpC(A.sea, B.sea, f, wu.waterColor.value);
    dsun.position.copy(SUN);
    DAY.n = lerpN(A.n, B.n, f);
    if (Math.abs(d - DAY.env) > .015) {      // remake the sky light now and then (not every frame: it costs a little)
      DAY.env = d; const old = scene.environment;
      scene.environment = DSCENE.environment = PMREM.fromScene(envScene).texture; old.dispose();
    }
    SHADOW = true;
  }
  // (2026-11-20: the time of day no longer moves with the turns; it comes from the visual pack, js/packs.js)
  const dayWanted = () => DAY.test != null ? DAY.test : typeof packOf === 'function' ? packOf().time : .25;
  function dayStep() {
    const want = dayWanted();
    if (want === DAY.cur) return;
    DAY.cur = want; setDay(want);      // a new pick shows straight away
  }

  // ----- camera and controls (drag to turn round the island, scroll or pinch to zoom, right-drag to slide) -----
  const C = new Orbit(cam, cv);
  C.enableDamping = true; C.dampingFactor = .08; C.rotateSpeed = .55; C.zoomSpeed = .8;
  C.minPolarAngle = .12; C.maxPolarAngle = 1.22; C.screenSpacePanning = false;
  cv.style.touchAction = WIDE.matches ? 'none' : 'pan-y';      // on phones a straight-up swipe still scrolls the page
  let FITTED = false;
  function fit(reset) {
    const w = view.clientWidth, h = view.clientHeight;
    if (!w || !h) return;
    usePR(); R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    const v = T.MathUtils.degToRad(cam.fov / 2), hz = Math.atan(Math.tan(v) * cam.aspect);
    const dist = (ISLE + 40) / Math.sin(Math.min(v * 1.25, hz)) * (cam.aspect < 1.2 ? 1.08 : WIDE.matches ? 1.12 : .95);
    C.minDistance = dist * .28; C.maxDistance = dist * 1.8;
    if (reset || !FITTED) {
      FITTED = true;
      C.target.set(0, 0, WIDE.matches ? 55 : 5);
      cam.position.copy(C.target).add(new T.Vector3().setFromSphericalCoords(dist, T.MathUtils.degToRad(42), 0));
    }
    C.update();
  }
  new ResizeObserver(() => { if (D3.on) fit(false); }).observe(view);

  // ----- what stays put for a whole game: lands and their scenery, number discs, ports, the lair -----
  const stat = new T.Group(), dyn = new T.Group(), hits = new T.Group();
  scene.add(stat, dyn, hits);
  let SKEY = null, TILES3 = [], DISCS = [], SMOKE = [], CAMPGLOW = null, junk = [];
  const SNOOZE = [];      // resting knights' floating Z sprites (see snooze(), moved in frame())
  const DSMOKE = [], DFLAGS = [];      // busy towns (2026-11-19): chimney smoke puffs and fluttering fort flags, rebuilt in dynamic()
  const ROUTEMAT = new T.MeshStandardMaterial({color: 0xffe08a, emissive: 0xffb52e, emissiveIntensity: 1, roughness: .3, metalness: .4});      // longest route strip
  const keep = o => { junk.push(o); return o; };       // made for this game only: thrown away when the next one starts
  function inst(geo, mat, list, shadow) {               // many copies of one shape in one go (fast)
    if (!list.length) return;
    const m = new T.InstancedMesh(geo, mat, list.length), o = new T.Object3D(), c = new T.Color();
    list.forEach((p, k) => {
      o.position.set(p.x, p.y, p.z); o.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
      o.scale.set(p.sx, p.sy == null ? p.sx : p.sy, p.sz == null ? p.sx : p.sz); o.updateMatrix();
      m.setMatrixAt(k, o.matrix); m.setColorAt(k, c.set(p.c).multiplyScalar(p.k || 1));
    });
    m.castShadow = shadow !== false; m.receiveShadow = true; stat.add(keep(m));
    m.userData.hs = Int16Array.from(list, p => p.h == null ? -1 : p.h);      // which tile each copy belongs to (-1: ports), for the intro
    return m;
  }
  function scenery(t, i, h, r, L) {
    const X = x => h.x + x, Z = z => h.y + z;
    if (t === 'wood') {                                         // a forest: pines and round leafy trees
      // (Rick's request, 2026-11-19: trees don't poke into each other. Each tree's widest part (pine: bottom tier,
      // leafy: crown) is a circle of radius `w`; a spot is only used if it's clear of every tree already planted.)
      // (denser, Rick 2026-11-20: up to 34 trees (was 22), a little smaller on average, packed closer, still not touching)
      const trees = [];
      for (let n = 0; n < 1200 && trees.length < 34; n++) {
        const x = (r() - .5) * 84, z = (r() - .5) * 84;
        if (!inHex(x, z, 39) || Math.hypot(x, z) < 23) continue;
        const s = .7 + r() * .35, pine = r() < .4, w = (pine ? 5 : 6.3) * s;
        if (trees.some(q => Math.hypot(q.x - x, q.z - z) < q.w + w + .1)) continue;
        trees.push({x, z, w});
        const k = .7 + r() * .45;
        if (pine) {
          L.trunk.push({x: X(x), y: TOP, z: Z(z), sx: 1.6 * s, sy: 4 * s, c: '#5a3d22'});
          L.pine.push({x: X(x), y: TOP + 2 * s, z: Z(z), sx: 10 * s, sy: 21 * s, ry: r() * 6, c: '#1d5a2e', k});
        } else {
          const th = 7 * s;
          L.trunk.push({x: X(x), y: TOP, z: Z(z), sx: 1.8 * s, sy: th + 2, c: '#5a3d22'});
          L.crown.push({x: X(x), y: TOP + th + 4 * s, z: Z(z), sx: 5.5 * s, sy: 5.2 * s, ry: r() * 6, c: trees.length % 3 ? '#2f7a35' : '#3f8a30', k});
        }
      }
    }
    if (t === 'stone') {                                        // grey peaks behind the number, boulders in front, a stone mine at one side
      const rock0 = L.rock.length, crys0 = L.crystal.length, snow0 = L.snow.length;    // (for the number-disc check at the end)
      const m = r() < .5 ? -1 : 1;                              // which front side the mine is on
      // a mountain range (Rick, 2026-11-20: "more of a continuous mountain range"; were 5 separate peaks): a chain of
      // overlapping peaks curving round the back of the tile, from the mine's hill on one side to the quarry's on the
      // other, tallest in the middle and lower towards the ends, with low ridges filling the dips between peaks and a
      // second, lower row behind. Snow on the tall ones.
      const RANGE = 11;
      for (let q = 0; q < RANGE; q++) {
        // (the ends stop short of the quarry's crane and the mine's shaft, and are narrower)
        const f = q / (RANGE - 1), a = Math.PI * (1.08 + .84 * f), R = 29 + (r() - .5) * 2.5;
        const x = Math.cos(a) * R, z = Math.sin(a) * R, hgt = (.55 + .45 * Math.sin(f * Math.PI)) * (q % 2 ? .78 : 1) * (.9 + r() * .2);
        const w = 6 + 3 * Math.sin(f * Math.PI) + r() * 1.2, sy = 27 * hgt;
        L.rock.push({x: X(x), y: TOP + 1, z: Z(z), sx: w, sy, sz: w * .9, ry: r() * 6, c: '#8f8a84', k: .78 + r() * .3});
        if (sy > 19) L.snow.push({x: X(x), y: TOP + 1 + sy * .87, z: Z(z), sx: w * .42, sy: sy * .17, ry: r() * 6, c: '#f2f4f8'});
        if (q < RANGE - 1) {      // a low ridge in the dip before the next peak
          const b = a + Math.PI * .84 / (RANGE - 1) / 2;
          L.rock.push({x: X(Math.cos(b) * 31), y: TOP, z: Z(Math.sin(b) * 31), sx: 6.5, sy: 9 + r() * 4, sz: 6, ry: r() * 6, c: '#86817b', k: .85});
        }
        if (q % 2 === 0 && f > .1 && f < .9) {      // the lower row behind, along the back edge
          L.rock.push({x: X(Math.cos(a) * 37), y: TOP, z: Z(Math.sin(a) * 37), sx: 6, sy: 11 + r() * 4, sz: 5.5, ry: r() * 6, c: '#7f7a74', k: .85});
        }
      }
      // (boulders keep clear of the mine)
      // the quarry (2026-11-19, Rick's request), on the other front side from the mine: a hill with stepped ledges cut
      // into it in pale fresh stone, a crystal vein showing on the top ledge, a stack of cut blocks and a wooden crane
      // lifting one. `u` runs outwards from the quarry's middle (qx); the ledges' sides all differ a little (no z-fighting).
      const o = -m, qx = o * 23, qz = 10, QX = u => qx + o * u;
      L.rock.push({x: X(QX(9)), y: TOP, z: Z(qz), sx: 6, sy: 15, sz: 10, ry: r() * 6, c: '#8f8a84', k: .9});      // the hill behind the ledges
      // ledges: [u middle, width, height, depth, colour] (inner one lowest)
      [[0, 10, 3, 16, '#cfc9bc'], [1.6, 7, 6.2, 15, '#bfb8aa'], [3.2, 3.9, 9.5, 14, '#dbd6ca']].forEach(([u, w, hgt, d, c], q) =>
        L.cut.push({x: X(QX(u + q * .05)), y: TOP + hgt / 2, z: Z(qz), sx: w, sy: hgt, sz: d, ry: 0, c}));
      // a stack of cut blocks in front of the quarry: [u, along z, level]
      [[-3, 0, 0], [-3, 3.3, 0], [-3, 6.6, 0], [.3, 3.3, 0], [-3, 1.65, 1], [-3, 4.95, 1], [-3, 3.3, 2]].forEach(([u, w, lv], q) =>
        L.cut.push({x: X(QX(u)), y: TOP + 1.5 + lv * 3.02, z: Z(qz + 10 + w), sx: 3, sy: 3, sz: 3, ry: (r() - .5) * .15, c: q % 2 ? '#d2ccbf' : '#c2bbad'}));
      // the crane, behind the quarry: a post, a beam out over the ledges, a rope and a block hanging from it
      const cz0 = qz - 8, bdx = o * 7, bdz = 6;      // the beam runs from the post's top (u -3) to over the top ledge (u 4)
      L.post.push({x: X(QX(-3)), y: TOP, z: Z(cz0), sx: 1.3, sy: 19, sz: 1.3, c: '#6a4a2a'});
      L.rail.push({x: X(QX(-3) + bdx / 2), y: TOP + 18.4, z: Z(cz0 + bdz / 2), sx: Math.hypot(bdx, bdz) + 1, sy: 1.1, sz: 1.1, ry: Math.atan2(-bdz, bdx), c: '#5e4024'});
      L.post.push({x: X(QX(4)), y: TOP + 13.1, z: Z(cz0 + bdz), sx: .25, sy: 5, sz: .25, c: '#d8c79a'});
      L.cut.push({x: X(QX(4)), y: TOP + 11.8, z: Z(cz0 + bdz), sx: 2.6, sy: 2.6, sz: 2.6, ry: .3, c: '#d0cabd'});
      // crystal clusters (blue and violet, glowing softly, see frame()): at the foot of the side peaks, at the front,
      // and in a vein on the quarry's top ledge
      const cluster = (x, z, s, y) => {
        const n = 4 + Math.floor(r() * 3);
        for (let q = 0; q < n; q++) {
          const a = q / n * Math.PI * 2 + r(), tilt = q ? .25 + r() * .45 : r() * .15, d = q ? .8 + r() * 1.2 : 0;
          L.crystal.push({x: X(x + Math.cos(a) * d * s), y: (y || TOP) - .3, z: Z(z + Math.sin(a) * d * s), sx: (.9 + r() * .6) * s, sy: (q ? 2 + r() * 1.6 : 3.6 + r()) * s,
            ry: -a, rz: -tilt, c: ['#4fb8ff', '#9a72ff', '#3fe4ff'][Math.floor(r() * 3)], k: .95 + r() * .15});
        }
      };
      cluster(m * 19, -5, 2); cluster(o * 18, -6, 1.7); cluster(o * 7, 27, 1.6); cluster(0, 36, 1.2);
      cluster(QX(3.2), qz + 4, 1.3, TOP + 9.5);
      for (let n = 0; n < 16; n++) { const x = (r() - .5) * 80, z = (r() - .5) * 80; if (inHex(x, z, 40) && Math.hypot(x, z) > 21 && Math.hypot(x - m * 24, z - 20) > 14 && Math.hypot(x - qx, z - qz - 6) > 17) L.rock.push({x: X(x), y: TOP + .5, z: Z(z), sx: 1.5 + r() * 2.5, ry: r() * 6, c: '#9a9ca2', k: .8 + r() * .3}); }
      // the mine (2026-11-18, Rick's request): a rocky hill with a timber-framed shaft, a lamp, a rail track
      // running out towards the front, a cart full of stone on it, a heap of dug stone and a pickaxe
      const mx = m * 27;
      L.rock.push({x: X(m * 28), y: TOP, z: Z(6), sx: 11, sy: 12, sz: 9, ry: r() * 6, c: '#8f8a84', k: .9},
        {x: X(m * 35), y: TOP, z: Z(1), sx: 6, sy: 8, sz: 6, ry: r() * 6, c: '#857f78', k: .9});
      L.cave.push({x: X(mx), y: TOP, z: Z(15), sx: 4.6, sy: 7.5, sz: 3.6, c: '#0b0806'});
      [-4.6, 4.6].forEach(u => L.post.push({x: X(mx + u), y: TOP, z: Z(18), sx: 1.2, sy: 8, sz: 1.2, c: '#6a4a2a'}));
      L.rail.push({x: X(mx), y: TOP + 8, z: Z(18), sx: 11.5, sy: 1.3, sz: 1.5, c: '#5e4024'});
      L.lamp.push({x: X(mx + m * -3), y: TOP + 6.2, z: Z(18.9), sx: 1, sy: 1.4, sz: 1, c: '#fff'});
      // the track: two steel rails on wooden sleepers, from the shaft towards the front of the tile
      const A = [mx, 18.5], B = [m * 15, 31], dx = B[0] - A[0], dz = B[1] - A[1], len = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx), nx = -dz / len, nz = dx / len;
      [-1.4, 1.4].forEach(w => L.blade.push({x: X((A[0] + B[0]) / 2 + nx * w), y: TOP + .55, z: Z((A[1] + B[1]) / 2 + nz * w), sx: len, sy: .4, sz: .45, ry, c: '#7a8088'}));
      for (let q = 0; q <= 6; q++) { const k = q / 6; L.plank.push({x: X(A[0] + dx * k), y: TOP + .2, z: Z(A[1] + dz * k), sx: 1.2, sy: .4, sz: 4.4, ry, c: '#6a4a2a'}); }
      // the cart, partway out, heaped with stone
      const cx = A[0] + dx * .55, cz = A[1] + dz * .55;
      L.blade.push({x: X(cx), y: TOP + 3, z: Z(cz), sx: 5.2, sy: 3, sz: 3.8, ry, c: '#5a5f66'});
      [[-1.6, -1.9], [1.6, -1.9], [-1.6, 1.9], [1.6, 1.9]].forEach(([u, w]) => L.wheel.push({x: X(cx + Math.cos(ry) * u + nx * w), y: TOP + 1.3, z: Z(cz - Math.sin(ry) * u + nz * w), sx: 1.1, sy: 1, sz: 1.1, rz: Math.PI / 2, ry: ry + Math.PI / 2, c: '#2a2a2e'}));
      [[-1.2, -.6], [1, .5], [0, .2]].forEach(([u, w], q) => L.rock.push({x: X(cx + Math.cos(ry) * u + nx * w), y: TOP + 4.6 + (q === 2 ? .8 : 0), z: Z(cz - Math.sin(ry) * u + nz * w), sx: 1.6, sy: 1.3, ry: q * 2, c: '#9a9ca2', k: .85}));
      // dug stone heaped by the entrance, and a pickaxe leaning on it
      const hx = mx + m * 7.5, hz = 20;
      L.rock.push({x: X(hx), y: TOP, z: Z(hz), sx: 3.6, sy: 2.6, ry: 1, c: '#8d9096'}, {x: X(hx - m * 2.4), y: TOP, z: Z(hz + 2.4), sx: 2.2, sy: 1.8, ry: 2, c: '#a2a5ab'});
      L.post.push({x: X(hx - m * 3), y: TOP, z: Z(hz + 1), sx: .5, sy: 7.5, rz: -m * .4, c: '#8a6236'});
      L.blade.push({x: X(hx - m * 3 + m * 7.5 * Math.sin(.4)), y: TOP + 7.5 * Math.cos(.4), z: Z(hz + 1), sx: 4.6, sy: .7, sz: .7, rz: -m * .4, c: '#8d9298'});
      // Keep clear of the number disc (Rick, 2026-11-20: peaks and crystals poked into it). The disc's radius is 15.2;
      // nothing may come within DISCCLEAR of the middle. A rock's lumpy shape reaches ~1.3x its size, so rocks too
      // close are made narrower (same height), and crystal clusters are moved outwards.
      const DISCCLEAR = 17;
      L.rock.slice(rock0).forEach(p => {
        const d = Math.hypot(p.x - h.x, p.z - h.y), w = Math.max(p.sx, p.sz == null ? p.sx : p.sz) * 1.3;
        if (d - w >= DISCCLEAR) return;
        const k = Math.max(.3, (d - DISCCLEAR) / w);
        p.sx *= k; if (p.sz != null) p.sz *= k;
        L.snow.slice(snow0).forEach(q => { if (q.x === p.x && q.z === p.z) { q.sx *= Math.sqrt(k); q.sz = q.sx; } });      // (its snow cap too)
      });
      L.crystal.slice(crys0).forEach(p => {
        const dx = p.x - h.x, dz = p.z - h.y, d = Math.hypot(dx, dz) || 1, need = DISCCLEAR + 1.5;
        if (d < need) { p.x = h.x + dx / d * need; p.z = h.y + dz / d * need; }
      });
    }
    if (t === 'grain') for (let z = -44; z <= 44; z += 2.3) for (let x = -44; x <= 44; x += 2.3) {     // wheat, stalk by stalk
      const a = x + (r() - .5) * 1.6, b = z + (r() - .5) * 1.6;
      if (!inHex(a, b, 41.5) || Math.hypot(a, b) < 19) continue;
      L.stalk.push({x: X(a), y: TOP, z: Z(b), sx: 1.7, sy: 7 + r() * 2.5, rx: (r() - .5) * .25, rz: (r() - .5) * .25, ry: r() * 6, c: r() < .5 ? '#ffd45e' : '#f0b83c', k: .9 + r() * .25});
    }
    if (t === 'wool') {                                         // grass, a fenced paddock and sheep
      for (let n = 0; n < 110; n++) { const x = (r() - .5) * 84, z = (r() - .5) * 84; if (inHex(x, z, 42) && Math.hypot(x, z) > 17) L.tuft.push({x: X(x), y: TOP, z: Z(z), sx: 1.4 + r(), sy: 2 + r() * 2.5, ry: r() * 6, c: '#3f8a2c', k: .75 + r() * .5}); }
      const F = 38, P = [0, 1, 2, 3, 4, 5].map(k => { const a = Math.PI / 180 * (60 * k - 90); return [F * Math.cos(a), F * Math.sin(a)]; });
      const sides = P.map((a, j) => [a, P[(j + 1) % 6]]);
      const gate = sides.reduce((g, s, j) => s[0][1] + s[1][1] > sides[g][0][1] + sides[g][1][1] ? j : g, 0);
      const stretch = (a, b) => {
        const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), n = Math.max(1, Math.round(len / 8));
        for (let q = 0; q <= n; q++) L.post.push({x: X(a[0] + dx * q / n), y: TOP, z: Z(a[1] + dz * q / n), sx: 1.1, sy: 5.6, c: '#8a6236'});
        [2.4, 4.6].forEach(y => L.rail.push({x: X(a[0] + dx / 2), y: TOP + y, z: Z(a[1] + dz / 2), sx: len, sy: .5, sz: .5, ry: Math.atan2(-dz, dx), c: '#a4784a'}));
      };
      sides.forEach(([a, b], j) => {
        if (j !== gate) return stretch(a, b);
        const m = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        stretch(a, m(.32)); stretch(m(.68), b);
      });
      const flock = [];
      for (let n = 0; n < 50 && flock.length < 6; n++) {
        const x = (r() - .5) * 60, z = (r() - .5) * 60;
        if (!inHex(x, z, 29) || Math.hypot(x, z) < 21 || flock.some(([a, b]) => Math.hypot(a - x, b - z) < 9)) continue;
        flock.push([x, z]);
        const ry = r() * 6.28, s = .95 + r() * .2;
        L.fleece.push({x: X(x), y: TOP, z: Z(z), sx: s, ry, c: '#f4f1ea', k: .9 + r() * .1});
        L.sheepd.push({x: X(x), y: TOP, z: Z(z), sx: s, ry, c: '#2e2626'});
      }
    }
    if (t === 'clay') {      // a clay works: a dug clay pit, a smoking brick kiln, fired bricks, a muddy puddle with reeds
      // six places round the number disc, shuffled per tile; the kiln always gets one at the back so it never hides the number
      const back = [[-27, -15], [0, -31], [27, -15]], front = [[-26, 16], [26, 16], [0, 31]];
      const pickOut = a => a.splice(Math.floor(r() * a.length), 1)[0];
      const kiln = pickOut(back), pit = pickOut(front), rest = back.concat(front);
      const puddle = pickOut(rest), bricks = pickOut(rest);
      const jit = ([x, z]) => [x + (r() - .5) * 4, z + (r() - .5) * 4];
      { // the kiln: a brick beehive with a glowing fire mouth facing you, a chimney, smoke, and a log pile
        const [x, z] = jit(kiln).map(v => v * .9), ry = (r() - .5) * .8, sn = Math.sin(ry), cs = Math.cos(ry);
        const at = (u, w) => [X(x + cs * u + sn * w), Z(z - sn * u + cs * w)];      // u: across, w: towards the front
        L.kiln.push({x: X(x), y: TOP + 1.2, z: Z(z), sx: 1.4, ry, c: '#c8684a', k: .9 + r() * .2});
        L.hole.push({x: X(x), y: TOP + .7, z: Z(z), sx: 10.2, sy: 7, sz: 10.2, c: '#8a8278'});      // its stone base
        const [dx, dz] = at(0, 8); L.mouth.push({x: dx, y: TOP + 3.6, z: dz, sx: 4.2, sy: 4.6, sz: 1.6, ry, c: '#ffffff'});
        L.pile.push({x: X(x + 1.6), y: TOP + 12.4, z: Z(z - 1.4), sx: 2.8, sy: 5, c: '#7a3a26'});
        L.smoke.push({x: X(x + 1.6), y: TOP + 18, z: Z(z - 1.4), s: .4});
        [[1.4, 1.1], [-.8, 1.1], [.3, 2.9]].forEach(([w, y]) => { const [lx, lz] = at(9.5, w + 4); L.trunk.push({x: lx, y: TOP + y, z: lz, sx: 2, sy: 7, rz: Math.PI / 2, ry, c: '#6a4426'}); });      // logs, lying across
      }
      { // the clay pit: a dark dug hole with a raised rim of dug clay, two heaps and a shovel stuck in one
        const [x, z] = jit(pit), ry = r() * 3;
        L.hole.push({x: X(x), y: TOP + .15, z: Z(z), sx: 8.5, sy: 1, sz: 6.2, ry, c: '#2e1609'});
        L.rim.push({x: X(x), y: TOP + .3, z: Z(z), sx: 9, sy: 6, sz: 6.8, ry, c: '#c4703f', k: .9 + r() * .2});
        const hx = x + 12 * (x < 0 ? 1 : -1), hz = z - 4;
        L.rock.push({x: X(hx), y: TOP, z: Z(hz), sx: 4.4, sy: 3.2, ry: r() * 6, c: '#c86c3c'});
        L.rock.push({x: X(hx + 2.5), y: TOP, z: Z(hz + 5), sx: 3, sy: 2.2, ry: r() * 6, c: '#b9612f'});
        L.post.push({x: X(hx), y: TOP + 1.5, z: Z(hz), sx: .55, sy: 10, rz: .45, c: '#8a6236'});           // shovel handle
        L.blade.push({x: X(hx + .5), y: TOP + 1.6, z: Z(hz), sx: 2.4, sy: 2.8, sz: .35, rz: .45, c: '#8d9298'});
      }
      { // a muddy puddle with reeds
        const [x, z] = jit(puddle);
        L.puddle.push({x: X(x), y: TOP + .1, z: Z(z), sx: 5 + r() * 2, sy: 1, sz: 3 + r() * 2, ry: r() * 6, c: '#3b2416'});
        for (let q = 0; q < 6; q++) { const a = r() * 6.28, d = 5.5 + r() * 2.5; L.reed.push({x: X(x + Math.cos(a) * d), y: TOP, z: Z(z + Math.sin(a) * d * .7), sx: 1, sy: 4 + r() * 3.5, rx: (r() - .5) * .3, rz: (r() - .5) * .3, c: '#6f7a32', k: .8 + r() * .4}); }
      }
      { // a big stack of fired bricks on a wooden pallet (2026-11-18: made larger, Rick's request): 4 rows, two bricks deep
        const [x, z] = jit(bricks), ry = r() * 3, cs = Math.cos(ry), sn = Math.sin(ry);
        const at = (u, w) => [X(x + cs * u + sn * w), Z(z - sn * u + cs * w)];      // u: along the stack, w: across
        { const [px, pz] = at(0, 0); L.plank.push({x: px, y: TOP + .4, z: pz, sx: 20.5, sy: .8, sz: 6, ry, c: '#9a7044'}); }
        [[0, 4], [1, 3], [2, 2], [3, 1]].forEach(([row, cnt]) => { for (let q = 0; q < cnt; q++) for (const w of [-1.25, 1.25]) {
          const [bx, bz] = at((q - (cnt - 1) / 2) * 4.9, w);
          L.brick.push({x: bx, y: TOP + 1.85 + row * 2.15, z: bz, sx: 4.7, sy: 2.05, sz: 2.4, ry, c: '#b45a32', k: .78 + r() * .4});
        } });
      }
    }
  }
  function puff(x, y, z, s, k) {      // one puff of smoke rising from (x, y, z); s = size, k = where in its rise it starts
    const p = new T.Mesh(G3.ball, keep(std({color: 0x8a8580, transparent: true, opacity: .4, depthWrite: false, roughness: 1})));
    p.userData = {k, x, y, z, s}; stat.add(noRef(p)); SMOKE.push(p);
  }
  // Fire glow (2026-11-20, Rick: cheaper lighting is fine): the lair's campfire used to have a real flickering
  // PointLight. Being the only extra light, it made the graphics chip re-prepare nearly every material's program when a
  // game started (the start-up island has no such light), the heaviest moment for Rick's laptop, and it cost a bit on
  // every pixel. Now it's a glowing sprite (CAMPGLOW, opacity flickered in frame(); userData.k = brightness).
  function fireGlow(x, y, z, size, k, col, i) {
    const s = new T.Sprite(keep(new T.SpriteMaterial({map: glowTex, color: col, transparent: true, depthWrite: false, blending: T.AdditiveBlending})));
    s.position.set(x, y, z); s.scale.set(size, size, 1); s.userData.k = k; s.userData.h = i;
    stat.add(noRef(s)); return s;
  }
  function lair(h, L, i) {      // the bandits' lair (the middle land in Classic games): a cave in a rocky hill, a camp, a lookout and stolen gold
    const X = x => h.x + x, Z = z => h.y + z;
    // the rocky hill at the back, with the cave mouth (a dark hollow framed with timbers) and a torch either side
    [[0, -31, 14, 17, 10, .4], [-16, -24, 10, 12, 10, 1.3], [16, -25, 10, 11, 10, 2.6], [-27, -13, 7, 6, 7, 4], [-7, -36, 9, 10, 8, 2], [8, -36, 9, 11, 8, 3.3]]
      .forEach(([x, z, sx, sy, sz, ry], n) => L.rock.push({x: X(x), y: TOP, z: Z(z), sx, sy, sz, ry, c: n % 2 ? '#6f675f' : '#7d746a'}));
    L.cave.push({x: X(0), y: TOP, z: Z(-19), sx: 7, sy: 10, sz: 4.5, c: '#0b0806'});
    [-6.2, 6.2].forEach(x => L.post.push({x: X(x), y: TOP, z: Z(-15.2), sx: 1.4, sy: 10.5, sz: 1.4, c: '#6a4a2a'}));
    L.rail.push({x: X(0), y: TOP + 10.5, z: Z(-15.2), sx: 15, sy: 1.5, sz: 1.8, c: '#5e4024'});
    [-10, 10].forEach(x => { L.post.push({x: X(x), y: TOP, z: Z(-12.5), sx: .8, sy: 7, c: '#5a3d22'}); L.fire.push({x: X(x), y: TOP + 7, z: Z(-12.5), sx: .9, sy: 1.2, c: '#fff'}); });
    // a campfire in a ring of stones, logs leaning in, smoke and a flickering light
    const fx = -19, fz = 15;
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; L.rock.push({x: X(fx + Math.cos(a) * 4.6), y: TOP + .3, z: Z(fz + Math.sin(a) * 4.6), sx: 1.4, ry: k, c: '#77706a'}); }
    [0, 2.1, 4.2].forEach(a => L.trunk.push({x: X(fx + Math.cos(a) * 3.8), y: TOP + .3, z: Z(fz - Math.sin(a) * 3.8), sx: 1.3, sy: 5.5, rz: Math.PI / 2 - .55, ry: a, c: '#5a3a20'}));
    L.fire.push({x: X(fx), y: TOP, z: Z(fz), sx: 2, sy: 1.6, c: '#fff'}, {x: X(fx + .8), y: TOP, z: Z(fz - .5), sx: 1.2, sy: 1.9, ry: 1, c: '#fff'});
    L.smoke.push({x: X(fx), y: TOP + 7, z: Z(fz), s: .45});
    CAMPGLOW = fireGlow(X(fx), TOP + 4, Z(fz), 26, .6, 0xff8a3a, i);
    // two canvas tents
    L.tent.push({x: X(24), y: TOP, z: Z(10), sx: 12, sy: 5.5, sz: 5.5, ry: .6, c: '#b39a6c'}, {x: X(-27), y: TOP, z: Z(1), sx: 10, sy: 5, sz: 5, ry: 1.2, c: '#8f7a55'});
    // a lookout tower with a railing and a red flag
    const tx = 27, tz = -12;
    [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]].forEach(([a, b]) => L.post.push({x: X(tx + a), y: TOP, z: Z(tz + b), sx: .9, sy: 22, c: '#6a4a2a'}));
    L.rail.push({x: X(tx), y: TOP + 19, z: Z(tz), sx: 7.6, sy: 1, sz: 7.6, c: '#7a5634'});
    [-1, 1].forEach(s => { L.rail.push({x: X(tx), y: TOP + 21.6, z: Z(tz + s * 2.6), sx: 6, sy: .5, sz: .5, c: '#6a4a2a'}, {x: X(tx + s * 2.6), y: TOP + 21.6, z: Z(tz), sx: .5, sy: .5, sz: 6, c: '#6a4a2a'}); });
    [-1, 1].forEach(s => L.rail.push({x: X(tx), y: TOP + 9, z: Z(tz + s * 2.6), sx: 7.4, sy: .6, sz: .6, rz: s * .9, c: '#5e4024'}));      // cross braces
    L.post.push({x: X(tx + 2.6), y: TOP + 22, z: Z(tz - 2.6), sx: .5, sy: 8, c: '#5a3d22'});
    L.rail.push({x: X(tx + 5.1), y: TOP + 28.3, z: Z(tz - 2.6), sx: 5, sy: 3, sz: .25, c: '#8a1f1f'});
    // stolen gold: a chest with gold bands, a heap of gold and coins scattered round it
    const cx = 12.5, cz = -6, cr = -.4, at = u => [X(cx + Math.cos(cr) * u), Z(cz - Math.sin(cr) * u)];
    L.rail.push({x: X(cx), y: TOP + 1.8, z: Z(cz), sx: 6, sy: 3.6, sz: 3.8, ry: cr, c: '#6b4322'}, {x: X(cx), y: TOP + 4.1, z: Z(cz), sx: 6.2, sy: 1.2, sz: 4, ry: cr, c: '#56351a'});
    [-2, 2].forEach(u => { const [x, z] = at(u); L.gold.push({x, y: TOP + 2.4, z, sx: .5, sy: 4.9, sz: 4.1, ry: cr, c: '#fff'}); });
    L.heap.push({x: X(17), y: TOP, z: Z(-1.5), sx: 3, sy: 1.6, sz: 2.5, c: '#fff'});
    const r = rng(4242);
    for (let k = 0; k < 10; k++) L.coin.push({x: X(9 + r() * 12), y: TOP + .15 + (k > 7 ? (k - 7) * .3 : 0), z: Z(-2 + r() * 6), sx: .9, ry: r() * 3, rx: (r() - .5) * .3, c: '#fff'});
    // barrels by the cave
    L.barrel.push({x: X(-15), y: TOP, z: Z(-7), sx: 2.2, sy: 4.5, c: '#7a5230'}, {x: X(-12.4), y: TOP, z: Z(-4.6), sx: 2, sy: 4, c: '#6b4728'});
  }
  function build() {
    // (2026-11-20: the last game's materials are thrown away a few seconds later, not now, so the new game's
    // identical materials reuse the graphics programs already prepared instead of making them again)
    const old = junk; junk = []; setTimeout(() => old.forEach(o => o.dispose()), 10000);      // (10 s: well after the new game's warm-up)
    stat.visible = true;      // (prewarm's sample island was hidden)
    stat.clear(); TILES3 = []; DISCS = []; SMOKE = []; CAMPGLOW = null;
    const L = {trunk: [], pine: [], crown: [], rock: [], snow: [], stalk: [], tuft: [], reed: [], post: [], rail: [], fleece: [], sheepd: [], brick: [], puddle: [], plank: [], pile: [],
      kiln: [], mouth: [], hole: [], rim: [], blade: [], cut: [], crystal: [], smoke: [], cave: [], fire: [], tent: [], gold: [], heap: [], coin: [], barrel: [], lamp: [], wheel: []};
    HEX.forEach((h, i) => {      // (everything made for a tile remembers which tile it is, for the intro)
      const n0 = {}, c0 = stat.children.length;
      for (const k in L) n0[k] = L[k].length;
      tile(h, i, L);
      for (const k in L) for (let q = n0[k]; q < L[k].length; q++) L[k][q].h = i;
      stat.children.slice(c0).forEach(o => { o.userData.h = i; });
    });
    const c1 = stat.children.length;
    ports(L);
    stat.children.slice(c1).forEach(o => { o.userData.h = -1; });
    instAll(L);
    lighthouse();
    if (INTRO) introEnd();
    // a brand-new game (nothing built yet, still in setup): the island assembles itself (introStart)
    if (G.phase === 'setup' && !Object.keys(G.b).length && !Object.keys(G.r).length) introStart();
  }
  function tile(h, i, L) {
    {
      const t = G.hex[i].t, r = rng(i * 97 + 13);
      const map = keep(LTEX[t].clone()); map.needsUpdate = true; map.repeat.set(1 / 55, 1 / 55); map.offset.set(r(), r());
      const top = keep(std({map, bumpMap: map, bumpScale: 1.5, roughness: .95, emissive: 0xffe08a, emissiveIntensity: 0}));
      const side = keep(std({map, color: 0x707070, roughness: 1}));
      const m = new T.Mesh(G3.tile, [top, side]); m.position.set(h.x, 0, h.y); m.castShadow = m.receiveShadow = true; stat.add(m);
      TILES3.push({top});
      scenery(t, i, h, r, L);
      if (t === 'lair') { lair(h, L, i); return; }      // the bandits' lair
      if (G.hex[i].n) {                // the number disc: a wooden token that always turns to face you
        const g = new T.Group(), base = new T.Mesh(G3.disc, M3.disc), face = new T.Mesh(G3.face, std({map: tokTex(G.hex[i].n), roughness: .6}));
        base.castShadow = base.receiveShadow = true; face.rotation.x = -Math.PI / 2; face.position.y = 3.05; face.receiveShadow = true;
        keep(face.material); g.add(base, face); g.position.set(h.x, TOP, h.y); g.userData.disc = true; stat.add(g); DISCS.push(g);
      }
    }
  }
  function ports(L) {
    (G.ports || []).forEach(o => {     // wooden jetties on pilings, with the port's sign on a post
      const g = portGeo(o), at = (d, s) => [g.mx + g.nx * d + g.tx * s, g.my + g.ny * d + g.ty * s], ry = Math.atan2(g.nx, g.ny);
      // two walkways, from the beach by each corner of the coast edge to the platform (PORTWALK, same as the flat map)
      PORTWALK.forEach(([x0, y0, x1, y1]) => {
        const P0 = at(JETTY + y0, x0), P1 = at(JETTY + y1, x1), dx = P1[0] - P0[0], dz = P1[1] - P0[1], len = Math.hypot(dx, dz), wr = Math.atan2(dx, dz);
        for (let k = 0, n = 0; k < len; k += 2.6, n++) L.plank.push({x: P0[0] + dx * k / len, y: 4.2, z: P0[1] + dz * k / len, sx: 9.2, sy: .8, sz: 2.3, ry: wr, c: n % 2 ? '#a97a42' : '#bb8c52'});
        [.3, .75].forEach(k => [-5.4, 5.4].forEach(w => L.pile.push({x: P0[0] + dx * k + dz / len * w, y: -8, z: P0[1] + dz * k - dx / len * w, sx: 1.9, sy: 13, c: '#4a2e14'})));
      });
      for (let s = -11, n = 0; s < 12.5; s += 2.6, n++) { const [x, z] = at(JETTY + 24.75, s); L.plank.push({x, y: 4.6, z, sx: 2.3, sy: .8, sz: 15.5, ry, c: n % 3 ? '#b4864d' : '#c49559'}); }
      [[17.5, -12.6], [17.5, 12.6], [32.3, -12.6], [32.3, 12.6]].forEach(([d, s]) => { const [x, z] = at(JETTY + d, s); L.pile.push({x, y: -8, z, sx: 1.9, sy: 13, c: '#4a2e14'}); });
      const [x, z] = at(DOCK, 0);
      L.pile.push({x, y: 5, z, sx: 1.2, sy: 12, c: '#6b4722'});
      const sign = new T.Sprite(keep(new T.SpriteMaterial({map: signTex(o.r)}))); sign.position.set(x, 24, z); sign.scale.set(19, 19, 1); stat.add(sign);
    });
  }
  function instAll(L) {
    inst(G3.trunk, M3.bark, L.trunk); inst(G3.pine, M3.pine, L.pine); inst(G3.crown, M3.leaf, L.crown);
    inst(G3.rock, M3.rock, L.rock); inst(G3.rock, M3.snow, L.snow); noRef(inst(G3.stalk, M3.wheat, L.stalk));
    noRef(inst(G3.tuft, M3.grass, L.tuft)); noRef(inst(G3.reed, M3.reed, L.reed)); inst(G3.post, M3.wood, L.post); inst(G3.cube, M3.wood, L.rail);
    inst(G3.fleece, M3.fleece, L.fleece); inst(G3.sheepd, M3.dark, L.sheepd); inst(G3.cube, M3.brick, L.brick);
    inst(G3.puddle, M3.puddle, L.puddle, false); inst(G3.cube, M3.wood, L.plank); inst(G3.pile, M3.wood, L.pile);
    inst(G3.kiln, M3.brick, L.kiln); inst(G3.cube, M3.ember, L.mouth, false); inst(G3.puddle, M3.mud, L.hole, false);
    inst(G3.rim, M3.mud, L.rim); inst(G3.cube, M3.metal, L.blade);
    inst(G3.cube, M3.cut, L.cut); inst(G3.crystal, M3.crystal, L.crystal);
    inst(G3.ball, M3.dark, L.cave, false); inst(G3.flame, M3.fire, L.fire, false); inst(G3.tent, M3.cloth, L.tent);
    inst(G3.cube, M3.gold, L.gold); inst(G3.ball, M3.gold, L.heap); noRef(inst(G3.coin, M3.gold, L.coin)); inst(G3.barrel, M3.wood, L.barrel);
    inst(G3.cube, M3.glow, L.lamp, false); inst(G3.coin, M3.dark, L.wheel);
    L.smoke.forEach(o => { for (let k = 0; k < 4; k++) puff(o.x, o.y, o.z, o.s, k / 4); });
  }

  // ----- the lighthouse (2026-11-19, Rick's pick) -----
  // On a little rocky islet off the coast, away from the ports and the raiders' side: a white tower with red bands,
  // a gallery, a glowing lamp room and a red cap. Its lamp glows brighter at night. (The sweeping beam was removed
  // 2026-11-20, Rick: too distracting.)
  const LH = {glow: null};
  const LAMPMAT = std({color: 0x664400, emissive: 0xffe2a0, emissiveIntensity: 1.2});
  function lighthouse() {
    const portMid = (G.ports || []).map(o => edgeMid(o.e)), fl = fleetAt(FLEETMAX);
    let best = null, bs = -1e9;
    COAST.forEach(c => {
      const [x, z] = edgeMid(c.e), near = Math.min(...portMid.map(([a, b]) => Math.hypot(a - x, b - z)), 999);
      const s = Math.min(near, 140) - z * .35 + Math.min(Math.hypot(fl[0] - x, fl[1] - z), 260) * .25;      // clear of ports, towards the back, away from the raiders
      if (s > bs) { bs = s; best = c; }
    });
    const h = HEX[best.h], [mx, mz] = edgeMid(best.e), d = Math.hypot(mx - h.x, mz - h.y), nx = (mx - h.x) / d, nz = (mz - h.y) / d;
    const g = new T.Group(); g.position.set(mx + nx * 72, 0, mz + nz * 72); g.userData.h = -1; stat.add(g);
    const r = rng(99);
    [[0, 0, 13, 7], [9, 5, 8, 5], [-8, 7, 7, 4], [4, -10, 9, 5], [-7, -7, 7, 4.5], [13, -5, 6, 3.5]].forEach(([x, z, s, y]) => {      // the islet's rocks
      const m = part(g, G3.rock, M3.rock, x, -3, z); m.scale.set(s, y + 3, s * .9); m.rotation.y = r() * 6; keep(m.material = std({color: 0x7d776f, roughness: .95, flatShading: true}));
    });
    const white = keep(std({color: 0xf3efe6, roughness: .6})), red = keep(std({color: 0xb8322a, roughness: .6}));
    const tower = new T.LatheGeometry([[6.8, 0], [6.2, 12], [5.4, 24], [4.6, 34], [0, 34]].map(([x, y]) => new T.Vector2(x, y)), 24);
    keep(tower); part(g, tower, white, 0, 4, 0);
    [[6.55, 5], [5.75, 18.5], [4.95, 29]].forEach(([rr, y]) => { const b = keep(cyl(rr + .25, rr + .25, 3.4, 24, 0)); part(g, b, red, 0, 4 + y, 0); });      // red bands
    part(g, keep(cyl(6.4, 6.4, 1, 24, 0)), M3.dark, 0, 38.5, 0);                                         // the gallery
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; part(g, G3.post, M3.dark, Math.cos(a) * 6, 39, Math.sin(a) * 6).scale.set(.3, 2.2, .3); }
    part(g, keep(cyl(3.6, 3.6, 5.5, 16, 0)), LAMPMAT, 0, 41.8, 0);                                    // the lamp room
    part(g, keep(new T.ConeGeometry(4.6, 5, 16)), red, 0, 47, 0);                                    // the cap
    part(g, G3.ball, M3.dark, 0, 49.8, 0).scale.setScalar(.9);
    part(g, G3.door, M3.door, 0, 6, 6.6);
    // a keeper's hut beside it
    part(g, G3.house, white, 10.5, 6.5, 4).scale.set(.75, .6, .7);
    part(g, G3.roof, red, 10.5, 8.6, 4).scale.set(.75, .6, .7);
    LH.glow = new T.Sprite(new T.SpriteMaterial({map: glowTex, transparent: true, depthWrite: false})); keep(LH.glow.material);
    LH.glow.position.set(g.position.x, 41.8, g.position.z); LH.glow.scale.set(36, 36, 1); LH.glow.userData.h = -1; stat.add(noRef(LH.glow));
  }

  // ----- the island assembles itself at the start of a game (2026-11-19, Rick's pick) -----
  // The land tiles fall from the sky one by one onto the sandy base, each settling with a little bounce; then
  // its trees, wheat, rocks and buildings pop up piece by piece, its number disc drops on, and finally the
  // jetties are laid plank by plank and the lighthouse goes up. The camera swings round as it happens.
  // Pieces of scenery are InstancedMeshes shared by all tiles, so each copy remembers its tile (`hs`) and its
  // finished matrix (`base`); introStep moves only the copies growing right then (see introStart).
  let INTRO = null;
  const backOut = k => { const c = 1.9; k -= 1; return 1 + (c + 1) * k * k * k + c * k * k; };
  const m4 = new T.Matrix4(), v3 = new T.Vector3();
  // one tile at a time (Rick, 2026-11-20): each starts falling as the one before it lands, so INTROTILE = INTROFALL.
  // (Landing them in groups was tried the same day: shorter, but no lighter per frame, so Rick kept one at a time.)
  const INTROTILE = 340, INTROFALL = 340, INTROGROW = 380;
  function introStart() {
    // tiles land from the middle outwards, round and round
    const ord = HEX.map((h, i) => i).sort((a, b) => (Math.round(Math.hypot(HEX[a].x, HEX[a].y) / 60) - Math.round(Math.hypot(HEX[b].x, HEX[b].y) / 60)) ||
      Math.atan2(HEX[a].y, HEX[a].x) - Math.atan2(HEX[b].y, HEX[b].x));
    const land = []; ord.forEach((i, k) => { land[i] = 500 + k * INTROTILE; });
    const ports = 500 + HEX.length * INTROTILE + 250, end = ports + 1700;
    const insts = [];
    // Lighter intro (Rick, 2026-11-20): there are ~4000 scenery copies (wheat stalk by stalk...), and every frame used to
    // work out all of them and send them all to the graphics chip again. Now each copy's start (ia) and finish (ib) are
    // worked out once; a frame only touches the copies growing or bouncing right then, and a group nothing moved in
    // isn't sent again. Every copy starts hidden (scale ~0) and is set to its finished place once when it's done.
    stat.children.forEach(o => {
      const u = o.userData;
      if (o.isInstancedMesh && u.hs) {
        const hs = u.hs, n = hs.length, B = u.base = o.instanceMatrix.array.slice();
        const A = u.ia = new Float32Array(n), E = u.ib = new Float32Array(n); u.done = new Uint8Array(n); u.lo = 1e9; u.fin = false;
        for (let k = 0; k < n; k++) {
          const h = hs[k];
          A[k] = h >= 0 ? land[h] + 120 + hash(k * .37, o.id) * .999 * 650 : ports + (k / n) * 1100;      // (jetties: laid piece by piece in order)
          E[k] = h >= 0 ? Math.max(A[k] + INTROGROW, land[h] + 260) : A[k] + INTROGROW;      // (grown, and its land's bounce over)
          u.lo = Math.min(u.lo, A[k]);
          m4.fromArray(B, k * 16); m4.scale(v3.setScalar(.0001)); o.setMatrixAt(k, m4);
        }
        o.instanceMatrix.needsUpdate = true; insts.push(o);
      }
      else if (u.h != null) { u.y0 = o.position.y; u.s0 = o.scale.clone(); }
    });
    // (t0 is set on the first drawn frame, not now: the shader warm-up (HOLD) can pause drawing for a couple of
    // seconds first, and the intro used to carry on unseen during it)
    // band: when the bandit drops onto its land (Rick, 2026-11-20): just after that land's number disc
    INTRO = {t0: null, land, ports, end, insts, cam: true, f: 0, band: G.deck && HEX[G.storm] ? land[G.storm] + 800 : null};
  }
  const BANDFALL = 450;
  function introStep(now) {
    const I = INTRO;
    if (I.t0 == null) I.t0 = now;
    const t = now - I.t0;
    if (I.f++ % 4 === 0) SHADOW = true;      // (shadows about every 4th frame during the intro, not every other: they cost the most)
    if (!I.camEnd) I.camEnd = cam.position.clone().sub(C.target);
    if (t >= I.end) { introEnd(); return; }
    const fall = i => { const k = Math.min(1, Math.max(0, (t - (I.land[i] - INTROFALL)) / INTROFALL)); return k < 1 ? 320 * (1 - k) * (1 - k) : Math.max(0, Math.sin((t - I.land[i]) / 260 * Math.PI)) * 3 * (t - I.land[i] < 260); };
    const grow = start => { const k = (t - start) / INTROGROW; return k <= 0 ? 0 : k >= 1 ? 1 : Math.max(0, backOut(k)); };
    I.n = 0;      // (how many copies moved this frame, for testing)
    I.insts.forEach(m => {
      const u = m.userData;
      if (u.fin || t < u.lo) return;
      const B = u.base, hs = u.hs, A = u.ia, E = u.ib, D = u.done;
      let moved = 0, left = 0;
      for (let k = 0; k < hs.length; k++) {
        if (D[k]) continue;
        left++;
        if (t < A[k]) continue;      // (not started: still hidden)
        m4.fromArray(B, k * 16);
        if (t >= E[k]) D[k] = 1;      // (done: its finished place, once)
        else { m4.scale(v3.setScalar(Math.max(.0001, grow(A[k])))); if (hs[k] >= 0) m4.elements[13] += fall(hs[k]); }
        m.setMatrixAt(k, m4); moved++;
      }
      if (moved) m.instanceMatrix.needsUpdate = true;
      if (!left) u.fin = true;
      I.n += moved;
    });
    stat.children.forEach(o => {
      const u = o.userData;
      if (o.isInstancedMesh || u.h == null || u.y0 == null) return;
      if (u.h < 0) {      // the lighthouse rises from the sea after the jetties; its glow and the port signs pop in
        const s = grow(I.ports + 1000, 0);
        // (hidden until it starts rising: squashed flat it lay right on the sea's surface and flickered there, Rick 2026-11-21)
        if (o.isSprite) o.visible = t > I.ports + 1300; else { o.visible = s > 0; o.scale.set(u.s0.x, u.s0.y * Math.max(.0001, s), u.s0.z); }
        return;
      }
      if (o.isSprite) { o.visible = t > I.land[u.h] + 700; return; }
      if (u.disc) { const k = Math.min(1, Math.max(0, (t - I.land[u.h] - 450) / 300)); o.visible = k > 0; o.position.y = u.y0 + 60 * (1 - k) * (1 - k); return; }
      o.visible = t >= I.land[u.h] - INTROFALL;      // (not hanging in the sky while it waits its turn)
      o.position.y = u.y0 + fall(u.h);
    });
    SMOKE.forEach(p => { p.visible = false; });
    // the pieces (dyn) stay hidden until the end, except the bandit, who drops from the sky onto his land and squashes
    dyn.children.forEach(c => { c.visible = c === BANDIT3 && I.band != null && t >= I.band; });
    if (BANDIT3.visible && BANDIT3.parent === dyn) {
      const k = (t - I.band) / BANDFALL;
      if (k < 1) { BANDIT3.position.y = TOP + 140 * (1 - k * k); BANDIT3.scale.set(1, 1, 1); }
      else { const q = Math.min(1, (k - 1) * BANDFALL / 300), sq = Math.sin(q * Math.PI) * .25; BANDIT3.position.y = TOP; BANDIT3.scale.set(1 + sq * .6, 1 - sq, 1 + sq * .6); }
    }
    if (I.cam) {      // the camera swings round and down to where it normally sits
      const k = Math.min(1, t / (I.end - 400)), e = 1 - Math.pow(1 - k, 3);
      const off = I.camEnd.clone().applyAxisAngle(new T.Vector3(0, 1, 0), -1.1 * (1 - e));
      off.setLength(I.camEnd.length() * (1 + .35 * (1 - e))); off.y += 220 * (1 - e);
      cam.position.copy(C.target).add(off);
    }
  }
  function introEnd() {
    const I = INTRO; INTRO = null;
    if (!I) return;
    // (computeBoundingSphere: three.js measured each group while it was shrunk to nothing, so zooming in made whole
    // groups of scenery vanish as "off screen"; Rick saw details disappear, 2026-11-20. Measure again at full size.)
    I.insts.forEach(m => { const u = m.userData; m.instanceMatrix.array.set(u.base); m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); ['base', 'ia', 'ib', 'done', 'lo', 'fin'].forEach(k => delete u[k]); });
    stat.children.forEach(o => { const u = o.userData; if (u.y0 != null && !o.isInstancedMesh) { o.position.y = u.y0; o.scale.copy(u.s0); o.visible = true; delete u.y0; } });
    SMOKE.forEach(p => { p.visible = true; });
    dyn.children.forEach(c => { c.visible = true; });
    BANDIT3.position.y = TOP; BANDIT3.scale.set(1, 1, 1);
    SHADOW = true;
  }
  cv.addEventListener('pointerdown', () => { if (INTRO) INTRO.cam = false; });      // (the player grabbed the camera: let them have it)

  // ----- what changes during play: roads, towns, forts, walls, the bandit, where you can build -----
  const part = (g, geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const TRACKMAT = {};      // castle roof materials, one per track (made when first needed)
  // windows: dark by day, glowing warm at night (WINMAT's glow is set by the time of day in frame()), and a soft
  // pool of lamplight by each door (NIGHTGLOW, only shows at dusk and night)
  const WINMAT = std({color: 0x2a2219, roughness: .4, emissive: 0xffb44a, emissiveIntensity: 0});
  const WINGEO = box(1.7, 1.7, .35), SLIT = box(1.2, 2.6, .35);
  let NIGHTGLOW = null;
  // ----- the track buildings (Rick, 2026-11-20): a castle claimed at level 4 is no longer a two-tower fort but a building of
  // its own: Science → a grand library, Trade → a busy market, Politics → a mighty castle. Walls in the player's colour,
  // roofs in the track's colour; once it's permanent (its owner at level 5) it grows grander and gets gold trim. -----
  const TB = (() => {
    const tri = (w, h, d) => new T.ExtrudeGeometry(new T.Shape([new T.Vector2(-w / 2, 0), new T.Vector2(w / 2, 0), new T.Vector2(0, h)]), {depth: d, bevelEnabled: false}).translate(0, 0, -d / 2);
    return {
      podium: box(20, 1.6, 16), steps: box(12, .8, 2.2), hall: box(15, 9, 8.5), col: cyl(.72, .82, 8.4, 12), colCap: box(2, .5, 2),
      beam: box(18, 1.3, 4.2), pedi: tri(18, 3.6, 3.6), hallRoof: tri(16.5, 3.2, 9), drum: cyl(4.4, 4.4, 2.2, 20), dome: new T.SphereGeometry(4.6, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      finial: new T.ConeGeometry(.55, 2.6, 8), orb: new T.SphereGeometry(.7, 12, 8), wing: box(5, 6, 6), wingDome: new T.SphereGeometry(2.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      scope: cyl(.45, .7, 5, 10, 0), door: box(2.6, 4.6, .4), win: box(1.4, 3, .35),
      plaza: cyl(11.6, 12.2, .7, 6), market: box(10, 6, 7), mRoof: tri(11.6, 4.2, 8.2), counter: box(4.4, 1.7, 1.9), post: cyl(.18, .18, 4.4, 6, 0), awning: box(5.2, .25, 3.2),
      good: new T.SphereGeometry(.55, 8, 6), sack: new T.SphereGeometry(.9, 10, 8), cratel: box(1.6, 1.6, 1.6),
      body: cyl(.55, .75, 2.2, 8, 0), head: new T.SphereGeometry(.55, 10, 8), belfry: box(3.4, 13, 3.4), belfryRoof: new T.ConeGeometry(3, 4, 4).rotateY(Math.PI / 4), bell: cyl(.5, 1.1, 1.4, 12, 0),
      curtain: box(15, 6.5, 1.8), ctower: cyl(2.5, 2.8, 12, 14), cone: new T.ConeGeometry(3.2, 5.5, 14), keep: box(8, 18, 8), kcren: box(1.8, 1.8, 1.8), wmer: box(1.5, 1.3, 1.9),
      gate: box(3.6, 5.2, .5), portc: box(3, 4.4, .2), crown: new T.ConeGeometry(.6, 2.2, 6), ring: new T.TorusGeometry(2.6, .45, 8, 24).rotateX(Math.PI / 2), banner: box(2.6, 4.2, .2)
    };
  })();
  const MARBLE = std({color: 0xf2ede2, roughness: .55}), WOOD = std({color: 0x8a5a32, roughness: .85}), PAVE = std({color: 0xcfc4ad, roughness: .95}), SACK = std({color: 0xcdb48a, roughness: 1});
  const GOODMAT = ['#c0392b', '#f39c12', '#7fb03a', '#8e5bc8', '#e8d36a'].map(c => std({color: c, roughness: .6}));
  const FOLKMAT = ['#c0392b', '#2e86c1', '#27ae60', '#8e44ad', '#d68910', '#566573'].map(c => std({color: c, roughness: .8}));
  const FOLK = [];      // market shoppers, rebuilt in dynamic(), walked about in frame()
  function trackBuilding(g, b, k, v) {
    const y0 = TOP + 1, wall = pm3(b.p, 'wall'), roof = TRACKMAT[k] = TRACKMAT[k] || std({color: TRACKS[k].c, roughness: .45, metalness: .2});
    const perm = b.perm != null ? b.perm : !!(G.castle && G.castle[k] && G.castle[k].perm), trim = perm ? M3.gold : MARBLE;
    const add = (geo, mat, x, y, z, ry) => { const m = part(g, geo, mat, x, y, z); if (ry) m.rotation.y = ry; return m; };
    if (k === 'sci') {      // a grand library: a marble podium, a hall with a columned porch, a pediment and a dome
      add(TB.podium, MARBLE, 0, y0 + .8, 0); add(TB.steps, MARBLE, 0, y0 + .4, 8.6);
      add(TB.hall, wall, 0, y0 + 6.1, -2.6);
      for (let i = 0; i < 6; i++) { const x = -7.2 + i * 2.88; add(TB.col, MARBLE, x, y0 + 1.6, 5.6); add(TB.colCap, trim, x, y0 + 10.2, 5.6); }
      add(TB.beam, trim, 0, y0 + 11, 4.6);
      add(TB.pedi, roof, 0, y0 + 11.6, 4.8); add(TB.hallRoof, roof, 0, y0 + 10.6, -2.6);
      add(TB.door, M3.door, 0, y0 + 3.9, 1.7);
      [-1, 1].forEach(s => { add(TB.win, WINMAT, s * 4.5, y0 + 5.8, 1.68); add(TB.win, WINMAT, s * 7.55, y0 + 5.8, -2.6, Math.PI / 2); });
      const dy = y0 + 13.4, big = perm ? 1.22 : 1;
      add(TB.drum, wall, 0, dy, -2.6).scale.set(big, 1, big);
      add(TB.dome, perm ? M3.gold : roof, 0, dy + 2.2, -2.6).scale.setScalar(big);
      add(TB.finial, M3.gold, 0, dy + 2.2 + 4.6 * big + 1.2, -2.6); add(TB.orb, M3.gold, 0, dy + 2.2 + 4.6 * big + 2.6, -2.6);
      if (perm) {      // level 5: two domed reading wings and a brass telescope on the roof
        [-1, 1].forEach(s => { add(TB.wing, wall, s * 9.6, y0 + 4.6, -3); add(TB.wingDome, roof, s * 9.6, y0 + 7.6, -3); add(TB.win, WINMAT, s * 9.6, y0 + 4.8, .05); });
        const sc = add(TB.scope, M3.gold, 5.2, y0 + 12.2, -5.5); sc.rotation.z = -.7; sc.rotation.x = -.3;
      }
    } else if (k === 'trd') {      // a busy market: a paved square, a market hall, stalls with striped awnings, goods, barrels, shoppers
      add(TB.plaza, PAVE, 0, y0, 0);
      add(TB.market, wall, 0, y0 + 4.9, -4).scale.y = 1.4; add(TB.mRoof, roof, 0, y0 + 9.1, -4).scale.y = 1.25;
      add(TB.door, M3.door, 0, y0 + 3, -.45); [-1, 1].forEach(s => add(TB.win, WINMAT, s * 3.2, y0 + 5.4, -.45));
      const stalls = perm ? [[-7.2, 3.2, .5], [0, 6.6, 0], [7.2, 3.2, -.5], [-8.6, -4.6, 1.4], [8.6, -4.6, -1.4]] : [[-6.6, 3.6, .45], [0, 6.8, 0], [6.6, 3.6, -.45]];
      stalls.forEach(([x, z, ry], i) => {
        const s = new T.Group(); s.position.set(x, y0 + .7, z); s.rotation.y = ry; g.add(s);
        part(s, TB.counter, WOOD, 0, .85, 0);
        [-2, 2].forEach(px => part(s, TB.post, WOOD, px, 2.2, -.8));
        const aw = part(s, TB.awning, i % 2 ? pm3(b.p, 'flag') : roof, 0, 4.5, -.1); aw.rotation.x = .28;
        for (let q = 0; q < 4; q++) part(s, TB.good, GOODMAT[(i + q) % GOODMAT.length], -1.5 + q, 1.95, .1);
      });
      [[-4.2, -8.6], [4.6, -8.4], [-9.6, 0]].forEach(([x, z], i) => { const c = add(i === 2 ? TB.cratel : G3.barrel, WOOD, x, y0 + .7 + (i === 2 ? .8 : 0), z); if (i < 2) c.scale.set(1.2, 2, 1.2); });
      add(TB.sack, SACK, 9.4, y0 + 1, .6).scale.set(1, 1.2, 1); add(TB.sack, SACK, 10, y0 + .9, 2.2);
      if (perm) {      // level 5: a bell tower with a gold bell and a flag
        add(TB.belfry, wall, -6.2, y0 + 6.5, -7.2); add(TB.belfryRoof, roof, -6.2, y0 + 15, -7.2); add(TB.bell, M3.gold, -6.2, y0 + 10.2, -5.45);
        add(G3.mast, M3.pole, -6.2, y0 + 19.5, -7.2); add(G3.flag, pm3(b.p, 'flag'), -3.2, y0 + 22.4, -7.2);      // (the mast is centred on its y)
      }
      // shoppers wander between the stalls (walked about in frame(), FOLK)
      const n = perm ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const f = new T.Group(); f.scale.setScalar(1.7); g.add(f);
        part(f, TB.body, FOLKMAT[(i + (+v || 0)) % FOLKMAT.length], 0, 1.1, 0); part(f, TB.head, M3.skin, 0, 2.75, 0);
        f.userData = {a: i / n * Math.PI * 2, r: 2.6 + (i % 2) * 1.6, sp: (i % 2 ? .35 : -.28), y: y0 + .7, ph: i * 1.7};
        FOLK.push(f);
      }
    } else {      // a mighty castle: curtain walls with battlements, four round towers with tall roofs, a great keep and a gate
      const h = perm ? 24 : 18;
      [[0, 7.6, 0], [0, -7.6, 0], [7.6, 0, Math.PI / 2], [-7.6, 0, Math.PI / 2]].forEach(([x, z, ry]) => {
        add(TB.curtain, wall, x, y0 + 3.25, z, ry);
        for (let q = -3; q <= 3; q++) { const m = add(TB.wmer, pm3(b.p, 'roof'), x + (ry ? 0 : q * 2.1), y0 + 7.1, z + (ry ? q * 2.1 : 0)); if (ry) m.rotation.y = ry; }
      });
      [[-7.6, -7.6], [7.6, -7.6], [-7.6, 7.6], [7.6, 7.6]].forEach(([x, z]) => {
        add(TB.ctower, wall, x, y0, z); add(TB.cone, roof, x, y0 + 14.7, z);      // (cyl() pieces stand on their y)
        add(TB.win, WINMAT, x + (x > 0 ? .9 : -.9), y0 + 8, z + 2.5).scale.set(.6, .8, 1);
        if (perm) { add(G3.mast, M3.pole, x, y0 + 17, z).scale.y = .6; add(TB.banner, pm3(b.p, 'flag'), x + 1.4, y0 + 18.2, z); }
      });
      add(TB.keep, wall, 0, y0 + h / 2, -1).scale.y = h / 18;
      [-3, 0, 3].forEach(x => [-3, 0, 3].forEach(z => { if (x || z) add(TB.kcren, pm3(b.p, 'roof'), x, y0 + h + .9, z - 1); }));
      [-1, 1].forEach(s => { add(TB.win, WINMAT, s * 2, y0 + h * .62, 3.05); add(TB.win, WINMAT, s * 4.05, y0 + h * .62, -1, Math.PI / 2); });
      add(TB.gate, M3.door, 0, y0 + 2.6, 8.55); add(TB.portc, M3.steel, 0, y0 + 2.9, 8.85);
      add(G3.mast, M3.pole, 0, y0 + h + 1.8, -1).scale.y = 1.3;
      add(G3.flag, pm3(b.p, 'flag'), 3, y0 + h + 6, -1);
      if (perm) {      // level 5: a gold crown round the top of the keep
        add(TB.ring, M3.gold, 0, y0 + h + 2.2, -1).scale.set(1.5, 1, 1.5);
        for (let q = 0; q < 8; q++) { const a = q / 8 * Math.PI * 2; add(TB.crown, M3.gold, Math.cos(a) * 3.9, y0 + h + 3.6, -1 + Math.sin(a) * 3.9); }
      }
    }
    const l = new T.Sprite(NIGHTGLOW); l.position.set(0, y0 + 4, 11); l.scale.set(18, 18, 1); g.add(noRef(l));
  }
  function building(v, b) {
    const g = new T.Group(), fort = b.l === 2, P = g.userData.parts = {cren: []};
    NIGHTGLOW = NIGHTGLOW || new T.SpriteMaterial({map: glowTex, transparent: true, opacity: 0, depthWrite: false});
    P.found = part(g, fort ? G3.found2 : G3.found, M3.stone, 0, 0, 0);
    if (fort && b.c && TRACKS[b.c]) trackBuilding(g, b, b.c, v);      // a track building (library, market, castle)
    else if (!fort) {           // a house with a pitched roof, a door and a chimney
      part(g, G3.house, pm3(b.p, 'wall'), 0, TOP + 4.5, 0);
      part(g, G3.roof, pm3(b.p, 'roof'), 0, TOP + 8, 0);
      part(g, G3.door, M3.door, -1.6, TOP + 3, 4.55);
      part(g, G3.chim, M3.stone, 2.6, TOP + 11, -2);
      part(g, WINGEO, WINMAT, 2, TOP + 4.6, 4.55);                                    // windows: front and both sides
      [-1, 1].forEach(s => part(g, WINGEO, WINMAT, s * 4.55, TOP + 4.6, 0).rotation.y = Math.PI / 2);
      const l = new T.Sprite(NIGHTGLOW); l.position.set(-1.6, TOP + 3, 8); l.scale.set(13, 13, 1); g.add(noRef(l));
    } else {               // a square tower with battlements and a flag
      P.tower = part(g, G3.tower, pm3(b.p, 'wall'), 0, TOP + 7.5, 0);
      [-5, 0, 5].forEach(x => [-5, 0, 5].forEach(z => { if (x || z) P.cren.push(part(g, G3.cren, pm3(b.p, 'roof'), x, TOP + 15.6, z)); }));
      P.gate = part(g, G3.gate, M3.door, 0, TOP + 4, 6.6);
      P.win = [-3.6, 3.6].map(x => part(g, SLIT, WINMAT, x, TOP + 10, 6.55)).concat([-1, 1].map(s => { const w = part(g, SLIT, WINMAT, s * 6.55, TOP + 10, 0); w.rotation.y = Math.PI / 2; return w; }));
      const l = new T.Sprite(NIGHTGLOW); l.position.set(0, TOP + 5, 10); l.scale.set(16, 16, 1); g.add(noRef(l)); P.lamp = l;
      if (!b.u && !b.c) {
        P.mast = part(g, G3.mast, M3.pole, 0, TOP + 19, 0);
        const fl = P.flag = part(g, G3.flagL, pm3(b.p, 'flag'), 0, TOP + 21.6, 0);      // hinged on the mast, so it can flutter (frame())
        fl.userData.ph = (+v || 0) * .7; DFLAGS.push(fl);
      }
      // Forts and Guards upgrades: a Keep adds a tall turret with a flag; a Citadel two turrets with gold roofs and a big banner
      // a castle (Forts and Knights) is drawn like a Citadel, with roofs in its track's colour
      const roofMat = b.c && TRACKS[b.c] ? (TRACKMAT[b.c] = TRACKMAT[b.c] || std({color: TRACKS[b.c].c, roughness: .45, metalness: .2})) : M3.gold;
      const turret = (x, z, gold) => {
        part(g, G3.turret, pm3(b.p, 'wall'), x, TOP + 13, z);
        if (gold) part(g, G3.goldCone, roofMat, x, TOP + 29, z);
        else [-2.2, 2.2].forEach(dx => [-2.2, 2.2].forEach(dz => part(g, G3.merlon, pm3(b.p, 'roof'), x + dx, TOP + 26.2, z + dz)));
      };
      if (b.u === 1) {
        turret(4, -4, false);
        part(g, G3.mast, M3.pole, 4, TOP + 31, -4);
        part(g, G3.flag, pm3(b.p, 'flag'), 7, TOP + 33.6, -4);
      }
      if (b.u === 2 || (b.c && TRACKS[b.c])) {
        turret(-5, -5, true); turret(5, -5, true);
        part(g, G3.mast, M3.pole, 0, TOP + 30.5, 2).scale.y = 2.6;
        part(g, G3.flag, pm3(b.p, 'flag'), 4.8, TOP + 39, 2).scale.set(1.6, 1.7, 1);
      }
    }
    g.rotation.y = (hash(v, 3) - .5) * .7;
    g.position.set(VERT[v].x, 0, VERT[v].y);
    return g;
  }
  const BANDIT3 = (() => {      // a masked bandit: wide hat with a feather, red bandana, long coat, a lantern in one hand, a sack of loot over the shoulder
    const g = new T.Group(), f = new T.Group();      // f is the figure; it faces +z (towards the camera, see frame())
    const add = (geo, mat, x, y, z, rx, ry, rz, to) => { const m = part(to || f, geo, mat, x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); return m; };
    const limb = (a, b, r, mat) => {      // a sleeve from point a (shoulder or elbow) to point b
      const A = new T.Vector3(...a), d = new T.Vector3(...b).sub(A), len = d.length();
      const m = part(f, new T.CylinderGeometry(r, r * 1.1, len, 10).translate(0, -len / 2, 0), mat, ...a);
      m.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), d.normalize()); return m;
    };
    [-1.9, 1.9].forEach(x => {                                                   // boots and trousers
      add(cyl(1.5, 1.7, 3, 12), M3.boot, x, 0, .2); add(box(2.4, 1.3, 2.2), M3.boot, x, .65, 1.5);
      add(cyl(1.25, 1.35, 5, 10), M3.pants, x, 2.8, 0);
    });
    add(new T.LatheGeometry([[4.9, 4.2], [4.4, 7], [3.9, 10], [3.7, 13], [4, 16], [3.3, 17.6], [1.8, 18.4], [0, 18.6]].map(([x, y]) => new T.Vector2(x, y)), 24), M3.coat, 0, 0, 0);      // long coat
    add(box(2.2, 7, .4), M3.shirt, 0, 13.2, 3.7);                                // shirt showing down the front
    add(new T.TorusGeometry(3.85, .5, 8, 24), M3.boot, 0, 10.6, 0, Math.PI / 2);  // belt and buckle
    add(box(1.4, 1.1, .5), M3.gold, 0, 10.6, 4.2);
    add(box(.9, 4.2, .6), M3.boot, 2.9, 6.8, 4.1, 0, 0, .3);                     // a dagger in its sheath at the hip
    add(box(1.8, .4, .7), M3.gold, 2.3, 8.9, 4.2, 0, 0, .3); add(box(.5, 1.6, .5), M3.gold, 2.0, 9.8, 4.2, 0, 0, .3);
    add(cyl(2.2, 4.9, 3.4, 18), M3.mantle, 0, 15.2, 0);                          // short shoulder cape
    add(new T.SphereGeometry(3, 20, 14), M3.skin, 0, 21, 0);                     // head
    add(new T.SphereGeometry(3.12, 20, 10, 0, Math.PI * 2, Math.PI * .45, Math.PI * .36), M3.mask, 0, 21, 0);     // bandana over nose and mouth
    add(new T.SphereGeometry(.8, 10, 8), M3.mask, 0, 20.6, -3.1);                // its knot and tails at the back
    [-1, 1].forEach(s => add(box(.7, 2.2, .25), M3.mask, s * .5, 19.4, -3.2, 0, 0, s * .25));
    [-1, 1].forEach(s => {                                                        // narrowed eyes and frowning brows
      add(new T.SphereGeometry(.42, 8, 6), M3.door, s * 1.1, 21.85, 2.7);
      add(box(1.5, .38, .4), M3.hat, s * 1.1, 22.65, 2.75, 0, 0, s * .28);
    });
    const hat = new T.Group(); hat.position.set(0, 23.2, 0); hat.rotation.set(-.06, 0, .1); f.add(hat);
    add(cyl(6.4, 6.4, .45, 32, 0), M3.hat, 0, 0, 0, 0, 0, 0, hat);               // wide brim
    add(cyl(2.8, 3.3, 3.6, 24), M3.hat, 0, .2, 0, 0, 0, 0, hat);                 // crown
    add(cyl(3.33, 3.36, .9, 24), M3.red, 0, .3, 0, 0, 0, 0, hat);                // hat band
    add(new T.ConeGeometry(.6, 6.5, 6), M3.feather, 3.2, 3, -1, .3, 0, -.9, hat);
    // right arm hangs down holding a lantern
    limb([4.2, 17.4, 0], [6, 10.6, .6], 1.15, M3.coat);
    add(new T.SphereGeometry(1.1, 10, 8), M3.skin, 6.1, 10, .7);
    add(cyl(.4, 1.3, .8, 8), M3.metal, 6.2, 8.6, .8);
    add(box(1.8, 2.4, 1.8), M3.glow, 6.2, 7.4, .8);
    add(box(2.1, .4, 2.1), M3.metal, 6.2, 6.1, .8);
    // left arm bent up, holding a sack of loot over the shoulder
    limb([-4.2, 17.4, 0], [-5.4, 13.6, 1.8], 1.15, M3.coat);
    limb([-5.4, 13.6, 1.8], [-4.6, 19.4, -.4], 1.1, M3.coat);
    add(new T.SphereGeometry(1.1, 10, 8), M3.skin, -4.6, 19.8, -.6);
    add(cyl(.7, 1, 1.6, 10), M3.sack, -4.4, 19.2, -2.2, -.9);
    add(new T.SphereGeometry(1, 16, 12).scale(3.4, 4, 3), M3.sack, -3.4, 16.8, -4.8);
    f.position.set(0, 3, -10.5); g.add(f);
    return g;
  })();
  const banditOff = i => { const home = G.hex[i].t === 'lair'; return [home ? 0 : 3, home ? -7 : -10.5]; };      // [height, back] of the figure on land i

  // ----- the Guard: a knight in the player's colours who lands, scares the bandit off to its new land, then vanishes -----
  const KNIGHT = (() => {
    const g = new T.Group(), f = new T.Group(), team = [];
    const add = (geo, mat, x, y, z, rx, ry, rz, to) => { const m = part(to || f, geo, mat, x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); return m; };
    const steel = M3.steel, col = m => { team.push(m); return m; };
    [-2, 2].forEach(x => { add(cyl(1.7, 1.9, 3, 12), M3.boot, x, 0, .3); add(cyl(1.4, 1.6, 6, 12), steel, x, 2.8, 0); });         // boots and steel legs
    add(new T.LatheGeometry([[4.4, 8.4], [4.2, 11], [4.7, 15], [5.2, 18], [3.4, 20.2], [0, 20.6]].map(([x, y]) => new T.Vector2(x, y)), 24), steel, 0, 0, 0);     // breastplate
    add(cyl(4.6, 4.9, 2.2, 16), steel, 0, 7.6, 0);                                                                            // skirt of plates
    col(add(box(5.4, 10.5, .5), M3.flag, 0, 13.4, 4.75));                                                                   // tabard in the player's colour
    add(box(1.6, 1.6, .55), M3.gold, 0, 15.2, 5.05, 0, 0, Math.PI / 4);                                                     // its gold badge
    [-1, 1].forEach(s => add(new T.SphereGeometry(2.3, 14, 10), steel, s * 5, 19, 0));                                      // shoulder plates
    add(cyl(3.1, 3.1, 4.4, 20), steel, 0, 20.4, 0);                                                                         // helmet
    add(new T.SphereGeometry(3.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), steel, 0, 24.8, 0);
    add(box(4.6, .7, .6), M3.door, 0, 22.8, 2.9);                                                                           // eye slit
    add(box(.5, 3, .6), M3.door, 0, 21.2, 2.95);
    col(add(new T.ConeGeometry(1.1, 6, 8), M3.flag, 0, 29.5, -.6, -.35));                                                    // plume
    // shield on the left arm
    add(cyl(1.3, 1.4, 6, 10, -3), steel, -5.6, 19, 0, 0, 0, -.25);
    col(add(cyl(4.6, 4.6, .8, 24, 0), M3.flag, -6.8, 13, 2.2, Math.PI / 2, 0, 0));
    add(new T.TorusGeometry(4.6, .45, 8, 28), steel, -6.8, 13, 2.2);
    add(cyl(1, 1, 1, 12, 0), M3.gold, -6.8, 13, 2.75, Math.PI / 2, 0, 0);
    // sword arm: a group turning at the shoulder, so the sword can be raised
    const arm = new T.Group(); arm.position.set(5.6, 19, 0); f.add(arm);
    add(cyl(1.3, 1.4, 6, 10, -3), steel, 0, 0, 0, 0, 0, 0, arm);
    add(new T.SphereGeometry(1.3, 10, 8), steel, 0, -6.4, 0, 0, 0, 0, arm);
    add(box(.7, 2.6, .7), M3.hat, 0, -6.6, 1.6, Math.PI / 2, 0, 0, arm);                                                    // grip
    add(box(4.2, .7, .9), M3.gold, 0, -6.6, 3.1, 0, 0, 0, arm);                                                             // crossguard
    add(box(1.1, .35, 13), M3.shine, 0, -6.6, 10, 0, 0, 0, arm);                                                           // blade (points forward)
    g.add(f);
    return {g, f, arm, team};
  })();
  const RING = new T.Mesh(new T.TorusGeometry(1, .18, 8, 40).rotateX(Math.PI / 2), new T.MeshBasicMaterial({color: 0xfff4d6, transparent: true, depthWrite: false}));
  const CHASEMS = 3800;
  let CHASE = null;
  function chaseStep(now, az) {      // 0-.22 knight drops in · .22-.36 bandit jumps in fright · .36-.78 bandit bounds away to its new land · .82-1 knight vanishes
    const c = CHASE, p = (now - c.t0) / CHASEMS;
    SHADOW = true;
    if (p >= 1) { scene.remove(KNIGHT.g, RING); CHASE = null; render(); return; }      // (render: shows a waiting rob window)
    const A = HEX[c.from], B = HEX[c.to], K = KNIGHT, ease = k => k * k * (3 - 2 * k);
    // the knight: falls from the sky, lands with a squash, raises the sword at the bandit, then shrinks away spinning
    const fall = Math.min(1, p / .22), land = p >= .22 && p < .3 ? Math.sin((p - .22) / .08 * Math.PI) : 0;
    K.g.position.set(A.x, TOP + 3 + 160 * (1 - fall) * (1 - fall), A.y);
    K.f.scale.set(1 + land * .15, 1 - land * .2, 1 + land * .15);
    const face = Math.atan2(B.x - A.x, B.y - A.y);
    K.g.rotation.y = face;
    K.arm.rotation.x = p < .26 ? 0 : -Math.min(1, (p - .26) / .08) * 1.9 + (p > .34 && p < .7 ? Math.sin((p - .34) * 40) * .25 : 0);     // sword up, shaking it
    const gone = p < .82 ? 1 : 1 - ease((p - .82) / .18);
    K.g.scale.setScalar(Math.max(.001, gone)); K.g.rotation.y = face + (1 - gone) * 8;
    if (p >= .82) K.g.position.y += (1 - gone) * 20;
    // a ring of dust where it lands
    const r = (p - .22) / .2;
    RING.visible = r > 0 && r < 1;
    if (RING.visible) { RING.position.set(A.x, TOP + .6, A.y); RING.scale.setScalar(6 + r * 40); RING.material.opacity = .8 * (1 - r); }
    // the bandit: a fright jump, then big bounds from the old land to the new one
    const fig = BANDIT3.children[0], [y0, z0] = banditOff(c.from), [y1, z1] = banditOff(c.to);
    if (p < .36) {
      BANDIT3.position.set(A.x, TOP, A.y);
      const j = p > .24 ? Math.sin(Math.min(1, (p - .24) / .1) * Math.PI) : 0;
      fig.position.set(0, y0 + j * 9, z0); BANDIT3.rotation.y = face + Math.PI + j * .6;      // facing the knight, startled
    } else if (p < .78) {
      const k = (p - .36) / .42, e = ease(k);
      BANDIT3.position.set(A.x + (B.x - A.x) * e, TOP + Math.abs(Math.sin(k * Math.PI * 3)) * 16 + Math.sin(k * Math.PI) * 20, A.y + (B.y - A.y) * e);
      fig.position.set(0, y0 + (y1 - y0) * e, z0 * (1 - e) + z1 * e);
      BANDIT3.rotation.y = face + Math.PI * (1 - Math.min(1, k * 5));      // turns and runs
    } else {
      const k = Math.min(1, (p - .78) / .06), k2 = ease(Math.min(1, (p - .78) / .14));
      let d = az - face; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      BANDIT3.rotation.y = face + d * k2;      // settles back to facing the camera
      BANDIT3.position.set(B.x, TOP, B.y); fig.position.set(0, y1, z1);
      fig.scale.set(1 + (1 - k) * .12, 1 - (1 - k) * .15, 1 + (1 - k) * .12);
    }
    if (p >= .84) fig.scale.setScalar(1);
  }
  // ----- a town becomes a fort (2026-11-19, Rick's pick) -----
  // Instead of dropping in: the house sinks into the ground, stone blocks fly in from all round while the tower
  // rises, the gate and arrow slits appear, the battlements pop on one by one and the flag runs up the mast.
  // UPG[v] = when it started (the FELL stamp); UPGS = the ones in this draw (posed every frame by upgPose).
  const UPGMS = 2600, UPG = {}, UPGS = [];
  let PREVL = {}, PREVID = null;      // each corner's level at the last draw, to spot town -> fort
  function upgPose(u, now) {
    const p = Math.min(1, (now - u.t0) / UPGMS), P = u.g.userData.parts, cl = (a, b) => Math.max(0, Math.min(1, (p - a) / (b - a))), ease = k => k * k * (3 - 2 * k);
    const s = cl(0, .3);
    u.old.visible = s < 1; u.old.scale.set(1, Math.max(.001, 1 - s), 1); u.old.position.x = s > 0 && s < 1 ? Math.sin(p * 140) * .5 : 0;
    const k = ease(cl(.2, .68));
    P.tower.visible = k > 0; P.tower.scale.y = Math.max(.001, k); P.tower.position.y = TOP + 1 + 6.5 * k;
    u.stones.forEach((st, j) => {
      const a = cl(.12 + j * .06, .3 + j * .06), ang = j / u.stones.length * Math.PI * 2 + 1, y1 = TOP + 2 + 12 * k;
      st.visible = a > 0 && a < 1;
      st.position.set(Math.cos(ang) * 40 * (1 - a), TOP + 4 + (y1 - TOP - 4) * a + Math.sin(a * Math.PI) * 24, Math.sin(ang) * 40 * (1 - a));
      st.rotation.set(a * 6, a * 4, 0);
    });
    const gt = cl(.55, .68); P.gate.visible = gt > 0; P.gate.scale.setScalar(Math.max(.001, backOut(gt)));
    P.win.forEach(w => { w.visible = p > .62; });
    P.cren.forEach((c, j) => { const q = cl(.66 + j * .022, .74 + j * .022); c.visible = q > 0; c.scale.setScalar(Math.max(.001, backOut(q))); });
    if (P.mast) { const m = cl(.84, .9); P.mast.visible = m > 0; P.mast.scale.y = Math.max(.001, m); P.flag.visible = p > .88; P.flag.position.y = TOP + 15.5 + 6.1 * cl(.88, 1); }
    P.lamp.visible = p >= 1;
  }
  // ----- a raid (Forts and Knights; 2026-11-19, Rick's pick) -----
  // After the dice land, the fleet sails right up to the beach. Knights won: it turns and flees, one ship sinking.
  // Nothing (or only castles) to raid: it sails away. Raiders won: it waits until every loser has chosen a fort,
  // then fire arrows fly at those forts, they burn, crumble into the ground and a town drops in where each stood;
  // then the fleet sails off. Until then the sacked forts are still drawn as forts (raidHeld, used in dynamic()).
  const PILLMS = 3600, RAIDIN = 3000, RAIDOUT = 3800;
  let RAID = null, FLEETYAW = null;      // (FLEETYAW: the fleet's usual heading, kept on the first raid)
  const raidHeld = () => RAID && RAID.r === 'lost' && G.raidfx && G.raidfx.n === RAID.n ? (G.raidfx.v || []).filter(v => !RAID.done[v]) : [];
  const SOOT = std({color: 0x2c2724, transparent: true, opacity: .5, depthWrite: false, roughness: 1});
  const BLAZE = std({color: 0x401400, emissive: 0xff7a1e, emissiveIntensity: 2.4});      // (M3.fire only works on InstancedMeshes: its sway shader needs instanceMatrix)
  function raidStart(fx) {
    raidEnd();
    if (FLEETYAW === null) FLEETYAW = FLEET.rotation.y;
    const n = fleetAt(FLEETMAX), S0 = [n[0] * 1.15, n[1] * 1.15], f = fleetAt(0), FAR = [f[0] * 1.15, f[1] * 1.15];
    let best = COAST[0], bd = 1e9;
    COAST.forEach(c => { const [x, z] = edgeMid(c.e), d = Math.hypot(x - S0[0], z - S0[1]); if (d < bd) { bd = d; best = c; } });
    const h = HEX[best.h], [mx, mz] = edgeMid(best.e), d = Math.hypot(mx - h.x, mz - h.y);
    const L = [mx + (mx - h.x) / d * 84, mz + (mz - h.y) / d * 84];      // (far enough out to leave the beach clear for the battle)
    RAID = {n: fx.n, r: fx.r, t0: Date.now() + DICEMS, S0, L, FAR, done: {}, forts: {}, fx: {}, kn: {}, pill: null, leave: null,
      mid: [mx, mz], nv: [(mx - h.x) / d, (mz - h.y) / d], fight: fx.r === 'won' || fx.r === 'lost'};
    dynamic();
  }
  function raidEnd() {
    if (!RAID) return;
    for (const v in RAID.fx) scene.remove(RAID.fx[v].grp);
    if (RAID.B) scene.remove(RAID.B.grp);
    if (FLEETYAW !== null) FLEET.rotation.y = FLEETYAW;
    FLEET.children.forEach(b => { b.visible = true; b.rotation.z = 0; b.rotation.y = 0; });
    RAID = null;
    if (G) dynamic();
  }
  function raidStep(now) {
    const Q = RAID, t = now - Q.t0, fx = G.raidfx;
    if (!fx || fx.n !== Q.n) { raidEnd(); return; }
    SHADOW = true;
    const lerp = (A, B, k) => [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k], yawOf = (A, B) => Math.atan2(-(B[1] - A[1]), B[0] - A[0]);
    const yawIn = yawOf(Q.S0, Q.L);
    let pos = Q.S0, yaw = yawIn, turn = 0;      // (turn: each ship turns on the spot, so the ones behind don't swing onto the island)
    if (t > 0) pos = lerp(Q.S0, Q.L, 1 - Math.pow(1 - Math.min(1, t / RAIDIN), 3));
    const bEnd = RAIDIN + (Q.fight ? BATTLEMS : 0);      // (when there are forts to fight over, there's a battle on the beach first)
    if (Q.fight && t >= RAIDIN && !Q.bdone) battleStep(now, t - RAIDIN);
    if (t >= bEnd && Q.leave == null) {
      if (Q.r !== 'lost') Q.leave = Q.t0 + bEnd + 300;
      else if (!Q.pill && !fx.w) { Q.pill = now; Q.pv = raidHeld(); if (!Q.pv.length) Q.leave = now; }
      else if (Q.pill && now - Q.pill > PILLMS) Q.leave = now;
    }
    if (Q.pill) pillStep(now, pos);
    if (Q.leave != null && now >= Q.leave) {
      const k = (now - Q.leave) / RAIDOUT, tk = Math.min(1, k / .2), yawOut = yawOf(Q.L, Q.FAR);
      let dy = yawOut - yawIn; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
      turn = dy * tk * tk * (3 - 2 * tk);
      pos = lerp(Q.L, Q.FAR, Math.pow(Math.max(0, (k - .15) / .85), 2));
      if (Q.r === 'won') {      // beaten: the last ship of the fleet goes down
        const sk = Math.min(1, k / .55), b = FLEET.children[FLEET.children.length - 1];
        b.rotation.z = sk * .8; b.position.y = -sk * sk * 34; b.visible = sk < 1;
      }
      if (k >= 1) { raidEnd(); return; }
    }
    FLEET.position.set(pos[0], 0, pos[1]); FLEET.rotation.y = yaw;
    FLEET.children.forEach(b => { b.rotation.y = turn; });
  }
  // ----- the battle on the beach (2026-11-19, Rick's request: "do the knights and raiders fight when the raiders arrive") -----
  // Once the fleet has landed (and there are forts to fight over), raiders jump from the ships onto the beach and
  // every knight on duty hops down from their road to meet them (resting knights sleep through it). They clash with
  // swinging axes, sparks and dust. Knights won: the raiders run back to the ships, the knights cheer and go home.
  // Raiders won: the knights fall back to their roads, the raiders cheer, climb aboard, and the pillage starts.
  // Timeline (ms after landing): raiders ashore 0-900, knights march 200-1900, clash 1900-3700, then the outcome.
  const BATTLEMS = 5400, RAIDERS = 5;
  const RM = {tunic: std({color: 0x6e2a1c, roughness: .9}), fur: std({color: 0x8a6a46, roughness: 1}), beard: std({color: 0x9a5a28, roughness: 1}),
    helm: std({color: 0x6d7076, roughness: .4, metalness: .7}), shield: std({color: 0x5a3a1e, roughness: .9})};
  let SPARKMAT = null;
  function makeRaider() {      // a sea raider: helmet with a nose guard, red tunic, fur cape, round shield, axe (the arm swings: userData.arm)
    const g = new T.Group(), f = new T.Group(); g.add(f);
    const add = (geo, mat, x, y, z, to) => part(to || f, geo, mat, x, y, z);
    [-1.1, 1.1].forEach(x => add(cyl(.8, .9, 3.4, 8), M3.boot, x, 0, 0));
    add(cyl(2.1, 2.8, 6, 12), RM.tunic, 0, 3, 0);
    add(cyl(2.3, 2.3, .7, 12), M3.boot, 0, 5.4, 0);                                  // belt
    add(cyl(2.6, 2.2, 1.6, 12), RM.fur, 0, 8.5, 0);                                 // fur cape over the shoulders
    add(sph(0, 0, 0, 1.9), M3.skin, 0, 10.6, 0);
    add(sph(0, 0, 0, 1.4), RM.beard, 0, 9.6, 1.1).scale.set(1, 1.1, .7);
    add(new T.SphereGeometry(2.05, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), RM.helm, 0, 11, 0);
    add(box(.4, 1.6, .4), RM.helm, 0, 10.6, 1.95);                                   // nose guard
    const sh = add(cyl(2.6, 2.6, .6, 16, 0), RM.shield, -2.7, 5.6, 1.2); sh.rotation.set(Math.PI / 2, 0, .3);
    add(cyl(.6, .6, .7, 10, 0), RM.helm, -2.9, 5.6, 1.6).rotation.x = Math.PI / 2;  // shield boss
    const arm = new T.Group(); arm.position.set(2.6, 8.6, 0); f.add(arm);
    add(cyl(.6, .7, 3.6, 8, -1.8), RM.tunic, 0, 0, 0, arm);
    add(cyl(.25, .25, 7, 6, 0), M3.pole, 0, -3.6, 2.2, arm).rotation.x = Math.PI / 2;   // axe handle, pointing forward
    add(box(.4, 2.6, 1.8), M3.steel, 0, -3.6, 5.2, arm);                              // axe head
    g.userData.arm = arm;
    g.scale.setScalar(1.75);
    return g;
  }
  function battleStep(now, b) {
    const Q = RAID, [mx, mz] = Q.mid, [nx, nz] = Q.nv, tx = -nz, tz = nx;
    const at = (out, along, y) => new T.Vector3(mx + nx * out + tx * along, y, mz + nz * out + tz * along);
    const cl = (a, z) => Math.max(0, Math.min(1, (b - a) / (z - a))), ease = k => k * k * (3 - 2 * k);
    const won = Q.r === 'won';
    if (!Q.B) {      // first frame of the battle: the raiders start on the ships' decks
      const grp = new T.Group(), raiders = [];
      SPARKMAT = SPARKMAT || new T.SpriteMaterial({map: glowTex, color: 0xfff2c0, transparent: true, depthWrite: false, blending: T.AdditiveBlending});
      for (let i = 0; i < RAIDERS; i++) {
        const r = makeRaider(), ship = FLEET.children[i % FLEET.children.length], from = new T.Vector3();
        ship.getWorldPosition(from); from.y = 9;
        r.userData.from = from; r.userData.slot = at(21 + (i % 2) * 5, (i - (RAIDERS - 1) / 2) * 10, .5);      // (wading in the shallows)
        grp.add(r); raiders.push(r);
      }
      const sparks = [0, 1, 2, 3, 4, 5].map(() => { const s = new T.Sprite(SPARKMAT); s.visible = false; grp.add(noRef(s)); return s; });
      const ring = new T.Mesh(RING.geometry, RING.material.clone()); ring.visible = false; grp.add(ring);
      scene.add(grp);
      Q.B = {grp, raiders, sparks, ring};
    }
    if (b >= BATTLEMS) {      // over: everyone back where they belong
      scene.remove(Q.B.grp); Q.B.ring.material.dispose(); Q.bdone = true;
      dynamic();      // (the knights who fought are home: now they're drawn resting)
      return;
    }
    const clash = b >= 1900 && b < 3700, face = (o, dx, dz, mt) => { o.rotation.y = mt ? Math.atan2(-dz, dx) : Math.atan2(dx, dz); };
    // the knights on duty
    const keys = Object.keys(Q.kn).sort((a, c) => a - c), N = keys.length;
    keys.forEach((e, j) => {
      const g = Q.kn[e], u = g.userData, row = j < 7 ? 0 : 1, col = row ? j - 7 : j, cols = row ? N - 7 : Math.min(N, 7);
      const slot = at(row ? -8 : 1, (col - (cols - 1) / 2) * 9, row ? TOP + 2.4 : 3.5);
      const go = ease(cl(200 + j * 80, 1700 + j * 80)), back = won ? ease(cl(4300, 5300)) : ease(cl(3700, 4800));
      const A = back > 0 ? slot : u.home, B = back > 0 ? u.home : slot, k = back > 0 ? back : go;
      g.position.lerpVectors(A, B, k);
      g.position.y += (k > 0 && k < 1 ? Math.abs(Math.sin(k * Math.PI * 3)) * 7 : 0);
      if (k > 0 && k < 1) face(g, B.x - A.x, B.z - A.z, u.mt);
      if (go >= 1 && back <= 0) {
        face(g, nx, nz, u.mt);      // facing the sea and the raiders
        if (clash) { const l = Math.max(0, Math.sin((b - 1900) / 170 + j * 1.7)); g.position.x += nx * l * 3; g.position.z += nz * l * 3; }
        if (won && b >= 3700) g.position.y += Math.abs(Math.sin((b - 3700) / 110)) * 4 * (1 - cl(3700, 4300));      // cheering
      }
    });
    // the raiders
    Q.B.raiders.forEach((r, i) => {
      const u = r.userData, arm = u.arm;
      const land = ease(cl(i * 130, 700 + i * 130)), off = won ? ease(cl(3700 + i * 60, 4500 + i * 60)) : ease(cl(4500 + i * 60, 5200 + i * 60));
      const A = off > 0 ? u.slot : u.from, B = off > 0 ? u.from : u.slot, k = off > 0 ? off : land;
      r.position.lerpVectors(A, B, k); r.position.y += Math.sin(k * Math.PI) * 16;
      r.visible = !(off >= 1) && b >= i * 130;
      r.scale.setScalar(1.75 * (off > .85 ? Math.max(.001, (1 - off) / .15) : 1));
      face(r, B.x - A.x, B.z - A.z);
      arm.rotation.x = 0;
      if (land >= 1 && off <= 0) {
        face(r, -nx, -nz);      // facing the island
        if (clash) {
          const l = Math.max(0, Math.sin((b - 1900) / 170 + i * 2.3 + 1));
          r.position.x -= nx * l * 3; r.position.z -= nz * l * 3;
          arm.rotation.x = -1.3 + Math.sin((b - 1900) / 120 + i) * 1.3;      // axe swings
        }
        if (!won && b >= 3700) { arm.rotation.x = -2.4; r.position.y += Math.abs(Math.sin((b - 3700) / 110 + i)) * 4; }      // cheering, axes up
        if (b < 1900) arm.rotation.x = -.6;
      }
    });
    // sparks where they meet, and a ring of dust as the fighting starts
    Q.B.sparks.forEach((s, k) => {
      const ph = (b / 220 + k * .37) % 1, cyc = Math.floor(b / 220 + k * .37);
      s.visible = clash && ph < .35;
      if (!s.visible) return;
      s.position.copy(at(11 + (hash(cyc, k) - .5) * 4, (hash(k, cyc) - .5) * 44, 6 + hash(cyc * 3, k) * 8));
      s.scale.setScalar(5 + (1 - ph / .35) * 6);
    });
    const rr = (b - 1900) / 700, ring = Q.B.ring; ring.visible = rr > 0 && rr < 1;
    if (ring.visible) { ring.position.copy(at(11, 0, 2)); ring.scale.setScalar(10 + rr * 45); ring.material.opacity = .7 * (1 - rr); }
  }
  function pillStep(now, ship) {
    const Q = RAID;
    Q.pv.forEach((v, j) => {
      if (Q.done[v]) return;
      const t = now - Q.pill - j * 300, V = VERT[v], top = [V.x, TOP + 17, V.y];
      if (t < 0) return;
      let F = Q.fx[v];
      if (!F) {
        F = Q.fx[v] = {grp: new T.Group(), arrows: [], flames: [], smoke: []};
        for (let k = 0; k < 5; k++) { const a = new T.Mesh(G3.ball, BLAZE); a.scale.setScalar(1.6); F.grp.add(a); F.arrows.push(a); }
        for (let k = 0; k < 5; k++) { const f = new T.Mesh(G3.flame, BLAZE); f.position.set(top[0] + Math.cos(k * 1.3) * 4.5, top[1] - 2, top[2] + Math.sin(k * 1.3) * 4.5); F.grp.add(f); F.flames.push(f); }
        for (let k = 0; k < 4; k++) { const s = new T.Mesh(G3.ball, SOOT); F.grp.add(noRef(s)); F.smoke.push(s); }
        const r = new T.Mesh(RING.geometry, RING.material.clone()); F.grp.add(r); F.ring = r;
        scene.add(F.grp);
      }
      // fire arrows arc from the fleet onto the fort
      F.arrows.forEach((a, k) => {
        const q = (t - k * 140) / 650; a.visible = q > 0 && q < 1;
        if (!a.visible) return;
        a.position.set(ship[0] + (top[0] - ship[0]) * q, 22 + (top[1] - 22) * q + Math.sin(q * Math.PI) * 70, ship[1] + (top[2] - ship[1]) * q);
      });
      // it burns...
      const burn = Math.max(0, Math.min(1, (t - 650) / 400)) * (t < 2700 ? 1 : Math.max(0, 1 - (t - 2700) / 300));
      const c = Math.max(0, Math.min(1, (t - 2000) / 800));      // (how far it has crumbled: the flames sink with it)
      F.flames.forEach((f, k) => { f.visible = burn > 0; f.position.y = TOP + (top[1] - 2 - TOP) * (1 - c * .95); f.scale.set(3.2 * burn, (4.6 + Math.sin(now / 90 + k * 2) * 1.2) * burn, 3.2 * burn); });
      F.smoke.forEach((s, k) => {
        const q = ((now / 1600 + k / 4) % 1); s.visible = burn > 0;
        s.position.set(top[0] + q * 10, top[1] + 4 + q * 40, top[2] - q * 6); s.scale.setScalar((3 + q * 10) * burn);
      });
      // ...then crumbles into the ground with a ring of dust, and a town drops in where it stood
      const g = Q.forts[v];
      if (g) { g.scale.set(1 + c * .08, Math.max(.001, 1 - c * .95), 1 + c * .08); g.position.x = V.x + (c > 0 && c < 1 ? Math.sin(now / 25) * .8 : 0); }
      const rr = (t - 2500) / 600; F.ring.visible = rr > 0 && rr < 1;
      if (F.ring.visible) { F.ring.position.set(V.x, TOP + .6, V.y); F.ring.scale.setScalar(8 + rr * 30); F.ring.material.opacity = .8 * (1 - rr); }
      if (t >= 3100) { Q.done[v] = true; scene.remove(F.grp); F.ring.material.dispose(); FELL['b' + v] = now; dynamic(); }
    });
  }
  let dynJunk = [], DROPS = [];
  function dropIn(key, obj) {      // a new piece falls onto the board (FELL is filled in by noteDrops)
    obj.userData.y0 = obj.position.y;
    if (Date.now() - (FELL[key] || 0) < DROPMS) DROPS.push({obj, key});
  }
  // A track building taken from someone (Rick, 2026-11-20; TAKE in draw2d.js): the old one shakes, then sinks into the
  // ground (squashing down) back to a plain fort; the new owner's plain fort is swapped for the new building growing up.
  let TK = {};
  function takeStep(now) {
    if (!taking()) { if (TK.gNew) { TK.gNew.scale.set(1, 1, 1); TK.gNew.visible = true; } if (TK.gOld) TK.gOld.visible = false; if (TK.gFort) TK.gFort.visible = false; TK = {}; return; }
    const k = (now - TAKE.t) / TAKEMS;
    SHADOW = true;
    if (TK.gOld) {
      const o = TK.gOld;
      if (k < .12) { o.rotation.z = Math.sin(k * 260) * .05; o.position.y = 0; o.scale.set(1, 1, 1); o.visible = true; }
      else { const s = Math.min(1, (k - .12) / .28), e = s * s; o.rotation.z = 0; o.position.y = -e * 14; o.scale.set(1 + e * .1, Math.max(.02, 1 - e), 1 + e * .1); o.visible = s < 1; }
    }
    if (TK.gNew) {
      const s = (k - .62) / .23;
      TK.gNew.visible = s > 0;
      TK.gNew.scale.set(1, s <= 0 ? .001 : s >= 1 ? 1 : Math.max(.001, backOut(s)), 1);
      if (TK.gFort) TK.gFort.visible = k < .66;
    }
  }
  function dynamic() {
    dynJunk.forEach(o => o.dispose()); dynJunk = []; DROPS = []; TK = {};
    dyn.clear(); hits.clear();
    TILES3.forEach((o, i) => o.top.color.setScalar(i === G.storm ? .5 : 1));
    for (const e in G.r) {
      const A = VERT[EDGE[e].a], B = VERT[EDGE[e].b], m = new T.Mesh(G3.cube, pm3(G.r[e], 'flag'));
      m.position.set((A.x + B.x) / 2, (2.5 + TOP + 2.4) / 2, (A.y + B.y) / 2);
      m.scale.set(S * .74, TOP - .1, 5.6); m.rotation.y = Math.atan2(-(B.y - A.y), B.x - A.x);
      m.castShadow = m.receiveShadow = true; dyn.add(m); dropIn('r' + e, m);
    }
    // the longest route (2026-11-19): a glowing gold strip along the top of each of its roads (pulses in frame())
    if (G.lr != null && G.lr >= 0) routeEdges(G.lr).forEach(e => {
      const A = VERT[EDGE[e].a], B = VERT[EDGE[e].b], m = new T.Mesh(G3.cube, ROUTEMAT);
      m.position.set((A.x + B.x) / 2, (2.5 + TOP + 2.4) / 2 + (TOP - .1) / 2 + .35, (A.y + B.y) / 2);
      m.scale.set(S * .7, .7, 2.2); m.rotation.y = Math.atan2(-(B.y - A.y), B.x - A.x);
      dyn.add(m); dropIn('r' + e, m);
    });
    ghostOff();      // (the board changed: the preview is rebuilt on the next pointer move)
    DSMOKE.length = 0; DFLAGS.length = 0; UPGS.length = 0; FOLK.length = 0;
    if (PREVID !== G.id) { PREVID = G.id; PREVL = {}; for (const k in UPG) delete UPG[k]; }
    const now = Date.now(), held = raidHeld();
    if (RAID) { RAID.forts = {}; RAID.kn = {}; }
    for (const v in G.b) {
      let b = G.b[v];
      // a town that just became a fort is built up in front of you (upgStep) instead of dropping in
      if (b.l === 2 && PREVL[v] === 1 && !b.u && !b.c && now - (FELL['b' + v] || 0) < DROPMS) UPG[v] = FELL['b' + v];
      PREVL[v] = b.l;
      if (held.includes(+v) && b.l === 1) b = Object.assign({}, b, {l: 2});      // raiders on the way: it's still a fort until they pillage it
      const g = building(v, b);
      dyn.add(g);
      if (held.includes(+v)) RAID.forts[v] = g;
      else if (UPG[v] && now - UPG[v] < UPGMS) {
        const old = building(v, {p: b.p, l: 1}); old.rotation.y = 0; old.position.set(0, 0, 0); g.add(old);
        old.children.forEach(c => { if (c.isSprite) c.visible = false; });
        const stones = [];
        for (let k = 0; k < 7; k++) { const s = part(g, G3.cube, M3.stone, 0, 0, 0); s.scale.setScalar(2.4); stones.push(s); }
        UPGS.push({g, old, stones, t0: UPG[v]});
        upgPose(UPGS[UPGS.length - 1], now);
      } else if (taking() && (+v === TAKE.to || +v === TAKE.from)) {      // a track building changing hands (takeStep)
        if (+v === TAKE.to) {
          TK.gNew = g;
          TK.gFort = building(v, {p: b.p, l: 2}); TK.gFort.rotation.y = g.rotation.y; dyn.add(TK.gFort);      // its plain fort, until the new building rises
        } else {
          TK.gOld = building(v, {p: TAKE.fp, l: 2, c: TAKE.k, perm: false}); dyn.add(TK.gOld);      // the old owner's building, over the fort left behind
        }
        takeStep(now);
      } else { delete UPG[v]; dropIn('b' + v, g); }
      if (b.l === 1) {      // a town's chimney smokes: 3 puffs taking turns (the chimney sits at 2.6, -2 in the turned house)
        const r = g.rotation.y, cx = VERT[v].x + 2.6 * Math.cos(r) - 2 * Math.sin(r), cz = VERT[v].y - 2.6 * Math.sin(r) - 2 * Math.cos(r);
        for (let k = 0; k < 3; k++) {
          const m = std({color: 0xd8d4cc, transparent: true, opacity: .4, depthWrite: false, roughness: 1}), p = new T.Mesh(G3.ball, m);
          p.userData = {k: k / 3 + (+v % 7) / 7, x: cx, y: TOP + 13.5, z: cz, s: .22}; dynJunk.push(m); dyn.add(noRef(p)); DSMOKE.push(p);
        }
      }
      if (b.w) {      // a stone wall round it, with battlements
        const w = new T.Group();
        part(w, G3.wall, M3.ring, 0, 0, 0);
        for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, m = part(w, G3.merlon, M3.ring, Math.cos(a) * 16, 7.2, Math.sin(a) * 16); m.rotation.y = -a; }
        w.position.set(VERT[v].x, TOP + 1, VERT[v].y); dyn.add(w); dropIn('w' + v, w);
      }
    }
    if (G.deck && HEX[G.storm]) {
      // the bandit stands behind the number disc; in the lair, in front of the cave
      BANDIT3.children[0].position.set(0, ...banditOff(G.storm));
      BANDIT3.position.set(HEX[G.storm].x, TOP, HEX[G.storm].y); dyn.add(BANDIT3);
      if (!(D3.chasing && D3.chasing())) dropIn('storm', BANDIT3);      // (a Guard's chase moves the bandit itself, see chaseStep)
    }
    SNOOZE.length = 0;
    // the knights who were on duty when the raiders came (G.raidfx.k) fight on the beach and only lie down to rest
    // once the battle is over, though the rules already rested them (Rick, 2026-11-19)
    const fought = RAID && !RAID.bdone && G.raidfx && G.raidfx.n === RAID.n ? (G.raidfx.k || []) : [];
    for (const e in guards()) {      // (resting guards are grey, see guard3D)
      const f = fought.includes(+e), g = guard3D(e, f ? Object.assign({}, G.gd[e], {a: 1}) : G.gd[e]); dyn.add(g);
      if (!f) dropIn('g' + e, g);
      if (f) { RAID.kn[e] = g; g.userData.home = g.position.clone(); g.userData.rot = g.rotation.y; g.userData.mt = G.gd[e].s > 1; }      // (on duty: they go and fight the raiders)
    }
    if (G.fg) { const [fx, fz] = fleetAt(G.fleet || 0); if (!RAID) FLEET.position.set(fx * 1.15, 0, fz * 1.15); dyn.add(FLEET); }
    const what = placing(), hit = (geo, mat, u, x, y, z, sx, sy, sz, ry) => {
      const m = new T.Mesh(geo, mat); m.position.set(x, y, z); if (sx) m.scale.set(sx, sy, sz); if (ry) m.rotation.y = ry; m.userData = u; hits.add(m); return m;
    };
    if (what === 'road') spots(G.turn, 'road').forEach(e => {
      const A = VERT[EDGE[e].a], B = VERT[EDGE[e].b], x = (A.x + B.x) / 2, z = (A.y + B.y) / 2, ry = Math.atan2(-(B.y - A.y), B.x - A.x);
      const m = new T.Mesh(G3.cube, M3.spot); m.position.set(x, TOP + 1.5, z); m.scale.set(S * .6, 1.2, 3.6); m.rotation.y = ry; dyn.add(m);
      hit(G3.cube, M3.hit, {e}, x, TOP, z, S * .8, 24, 20, ry);
    });
    if (what === 'town' || what === 'fort' || what === 'wall' || what === 'upgrade' || what === 'castle' || what === 'sack') spots(what === 'sack' ? sackWho() : G.turn, what).forEach(v => {
      const x = VERT[v].x, z = VERT[v].y;
      if (what === 'town') {
        const d = new T.Mesh(G3.spotDisc, M3.spot); d.position.set(x, TOP + 1.2, z); dyn.add(d);
        const ring = new T.Mesh(G3.townRing, pm3(G.turn, 'flag')); ring.position.set(x, TOP + 1.4, z); dyn.add(ring);
      } else { const d = new T.Mesh(G3.spotRing, M3.spot); d.position.set(x, TOP + 3, z); dyn.add(d); }
      hit(G3.pile, M3.hit, {v}, x, TOP - 4, z, 38, 40, 38);
    });
    if (GMODES.includes(what)) gSpots(what).forEach(v => {      // (knights stand on corners)
      const x = VERT[v].x, z = VERT[v].y, d = new T.Mesh(G3.spotRing, M3.spot); d.position.set(x, TOP + 3, z); d.scale.setScalar(.75); dyn.add(d);
      hit(G3.pile, M3.hit, {v}, x, TOP - 4, z, 30, 40, 30);
    });
    if (what === 'storm') HEX.forEach((h, i) => {
      if (i === G.storm) return;
      const ring = new T.Mesh(G3.hexRing, M3.spot); ring.position.set(h.x, TOP + .8, h.y); dyn.add(ring);
      hit(G3.hexFill, M3.stormFill, {h: i}, h.x, TOP + .9, h.y);
    });
    SHADOW = true;
  }

  // ----- clicking the 3D board -----
  const ray = new T.Raycaster(), ptr = new T.Vector2();
  function pick(e) {
    if (INTRO) return null;      // (the island is still putting itself together)
    const r = cv.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    cam.updateMatrixWorld(); ray.setFromCamera(ptr, cam);
    const h = ray.intersectObjects(hits.children, false)[0];
    return h && h.object.userData;
  }
  let DOWN = null;
  cv.addEventListener('pointerdown', e => { DOWN = {x: e.clientX, y: e.clientY}; });
  cv.addEventListener('click', e => {
    if (!DOWN || Math.hypot(e.clientX - DOWN.x, e.clientY - DOWN.y) > 6) return;     // that was a drag to turn the camera
    const u = pick(e), what = placing();
    if (!u || !what) return;
    if (u.h != null) go({t: 'storm', h: u.h});
    else if (u.e != null) go({t: 'road', e: u.e});
    else if (GMODES.includes(what)) knightTap(what, u.v);      // (knights stand on corners)
    else go({t: upWhat(what, u.v), v: u.v, p: what === 'sack' ? sackWho() : undefined});
  });
  cv.addEventListener('pointermove', e => { if (e.buttons) return; const u = pick(e); cv.classList.toggle('pick', !!u); ghost3D(u); });
  cv.addEventListener('pointerleave', ghostOff);
  // --- see-through preview (Rick, 2026-11-19): pointing at a glowing spot shows the piece you'd build there, in your colour ---
  const GHOSTM = {};
  const ghostMat = p => GHOSTM[p] = GHOSTM[p] || std({color: PCOL[p], emissive: PCOL[p], emissiveIntensity: .35, transparent: true, opacity: .5, depthWrite: false});
  let GHOST = null, GKEY = '';
  function ghostOff() { if (GHOST) scene.remove(GHOST); GHOST = null; GKEY = ''; }
  function ghost3D(u) {
    const what = placing(), key = u && what ? what + JSON.stringify(u) : '';
    if (key === GKEY) return;
    ghostOff(); GKEY = key;
    if (!key) return;
    const p = G.turn, gd = u.v != null ? guards()[u.v] : null;
    let o = null;
    if (what === 'road' && u.e != null) {
      const A = VERT[EDGE[u.e].a], B = VERT[EDGE[u.e].b];
      o = new T.Mesh(G3.cube); o.position.set((A.x + B.x) / 2, (2.5 + TOP + 2.4) / 2, (A.y + B.y) / 2);
      o.scale.set(S * .74, TOP - .1, 5.6); o.rotation.y = Math.atan2(-(B.y - A.y), B.x - A.x);
    } else if ((what === 'town' || what === 'fort') && u.v != null) o = building(u.v, {p, l: what === 'fort' ? 2 : 1});
    else if (u.v != null && (what === 'guard' || what === 'train' || what === 'activate')) o = guard3D(u.v, {p, s: !gd ? 1 : what === 'train' ? gd.s + 1 : gd.s, a: 1});
    if (!o) return;
    const m = ghostMat(p);
    o.traverse(c => { if (c.isSprite) c.visible = false; else if (c.isMesh) { c.material = m; c.castShadow = c.receiveShadow = false; } });
    GHOST = o; scene.add(o);
  }

  // ----- the trade boat (same timeline as the flat map's, see sailShip) -----
  const BOATGEO = (() => {      // shared by the trade boat and the raiders' ships
    const hull = new T.Shape([new T.Vector2(-20, 3.5), new T.Vector2(20, 3.5), new T.Vector2(15, -4), new T.Vector2(-15.5, -4)]);
    const main = new T.Shape(); main.moveTo(3, 34); main.quadraticCurveTo(18, 22, 3, 8); main.closePath();
    const jib = new T.Shape(); jib.moveTo(1, 32); jib.quadraticCurveTo(-11, 21, 1, 10); jib.closePath();
    const flag = new T.Shape([new T.Vector2(2, 34.5), new T.Vector2(10, 36.6), new T.Vector2(2, 38.6)]);
    return {hull: new T.ExtrudeGeometry(hull, {depth: 9, bevelEnabled: true, bevelThickness: .8, bevelSize: .8, bevelSegments: 2}).translate(0, 0, -4.5),
      deck: box(36, .5, 8.6), mast: cyl(.5, .6, 35, 8, 0), main: new T.ShapeGeometry(main, 12), jib: new T.ShapeGeometry(jib, 12), flag: new T.ShapeGeometry(flag),
      // details (Rick, 2026-11-18: "make the ship look a bit more complex")
      band: box(34, 1.1, 10.9), cabin: box(9, 5, 8), roof: box(10.2, .7, 9), pane: box(.3, 1.5, 1.6), sidePane: box(1.6, 1.5, .3),
      rail: box(25, .45, .45), post: box(.45, 1.9, .45), nest: cyl(1.9, 1.4, 1.7, 10, 0), port: cyl(.85, .85, .4, 10, 0).rotateX(Math.PI / 2),
      sprit: cyl(.3, .45, 11, 6, 0), rope: cyl(.12, .12, 1, 4, 0), lamp: box(1.1, 1.5, 1.1)};
  })();
  const BOWDECK = 13;      // where cargo rides: on the front deck, clear of the mast and sails
  // a thin rope from a to b (boat coordinates)
  function rope(g, a, b) {
    const A = new T.Vector3(...a), B = new T.Vector3(...b), m = new T.Mesh(BOATGEO.rope, M3.pole);
    m.position.copy(A).add(B).multiplyScalar(.5); m.scale.y = A.distanceTo(B);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize()); g.add(m);
  }
  function makeBoat(hull, sail, flag) {
    const g = new T.Group();
    part(g, BOATGEO.hull, hull, 0, 0, 0); part(g, BOATGEO.deck, M3.deck, 0, 4.2, 0); part(g, BOATGEO.mast, M3.pole, 2, 21, 0);
    part(g, BOATGEO.main, sail, 0, 0, 0); part(g, BOATGEO.jib, sail, 0, 0, 0); part(g, BOATGEO.flag, flag, 0, 0, 0);
    part(g, BOATGEO.band, M3.deck, 0, 1.4, 0);                                                 // a light stripe along the hull
    [-9, -3, 3, 9].forEach(x => [-1, 1].forEach(s => part(g, BOATGEO.port, M3.door, x, -.6, s * 5.35)));      // portholes
    // a cabin at the stern with a roof, lit windows at the back and sides, and a lantern
    part(g, BOATGEO.cabin, hull, -13, 7, 0); part(g, BOATGEO.roof, M3.deck, -13, 9.8, 0);
    [-2, 2].forEach(z => part(g, BOATGEO.pane, M3.glow, -17.6, 7.4, z));
    [-1, 1].forEach(s => part(g, BOATGEO.sidePane, M3.glow, -13, 7.4, s * 4.1));
    part(g, BOATGEO.lamp, M3.glow, -18.2, 11.6, 0);
    // railings along both sides of the open deck
    [-1, 1].forEach(s => {
      part(g, BOATGEO.rail, M3.pole, 4.5, 6.3, s * 4.1);
      for (let x = -7; x <= 16; x += 4.6) part(g, BOATGEO.post, M3.pole, x, 5.4, s * 4.1);
    });
    // a bowsprit pointing forward and up, a crow's nest on the mast, and ropes from the masthead to bow and stern
    const sp = part(g, BOATGEO.sprit, M3.pole, 19.5, 5.4, 0); sp.rotation.z = -Math.PI / 2 + .35;
    part(g, BOATGEO.nest, M3.hull, 2, 29.5, 0);
    rope(g, [2, 37, 0], [26.5, 7.9, 0]); rope(g, [2, 37, 0], [-17, 10.2, 0]);
    [-1, 1].forEach(s => rope(g, [2, 30, 0], [2, 4.6, s * 4.3]));
    return g;
  }
  const BOAT = makeBoat(M3.hull, M3.sail, M3.flag);
  // Forts and Guards: the raider fleet (three dark-sailed ships with red stripes), placed in dynamic() by G.fleet
  const FLEET = new T.Group();
  {
    const hull = std({color: 0x3d2817}), sail = std({color: 0x2a2422, side: T.DoubleSide, roughness: .95}), red = std({color: 0xc62828, side: T.DoubleSide});
    FLEETSHIPS.forEach(([dx, dy], k) => {
      const b = makeBoat(hull, sail, red);
      const band = new T.Mesh(new T.PlaneGeometry(9, 2.4), red); band.position.set(7.5, 23, .05); b.add(band);
      const band2 = band.clone(); band2.position.z = -.05; b.add(band2);
      b.position.set(dx * 1.4, 0, dy * 1.4); b.userData.k = k; FLEET.add(b);
    });
    FLEET.scale.setScalar(1.4);
    FLEET.rotation.y = Math.atan2(-(FLEETNEAR[1] - FLEETFAR[1]), FLEETNEAR[0] - FLEETFAR[0]);      // heading for the island
  }
  // a guard on a road: stone base, body in the player's colour, helmet and shield; a trained one also has a spear and a red plume
  const GG = {base: cyl(3.6, 3.9, 1.2, 12), body: cyl(2.2, 2.9, 6.5, 10), head: sph(0, 0, 0, 1.9), helm: new T.SphereGeometry(2.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    shield: box(3.8, 4.8, .9), plume: box(.7, 1.8, 3.2), duty: new T.TorusGeometry(4.3, .45, 6, 28).rotateX(Math.PI / 2),
    // armour (Rick, 2026-11-20: "a more armored look, while still maintaining player colors"): steel body, shoulder
    // plates, gauntlets and a helmet with a nose guard and rim; the surcoat (front and back), plume and shield carry the colour
    tabard: box(3.1, 5.4, .3), pauldron: new T.SphereGeometry(1.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), nasal: box(.38, 1.5, .32),
    rim: new T.TorusGeometry(2.15, .2, 6, 24).rotateX(Math.PI / 2), crest: new T.ConeGeometry(.75, 3, 8).rotateX(-.5), emblem: box(.85, .85, .22).rotateZ(Math.PI / 4),
    belt: new T.TorusGeometry(2.72, .26, 6, 24).rotateX(Math.PI / 2)};
  // A foot knight's sword (Rick, 2026-11-20: a sword instead of the spear), along +y with 0 = the middle of the grip:
  // a gold pommel, a leather grip, a gold crossguard and a steel blade narrowing to a point
  const SWORD = (() => {
    const s = new T.Shape(); s.moveTo(-.48, 0); s.lineTo(.48, 0); s.lineTo(.4, 6.4); s.lineTo(0, 7.6); s.lineTo(-.4, 6.4); s.closePath();
    return {pommel: new T.SphereGeometry(.42, 10, 8).translate(0, -1.35, 0), grip: cyl(.24, .28, 2.2, 8, 0), guard: box(2.6, .38, .55).translate(0, 1.2, 0),
      blade: new T.ExtrudeGeometry(s, {depth: .16, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 1}).translate(0, 1.35, -.08),
      fuller: box(.14, 5.6, .3).translate(0, 4.4, 0)};      // (the groove down the middle of the blade)
  })();
  const RESTING = std({color: 0x7d7a74, roughness: .9});      // a resting guard's grey body
  // Mounted knights (Rick, 2026-11-19): strength 2 rides a brown horse with a lance; strength 3 (mighty) wears gold armour on a
  // white horse and glows (a soft golden halo sprite, pulsing in frame()). The horse faces along +x; guard3D turns it along the road.
  const HG = {body: new T.CapsuleGeometry(1.9, 4.6, 4, 12).rotateZ(Math.PI / 2), leg: cyl(.42, .34, 4.6, 6), neck: cyl(.85, 1.25, 4, 8),
    head: new T.CapsuleGeometry(.8, 1.9, 3, 8).rotateZ(Math.PI / 2), ear: new T.ConeGeometry(.3, .9, 4), tail: cyl(.25, .6, 3.6, 6),
    cloth: box(3.6, .5, 4.4), legR: box(1, 2.6, .9), torso: cyl(1.35, 1.75, 4, 10), lance: cyl(.22, .3, 19, 6, 0), lanceTip: new T.ConeGeometry(.55, 2.6, 6).translate(0, 1.3, 0),
    pennant: new T.BufferGeometry().setFromPoints([new T.Vector3(0, 0, 0), new T.Vector3(0, -2.4, 0), new T.Vector3(3.4, -1.2, 0)]).toNonIndexed()};
  HG.pennant.computeVertexNormals();
  // the lance's pieces along +y (0 = where the hand holds it): grip -3.4..0.7, neck, guard 1.1..3.2, shaft 3.2..17.4, point 17.4..20.6
  const lathe = pts => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), 14);
  const LANCE = {
    grip: lathe([[0, -3.4], [.3, -3.4], [.36, -2.6], [.45, .7], [0, .7]]),                         // tapered, wider towards the guard
    neck: cyl(.2, .2, .45, 8, .92),
    guard: lathe([[0, 1.1], [.62, 1.15], [.86, 1.5], [.8, 1.95], [.5, 2.6], [.2, 3.2], [0, 3.2]]),     // a rounded cone, wide at the back
    shaft: lathe([[0, 3.2], [.24, 3.2], [.13, 17.4], [0, 17.4]]),                                    // long and thin, narrowing forward
    point: lathe([[0, 17.3], [.16, 17.3], [.34, 18.2], [.28, 19.2], [0, 20.6]])                        // slim, leaf-shaped and sharp
  };
  const HORSE = {brown: std({color: 0xa8693a, roughness: .8}), white: std({color: 0xf1ece0, roughness: .7}), mane: std({color: 0x2a1a10}), maneW: std({color: 0xd9cfb8}),
    hoof: std({color: 0x2b2522, roughness: .6})};
  // The horse (2026-11-19, Rick: "make the horses look more realistic"), facing +x, standing on y 0, back at about y 8.4.
  // Built once from merged shapes: a barrel body with a deep chest and round rump, legs with thighs, knees/hocks,
  // thin cannons, fetlocks and dark hooves (the hind legs bend back at the hock), a flowing tail; and a neck group
  // (pivot at the withers, HB.pivot) with a tapered neck, a long head with a muzzle, a mane, ears, eyes and nostrils.
  const HB = (() => {
    const ball = (x, y, z, sx, sy, sz) => new T.SphereGeometry(1, 16, 12).scale(sx, sy, sz).translate(x, y, z);
    const Y = new T.Vector3(0, 1, 0);
    function between(A, B, r0, r1, seg) {      // a tapered cylinder from point A (radius r0) to point B (radius r1)
      const a = new T.Vector3(...A), d = new T.Vector3(...B).sub(a), len = d.length();
      return new T.CylinderGeometry(r1, r0, len, seg || 10).translate(0, len / 2, 0).applyQuaternion(new T.Quaternion().setFromUnitVectors(Y, d.normalize())).translate(a.x, a.y, a.z);
    }
    const strip = g => { g.deleteAttribute('uv'); return g; };
    const merge = list => BU.mergeGeometries(list.map(strip));
    // body: a long barrel, a deep chest in front and a rounded rump behind, a little belly
    const body = merge([ball(0, 6.6, 0, 3.9, 1.8, 1.5), ball(2.7, 6.6, 0, 1.75, 1.85, 1.45), ball(-2.8, 6.85, 0, 1.85, 1.75, 1.6), ball(.2, 5.9, 0, 2.6, 1.2, 1.35)]);
    // legs: [top, knee or hock, fetlock] for front (x > 0) and hind legs, on both sides
    const legs = [], hooves = [];
    [[2.5, [2.6, 5.6], [2.75, 3.1], [2.7, .95], .62], [-2.6, [-2.6, 6.2], [-3.25, 3.35], [-2.9, .95], .85]].forEach(([, top, knee, fet, thick]) => [-.8, .8].forEach(z => {
      legs.push(between([top[0], top[1], z], [knee[0], knee[1], z], thick, .36), ball(knee[0], knee[1], z, .4, .42, .38),
        between([knee[0], knee[1], z], [fet[0], fet[1], z], .28, .24, 8), ball(fet[0], fet[1], z, .32, .3, .3),
        between([fet[0], fet[1], z], [fet[0] + .15, .55, z], .24, .28, 8));
      hooves.push(between([fet[0] + .15, 0, z], [fet[0] + .12, .62, z], .42, .32, 10));
    }));
    // tail: two flowing strands from the top of the rump down behind the hocks
    const tail = merge([0, 1].map(k => new T.TubeGeometry(new T.CatmullRomCurve3([[-4.4, 7.7, 0], [-5.1, 7.1, k * .2 - .1], [-5.35, 5.5, k * .3 - .15], [-5.1, 3.4, k * .4 - .2]].map(p => new T.Vector3(...p))), 14, .34 - k * .08, 7)));
    // neck group (origin at the withers): the neck runs up and forward to the head
    const pivot = [3.2, 7.4, 0], D = [1.9, 3.1, 0];
    const neck = merge([between([0, -.6, 0], D, 1.15, .62, 12), ball(.4, -.2, 0, 1.25, 1.1, 1.05)]);
    const S = [D[0] + .15, D[1] + .25, 0];       // the top of the head (poll)
    const M = [S[0] + 1.75, S[1] - 1.25, 0];     // the end of the muzzle
    const head = merge([ball(S[0], S[1], 0, .78, .68, .6), between(S, M, .58, .44, 12), ball(M[0], M[1], 0, .5, .46, .44), ball(M[0] - .35, M[1] - .3, 0, .42, .25, .36)]);
    const n = [-D[1], D[0]].map(v => v / Math.hypot(D[0], D[1]));       // across the neck, towards its top edge
    const mane = merge([between([n[0] * .7, -.4 + n[1] * .7, 0], [D[0] + n[0] * .5, D[1] + n[1] * .5, 0], .34, .26, 6).scale(1, 1, .7), ball(S[0] + .5, S[1] + .35, 0, .38, .22, .3)]);      // and a forelock
    const ears = merge([-.3, .3].map(z => new T.ConeGeometry(.2, .75, 6).rotateZ(-.25).translate(S[0] - .25, S[1] + .85, z)));
    const eyes = merge([-1, 1].map(s => ball(S[0] + .38, S[1] + .1, s * .54, .13, .13, .1)));
    const nose = merge([-1, 1].map(s => ball(M[0] + .32, M[1] - .05, s * .2, .1, .1, .08)));
    // Armour for the mighty knight's horse (Rick, 2026-11-19): a chest plate and a rump plate (shells just outside the
    // body), plates round the neck (rings, in the neck group) and a face plate with a little spike down the head.
    const shell = (x, y, z, sx, sy, sz, p0, pl, t0, tl) => new T.SphereGeometry(1, 18, 12, p0, pl, t0, tl).scale(sx, sy, sz).translate(x, y, z);
    const peytral = merge([shell(2.75, 6.55, 0, 1.92, 2.02, 1.66, Math.PI / 2, Math.PI, .3, Math.PI * .58)]);
    const crupper = merge([shell(-2.8, 6.9, 0, 2.02, 1.9, 1.76, -Math.PI / 2, Math.PI, 0, Math.PI * .62)]);
    const L = Math.hypot(D[0], D[1]), dir = new T.Vector3(D[0] / L, D[1] / L, 0);
    // (flat overlapping bands hugging the neck, each a little wider than the neck where it sits)
    const rings = merge([.1, .3, .5, .7, .88].map(f => { const r = 1.12 - .5 * f; return new T.CylinderGeometry(r + .02, r + .1, .62, 22, 1, true).applyQuaternion(new T.Quaternion().setFromUnitVectors(Y, dir)).translate(D[0] * f, D[1] * f - .45 * (1 - f), 0); }));
    const ang = Math.atan2(M[1] - S[1], M[0] - S[0]), mid = [(S[0] + M[0]) / 2 - Math.sin(ang) * .42, (S[1] + M[1]) / 2 + Math.cos(ang) * .42];
    const chanfron = merge([ball(0, 0, 0, 1.2, .2, .48).rotateZ(ang).translate(mid[0], mid[1], 0),
      new T.ConeGeometry(.16, .9, 6).translate(0, .45, 0).rotateZ(ang - Math.PI / 2).translate(mid[0] - Math.sin(ang) * .15, mid[1] + Math.cos(ang) * .15, 0)]);      // (the spike points down the face)
    return {body, legs: merge(legs), hooves: merge(hooves), tail, pivot, neck, head, mane, ears, eyes, nose, bard: {peytral, crupper, rings, chanfron}};
  })();
  const BEARD = [std({color: 0x87827b, roughness: 1, flatShading: true}), std({color: 0xc9c4bb, roughness: 1, flatShading: true})];      // grizzled grey, and lighter
  const GOLDARM = std({color: 0xf5c84a, roughness: .25, metalness: .85, emissive: 0xffa21e, emissiveIntensity: .35});
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,240,170,.85)'); gr.addColorStop(.4, 'rgba(255,205,70,.5)'); gr.addColorStop(1, 'rgba(255,190,60,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return tex(c, true, false); })();
  // (normal blending, not additive: additive glow vanishes over bright grass and wheat)
  const HALO = new T.SpriteMaterial({map: glowTex, transparent: true, depthWrite: false});
  // plus a column of golden light rising round it, fading towards the top (vertex colours give the fade)
  const BEAM = (() => { const g = new T.CylinderGeometry(6.5, 8.5, 30, 24, 4, true).translate(0, 15, 0), p = g.attributes.position, c = [];
    for (let k = 0; k < p.count; k++) { const f = 1 - p.getY(k) / 30; c.push(f, f * .82, f * .35); }
    g.setAttribute('color', new T.Float32BufferAttribute(c, 3)); return g; })();
  const BEAMMAT = new T.MeshBasicMaterial({vertexColors: true, transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide});
  // Resting knights snooze (Rick, 2026-11-19): head down (a resting horse grazes) and three Z's that float up and fade
  // (SNOOZE = this board's Z sprites, filled by guard3D, moved in frame(); ZMAT[k] = one material per Z, so each fades in turn)
  const zTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    x.font = '900 52px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 8; x.strokeStyle = '#1a2230'; x.strokeText('Z', 32, 34); x.fillStyle = '#fff'; x.fillText('Z', 32, 34); return tex(c, true, false); })();
  const ZMAT = [0, 1, 2].map(() => new T.SpriteMaterial({map: zTex, transparent: true, depthWrite: false}));
  function snooze(grp, x, y, z) {
    ZMAT.forEach((m, k) => { const s = new T.Sprite(m); s.userData = {x, y, z, k}; s.position.set(x, y, z); grp.add(s); SNOOZE.push(s); });
  }
  function mounted(grp, g) {
    const gold = g.s >= 3, coat = gold ? HORSE.white : HORSE.brown, mane = gold ? HORSE.maneW : HORSE.mane;
    const arm = gold ? GOLDARM : M3.steel, cloth = g.a ? pm3(g.p, 'flag') : RESTING, rest = !g.a;      // resting: the horse grazes, the rider nods off
    // the horse (its own group, scaled up so it isn't dwarfed by the rider); its back is at y 11.5
    // (a more lifelike horse since 2026-11-19, Rick's request: see HB)
    const H = new T.Group(); H.scale.setScalar(1.35); grp.add(H);
    part(H, HB.body, coat, 0, 0, 0); part(H, HB.legs, coat, 0, 0, 0); part(H, HB.hooves, HORSE.hoof, 0, 0, 0);
    part(H, HB.tail, mane, 0, 0, 0);
    // neck and head turn together at the withers: up and alert, or down grazing when the knight rests
    const NK = new T.Group(); NK.position.set(...HB.pivot); NK.rotation.z = rest ? -1.6 : 0; H.add(NK);
    part(NK, HB.neck, coat, 0, 0, 0); part(NK, HB.head, coat, 0, 0, 0); part(NK, HB.mane, mane, 0, 0, 0);
    part(NK, HB.ears, coat, 0, 0, 0); part(NK, HB.eyes, M3.door, 0, 0, 0); part(NK, HB.nose, HORSE.hoof, 0, 0, 0);
    if (gold) {      // the mighty knight's horse wears gold armour (Rick, 2026-11-19)
      part(H, HB.bard.peytral, GOLDARM, 0, 0, 0); part(H, HB.bard.crupper, GOLDARM, 0, 0, 0);
      part(NK, HB.bard.rings, GOLDARM, 0, 0, 0); part(NK, HB.bard.chanfron, GOLDARM, 0, 0, 0);
    } else {      // (2026-11-20, Rick: more armour) a steel chest plate and face plate, and a rump cloth in the player's colour
      part(H, HB.bard.peytral, M3.steel, 0, 0, 0); part(H, HB.bard.crupper, cloth, 0, 0, 0); part(NK, HB.bard.chanfron, M3.steel, 0, 0, 0);
    }
    // the rider
    part(grp, HG.cloth, cloth, -.2, 11.6, 0).scale.set(1.2, 1, 1.25);              // saddle cloth in the player's colour
    [-1, 1].forEach(s => part(grp, HG.legR, arm, .4, 10.8, s * 2.7));               // legs either side of the horse
    part(grp, HG.torso, arm, -.2, 11.8, 0);                                          // body armour
    // (2026-11-20) a surcoat in the player's colour over it, front and back (grey while resting), shoulder plates
    [1, -1].forEach(s => { const t = part(grp, GG.tabard, cloth, -.2 + s * 1.5, 13.5, 0); t.rotation.set(-s * .1, Math.PI / 2, 0, 'YXZ'); t.scale.set(.7, .62, 1); });
    part(grp, GG.emblem, M3.gold, 1.5, 14.3, 0).rotation.y = Math.PI / 2;
    [-1, 1].forEach(s => { const p = part(grp, GG.pauldron, arm, -.2, 15.2, s * 1.65); p.scale.setScalar(.72); p.rotation.x = s * .35; });
    const hx = rest ? .9 : -.2, hy = rest ? 16.4 : 17.2;                             // (a dozing rider's head droops forward)
    part(grp, GG.head, M3.skin, hx, hy, 0).scale.setScalar(.8);
    const hm = part(grp, GG.helm, arm, hx, hy + .3, 0); hm.scale.setScalar(.8); hm.rotation.z = rest ? -.5 : 0;
    const rm = part(grp, GG.rim, arm, hx, hy + .3, 0); rm.scale.setScalar(.8); rm.rotation.z = rest ? -.5 : 0;
    part(grp, GG.nasal, arm, hx + 1.6, hy + .15, 0).scale.setScalar(.8);      // nose guard (the rider faces +x)
    part(grp, GG.plume, gold ? M3.feather : cloth, hx + (rest ? .7 : 0), hy + 2.3, 0).rotation.z = rest ? -.5 : 0;      // plume in the player's colour
    if (rest) snooze(grp, 2, 20.5, 0);
    face3(grp, hx + 1.3, hy + .1, 0, .8, rest, 'x');
    if (gold) {      // the mighty knight's grizzled beard (Rick, 2026-11-19): a scruffy grey beard, lighter whiskers and moustache
      part(grp, G3.rock, BEARD[0], hx + .95, hy - 1, 0).scale.set(.72, .95, .95);
      [-1, 1].forEach(s => part(grp, G3.rock, BEARD[1], hx + .65, hy - .55, s * .82).scale.set(.45, .62, .32));
      part(grp, G3.rock, BEARD[1], hx + 1.42, hy - .38, 0).scale.set(.22, .2, .78);
    }
    shield3(grp, [.2, 14.3, 2.55], .6, 0, g.p, gold);      // held in the left hand, small and high: clear of the leg and saddle (Rick, 2026-11-19)
    // the lance (Rick, 2026-11-19, from a picture of a real one): a tapered leather grip in the hand, a rounded cone-shaped
    // guard, a long thin shaft and a slim sharp point; lowered, pointing forwards and up, with a pennant near the front.
    // Its own group: origin at the hand, the lance along its +y (LANCE builds the pieces once).
    const LG = new T.Group(); LG.position.set(3.1, 14.2, -1.9); LG.rotation.z = -1.15; LG.scale.setScalar(.82); grp.add(LG);
    part(LG, LANCE.grip, M3.hat, 0, 0, 0); part(LG, LANCE.neck, M3.metal, 0, 0, 0);
    part(LG, LANCE.guard, gold ? GOLDARM : M3.steel, 0, 0, 0); part(LG, LANCE.shaft, M3.steel, 0, 0, 0);      // (all metal, Rick 2026-11-19)
    part(LG, LANCE.point, gold ? GOLDARM : M3.shine, 0, 0, 0);
    // arms (Rick, 2026-11-19): the right hand holds the lance's grip, the left holds the shield
    // (2026-11-20: armoured arms and gauntlets on every knight)
    const grip = LG.position;
    limb3(grp, [-.2, 14.8, -1.7], [grip.x, grip.y, grip.z], .55, arm); part(grp, G3.ball, arm, grip.x, grip.y, grip.z).scale.setScalar(.65);
    limb3(grp, [-.2, 14.8, 1.7], [.3, 14.2, 2.1], .55, arm); part(grp, G3.ball, arm, .3, 14.2, 2.1).scale.setScalar(.65);
    // (no pennant on the lance since 2026-11-19, Rick's request)
    if (gold && g.a) { const h = new T.Sprite(HALO); h.position.set(0, 11, 0); h.scale.set(40, 40, 1); grp.add(h); grp.add(new T.Mesh(BEAM, BEAMMAT)); }      // the golden glow
  }
  // A knight's shield (Rick, 2026-11-19: "more shield shaped", held in the hand): a heater shield, flat along the top and
  // curving to a point at the bottom, in the player's colour with a raised rim and a round boss in the middle (gold on a
  // mighty knight). It faces +z; `at` is its middle, held right in front of the knight's left hand.
  const SHIELD = (() => {
    const outline = (w, h) => { const s = new T.Shape(); s.moveTo(-w, h); s.lineTo(w, h); s.lineTo(w, h * .2); s.quadraticCurveTo(w * .95, -h * .55, 0, -h * 1.05); s.quadraticCurveTo(-w * .95, -h * .55, -w, h * .2); s.closePath(); return s; };
    const face = new T.ExtrudeGeometry(outline(1.85, 2.3), {depth: .3, bevelEnabled: true, bevelThickness: .12, bevelSize: .12, bevelSegments: 2, curveSegments: 10}).translate(0, 0, -.15);
    const ring = outline(2.05, 2.5); ring.holes.push(outline(1.75, 2.15));
    const rim = new T.ExtrudeGeometry(ring, {depth: .5, bevelEnabled: false, curveSegments: 10}).translate(0, 0, -.2);
    const boss = new T.SphereGeometry(.55, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).translate(0, .35, .25);
    return {face, rim, boss};
  })();
  function shield3(grp, at, s, ry, p, gold) {
    const g = new T.Group(); g.position.set(...at); g.rotation.y = ry; g.scale.setScalar(s); grp.add(g);
    part(g, SHIELD.face, pm3(p, 'flag'), 0, 0, 0); part(g, SHIELD.rim, gold ? GOLDARM : M3.steel, 0, 0, 0); part(g, SHIELD.boss, gold ? GOLDARM : M3.steel, 0, 0, 0);
    return g;
  }
  // a sleeve from point a (shoulder) to point b (hand), like the bandit's arms
  function limb3(grp, a, b, r, mat) {
    const A = new T.Vector3(...a), d = new T.Vector3(...b).sub(A), len = d.length();
    const m = part(grp, new T.CylinderGeometry(r, r * 1.1, len, 8).translate(0, -len / 2, 0), mat, ...a);
    dynJunk.push(m.geometry); m.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), d.normalize()); return m;
  }
  // eyes and frowning brows on a head at (x, y, z) of size k; asleep: closed eyes (thin lines). way: which way the face looks ('z' or 'x')
  const EYEGEO = new T.SphereGeometry(.3, 8, 6), LIDGEO = box(.62, .14, .2), BROWGEO = box(.75, .2, .22);
  function face3(grp, x, y, z, k, asleep, way) {
    [-1, 1].forEach(s => {
      const ex = way === 'x' ? x : x + s * .72 * k, ez = way === 'x' ? z + s * .55 * k : z;
      const eye = part(grp, asleep ? LIDGEO : EYEGEO, M3.door, ex, y, ez); eye.scale.setScalar(k); if (way === 'x') eye.rotation.y = Math.PI / 2;
      if (!asleep) { const b = part(grp, BROWGEO, M3.hat, ex - (way === 'x' ? .05 : 0), y + .55 * k, ez); b.scale.setScalar(k); if (way === 'x') { b.rotation.y = Math.PI / 2; b.rotation.x = s * .3; } else b.rotation.z = -s * .3; }
    });
  }
  function guard3D(e, g) {      // (e: the knight's corner since 2026-11-19; they used to stand on roads)
    const grp = new T.Group(), x = VERT[e].x, z = VERT[e].y;
    if (g.s > 1) {
      part(grp, GG.base, M3.stone, 0, 0, 0).scale.set(1.5, 1, 1.15);
      if (g.a) part(grp, GG.duty, M3.gold, 0, 1.3, 0).scale.set(1.5, 1, 1.15);
      const ride = new T.Group(); mounted(ride, g); grp.add(ride);
      grp.rotation.y = -.35;      // facing right, turned a little towards you
      grp.scale.setScalar(1.2);
      grp.position.set(x, TOP + 2.4, z);
      return grp;
    }
    part(grp, GG.base, M3.stone, 0, 0, 0);
    if (g.a) part(grp, GG.duty, M3.gold, 0, 1.3, 0);      // on duty: a gold ring round its feet
    // armour (Rick, 2026-11-20): a steel body under a surcoat in the player's colour (grey while resting), a belt with a
    // gold buckle, steel shoulder plates
    const cloth = g.a ? pm3(g.p, 'flag') : RESTING;
    part(grp, GG.body, M3.steel, 0, 1.2, 0);
    part(grp, GG.tabard, cloth, 0, 4.3, 2.55).rotation.x = -.09; part(grp, GG.tabard, cloth, 0, 4.3, -2.55).rotation.x = .09;
    part(grp, GG.emblem, M3.gold, 0, 5.6, 2.62);
    part(grp, GG.belt, M3.hat, 0, 3.5, 0).scale.set(1, 1, 1.04);
    [-1, 1].forEach(s => { const p = part(grp, GG.pauldron, M3.steel, s * 2.35, 6.9, 0); p.rotation.z = -s * .35; });
    // (resting: head nodding forward, towards the camera, and Z's floating up)
    const hz = g.a ? 0 : .8, hy = g.a ? 9.6 : 9.1;
    part(grp, GG.head, M3.skin, 0, hy, hz);
    part(grp, GG.helm, M3.steel, 0, hy + .4, hz).rotation.x = g.a ? 0 : .45;
    part(grp, GG.rim, M3.steel, 0, hy + .4, hz).rotation.x = g.a ? 0 : .45;      // the helmet's rim
    part(grp, GG.nasal, M3.steel, 0, hy + .25, hz + 1.95).rotation.x = g.a ? -.15 : .3;      // nose guard
    part(grp, GG.crest, cloth, 0, hy + 3, hz - .5).rotation.x = g.a ? -.5 : .1;      // plume in the player's colour
    if (!g.a) snooze(grp, 1.2, 13, 0);
    // eyes and arms (Rick, 2026-11-19: "like the bandit"); armoured arms and steel gauntlets since 2026-11-20; the right hand holds the sword
    face3(grp, 0, hy + .2, hz + 1.75, 1, !g.a, 'z');
    const hand = [3.3, 3.4, 1];
    limb3(grp, [2.3, 7.2, 0], hand, .7, M3.steel); part(grp, G3.ball, M3.steel, ...hand).scale.setScalar(.8);
    limb3(grp, [-2.3, 7.2, 0], [-2.6, 4.5, 1.7], .7, M3.steel); part(grp, G3.ball, M3.steel, -2.6, 4.5, 1.7).scale.setScalar(.8);
    shield3(grp, [-2.75, 4.6, 2.35], 1, .45, g.p, false);      // held in the left hand (Rick, 2026-11-19)
    // the sword (Rick, 2026-11-20): on duty it's held up, point to the sky, leaning out a little; a resting knight
    // leans it back against its shoulder
    const sw = new T.Group(); sw.position.set(...hand); grp.add(sw);
    if (g.a) sw.rotation.set(.18, 0, -.22); else sw.rotation.set(-.6, 0, .12);
    part(sw, SWORD.pommel, M3.gold, 0, 0, 0); part(sw, SWORD.grip, M3.hat, 0, 0, 0); part(sw, SWORD.guard, M3.gold, 0, 0, 0);
    part(sw, SWORD.blade, M3.shine, 0, 0, 0); part(sw, SWORD.fuller, M3.steel, 0, 0, 0);
    grp.scale.setScalar(1.75);
    grp.position.set(x, TOP + 2.4, z);
    return grp;
  }
  let SAIL = null;
  const crateMesh = (r, k) => { const m = new T.Mesh(G3.crate, std({map: crateTex(r, k), roughness: .8})); m.castShadow = true; return m; };
  function endSail() { if (!SAIL) return; scene.remove(BOAT, SAIL.got, SAIL.paid); SAIL.got.material.dispose(); SAIL.paid.material.dispose(); SAIL = null; }
  const proj = (x, y, z) => { cam.updateMatrixWorld(); const v = new T.Vector3(x, y, z).project(cam), r = cv.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; };
  function flyCard(r, x0, y0, p) {      // a card flies from the board to the player's hand (or profile)
    const hand = $('hand'), mine = p === VIEW && hand.offsetParent, to = mine ? hand : document.querySelector('#players .pl:nth-child(' + (p + 1) + ')');
    if (!to) return;
    const Z = to.getBoundingClientRect(), x1 = Z.left + Z.width / 2, y1 = Z.top + Z.height / 2, c = document.createElement('div');
    c.className = 'fly'; c.style.cssText = '--a:' + COL[r][0] + ';--b:' + COL[r][1]; c.innerHTML = ico(r);
    document.body.appendChild(c);
    c.animate([
      {transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.3)', opacity: 0},
      {transform: 'translate(' + x0 + 'px,' + (y0 - 20) + 'px) scale(1.15)', opacity: 1, offset: .2},
      {transform: 'translate(' + ((x0 + x1) / 2) + 'px,' + (Math.min(y0, y1) - 80) + 'px) scale(1)', offset: .55},
      {transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.55)', opacity: .9}
    ], {duration: 1000, easing: 'ease-in-out', fill: 'both'}).onfinish = () => { c.remove(); to.animate([{transform: 'scale(1)'}, {transform: 'scale(1.04)'}, {transform: 'scale(1)'}], {duration: 220}); };
    setTimeout(() => c.remove(), 1200);
  }
  function sailStep(now) {
    const s = SAIL, p = (now - s.t0) / SHIPMS;
    if (p >= 1) return endSail();
    const lerp = (P, Q, k) => [P[0] + (Q[0] - P[0]) * k, P[1] + (Q[1] - P[1]) * k], eo = k => 1 - Math.pow(1 - k, 3), ei = k => k * k * k;
    const turn = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
    const yIn = Math.atan2(-(s.B[1] - s.S0[1]), s.B[0] - s.S0[0]), yOut = Math.atan2(-(s.E[1] - s.B[1]), s.E[0] - s.B[0]);
    let pos = s.B, yaw = yIn;
    if (p < .35) pos = lerp(s.S0, s.B, eo(p / .35));
    else if (p >= .6 && p < .66) { const k = (p - .6) / .06; yaw = yIn + turn(yIn, yOut) * k * k * (3 - 2 * k); }
    else if (p >= .66) { pos = lerp(s.B, s.E, ei((p - .66) / .34)); yaw = yOut; }
    const bob = Math.sin(TIME.value * 2.2) * .5;
    BOAT.position.set(pos[0], bob, pos[1]); BOAT.rotation.set(Math.sin(TIME.value * 1.7) * .05, yaw, 0);
    BOAT.scale.setScalar(Math.max(.001, Math.min(1, p / .08, (1 - p) / .1)));
    // cargo rides on the front deck (BOWDECK along the boat, its +x), clear of the mast and sails
    const deck = [pos[0] + Math.cos(yaw) * BOWDECK, 8.6 + bob, pos[1] - Math.sin(yaw) * BOWDECK], dock = [s.D[0], 9, s.D[1]];
    const hop = (P, Q, k) => [P[0] + (Q[0] - P[0]) * k, P[1] + (Q[1] - P[1]) * k + Math.sin(k * Math.PI) * 16, P[2] + (Q[2] - P[2]) * k];
    // what was bought rides in on deck and hops onto the platform; what was paid hops aboard and sails off
    const g = p < .4 ? deck : p < .52 ? hop(deck, dock, (p - .4) / .12) : dock;
    s.got.position.set(...g); s.got.rotation.y = yaw; s.got.scale.setScalar(Math.max(.001, Math.min(1, p / .08, (.62 - p) / .06)));
    const q = p < .54 ? dock : p < .64 ? hop(dock, deck, (p - .54) / .1) : deck;
    s.paid.position.set(...q); s.paid.rotation.y = yaw; s.paid.scale.setScalar(p < .5 ? .001 : Math.max(.001, Math.min(1, (p - .5) / .04, (1 - p) / .1)));
    if (p >= .56 && !s.flown) { s.flown = true; const [x, y] = proj(...dock); flyCard(s.r, x, y, s.p); }
  }

  // ----- the thrown dice (2026-11-19, Rick: "match the visual style of the 3D board, and smaller") -----
  // Real rounded cubes, lit by the same sun and sky as the island, cream with dark brown pips like the number
  // discs (the second die red, the Sea die blue with its pictures). They live in their own little scene
  // (DSCENE), drawn after the board with the depth cleared, so they never sink into trees or towers. Same
  // timeline as the flat map's CSS dice: fly in from the left, drop, bounce twice, tumble, land with the
  // rolled face on top, wait DICEHOLD, fade. Their size is set in screen pixels (DIEPX), whatever the zoom.
  const DSCENE = new T.Scene();
  DSCENE.environment = scene.environment;
  const dsun = new T.DirectionalLight(0xfff0d8, 2.6); dsun.position.copy(SUN);
  DSCENE.add(dsun, new T.HemisphereLight(0xd6ecff, 0x3d3324, .45));
  const DIEGEO = (() => {      // a cube with rounded edges: push each point of a finely cut box out from a smaller inner box
    const g = new T.BoxGeometry(1, 1, 1, 6, 6, 6), p = g.attributes.position, r = .14, h = .5 - r, v = new T.Vector3(), c = new T.Vector3();
    for (let k = 0; k < p.count; k++) {
      v.fromBufferAttribute(p, k);
      c.set(Math.max(-h, Math.min(h, v.x)), Math.max(-h, Math.min(h, v.y)), Math.max(-h, Math.min(h, v.z)));
      v.sub(c).normalize().multiplyScalar(r).add(c); p.setXYZ(k, v.x, v.y, v.z);
    }
    g.computeVertexNormals(); return g;
  })();
  const PIPAT = {1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.27, .27], [.5, .5], [.73, .73]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]],
    5: [[.27, .27], [.73, .27], [.5, .5], [.27, .73], [.73, .73]], 6: [[.27, .25], [.73, .25], [.27, .5], [.73, .5], [.27, .75], [.73, .75]]};
  const DFACE = {};
  function dieFace(n, kind) {      // one face's picture: cream with carved pips (kind '' or 'red'), or the blue Sea die face
    const key = kind + n;
    if (DFACE[key]) return DFACE[key];
    if (kind === 'sea') {
      const svg = '<svg viewBox="-16 -16 32 32"><defs><radialGradient id="b" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#7cc0ff"/><stop offset="1" stop-color="#2560b0"/></radialGradient></defs>' +
        '<rect x="-16" y="-16" width="32" height="32" fill="url(#b)"/><g transform="scale(1.05)">' + seaSvg(n).replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</g></svg>';
      return DFACE[key] = std({map: svgTex('die' + key, svg, 128), roughness: .4});
    }
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d'), bg = x.createRadialGradient(N * .35, N * .3, 4, N * .5, N * .5, N * .8);
    bg.addColorStop(0, '#fffaf0'); bg.addColorStop(1, '#e3d3a6');      // the number discs' cream
    x.fillStyle = bg; x.fillRect(0, 0, N, N);
    const ink = kind === 'red' ? ['#e0524a', '#8f1410'] : ['#5b4a2a', '#1c150b'], pr = N * (n === 1 ? .12 : .095);
    PIPAT[n].forEach(([u, w]) => {
      const px = u * N, py = w * N;
      x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.arc(px + 1.2, py + 1.6, pr, 0, 7); x.fill();      // the lit lower lip of the hole
      const gr = x.createRadialGradient(px + pr * .35, py + pr * .45, 1, px, py, pr);
      gr.addColorStop(0, ink[0]); gr.addColorStop(1, ink[1]);
      x.fillStyle = gr; x.beginPath(); x.arc(px, py, pr, 0, 7); x.fill();
    });
    return DFACE[key] = std({map: tex(c, true, false), roughness: .35});
  }
  // BoxGeometry's faces are +x, -x, +y, -y, +z, -z: opposite faces add up to 7, and DUP turns face n to the top (+y)
  const DORDER = [3, 4, 1, 6, 2, 5], DUP = {1: [0, 0], 6: [Math.PI, 0], 3: [0, Math.PI / 2], 4: [0, -Math.PI / 2], 2: [-Math.PI / 2, 0], 5: [Math.PI / 2, 0]};
  const shTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(.5, 'rgba(0,0,0,.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return tex(c, false, false); })();
  let DICE3 = null;
  const DIEPX = () => innerWidth <= 600 ? 26 : 34;      // how big a die looks on screen (was 52px; 38 on phones)
  function endDice() { if (!DICE3) return; DICE3.list.forEach(o => { DSCENE.remove(o.die, o.sh); o.sh.material.dispose(); o.die.material.forEach(m => m.dispose()); }); DICE3 = null; }
  function throwDice3(d) {
    endDice();
    cam.updateMatrixWorld();
    const dist = cam.position.distanceTo(C.target), s = DIEPX() * 2 * dist * Math.tan(T.MathUtils.degToRad(cam.fov / 2)) / Math.max(1, cv.clientHeight);
    const right = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).setY(0).normalize(), fwd = new T.Vector3(-right.z, 0, right.x);      // fwd: away from the camera
    const mid = C.target.clone().setY(TOP + 2), list = [];
    d.forEach((n, j) => {
      const kind = j === 2 ? 'sea' : j ? 'red' : '';
      const mats = DORDER.map(f => { const m = dieFace(f, kind).clone(); m.transparent = true; return m; });
      const die = new T.Mesh(DIEGEO, mats); die.scale.setScalar(s);
      const sh = new T.Mesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({map: shTex, transparent: true, depthWrite: false}));
      sh.scale.setScalar(s * 1.9);
      const fx = (d.length === 3 ? (j - 1) * 1.35 : j ? .8 : -.8) * s + (Math.random() - .5) * s * .4, fy = (Math.random() - .5) * s * .6, sx = fx - (2.4 + Math.random()) * s;
      const at = (a, b) => mid.clone().addScaledVector(right, a).addScaledVector(fwd, b);
      const [ax, az] = DUP[n];
      const end = new T.Quaternion().setFromEuler(new T.Euler(0, Math.random() * Math.PI * 2, 0)).multiply(new T.Quaternion().setFromEuler(new T.Euler(ax, 0, az)));
      const axis = new T.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize();
      list.push({die, sh, A: at(sx, fy), B: at(fx, fy), end, axis, turns: (2 + Math.random()) * Math.PI * 2 * (Math.random() < .5 ? -1 : 1)});
      DSCENE.add(sh, die);
    });
    DICE3 = {t0: Date.now(), list, s, H: dist * .4};
    diceStep(Date.now());
  }
  const bez = (p1, p2) => u => { let t = u; for (let k = 0; k < 6; k++) { const x = 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t - u, dx = 3 * (1 - t) * (1 - t) * p1 + 6 * (1 - t) * t * (p2 - p1) + 3 * t * t * (1 - p2); if (Math.abs(dx) > 1e-4) t -= x / dx; } return Math.max(0, Math.min(1, t)); };
  const bezY = (p1, p2) => { const tx = bez(p1[0], p2[0]); return u => { const t = tx(u); return 3 * (1 - t) * (1 - t) * t * p1[1] + 3 * (1 - t) * t * t * p2[1] + t * t * t; }; };
  const glide = bezY([.2, .7], [.3, 1]), twirl = bezY([.25, .6], [.35, 1]);
  const BOUNCE = [[0, 1], [.32, 0], [.45, .55], [.58, 0], [.67, .15], [.75, 0], [1, 0]];      // height over time (first value: the drop height, then die sizes)
  function diceStep(now) {
    const D = DICE3, p = (now - D.t0) / DICEMS;
    if (p > 1 + (DICEHOLD + 350) / DICEMS) { endDice(); return; }
    const fade = Math.max(0, Math.min(1, 1 - (now - D.t0 - DICEMS - DICEHOLD) / 350));
    let h = 0;
    for (let k = 0; k < BOUNCE.length - 1; k++) {
      const [a, ha] = BOUNCE[k], [b, hb] = BOUNCE[k + 1];
      if (p >= a && p <= b) { const u = (p - a) / (b - a), up = hb > ha; h = ha + (hb - ha) * (up ? 1 - (1 - u) * (1 - u) : u * u); break; }
    }
    const lift = (p < .32 ? D.H : D.s) * h;
    D.list.forEach(o => {
      const g = glide(Math.min(1, p / .85)), r = twirl(Math.min(1, p / .85));
      o.die.position.lerpVectors(o.A, o.B, g); o.sh.position.copy(o.die.position);
      o.die.position.y += D.s / 2 + lift;
      o.die.quaternion.setFromAxisAngle(o.axis, (1 - r) * o.turns).multiply(o.end);
      const near = Math.max(0, 1 - lift / (D.s * 3));
      o.sh.material.opacity = (p < .32 ? Math.min(1, p / .32) : .6 + .4 * near) * fade;
      o.sh.scale.setScalar(D.s * (1.3 + .6 * near));
      o.die.material.forEach(m => { m.opacity = fade; });
    });
  }

  // ----- clouds (2026-11-19, Rick: the flat clouds "don't look right in 3D") -----
  // The weather's clouds are real 3D clouds now: 2-3 puffy heaps of lumpy balls high over the island, drifting across
  // from one side to the other, and the sun casts their shadows over the lands below (flair.js clouds() starts them).
  const CLOUDMAT = std({color: 0xffffff, roughness: 1, transparent: true, opacity: 0, emissive: 0xffffff, emissiveIntensity: .15});
  let CLOUDS = null;
  function cloudsStart(ms) {
    cloudsEnd();
    const g = new T.Group(), list = [], n = 2 + Math.floor(Math.random() * 2), dir = Math.random() < .5 ? 1 : -1;
    for (let k = 0; k < n; k++) {
      const c = new T.Group(), r = rng(1 + Math.floor(Math.random() * 99990)), puffs = 8 + Math.floor(r() * 4);
      for (let q = 0; q < puffs; q++) {      // a big middle puff, smaller ones round it, all with flattened bottoms
        const a = q / puffs * Math.PI * 2 + r(), d = q ? 13 + r() * 15 : 0, big = q ? 11 + r() * 9 : 22;
        const m = new T.Mesh(G3.crown, CLOUDMAT);
        m.position.set(Math.cos(a) * d * 1.7, q ? 2 + r() * 7 : 8, Math.sin(a) * d * .8); m.scale.set(big, big * .62, big * .9);
        m.castShadow = true; c.add(m);
      }
      c.scale.setScalar(.85 + r() * .5);
      c.userData = {z: -200 + k * 170 + (r() - .5) * 90, y: 150 + r() * 50, delay: k * 2400 + r() * 1500};
      c.visible = false; g.add(c); list.push(c);
    }
    scene.add(g);
    CLOUDS = {g, list, t0: Date.now(), ms, dir};
  }
  function cloudsEnd() { if (CLOUDS) { scene.remove(CLOUDS.g); CLOUDS = null; SHADOW = true; } }
  function cloudsStep(now) {
    const Q = CLOUDS, p = (now - Q.t0) / Q.ms;
    if (p >= 1) { cloudsEnd(); return; }
    CLOUDMAT.opacity = .88 * Math.min(1, p * 8, (1 - p) * 8);
    Q.list.forEach(c => {
      const u = c.userData, k = (now - Q.t0 - u.delay) / (Q.ms - u.delay);
      c.visible = k > 0 && k < 1;
      c.position.set(Q.dir * (-750 + 1500 * k), u.y, u.z);
    });
    SHADOW = true;      // (their shadows move over the land)
  }
  // ----- the winner's celebration (Rick, 2026-11-20): fireworks over the island while the camera circles it -----
  // flair.js winFx() starts it when a game is won (never on load). Rockets rise from round the island, each bursting
  // into a ball of sparks that drift out, slow down, droop and fade; colours: the winner's, gold and white, mixed.
  // Each burst is one Points cloud (cheap). No new lights: adding a light makes every material recompile, which
  // froze Rick's laptop. The camera turns slowly round the island until the player grabs it.
  const PARTYMS = 9500, SPARKN = 120, SPARKLIFE = 1900;
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.95)'); gr.addColorStop(.7, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return tex(c, true, false); })();
  let PARTY = null;
  function partyStart(p) {
    partyEnd();
    const g = new T.Group(), win = new T.Color(PCOL[p] || '#ffd95e'), cols = [win, new T.Color('#ffd23f'), win, new T.Color('#ffffff'), win, new T.Color('#ff9f43')];
    const list = [];
    for (let k = 0, t = 300; t < PARTYMS - 2400; k++) {      // a burst every ~0.4 s, sometimes two close together
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 120, from = [Math.cos(a) * (d + 50), Math.sin(a) * (d + 50)];
      list.push({t, from, at: [Math.cos(a) * d * .8, 110 + Math.random() * 70, Math.sin(a) * d * .8], col: cols[k % cols.length], big: .8 + Math.random() * .5});
      t += Math.random() < .25 ? 120 : 300 + Math.random() * 320;
    }
    scene.add(g);
    PARTY = {t0: Date.now(), g, list, cam: true};
  }
  function partyEnd() {
    if (!PARTY) return;
    scene.remove(PARTY.g);
    PARTY.list.forEach(b => { if (b.pts) { b.pts.geometry.dispose(); b.pts.material.dispose(); } if (b.rk) b.rk.material.dispose(); });
    PARTY = null;
  }
  function partyStep(now, dt) {
    const P = PARTY, t = now - P.t0;
    if (t > PARTYMS || !G || G.phase !== 'over') { partyEnd(); return; }
    if (P.cam) {      // the camera circles the island, slowly
      const off = cam.position.clone().sub(C.target).applyAxisAngle(new T.Vector3(0, 1, 0), dt * .28);
      cam.position.copy(C.target).add(off);
    }
    P.list.forEach(b => {
      const k = t - b.t;
      if (k < 0) return;
      const RISE = 650;
      if (k < RISE) {      // the rocket climbs, a bright dot with a little wobble
        if (!b.rk) { b.rk = new T.Sprite(new T.SpriteMaterial({map: dotTex, color: 0xfff1c4, transparent: true, depthWrite: false, blending: T.AdditiveBlending})); b.rk.scale.setScalar(9); P.g.add(b.rk); }
        const e = 1 - Math.pow(1 - k / RISE, 2);
        b.rk.position.set(b.from[0] + (b.at[0] - b.from[0]) * e + Math.sin(k * .03) * .8, TOP + (b.at[1] - TOP) * e, b.from[1] + (b.at[2] - b.from[1]) * e);
        return;
      }
      if (b.rk) { P.g.remove(b.rk); b.rk.material.dispose(); b.rk = null; }
      const age = k - RISE;
      if (age > SPARKLIFE) { if (b.pts) { P.g.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); b.pts = null; b.done = true; } return; }
      if (b.done) return;
      if (!b.pts) {      // burst: sparks fly out in every direction, with its own crackle (firework.wav)
        SFX.firework(0);
        const pos = new Float32Array(SPARKN * 3), dir = [];
        for (let q = 0; q < SPARKN; q++) {
          const u = Math.random() * 2 - 1, w = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = (150 + Math.random() * 30) * b.big;
          dir.push([r * Math.cos(w) * sp, u * sp, r * Math.sin(w) * sp]);
        }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        // (normal blending: added-up light vanishes against the bright daytime sea)
        b.pts = new T.Points(geo, new T.PointsMaterial({map: dotTex, color: b.col.clone().lerp(new T.Color(1, 1, 1), .25), size: 30, transparent: true, depthWrite: false}));
        b.pts.frustumCulled = false; b.dir = dir; P.g.add(b.pts);
      }
      const s = age / 1000, spread = (1 - Math.exp(-2.6 * s)) / 2.6, fall = 22 * s * s, arr = b.pts.geometry.attributes.position.array;
      b.dir.forEach((v, q) => { arr[q * 3] = b.at[0] + v[0] * spread; arr[q * 3 + 1] = b.at[1] + v[1] * spread - fall; arr[q * 3 + 2] = b.at[2] + v[2] * spread; });
      b.pts.geometry.attributes.position.needsUpdate = true;
      const f = age / SPARKLIFE;
      b.pts.material.opacity = Math.min(1, (1 - f) * 2.5) * (.8 + .2 * Math.sin(age * .05 + b.t));      // bright, then fades out, twinkling
      b.pts.material.size = 30 * (1 - f * .45) * (age < 120 ? 1.6 - age / 200 : 1);      // a bright flash at the start
    });
  }
  cv.addEventListener('pointerdown', () => { if (PARTY) PARTY.cam = false; });      // (the player grabbed the camera)
  // ----- every frame -----
  // Frame limit (2026-11-20, Rick's laptop froze in Chrome): drawing as fast as the screen allows kept a laptop's
  // built-in graphics chip at full load. Now: 30 frames a second while nothing big moves, up to 60 during
  // animations (dice, drops, the intro, raids...), 12 while the new-game window covers the island.
  // If drawn frames keep arriving much later than planned, the chip is struggling: lower the sharpness (PR) a step
  // (down to .75) and stay at 30 a second.
  const clock = new T.Clock();
  let LASTF = 0, LATE = 0, SEEN = 0, LOWQ = false, SHF = 0, RMS = 0;
  // Shader warm-up (2026-11-20): the first time each kind of material is drawn, the graphics chip has to prepare a
  // program for it, which froze the page for ~0.4 s when the first game started (and again as the intro revealed
  // hidden scenery). warm() asks for all of them at once, including hidden things, with compileAsync (Chrome
  // prepares them in the background), and frame() waits (HOLD) until they're ready. Once per page.
  // (2026-11-20, Rick: all of Chrome still froze just opening the page.) Every visit now opens on the New game window
  // with the island drawing behind it, so the sea, sky and island programs were prepared one by one in the first
  // frames, the page waiting up to ~0.25 s for each (and Chrome's shared graphics process stuck behind them). So
  // warm(true) also runs once at start-up, before the first frame; the game's own warm() still follows its first build.
  // (2026-11-20, later: Rick's graphics chip reset — "D3D11 device was removed" — while a game's ~45 programs were
  // being prepared all at once.) Now they're prepared WARMN at a time, with a short pause between batches, so the chip
  // never gets one big pile of work. One object per kind of material is enough (compile() also covers hidden things
  // and uses the whole scene's lights). frame() still waits (HOLD), at most WARMMAX ms; anything left after that is
  // prepared as it's first drawn, like before. A newer warm() takes over from one still running.
  let HOLD = false, WARMED = false, WARMRUN = 0;
  const WARMN = 3, WARMMAX = 10000;
  function warm(startup) {
    if (!startup) WARMED = true;
    if (!R.compileAsync) return;
    const seen = new Set(), list = [];
    scene.traverse(o => {
      [].concat(o.material || []).forEach(m => {
        const k = m.id + '|' + !!o.isInstancedMesh + '|' + !!o.isPoints + '|' + !!o.isSprite + '|' + !!o.isLine;
        if (!seen.has(k)) { seen.add(k); list.push(o); }
      });
    });
    const run = ++WARMRUN, end = performance.now() + WARMMAX;
    HOLD = true;
    return (async () => {      // (a promise: done when this warm-up is over)
      for (let i = 0; i < list.length && run === WARMRUN && !DEAD && performance.now() < end; i += WARMN) {
        try {
          await Promise.race([Promise.all(list.slice(i, i + WARMN).map(o => R.compileAsync(o, cam, scene))),
            new Promise(r => setTimeout(r, 3000))]);      // (never stuck on one batch)
        } catch (e) {}
        await new Promise(r => setTimeout(r, 25));      // (a breather for the graphics chip)
      }
      if (run === WARMRUN) HOLD = false;
    })();
  }
  function frame(ts) {
    if (DEAD) return;      // (this 3D island was lost to a graphics reset: stop drawing it)
    requestAnimationFrame(frame);
    if (!D3.on || HOLD) { clock.getDelta(); return; }
    // (60 a second only if a frame costs the processor little: on Rick's laptop each took ~20-25 ms, so 60 a
    // second during the intro left no time for anything else and Chrome froze; RMS = average cost, measured below)
    const busy = !LOWQ && RMS < 9 && (INTRO || DROPS.length || DICE3 || CHASE || RAID || SAIL || PARTY || TK.gNew || UPGS.length);
    const gap = 1000 / (!$('m-setup').hidden ? 12 : busy ? 60 : 30);
    if (ts - LASTF < gap - 4) return;
    if (LASTF && document.visibilityState === 'visible') {      // is the chip keeping up?
      if (ts - LASTF > Math.max(gap * 1.8, 50)) LATE++;
      if (++SEEN >= 60) {
        if (LATE > 30 && PR > .75) { PR = Math.max(.75, PR - .25); usePR(); LOWQ = true; SHADOW = true; }
        SEEN = LATE = 0;
      }
    }
    LASTF = ts;
    const dt = Math.min(clock.getDelta(), .1);
    const now = Date.now(), t = TIME.value += dt;
    water.material.uniforms.time.value += dt * .55;
    foam.material.opacity = .55 + .3 * Math.sin(t * 1.3);
    C.update();
    if (C.target.length() > 260) C.target.setLength(260);
    C.target.y = 0;
    dome.position.copy(cam.position);
    const az = C.getAzimuthalAngle();
    DISCS.forEach(d => { d.rotation.y = az; });
    BANDIT3.rotation.y = az;
    // the bandit blocks its land (Rick, 2026-11-20): two angry hops on the spot, squashing as it lands (BLOCK, draw2d.js)
    if (!CHASE && BANDIT3.parent && G && HEX[G.storm]) {
      const k = BLOCK && BLOCK.h === G.storm ? (now - BLOCK.t) / BLOCKMS : -1;
      if (k > 0 && k < .6) {
        const q = (k / .3) % 1, up = Math.sin(q * Math.PI) * (k < .3 ? 13 : 9), squash = q < .15 || q > .85 ? .15 : 0;
        BANDIT3.position.y = TOP + up; BANDIT3.scale.set(1 + squash * .6, 1 - squash, 1 + squash * .6);
        BANDIT3.rotation.z = Math.sin(q * Math.PI) * (k < .3 ? -.12 : .12);
        BLOCK.hop = true;
      } else if (BLOCK && BLOCK.hop) { BANDIT3.position.y = TOP; BANDIT3.scale.set(1, 1, 1); BANDIT3.rotation.z = 0; BLOCK.hop = false; }
    }
    if (FLEET.parent) FLEET.children.forEach(b => { const k = b.userData.k; b.position.y = Math.sin(t * 2 + k * 2) * .6; b.rotation.x = Math.sin(t * 1.6 + k) * .05; });      // the raiders rock on the waves
    M3.spot.opacity = .55 + .35 * Math.sin(t * 4.5);
    M3.ember.emissiveIntensity = 1.7 + .5 * Math.sin(t * 2.3);
    M3.crystal.emissiveIntensity = .9 + .35 * Math.sin(t * 1.6);      // the crystals shimmer
    // resting knights' Z's: each rises, drifts and fades, one after another, then starts again
    ZMAT.forEach((m, k) => { const f = (t * .45 + k / 3) % 1; m.opacity = Math.min(1, f * 5) * (1 - f); });
    SNOOZE.forEach(s => { const u = s.userData, f = (t * .45 + u.k / 3) % 1; s.position.set(u.x + f * 3 + Math.sin(f * 7) * .6, u.y + f * 6, u.z); s.scale.setScalar(1.6 + f * 2.2); });
    ROUTEMAT.emissiveIntensity = .9 + .5 * Math.sin(t * 2.6);      // the longest route's gold strip shimmers
    if (GHOST) GHOSTM[G.turn] && (GHOSTM[G.turn].opacity = .42 + .14 * Math.sin(t * 5));      // the preview breathes
    HALO.opacity = .65 + .35 * Math.sin(t * 3.2); BEAMMAT.opacity = .45 + .25 * Math.sin(t * 3.2); GOLDARM.emissiveIntensity = .3 + .2 * Math.sin(t * 3.2);      // a mighty knight's glow pulses
    if (CAMPGLOW) CAMPGLOW.material.opacity = CAMPGLOW.userData.k * (.8 + .2 * Math.sin(t * 7) * Math.sin(t * 3.1));      // (the fire's glow flickers)
    M3.fire.emissiveIntensity = 2.1 + .5 * Math.sin(t * 9) * Math.sin(t * 5.3);
    M3.glow.emissiveIntensity = 1.6 + .3 * Math.sin(t * 8) * Math.sin(t * 4.1);
    BLAZE.emissiveIntensity = M3.fire.emissiveIntensity * 1.1;
    RF++;
    DFLAGS.forEach(f => { f.rotation.y = Math.sin(t * 3.1 + f.userData.ph) * .32; });      // forts' flags flutter
    FOLK.forEach(f => {      // market shoppers stroll round the stalls, bobbing as they walk, stopping now and then
      const u = f.userData, go = Math.max(0, Math.sin(t * .5 + u.ph)), a = u.a + (t * u.sp + Math.sin(t * .5 + u.ph) * .8 * Math.sign(u.sp));
      f.position.set(Math.cos(a) * u.r, u.y + Math.abs(Math.sin(t * 7 + u.ph)) * .35 * go, Math.sin(a) * u.r * .7 + 2.8);      // (in front of the hall)
      f.rotation.y = -a + (u.sp > 0 ? Math.PI : 0);
    });
    SMOKE.concat(DSMOKE).forEach(p => {      // puffs of smoke drift up from the crater, the kilns' and the towns' chimneys, and fade
      const u = p.userData, s = u.s, k = (t * (.09 + (1 - s) * .08) + u.k) % 1;
      p.position.set(u.x + (k * 26 + Math.sin(k * 9 + u.k * 20) * 3) * s, u.y + k * 55 * s, u.z - k * 12 * s);
      p.scale.setScalar((3.5 + k * 13) * s); p.material.opacity = .45 * (1 - k) * Math.min(1, k * 6);
    });
    TILES3.forEach((o, i) => {      // lands that just paid out glow
      const on = HARV && HARV.h.includes(i) && now > HARV.t && now < HARV.t + 1600;
      const bl = BLOCK && BLOCK.h === i && now > BLOCK.t && now < BLOCK.t + BLOCKMS;      // (the bandit's land: red, Rick 2026-11-20)
      o.top.emissive.setHex(bl ? 0xff2a18 : 0xffe08a);
      o.top.emissiveIntensity = bl ? .9 * Math.sin(Math.PI * (now - BLOCK.t) / BLOCKMS) : on ? .75 * Math.sin(Math.PI * (now - HARV.t) / 1600) : 0;
    });
    if (DROPS.length) {
      SHADOW = true;
      DROPS = DROPS.filter(d => {
        const p = (now - (FELL[d.key] || 0)) / DROPMS;
        if (p >= 1) { d.obj.position.y = d.obj.userData.y0; return false; }
        d.obj.position.y = d.obj.userData.y0 + (p < .7 ? 70 * (1 - (p / .7) * (p / .7)) : 6 * Math.sin((p - .7) / .3 * Math.PI));
        return true;
      });
    }
    // day and night: windows, door lamps, the lighthouse; the shallows' light ripples and fish fade at night
    dayStep(dt);
    const N = DAY.n;
    WINMAT.emissiveIntensity = N * 2.6;
    if (NIGHTGLOW) NIGHTGLOW.opacity = N * .55;
    LAMPMAT.emissiveIntensity = 1 + N * 2.5;
    if (LH.glow) LH.glow.material.opacity = .25 + N * .7;
    caust.offset.set(t * .011 + Math.sin(t * .3) * .02, t * .007);
    CAUST.material.opacity = .22 * (1 - N * .8);
    SHALLOW.material.color.setScalar(1 - N * .62); foam.material.color.setScalar(1 - N * .5);      // (unlit sheets: darken them by hand)
    FISHMAT.opacity = .4 * (1 - N * .7);
    FISH.forEach(f => {
      const u = f.userData, [x, z, a] = loopAt(u.u + u.sp * (t + .9 * Math.sin(t * .8 + u.k)), u.side + Math.sin(t * 2.3 + u.k) * 1.5);
      f.position.x = x; f.position.z = z; f.rotation.y = a + Math.sin(t * 9 + u.k) * .15;      // (tail wiggle)
    });
    if (INTRO) introStep(now);
    if (UPGS.length) { SHADOW = true; UPGS.forEach(u => upgPose(u, now)); if (UPGS.some(u => now - u.t0 >= UPGMS)) dynamic(); }
    if (RAID) raidStep(now);
    if (CLOUDS) cloudsStep(now);
    if (SAIL) sailStep(now);
    if (CHASE) chaseStep(now, az);
    if (PARTY) partyStep(now, dt);
    if (TK.gNew || TK.gOld) takeStep(now);
    if (SHADOW && ++SHF % 2) { R.shadowMap.needsUpdate = true; SHADOW = false; }      // (shadows: at most every other frame; they cost the most)
    const r0 = performance.now();
    R.render(scene, cam);
    RMS = RMS * .9 + (performance.now() - r0) * .1;      // (how long a frame costs the processor, averaged)
    D3.drawn = true;      // (the first frame is on screen: main.js can lift the loading screen)
    if (!PREWARMED && !G) { PREWARMED = 1; setTimeout(() => { PREWARMED = false; prewarm(); }, 600); }      // (once, see prewarm)
    if (DICE3) diceStep(now);
    if (DICE3) { R.autoClear = false; R.clearDepth(); R.render(DSCENE, cam); R.autoClear = true; }      // the thrown dice, always on top
  }
  warm(true);      // (prepare the start-up scene's programs in the background; see warm())
  requestAnimationFrame(frame);

  D3.perf =() => ({PR, LOWQ, SEEN, LATE, RMS: Math.round(RMS * 10) / 10, FANCY});      // for testing the frame limit
  // the Graphics setting changed (settings.js): shadows on/off and sharpness. Every material's program changes with the
  // shadows, so they're all marked to be prepared again, a few at a time (warm), while drawing waits.
  D3.gfx = fancy => {
    if (DEAD || fancy === FANCY) return;
    FANCY = fancy; LOWQ = false; SEEN = LATE = 0;
    R.shadowMap.enabled = FANCY; sun.castShadow = FANCY; SHADOW = true;
    [scene, DSCENE].forEach(s => s.traverse(o => [].concat(o.material || []).forEach(m => { m.needsUpdate = true; })));
    // (true: doesn't count as the game's own warm-up. The new sharpness is applied after it: resizing the canvas
    // wipes it, and nothing is drawn while warming, so the island would go blank for the whole wait.)
    const p = warm(true), pr = () => { PR = Math.min(devicePixelRatio || 1, FANCY ? 1.5 : 1); usePR(); };
    if (p) p.then(pr); else pr();
  };

  // ----- what the rest of the game uses -----
  D3.update = () => {
    const key = G.id + '|' + G.hex.map(h => h.t + h.n).join() + '|' + JSON.stringify(G.ports || []);
    if (key !== SKEY) { SKEY = key; build(); }
    dynamic();
    if (!WARMED) warm();
  };
  // Getting ready early (2026-11-20, Rick saw a pause when the island starts assembling): after Start, drawing waited
  // ~3 s while the graphics chip prepared the new game's programs (warm). Every visit opens on the New game window, so
  // while it's open a sample island (a dealt island, nothing built, no game) is built behind it and warmed then.
  // Programs are shared by every material of the same kind, and build() keeps the old materials 3 s, so the real game
  // finds them ready. Runs once, shortly after the first frame, only while there's no game (G null).
  let PREWARMED = false;
  function prewarm() {
    if (PREWARMED || G || DEAD) return;
    PREWARMED = true;
    const hex = dealIsland();
    G = {id: 'prewarm', hex, ports: makePorts(), b: {}, r: {}, deck: [], storm: hex.findIndex(h => h.t === 'lair'), pl: [], phase: 'main', log: []};
    try { build(); } catch (e) { console.warn('prewarm', e); }
    G = null;
    stat.visible = false;      // (never shown: just the sand base behind the window, as before; warm() covers hidden things)
    SKEY = null;      // (the real game always builds its own island)
    warm(true);       // (true: the real game still gets its own, now short, warm-up)
  }
  D3.prewarm = prewarm;
  D3.resize = () => fit(false);
  D3.reset = () => fit(true);
  D3.dolly = k => {
    const off = cam.position.clone().sub(C.target);
    off.setLength(Math.min(C.maxDistance, Math.max(C.minDistance, off.length() / k)));
    cam.position.copy(C.target).add(off); C.update();
  };
  D3.screen = (x, y, z) => proj(x, y, z);      // where a board point shows on screen (used by tests too)
  D3.three = {T, R, scene, cam, sun, C};        // for poking at it from the console
  D3.rect = i => { const [x, y] = proj(HEX[i].x, TOP + 5, HEX[i].y); return {left: x, top: y, width: 0, height: 0}; };
  // (by the clock too, so a paused or hidden board can't keep the rob window waiting)
  D3.chasing = () => !!CHASE && Date.now() - CHASE.t0 < CHASEMS;
  D3.dice = d => throwDice3(d);
  D3.raid = fx => raidStart(fx);
  D3.knight = (v, g) => guard3D(v, g);
  D3.building = (v, b) => building(v, b);
  // players' colours changed (a new game with picked colours): make their materials again (pm3, the previews)
  D3.recolor = () => { for (const k in PM) { PM[k].dispose(); delete PM[k]; } for (const k in GHOSTM) { GHOSTM[k].dispose(); delete GHOSTM[k]; } };      // (for testing and pictures: a building model, not added to the board)
  D3.party = p => partyStart(p);      // the winner's fireworks and the camera circling (flair.js winFx)
  D3.clouds = ms => cloudsStart(ms);      // (weather: real clouds drifting over the island, see flair.js)      // (for testing and pictures: a knight model, not added to the board)
  D3.introLeft = () => !INTRO ? 0 : INTRO.t0 == null ? INTRO.end : Math.max(0, INTRO.end - (Date.now() - INTRO.t0));      // (computer players wait for the island)
  D3.day = d => { DAY.test = d; DAY.cur = null; };      // (null: back to normal)      // for testing: jump to a time of day (0 morning, .25 noon, .5 sunset, .75 night)
  D3.undice = endDice;
  D3.chase = c => {
    if (!HEX[c.from] || !HEX[c.to] || c.from === c.to) return;
    CHASE = {t0: Date.now(), from: c.from, to: c.to};
    KNIGHT.team.forEach(m => { m.material = pm3(c.p, 'flag'); });
    KNIGHT.g.scale.setScalar(1); KNIGHT.f.scale.setScalar(1); KNIGHT.arm.rotation.x = 0;
    DROPS = DROPS.filter(d => d.obj !== BANDIT3);
    scene.add(KNIGHT.g, RING);
    setTimeout(() => { if (G) render(); }, CHASEMS + 60);      // show a waiting rob window even if no frame ends the chase
  };
  D3.sail = t => {
    const o = (G.ports || []).find(q => q.e === t.e);
    if (!o) return;
    endSail();
    const g = portGeo(o), at = (d, s) => [g.mx + g.nx * d + g.tx * s, g.my + g.ny * d + g.ty * s];
    SAIL = {t0: Date.now(), B: at(DOCK + 14, 38), D: at(DOCK, 0), S0: at(BERTH + 230, 190), E: at(BERTH + 240, -140), got: crateMesh(t.get, 1), paid: crateMesh(t.give, t.k), p: t.p, r: t.get, flown: false};
    scene.add(BOAT, SAIL.got, SAIL.paid);
  };
}

