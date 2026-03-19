/*
 * panel-resize.js
 * Panel collapse toggles and drag-to-resize for output and simulator panels.
 *
 * toggleViewPanel()
 *   Collapses the output panel to a 36px stub or restores it to its
 *   previous width. Triggers Blockly.svgResize after the transition.
 *
 * toggleSimPanel()
 *   Same behaviour for the simulator panel.
 *
 * initResizeHandle(handleId, targetId)
 *   Attaches mousedown + touchstart to a resize handle element.
 *   Dragging adjusts the target panel's width (col-resize) or height
 *   on mobile (row-resize) within configured bounds.
 *   Calls Blockly.svgResize on every drag event.
 *
 * A window resize listener keeps the Blockly workspace filling its
 * container whenever the browser window size changes.
 *
 * Depends on: nothing (workspace global is set in init.js)
 */

// ═══════════════════════════════════════════════════════════

// ── View (output) panel toggle ────────────────────────────
let viewCollapsed = false;
let viewSavedWidth = 440;
function toggleViewPanel() {
  viewCollapsed = !viewCollapsed;
  const panel = document.getElementById('panel');
  const btn = document.getElementById('view-toggle-btn');
  if (viewCollapsed) {
    viewSavedWidth = panel.offsetWidth;
    panel.classList.add('collapsed');
    btn.innerHTML = '&#10095;';
    btn.title = 'Show View panel';
  } else {
    panel.classList.remove('collapsed');
    panel.style.width = viewSavedWidth + 'px';
    btn.innerHTML = '&#10094;';
    btn.title = 'Hide View panel';
  }
  setTimeout(() => { if(typeof Blockly !== 'undefined') Blockly.svgResize(workspace); }, 250);
}

// ── Simulator panel toggle ────────────────────────────────
let simCollapsed = false;
let simSavedWidth = 340;
function toggleSimPanel() {
  simCollapsed = !simCollapsed;
  const sp = document.getElementById('sim-panel');
  const btn = document.getElementById('sim-toggle-btn');
  if (simCollapsed) {
    simSavedWidth = sp.offsetWidth;
    sp.classList.add('collapsed');
    if (btn) { btn.innerHTML = '&#10094;'; btn.title = 'Show Simulator'; }
  } else {
    sp.classList.remove('collapsed');
    sp.style.width = simSavedWidth + 'px';
    if (btn) { btn.innerHTML = '&#10095;'; btn.title = 'Hide Simulator'; }
  }
  setTimeout(() => { if(typeof Blockly !== 'undefined') Blockly.svgResize(workspace); }, 250);
}

// ── Resize handles ────────────────────────────────────────
function initResizeHandle(handleId, targetId, side) {
  // side: 'left' = resize panel to the right of handle (shrink left-pane),
  //       'right' = resize panel itself
  const handle = document.getElementById(handleId);
  if (!handle) return;
  let startX, startY, startW, startH, isVert = false;

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    const main = document.getElementById('main');
    const rect = main.getBoundingClientRect();
    isVert = window.innerWidth <= 900;
    if (isVert) {
      startY = e.clientY;
      startH = target.offsetHeight;
    } else {
      startX = e.clientX;
      startW = target.offsetWidth;
    }
    handle.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = isVert ? 'row-resize' : 'col-resize';

    function onMove(ev) {
      const target2 = document.getElementById(targetId);
      if (isVert) {
        const dy = ev.clientY - startY;
        const newH = Math.max(80, Math.min(window.innerHeight * 0.7, startH + dy));
        target2.style.height = newH + 'px';
      } else {
        const dx = startX - ev.clientX; // dragging left = grow target
        const newW = Math.max(180, Math.min(window.innerWidth * 0.55, startW + dx));
        target2.style.width = newW + 'px';
      }
      if(typeof Blockly !== 'undefined') Blockly.svgResize(workspace);
    }
    function onUp() {
      handle.classList.remove('dragging');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Touch support
  handle.addEventListener('touchstart', e => {
    const t = e.touches[0];
    isVert = window.innerWidth <= 900;
    const target = document.getElementById(targetId);
    if (isVert) { startY = t.clientY; startH = target.offsetHeight; }
    else { startX = t.clientX; startW = target.offsetWidth; }
    handle.classList.add('dragging');

    function onTMove(ev) {
      const t2 = ev.touches[0];
      const target2 = document.getElementById(targetId);
      if (isVert) {
        const newH = Math.max(80, Math.min(window.innerHeight * 0.7, startH + t2.clientY - startY));
        target2.style.height = newH + 'px';
      } else {
        const newW = Math.max(180, Math.min(window.innerWidth * 0.55, startW + startX - t2.clientX));
        target2.style.width = newW + 'px';
      }
      if(typeof Blockly !== 'undefined') Blockly.svgResize(workspace);
    }
    function onTEnd() {
      handle.classList.remove('dragging');
      handle.removeEventListener('touchmove', onTMove);
      handle.removeEventListener('touchend', onTEnd);
    }
    handle.addEventListener('touchmove', onTMove, {passive:true});
    handle.addEventListener('touchend', onTEnd);
  }, {passive:true});
}

// Init both handles: dragging resize-panel resizes #panel; dragging resize-sim resizes #sim-panel
initResizeHandle('resize-panel', 'panel', 'left');
initResizeHandle('resize-sim', 'sim-panel', 'left');

// ── Window resize: re-trigger Blockly resize ──────────────
window.addEventListener('resize', () => {
  if(typeof Blockly !== 'undefined') setTimeout(() => Blockly.svgResize(workspace), 50);
});

// ═══════════════════════════════════════════════════════════
//  INIT BLOCKLY
// ═══════════════════════════════════════════════════════════
