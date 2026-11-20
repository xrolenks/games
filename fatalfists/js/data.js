'use strict';
// Fatal Fists - basics, fighters, moves, poses, settings
// ===== Basics =====
const W = 960, H = 540, GROUND = 470, GRAV = 0.8;
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let S = 1;
const $ = id => document.getElementById(id);
const rnd = n => Math.floor(Math.random() * n);
const ease = k => k * k * (3 - 2 * k);

// ===== Fighters (our own characters) =====
const FIGHTERS = [
  {id: 'kade', name: 'Kade', title: 'Street brawler', desc: 'Balanced and steady.',
   shirt: '#d8382c', pants: '#2a2a33', skin: '#e2a77c', hair: 'spiky', hairCol: '#24130d', band: '#f4f0e8', glove: '#8f1d16',
   speed: 3.4, power: 1.0, jump: 15,
   special: {name: 'Ember Shot', type: 'flame', color: '#ffb030', speed: 9, dmg: 9}},
  {id: 'vex', name: 'Vex', title: 'Storm caller', desc: 'Slow, heavy energy blast.',
   shirt: '#7b4bd6', pants: '#1e1630', skin: '#c98d6a', hair: 'long', hairCol: '#e8e0ff', band: '#c7ff5a', glove: '#3a2466',
   speed: 3.1, power: 1.0, jump: 14.5,
   special: {name: 'Volt Orb', type: 'orb', color: '#c7ff5a', speed: 6.5, dmg: 11}},
  {id: 'rook', name: 'Rook', title: 'Mountain wrestler', desc: 'Slow, but hits hardest.',
   shirt: '#6b5a48', pants: '#3a3027', skin: '#8a5a3c', hair: 'bald', hairCol: '#1b120c', band: '#d9a441', glove: '#d9a441',
   speed: 2.7, power: 1.22, jump: 14,
   special: {name: 'Rock Toss', type: 'rock', color: '#b7a38a', speed: 8, dmg: 10}},
  {id: 'juno', name: 'Juno', title: 'Swift kicker', desc: 'Fast and light.',
   shirt: '#1fb5a3', pants: '#123a40', skin: '#f1c7a3', hair: 'tail', hairCol: '#ff6fa8', band: '#ff6fa8', glove: '#0e5f58',
   speed: 4.1, power: 0.88, jump: 16,
   special: {name: 'Tide Ring', type: 'ring', color: '#7ff4ff', speed: 11, dmg: 7}},
];

// ===== Moves (frames at 60 per second; hit box relative to the feet, facing right) =====
const MOVES = {
  punch:    {startup: 4, active: 3, recovery: 9,  dmg: 5,  hitstun: 18, push: 3, hit: {x: 24, y: -126, w: 52, h: 22}},
  kick:     {startup: 7, active: 4, recovery: 14, dmg: 8,  hitstun: 24, push: 5, hit: {x: 30, y: -110, w: 66, h: 26}},
  uppercut: {startup: 5, active: 4, recovery: 24, dmg: 12, knockdown: true, launch: -12, kb: 5, heavy: true, hit: {x: 16, y: -190, w: 44, h: 110}},
  sweep:    {startup: 7, active: 4, recovery: 20, dmg: 7,  knockdown: true, launch: -5, kb: 2, hit: {x: 20, y: -30, w: 80, h: 28}},
  airPunch: {startup: 3, active: 8, recovery: 6,  dmg: 6,  hitstun: 14, push: 3, air: true, hit: {x: 14, y: -130, w: 48, h: 30}},
  airKick:  {startup: 4, active: 12, recovery: 6, dmg: 9,  hitstun: 20, push: 5, air: true, hit: {x: 20, y: -70, w: 62, h: 34}},
  throw:    {startup: 3, active: 2, recovery: 22, dmg: 12, throw: true, heavy: true, hit: {x: 0, y: -140, w: 50, h: 120}},
  special:  {startup: 12, active: 1, recovery: 18, projectile: true},
};
const SPECIAL_WAIT = 80;

