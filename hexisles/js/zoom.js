'use strict';
// Hex Isles - Zooming and dragging the map.
// ---------- Zoom and drag ----------
// #zoom (holding the tilted board) is scaled by ZM and moved by ZX, ZY pixels, from its top-left corner.
// Scroll wheel zooms around the pointer; dragging with the mouse moves the map (with a finger only once
// zoomed in, so phones can still scroll the page). A drag never counts as a click on the board.
let ZM = 1, ZX = 0, ZY = 0, DRAG = null, DRAGGED = false;
const ZMIN = .6, ZMAX = 3;
function applyZoom() {
  const v = $('view'), z = $('zoom'), W = v.clientWidth, H = v.clientHeight;
  // the middle of the window always stays over the board, so the island can't be lost off screen
  ZX = Math.min(W / 2, Math.max(W / 2 - ZM * z.offsetWidth, ZX));
  ZY = Math.min(H / 2, Math.max(H / 2 - ZM * z.offsetHeight, ZY));
  z.style.transform = ZM === 1 && !ZX && !ZY ? '' : 'translate(' + ZX.toFixed(1) + 'px,' + ZY.toFixed(1) + 'px) scale(' + ZM.toFixed(3) + ')';
  v.classList.toggle('zin', ZM > 1);
  $('z-in').disabled = ZM >= ZMAX; $('z-out').disabled = ZM <= ZMIN; $('z-reset').disabled = ZM === 1 && !ZX && !ZY;
  if (D3.on) $('z-in').disabled = $('z-out').disabled = $('z-reset').disabled = false;      // in 3D they move the camera
}
function zoomAt(k, cx, cy) {      // cx, cy: the point in the window that stays put
  const z = Math.min(ZMAX, Math.max(ZMIN, ZM * k));
  ZX = cx - z * (cx - ZX) / ZM; ZY = cy - z * (cy - ZY) / ZM; ZM = z;
  applyZoom();
}
{
  const v = $('view');
  v.addEventListener('wheel', e => {
    if (D3.on) return;      // the 3D camera handles its own zoom
    e.preventDefault();
    const r = v.getBoundingClientRect(), dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
    zoomAt(Math.exp(-dy * .0015), e.clientX - r.left, e.clientY - r.top);
  }, {passive: false});
  v.addEventListener('pointerdown', e => {
    DRAGGED = false;
    if (D3.on) return;
    if (e.button !== 0 || e.target.closest('#zbtns') || (e.pointerType !== 'mouse' && ZM <= 1)) return;
    DRAG = {id: e.pointerId, x: e.clientX, y: e.clientY, zx: ZX, zy: ZY, on: false};
  });
  v.addEventListener('pointermove', e => {
    if (!DRAG || e.pointerId !== DRAG.id) return;
    const dx = e.clientX - DRAG.x, dy = e.clientY - DRAG.y;
    if (!DRAG.on) {
      if (Math.hypot(dx, dy) < 6) return;      // a small wobble is still a click
      DRAG.on = true; v.setPointerCapture(e.pointerId); v.classList.add('dragging');
    }
    ZX = DRAG.zx + dx; ZY = DRAG.zy + dy; applyZoom();
  });
  const stop = () => { if (!DRAG) return; DRAGGED = DRAG.on; DRAG = null; v.classList.remove('dragging'); };
  v.addEventListener('pointerup', stop); v.addEventListener('pointercancel', stop);
  v.addEventListener('click', e => { if (DRAGGED) { e.stopPropagation(); DRAGGED = false; } }, true);      // the drag's own click
  const mid = k => zoomAt(k, v.clientWidth / 2, v.clientHeight / 2);
  $('z-in').onclick = () => D3.on ? D3.dolly(1.3) : mid(1.3); $('z-out').onclick = () => D3.on ? D3.dolly(1 / 1.3) : mid(1 / 1.3);
  $('z-reset').onclick = () => { if (D3.on) { D3.reset(); return; } ZM = 1; ZX = ZY = 0; applyZoom(); };
  $('z-3d').onclick = () => set3D(!D3.on);
  addEventListener('resize', applyZoom);
  applyZoom();
}
addEventListener('resize', () => { if (G) $('hand').innerHTML = handHTML(G.pl[VIEW] ? G.pl[VIEW].res : null); });
fitBoard();

