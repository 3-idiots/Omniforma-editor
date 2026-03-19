/*
 * serial-monitor.js
 * Serial monitor display and user input handling.
 *
 * serialAppend(text, cls)
 *   Adds a coloured line to the monitor display.
 *   cls: 'rx' (MCU output, green) | 'tx' (user input, blue) | 'sys' (grey)
 *
 * serialTimestamp()
 *   Returns an HTML timestamp span when timestamps are enabled.
 *
 * serialSend()
 *   Reads the input field, displays TX, pushes chars into serialTxQueue,
 *   triggers an immediate simStep if the simulator is running.
 *
 * serialQuick(msg) - sets the input to msg and calls serialSend()
 * simulateMCUResponse(msg) - built-in STATUS/RESET fallback responses
 * serialClear()    - clears the monitor log and resets byte counters
 * serialExport()   - downloads the log as serial_log.txt
 * serialToggleTimestamp(on) - enables/disables the HH:MM:SS.mmm prefix
 * serialSetBaud(v) - updates the baud rate display label
 *
 * Note: serialTxQueue, serialRxCount, serialTxCount, serialBaud, and
 * serialBuffer are declared in simulator-core.js as shared state.
 *
 * Depends on: simulator-core.js (serialTxQueue, simRunning, simStep)
 */

function serialAppend(text, cls='rx') {
  const el = document.getElementById("serial-monitor");
  if (!el) return;
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line && lines.length > 1) continue;
    const cssClass = cls === 'rx' ? 'serial-rx' : cls === 'tx' ? 'serial-tx' : cls === 'sys' ? 'serial-sys' : 'serial-rx';
    const entry = `<div class="${cssClass}">${serialTimestamp()}${escapeHtml(line)}</div>`;
    el.innerHTML += entry;
    serialBuffer.push(entry);
    if (serialBuffer.length > 500) { serialBuffer.shift(); }
    serialRxCount += line.length;
  }
  const rxEl = document.getElementById('serial-rx-count');
  if (rxEl) rxEl.textContent = serialRxCount;
  const autoEl = document.getElementById('serial-autoscroll');
  if (!autoEl || autoEl.checked) el.scrollTop = el.scrollHeight;
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function serialSend() {
  const el = document.getElementById("serial-input");
  if (!el || !el.value.trim()) return;
  const msg = el.value.trim();
  const lineEndSel = document.getElementById("serial-line-end");
  const lineEnd = lineEndSel ? lineEndSel.value : 'nl';
  let suffix = '';
  if (lineEnd === 'nl') suffix = '\n';
  else if (lineEnd === 'cr') suffix = '\r';
  else if (lineEnd === 'both') suffix = '\r\n';

  // Show TX in monitor
  const mon = document.getElementById("serial-monitor");
  const suffixDisplay = suffix ? `<span style="color:#444;">\\${lineEnd === 'nl' ? 'n' : lineEnd === 'cr' ? 'r' : 'r\\n'}</span>` : '';
  const txEntry = `<div class="serial-tx">${serialTimestamp()}&gt; ${escapeHtml(msg)}${suffixDisplay}</div>`;
  mon.innerHTML += txEntry;
  serialTxCount += msg.length;
  const txEl = document.getElementById('serial-tx-count');
  if (txEl) txEl.textContent = serialTxCount;

  // Push every character (+ line ending) into the MCU's RX queue
  const fullMsg = msg + suffix;
  for (const ch of fullMsg) serialTxQueue.push(ch);

  // If the sim is running, trigger an immediate loop step so the MCU
  // processes the incoming bytes right away (don't wait for the next tick)
  if (simRunning && simLoopStmts.length) {
    simStep();
    updateSimUI();
  } else if (!simRunning) {
    // Sim not running — fall back to the built-in response handler
    simulateMCUResponse(msg);
  }

  const autoEl = document.getElementById('serial-autoscroll');
  if (!autoEl || autoEl.checked) mon.scrollTop = mon.scrollHeight;
  el.value = "";
}

function serialQuick(msg) {
  const el = document.getElementById("serial-input");
  if (el) { el.value = msg; serialSend(); }
}

function simulateMCUResponse(msg) {
  // Only used when the sim is NOT running — provide basic built-in responses
  const upper = msg.toUpperCase().trim();
  if (upper === 'STATUS' || upper === '?') {
    const pinStates = [];
    for (let i = 0; i < Math.min(currentBoard.digital, 6); i++) {
      if (simPins[i] && simPins[i].mode !== 'OFF')
        pinStates.push(`D${i}:${simPins[i].value||'LOW'}`);
    }
    serialAppend(`STATUS: ${pinStates.join(' | ') || 'No active pins'} | Tick:${simTick}`, 'rx');
    return;
  }
  if (upper === 'RESET') { simReset(); serialAppend(`[MCU reset]`, 'sys'); return; }
  serialAppend(`[MCU not running — start the simulator first]`, 'sys');
}

// also clear the TX queue on reset
function serialClear() {
  const el = document.getElementById("serial-monitor");
  if (el) el.innerHTML = '';
  serialBuffer = [];
  serialRxCount = 0; serialTxCount = 0;
  const rxEl = document.getElementById('serial-rx-count');
  const txEl = document.getElementById('serial-tx-count');
  if (rxEl) rxEl.textContent = 0;
  if (txEl) txEl.textContent = 0;
}

function serialExport() {
  if (!serialBuffer.length) { setStatus('Serial monitor is empty','error'); return; }
  // Strip HTML tags for export
  const tmp = document.createElement('div');
  tmp.innerHTML = serialBuffer.join('\n');
  const txt = tmp.textContent || tmp.innerText;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], {type:'text/plain'}));
  a.download = 'serial_log.txt'; a.click();
}

function serialToggleTimestamp(on) { serialShowTimestamp = on; }

function serialSetBaud(v) {
  serialBaud = parseInt(v);
  const lbl = document.getElementById('serial-baud-label');
  if (lbl) lbl.textContent = `${v} baud`;
  serialAppend(`[Baud rate changed to ${v}]`, 'sys');
}

// ── hook compile() to also update simulator ───────────────
const _origCompile = compile;
compile = function() {
  _origCompile();
  // after compile, rebuild sim program from new C++ — but NOT while sim is running
  // (rebuilding mid-run would clobber simVars/globals and corrupt state)
  setTimeout(() => {
    if (simRunning) return;  // ← skip rebuild entirely while sim is running
    const cppEl = document.getElementById("out-cpp");
    if (!cppEl) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = cppEl.innerHTML;
    const cpp = tmp.querySelector("pre") ? tmp.querySelector("pre").textContent : tmp.textContent;
    if (cpp && cpp.trim()) {
      initSimPins();
      buildSimProgram(cpp);
      renderPinTable();
      renderAnalogTable();
      renderBoardSVG(currentBoardKey);
    }
  }, 100);
};

// ═══════════════════════════════════════════════════════════
//  PANEL TOGGLE & RESIZE
