'use strict';
// Fatal Fists - start-up and the frame loop
// ===== Start =====
function resize() {
  const s = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  if (s !== S || !bg.width) { S = s; cv.width = W * S; cv.height = H * S; buildBg(); }
}
addEventListener('resize', resize);
resize();
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
