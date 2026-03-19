/*
 * ui.js
 * Mode switching, warning modal, and MicroPython text editor toolbar.
 *
 * setMode(m)
 *   Switches between 'blocks' and 'text' modes with a modal warning
 *   if the current content would be lost.
 *
 * _applyMode(m)
 *   Performs the actual switch. Converts blocks to MicroPython on entry
 *   to text mode; resets the workspace when returning to block mode.
 *
 * _openModal / modalCancel / modalConfirm
 *   Warning modal management for both switch directions.
 *
 * editorUpdateLineNumbers()
 *   Rebuilds the line-number gutter to match the textarea content.
 *
 * setBadge(type, msg)
 *   Updates the compile status pill at the bottom of the editor.
 *
 * editorShowError(msg)
 *   Shows or hides the inline error bar below the editor toolbar.
 *
 * editorCompileAndRun()
 *   Compiles the text editor content and pushes it into the simulator.
 *
 * editorFormat()
 *   Auto-indents the file based on Python block structure.
 *
 * editorToggleComment()
 *   Toggles # comments on the selected lines (Ctrl+/).
 *
 * editorInsertSnippet(key)
 *   Inserts a preset MicroPython code snippet at the cursor position.
 *
 * Keyboard event listeners for the textarea (Tab, Ctrl+Enter, Ctrl+/,
 * Enter auto-indent, live debounced compile) are also registered here.
 *
 * Depends on: compiler.js, emitter-micropython.js, simulator-core.js
 */

function setMode(m){
  if (m === currentMode) return;

  if (m === "text" && currentMode === "blocks") {
    const blocks = workspaceToBlocks();
    if (blocks.length > 0) {
      _openModal("text",
        "Switch to MicroPython Text Editor?",
        "Your block workspace will be <strong>converted to MicroPython code</strong> and loaded into the text editor.",
        "⚠️ The block workspace will be cleared. Switching back to Blocks will reset it — your text edits will not be preserved as blocks.",
        "Cancel — Keep Blocks",
        "Yes, Switch to Text Editor"
      );
      return;
    }
  }

  if (m === "blocks" && currentMode === "text") {
    const src = document.getElementById("mcu-editor").value.trim();
    if (src.length > 0) {
      _openModal("blocks",
        "Switch back to Block Editor?",
        "Your <strong>MicroPython code will be discarded</strong> and the block workspace will be restored to its default state.",
        "⚠️ Any code written in the text editor cannot be automatically converted back to blocks and will be lost.",
        "Cancel — Keep Code",
        "Yes, Switch to Blocks"
      );
      return;
    }
  }

  _applyMode(m);
}

let _pendingMode = null;
function _openModal(targetMode, title, desc, note, cancelLabel, confirmLabel) {
  _pendingMode = targetMode;
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-desc").innerHTML = desc;
  document.getElementById("modal-note").textContent = note;
  document.getElementById("mode-modal-overlay").querySelector(".modal-btn-cancel").textContent = cancelLabel;
  document.getElementById("modal-confirm-btn").textContent = confirmLabel;
  document.getElementById("mode-modal-overlay").classList.add("open");
}

function _applyMode(m) {
  currentMode = m;
  document.getElementById("btn-blocks").classList.toggle("active", m === "blocks");
  document.getElementById("btn-text").classList.toggle("active", m === "text");
  document.getElementById("blockly-div").style.display = m === "blocks" ? "block" : "none";
  document.getElementById("text-editor-pane").style.display = m === "text" ? "flex" : "none";

  if (m === "text") {
    try {
      const blocks = workspaceToBlocks();
      if (blocks.length) {
        const src = blocksToMicroPython(blocks);
        if (src.trim()) {
          document.getElementById("mcu-editor").value = src;
          editorUpdateLineNumbers();
        }
      }
    } catch(e) {}
    document.getElementById("mcu-editor").focus();
    editorUpdateLineNumbers();
    updateCursor();
    setBadge("idle", "Not compiled");
    setStatus("MicroPython editor active — Ctrl+Enter to compile");
  }

  if (m === "blocks") {
    // Clear text editor, restore starter blocks
    document.getElementById("mcu-editor").value = "";
    placeStarterBlocks();
    setTimeout(() => { if (typeof Blockly !== "undefined") Blockly.svgResize(workspace); }, 50);
    setStatus("Block editor active");
  }
}

// Modal handlers
function modalCancel(e) {
  if (e && e.target !== document.getElementById("mode-modal-overlay")) return;
  _pendingMode = null;
  document.getElementById("mode-modal-overlay").classList.remove("open");
}
function modalConfirm() {
  document.getElementById("mode-modal-overlay").classList.remove("open");
  const target = _pendingMode;
  _pendingMode = null;
  _applyMode(target);
}

// ── Enhanced text editor ──────────────────────────────────
function editorUpdateLineNumbers() {
  const ed = document.getElementById("mcu-editor");
  const ln = document.getElementById("line-numbers");
  if (!ed || !ln) return;
  const lines = ed.value.split("\n").length;
  ln.innerHTML = Array.from({length: lines}, (_, i) => i + 1).join("<br>");
  // sync scroll
  ln.scrollTop = ed.scrollTop;
}

