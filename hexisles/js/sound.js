'use strict';
// Hex Isles - Sound effects (played from the .wav files in sound-effects/) and the volume slider.
// ---------- Sound effects ----------
// Every sound is a .wav file in sound-effects/ (one per sound, named as in SOUNDS; 2026-11-19, Rick's request:
// they used to be built from notes in code). sfx() runs on every render, on every screen (online guests too),
// and plays sounds for what changed: new log lines (G.said counts lines ever said), a new roll (the dice sound
// already has the shake, whoosh and bounces timed to the thrown dice), the trade boat, the Guard's knight
// (timed with its chase), and your turn starting.
// The volume (0-100) comes from the slider in the header and is kept in localStorage key VOLKEY.
// Browsers only allow sound after the first tap or key press, so the files are loaded and played after that.
const VOLKEY = 'hexisles-vol', SFXDIR = 'sound-effects/';
const SOUNDS = ['click', 'dice', 'road', 'town', 'fort', 'wall', 'harvest', 'coins', 'bell', 'card', 'sparkle', 'play',
  'bandit', 'stomp', 'tide', 'swipe', 'pop', 'yes', 'no', 'blip', 'award', 'win', 'turn',
  'horn', 'warhorn', 'guard', 'train', 'sack', 'knight'];      // horn to knight: Forts and Knights
let VOL = 60;
try { const v = localStorage.getItem(VOLKEY); if (v !== null && v !== '' && !isNaN(+v)) VOL = Math.max(0, Math.min(100, +v)); } catch (e) {}
let AC = null, OUT = null;
const BUF = {};      // sound name -> decoded sound, filled as the files arrive
function audio() {      // makes the sound system on the first tap and loads the files; wakes it up if the browser paused it
  if (AC) { if (AC.state === 'suspended') AC.resume(); return AC; }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  AC = new C();
  OUT = AC.createGain();
  const comp = AC.createDynamicsCompressor();      // stops lots of sounds at once getting too loud
  OUT.connect(comp); comp.connect(AC.destination);
  setVol(VOL);
  SOUNDS.forEach(n => fetch(SFXDIR + n + '.wav').then(r => r.arrayBuffer()).then(b => AC.decodeAudioData(b)).then(s => { BUF[n] = s; })
    .catch(e => console.warn('Sound ' + n + ' could not load:', e)));
  return AC;
}
function setVol(v) { VOL = v; if (OUT) OUT.gain.value = Math.pow(v / 100, 2) * 1.3; }
const live = () => AC && AC.state === 'running' && VOL > 0;
function playSound(n, at) {      // at: how many seconds from now it starts
  if (!live() || !BUF[n]) return;
  const s = AC.createBufferSource();
  s.buffer = BUF[n]; s.connect(OUT);
  s.start(AC.currentTime + (at || 0));
}
// SFX.road(at) etc.: one function per sound
const SFX = {};
SOUNDS.forEach(n => { SFX[n] = at => playSound(n, at); });
// Log line -> sound (the first match wins)
const SFXLINES = [
  [/ rolled 7\. The bandit/, 'bandit'], [/ rolled 7\. Low tide/, 'tide'], [/ rolled \d+\. (?!Nobody)/, 'harvest'],
  [/ built a road\./, 'road'], [/ founded a town| built a town\./, 'town'], [/ raised a fort\./, 'fort'], [/ built a wall\./, 'wall'],
  // the volcano (rumble, eruption) is silent for now: Rick's choice, 2026-11-18
  [/raiders sail closer/, 'horn'], [/raiders landed/, 'warhorn'], [/drove them off/, 'award'], [/sacked a fort/, 'sack'], [/treasure washed ashore! (?!Nobody)/, 'coins'],
  [/ hired a knight/, 'guard'], [/ trained a knight/, 'train'], [/ to a Keep| raised a Citadel| founded a fort/, 'fort'],
  [/ banner: | castle: | the .* castle from |castle is now permanent| (built|took) the (Grand Library|Grand Market|Mighty Castle)| is now permanent/, 'award'], [/ to level \d/, 'sparkle'], [/ draws? a progress card/, 'card'],
  [/ sent the bandit /, 'stomp'], [/ robbed /, 'swipe'], [/ handed .* a card\.| discarded /, 'card'],
  [/ bought a progress card/, 'card'], [/ played /, 'play'], [/ found 1 /, 'sparkle'],
  [/ offers /, 'pop'], [/ accepted the trade/, 'yes'], [/ said no to | turned down |Nobody wanted| took the offer back/, 'no'],
  [/ gave .* to .* for | traded \d+ /, 'coins'],
  [/ goes to /, 'award'], [/ won the game!/, 'win'], [/ is back\.| lost connection|reconnect/, 'blip']
];
let SSEEN = null;
function sfx() {
  const s = {id: G.id, said: G.said || 0, rolls: G.rolls || 0, ship: G.ship ? G.ship.n : 0, chase: G.chase ? G.chase.n : 0, turn: G.turn, mine: myTurn()};
  const was = SSEEN; SSEEN = s;
  if (!was || was.id !== s.id || !live()) return;      // first draw, a new game or a load: stay quiet
  const rolled = s.rolls !== was.rolls, late = rolled ? DICEMS / 1000 : 0, chased = s.chase !== was.chase && G.chase;
  if (rolled) SFX.dice(0);
  // new log lines; anything that comes with a roll waits for the dice to land
  G.log.slice(-Math.min(s.said - was.said, G.log.length)).forEach(t => {
    if (s.said <= was.said) return;
    const m = SFXLINES.find(([re]) => re.test(t));
    if (!m || (m[1] === 'stomp' && chased)) return;      // the knight's chase has its own sounds
    SFX[m[1]](late + (m[1] === 'harvest' ? 1 : 0));      // harvest: as the cards arrive
  });
  if (s.ship !== was.ship && G.ship) SFX.bell(0);
  if (chased) SFX.knight(0);
  if (s.mine && (!was.mine || was.turn !== s.turn) && (G.phase === 'roll' || G.phase === 'setup')) SFX.turn(.15);
}
// the volume button and slider in the header
function sndIcon() {
  const w = VOL === 0 ? '<path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
    : '<path d="M15.5 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' + (VOL > 50 ? '<path d="M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : '');
  $('sndbtn').innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9.5v5h4l5 4v-13l-5 4z" fill="currentColor"/>' + w + '</svg>';
  $('sndpct').textContent = VOL + '%';
  $('sndvol').value = VOL;
}
sndIcon();
$('sndbtn').onclick = () => { const p = $('sndpop'); p.hidden = !p.hidden; $('sndbtn').setAttribute('aria-expanded', String(!p.hidden)); };
$('sndvol').oninput = e => { audio(); setVol(+e.target.value); try { localStorage.setItem(VOLKEY, String(VOL)); } catch (x) {} sndIcon(); };
$('sndvol').onchange = () => SFX.coins(0);      // a little sample at the new volume
document.addEventListener('pointerdown', e => { audio(); if (!e.target.closest('#snd')) $('sndpop').hidden = true; }, true);
document.addEventListener('keydown', audio, true);
document.addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled && b.id !== 'dice' && !b.closest('#snd')) SFX.click(0); }, true);