// ===== Poses (facing right, origin at the feet, y up is negative) =====
const P = {
  idle:     {hip: [0, -72], neck: [5, -124], head: [8, -143], hF: [30, -112], hB: [16, -120], fF: [20, 0], fB: [-20, 0]},
  crouch:   {hip: [0, -40], neck: [12, -86], head: [16, -104], hF: [32, -76], hB: [20, -84], fF: [26, 0], fB: [-24, 0]},
  jump:     {hip: [0, -78], neck: [2, -130], head: [4, -149], hF: [26, -128], hB: [-14, -124], fF: [16, -40], fB: [-12, -48]},
  block:    {hip: [-2, -72], neck: [-2, -124], head: [0, -143], hF: [22, -140], hB: [18, -126], fF: [18, 0], fB: [-24, 0]},
  cblock:   {hip: [0, -40], neck: [8, -86], head: [12, -104], hF: [26, -104], hB: [22, -92], fF: [26, 0], fB: [-24, 0]},
  hit:      {hip: [-4, -72], neck: [-16, -120], head: [-24, -136], hF: [-2, -96], hB: [-14, -100], fF: [16, 0], fB: [-24, 0]},
  fall:     {hip: [0, -60], neck: [-36, -96], head: [-50, -108], hF: [-20, -130], hB: [-40, -120], fF: [30, -90], fB: [24, -70]},
  lie:      {hip: [0, -12], neck: [-52, -14], head: [-70, -16], hF: [-30, -6], hB: [-58, -4], fF: [46, -6], fB: [40, -14]},
  punch:    {hip: [4, -72], neck: [16, -122], head: [20, -140], hF: [68, -118], hB: [10, -114], fF: [30, 0], fB: [-22, 0]},
  kick:     {hip: [-6, -74], neck: [-20, -120], head: [-26, -137], hF: [8, -108], hB: [-6, -112], fF: [78, -100], fB: [-10, 0]},
  uppercut: {hip: [6, -68], neck: [18, -122], head: [22, -141], hF: [34, -178], hB: [0, -104], fF: [28, 0], fB: [-22, 0]},
  sweep:    {hip: [-4, -30], neck: [-26, -66], head: [-36, -80], hF: [-6, -46], hB: [-34, -4], fF: [80, -8], fB: [-14, 0]},
  airPunch: {hip: [0, -78], neck: [8, -128], head: [12, -146], hF: [58, -110], hB: [0, -118], fF: [14, -40], fB: [-14, -46]},
  airKick:  {hip: [-2, -80], neck: [-12, -128], head: [-16, -146], hF: [14, -118], hB: [-10, -122], fF: [64, -48], fB: [-8, -46]},
  throw:    {hip: [4, -72], neck: [14, -124], head: [18, -142], hF: [48, -128], hB: [44, -110], fF: [28, 0], fB: [-22, 0]},
  special:  {hip: [-2, -72], neck: [8, -124], head: [12, -142], hF: [58, -118], hB: [54, -106], fF: [26, 0], fB: [-26, 0]},
  dashf:    {hip: [2, -64], neck: [20, -112], head: [27, -128], hF: [36, -100], hB: [26, -108], fF: [24, -10], fB: [-34, -4]},
  dashb:    {hip: [-2, -66], neck: [-12, -116], head: [-18, -133], hF: [20, -124], hB: [12, -116], fF: [30, -4], fB: [-20, -12]},
  win:      {hip: [0, -74], neck: [2, -126], head: [4, -145], hF: [14, -196], hB: [-16, -106], fF: [18, 0], fB: [-18, 0]},
};
function clonePose(p) { const o = {}; for (const k in p) o[k] = [p[k][0], p[k][1]]; return o; }
function lerpPose(a, b, k) {
  const o = {};
  for (const n in a) o[n] = [a[n][0] + (b[n][0] - a[n][0]) * k, a[n][1] + (b[n][1] - a[n][1]) * k];
  return o;
}

// ===== Settings (localStorage key: fatalfists.settings) =====
const SAVEKEY = 'fatalfists.settings';
let settings = {muted: false, level: 1};
try { Object.assign(settings, JSON.parse(localStorage.getItem(SAVEKEY) || '{}')); } catch (e) {}
function saveSettings() { try { localStorage.setItem(SAVEKEY, JSON.stringify(settings)); } catch (e) {} }

