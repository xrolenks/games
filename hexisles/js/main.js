'use strict';
// Hex Isles - Start-up: load the saved game (or open the New game window) and start the 3D board.
// ---------- Start ----------
{
  const saved = load(), net = netResume();      // a wifi game interrupted by a reload carries on
  if (saved) render(); else if (!net) openSetup();
}
if (want3D()) load3D(); else show3D(false);
