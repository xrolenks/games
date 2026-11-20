'use strict';
// Fatal Fists - sounds made in code
// ===== Sound (made in code, no files) =====
let AC = null, NB = null;
function ac() {
  if (settings.muted) return null;
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      NB = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      const d = NB.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { AC = null; return null; }
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(f0, dur, type, vol, f1, delay = 0) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq, type = 'lowpass') {
  const a = ac(); if (!a) return;
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
  s.buffer = NB; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(a.destination); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
const SFX_RAW = {
  hit(heavy) { noise(heavy ? 0.2 : 0.12, 0.55, heavy ? 900 : 1800); tone(heavy ? 95 : 150, heavy ? 0.2 : 0.12, 'sine', 0.55, 40); },
  block() { tone(1100, 0.05, 'square', 0.08); noise(0.06, 0.25, 4000, 'highpass'); },
  whoosh() { noise(0.09, 0.12, 2400, 'bandpass'); },
  jump() { tone(240, 0.12, 'sine', 0.08, 420); },
  special() { tone(180, 0.35, 'sawtooth', 0.12, 720); noise(0.25, 0.12, 1500, 'bandpass'); },
  thud() { tone(70, 0.18, 'sine', 0.45, 35); noise(0.12, 0.2, 400); },
  ko() { tone(140, 1.1, 'sawtooth', 0.22, 30); noise(0.8, 0.4, 500); },
  gong() { tone(196, 1.4, 'sine', 0.3); tone(294, 1.1, 'sine', 0.12); tone(392, 0.8, 'triangle', 0.06); },
  fight() { tone(392, 0.12, 'square', 0.1); tone(523, 0.12, 'square', 0.1, null, 0.1); tone(784, 0.3, 'square', 0.1, null, 0.2); },
  select() { tone(620, 0.06, 'square', 0.06); },
  move() { tone(420, 0.04, 'square', 0.04); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, null, i * 0.12)); },
};
// SFX.x() plays a sound; when hosting online, fight sounds are also sent to the other player
const SFX = {};
for (const k in SFX_RAW) SFX[k] = (...a) => { SFX_RAW[k](...a); netEvent(['s', k, a]); };

