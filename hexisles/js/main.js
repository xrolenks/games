'use strict';
// Hex Isles - Start-up: open the New game window and start the 3D board.
// ---------- Start ----------
// Live games only (Rick, 2026-11-20): opening the page never continues a saved game. The autosave is still written,
// but only used for one thing: an online game interrupted by a reload carries on (netResume, js/online.js).
{
  const saved = load(), net = netResume();
  if (net) { if (saved) render(); }
  else { G = null; openSetup(); }
}
if (want3D()) load3D(); else show3D(false);

// ---------- Loading screen ----------
// (2026-11-20, Rick's request) #loading covers the page until the 3D island has drawn its first frame (D3.drawn),
// so setting it up doesn't happen while you're already clicking. Shown at least LOADMIN ms so it doesn't just flash,
// and never more than LOADMAX ms; lifted at once if the flat map is used (3D off, slow graphics, or offline).
{
  const LOADMIN = 600, LOADMAX = 8000, t0 = performance.now();
  const tick = setInterval(() => {
    const ms = performance.now() - t0, flat = !want3D() || D3.slow || D3.failed;
    if (ms < LOADMAX && !((D3.drawn || flat) && ms >= LOADMIN)) return;
    clearInterval(tick);
    const el = $('loading');
    el.classList.add('done');
    setTimeout(() => { el.hidden = true; }, 450);
  }, 100);
}
