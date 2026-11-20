'use strict';
// Fatal Fists - keyboard map
// ===== Keys =====
const keys = {};
const tapped = new Set();
const KEYMAP = [
  {left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
   punch: ['KeyJ', 'KeyF'], kick: ['KeyK', 'KeyG'], block: ['KeyL', 'KeyH'], special: ['KeyI', 'KeyT']},
  {left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
   punch: ['Numpad1', 'Comma'], kick: ['Numpad2', 'Period'], block: ['Numpad3', 'Slash'], special: ['Numpad5', 'Quote']},
];
const BTNS = ['left', 'right', 'up', 'down', 'punch', 'kick', 'block', 'special'];
const PRESSABLE = ['punch', 'kick', 'special', 'left', 'right'];      // left/right taps are counted for the double-tap dash
function humanInput(maps) {
  const held = {}, press = [];
  for (const b of BTNS) {
    held[b] = maps.some(m => m[b].some(c => keys[c]));
    if (PRESSABLE.includes(b) && maps.some(m => m[b].some(c => tapped.has(c)))) press.push(b);
  }
  return {held, press};
}