function setBadge(type, msg) {
  const b = document.getElementById("compile-status-badge");
  if (!b) return;
  b.textContent = msg;
  b.className = "compile-status-badge " + (type === "ok" ? "csb-ok" : type === "err" ? "csb-err" : "csb-idle");
}

function editorShowError(msg) {
  const bar = document.getElementById("editor-error-bar");
  if (!bar) return;
  if (msg) { bar.textContent = "⚠ " + msg; bar.style.display = "block"; }
  else { bar.style.display = "none"; }
}

function editorCompileAndRun() {
  editorShowError(null);
  try {
    compile();
    // Check if compilation produced errors (panel-error-bar visible = errors/warnings)
    const errBar = document.getElementById("panel-error-bar");
    const errMsg = document.getElementById("panel-error-msg");
    if (errBar && errBar.style.display !== "none" && errMsg && errMsg.textContent) {
      // Mirror first error line into the editor's inline error bar
      const firstLine = errMsg.textContent.split("\n")[0];
      editorShowError(firstLine);
      setBadge("err", "Errors — see panel");
      return;
    }
    setBadge("ok", "✓ Compiled OK");
    // Push into simulator
    const cppEl = document.getElementById("out-cpp");
    if (cppEl) {
      const tmp = document.createElement("div");
      tmp.innerHTML = cppEl.innerHTML;
      const cpp = tmp.textContent;
      if (cpp.trim() && !simRunning) {
        initSimPins();
        buildSimProgram(cpp);
        renderPinTable();
        renderAnalogTable();
        renderBoardSVG(currentBoardKey);
        serialAppend("[Compiled from text editor — ready to run]", "sys");
      }
    }
  } catch(e) {
    setBadge("err", "Error");
    editorShowError(e.message);
  }
}

function editorFormat() {
  const ed = document.getElementById("mcu-editor");
  if (!ed) return;
  const lines = ed.value.split("\n");
  const out = [];
  let indent = 0;
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { out.push(""); continue; }
    // dedent before else/elif/except/finally
    if (/^(else:|elif |except|finally:)/.test(trimmed)) indent = Math.max(0, indent - 1);
    out.push("    ".repeat(indent) + trimmed);
    // indent after : (def/if/else/for/while/with)
    if (trimmed.endsWith(":") && !trimmed.startsWith("#")) indent++;
    // dedent after return/break/continue/pass at current level
    if (/^(return|break|continue|pass)\b/.test(trimmed)) indent = Math.max(0, indent - 1);
  }
  ed.value = out.join("\n");
  editorUpdateLineNumbers();
  updateCursor();
  setStatus("Formatted");
}

function editorToggleComment() {
  const ed = document.getElementById("mcu-editor");
  if (!ed) return;
  const start = ed.selectionStart, end = ed.selectionEnd;
  const val = ed.value;
  // Find line boundaries
  const lineStart = val.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = val.indexOf("\n", end);
  const actualEnd = lineEnd === -1 ? val.length : lineEnd;
  const selectedLines = val.slice(lineStart, actualEnd).split("\n");
  const allCommented = selectedLines.every(l => l.trim().startsWith("#"));
  const toggled = selectedLines.map(l => {
    if (allCommented) return l.replace(/^(\s*)#\s?/, "$1");
    return l.replace(/^(\s*)/, "$1# ");
  });
  ed.value = val.slice(0, lineStart) + toggled.join("\n") + val.slice(actualEnd);
  ed.selectionStart = lineStart;
  ed.selectionEnd = lineStart + toggled.join("\n").length;
  editorUpdateLineNumbers();
}

const SNIPPETS = {
  setup: `def setup():\n    uart = UART(0, baudrate=9600)\n    print("Ready")\n`,
  loop:  `def loop():\n    pass\n`,
  dw:    `led_pin.value(1)   # HIGH\nled_pin.value(0)   # LOW\n`,
  dr:    `state = button_pin.value()  # reads 0 or 1\n`,
  ser:   `print("hello")          # → Serial via REPL\nuart.write("hello\\n")  # → UART TX\n`,
};

function editorInsertSnippet(key) {
  const ed = document.getElementById("mcu-editor");
  if (!ed) return;
  const snip = SNIPPETS[key] || "";
  const s = ed.selectionStart;
  ed.value = ed.value.slice(0, s) + snip + ed.value.slice(ed.selectionEnd);
  ed.selectionStart = ed.selectionEnd = s + snip.length;
  ed.focus();
  editorUpdateLineNumbers();
  updateCursor();
}

function clearAll(){
  document.getElementById("mcu-editor").value="";
  document.getElementById("out-mcu").innerHTML="";
  document.getElementById("out-cpp").innerHTML="";
  document.getElementById("out-asm").innerHTML="";
  document.getElementById("out-hex").innerHTML="";
  placeStarterBlocks();
  setStatus("Cleared — setup() and loop() blocks restored");
}
function downloadINO() {
  // Generate the Arduino .ino file (same as C++ output)
  let cpp;
  try {
    if (currentMode === "text") {
      const src = document.getElementById("mcu-editor").value;
      cpp = mcuSourceToCpp(src);
    } else {
      const blocks = workspaceToBlocks();
      if (!blocks.length) { setStatus("No blocks to export","error"); return; }
      cpp = blocksToCpp(blocks);
    }
  } catch(e) { setStatus("Export error: "+e.message,"error"); return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([cpp], {type:"text/plain"}));
  a.download = "sketch.ino"; a.click();
  setStatus("Downloaded sketch.ino");
}

function downloadPY() {
  // .py = MicroPython source code file
  let mcu;
  try {
    if (currentMode === "text") {
      mcu = document.getElementById("mcu-editor").value;
    } else {
      const blocks = workspaceToBlocks();
      if (!blocks.length) { setStatus("No blocks to export","error"); return; }
      mcu = blocksToMCU(blocks);
    }
    if (!mcu || !mcu.trim()) { setStatus("Nothing to save","error"); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([mcu], {type:"text/plain"}));
    a.download = "sketch.py"; a.click();
    setStatus("Downloaded sketch.py (MicroPython source)");
  } catch(e) { setStatus("Export error: "+e.message,"error"); }
}

function downloadHex(){
  if(!lastHex){
    // auto-compile first
    try { compile(); } catch(e) {}
    if (!lastHex) { setStatus("Compile failed — cannot export .hex","error"); return; }
  }
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([lastHex],{type:"text/plain"}));
  a.download="sketch.hex"; a.click();
  setStatus("Downloaded sketch.hex");
}

// ── Text editor event listeners ───────────────────────────
const ed=document.getElementById("mcu-editor");
ed.addEventListener("keydown",e=>{
  // Tab → 4 spaces
  if(e.key==="Tab"){
    e.preventDefault();
    const s=ed.selectionStart, end=ed.selectionEnd;
    if (s === end) {
      ed.value=ed.value.slice(0,s)+"    "+ed.value.slice(end);
      ed.selectionStart=ed.selectionEnd=s+4;
    } else {
      // indent selected lines
      const val = ed.value;
      const lineStart = val.lastIndexOf("\n", s-1)+1;
      const lineEnd = val.indexOf("\n", end); 
      const block = val.slice(lineStart, lineEnd===-1?val.length:lineEnd);
      const indented = block.split("\n").map(l => "    "+l).join("\n");
      ed.value = val.slice(0, lineStart) + indented + val.slice(lineEnd===-1?val.length:lineEnd);
    }
  }
  // Ctrl+Enter → compile & run
  if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();editorCompileAndRun();}
  // Ctrl+/ → toggle comment
  if(e.key==="/"&&(e.ctrlKey||e.metaKey)){e.preventDefault();editorToggleComment();}
  // Auto-indent on Enter
  if(e.key==="Enter"&&!e.ctrlKey&&!e.metaKey){
    e.preventDefault();
    const s=ed.selectionStart;
    const lineStart=ed.value.lastIndexOf("\n",s-1)+1;
    const currentLine=ed.value.slice(lineStart,s);
    const indentMatch=currentLine.match(/^(\s*)/);
    let indent=indentMatch?indentMatch[1]:"";
    // extra indent after :
    if(currentLine.trimEnd().endsWith(":")) indent+="    ";
    ed.value=ed.value.slice(0,s)+"\n"+indent+ed.value.slice(ed.selectionEnd);
    ed.selectionStart=ed.selectionEnd=s+1+indent.length;
  }
  editorUpdateLineNumbers();
});
ed.addEventListener("keyup",e=>{
  editorUpdateLineNumbers();
  updateCursor();
  // live compile on pause (debounced)
  clearTimeout(ed._compileTimer);
  ed._compileTimer = setTimeout(()=>{
    if(currentMode==="text" && ed.value.trim()){
      try { compile(); setBadge("ok","Compiled OK"); editorShowError(null); }
      catch(err){ setBadge("err","Error"); editorShowError(err.message); }
    }
  }, 900);
});
ed.addEventListener("click",e=>{updateCursor();});
ed.addEventListener("scroll",()=>{
  const ln=document.getElementById("line-numbers");
  if(ln) ln.scrollTop=ed.scrollTop;
});
function updateCursor(){
  const s=ed.selectionStart,txt=ed.value.slice(0,s);
  const ln=txt.split("\n").length, col=txt.split("\n").pop().length+1;
  document.getElementById("cursor-pos").textContent=`Ln ${ln}, Col ${col}`;
}
// Escape key closes modal
document.addEventListener("keydown", e=>{
  if(e.key==="Escape") document.getElementById("mode-modal-overlay").classList.remove("open");
});

// ═══════════════════════════════════════════════════════════
//  EXAMPLES
// ═══════════════════════════════════════════════════════════
