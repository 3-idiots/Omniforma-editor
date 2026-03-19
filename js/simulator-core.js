/*
 * simulator-core.js
 * Simulation engine: state variables, program builder, and executor.
 *
 * State variables (shared with simulator-ui.js and serial-monitor.js)
 *   simPins, simAnalog, simVars, simLoopStmts, simSetupStmts
 *   simGlobalInits  - initial global values, applied at Run time only
 *   serialTxQueue   - character FIFO for Serial.read() simulation
 *   serialRxCount, serialTxCount, serialBaud, serialBuffer, etc.
 *   analogWaveActive, analogWaveTimer, analogWaveType
 *
 * parseSimStmts(lines, pinMap) -> stmt[]
 *   Parses C++ function body lines into executable statement objects.
 *   Handles: if/else, while, for (all increment forms), digitalWrite,
 *   analogWrite, delay, Serial.begin/print/println/read, declarations.
 *
 * buildSimProgram(cpp)
 *   Extracts pin map, global initialisers (stored in simGlobalInits,
 *   not in simVars), pinMode calls, setup() and loop() stmts from C++.
 *
 * runSimSetup()
 *   Applies simGlobalInits to simVars, then executes setup() once.
 *
 * resolveSerialMsg(raw) -> string
 *   Resolves a serial message expression using simVars.
 *
 * simEvalCond(cond) -> boolean
 *   Evaluates a condition with Serial.available() queue-length support.
 *
 * execSimStmt(stmt)
 *   Dispatches on stmt.op and executes it. Recursively handles
 *   nested if/while/for bodies.
 *
 * simEval(expr) -> value
 *   Evaluates a C++ expression substituting simVars, Serial.available(),
 *   Serial.read(), analogRead(), and digitalRead().
 *
 * simStep()
 *   Executes one loop statement, increments simTick, calls updateSimUI.
 *
 * Depends on: boards.js (currentBoard), serial-monitor.js (serialAppend)
 */

// ═══════════════════════════════════════════════════════════
let simPins  = {};   // { 0: {mode:'OUTPUT',value:'LOW',pwm:0}, ... }
let simAnalog = {};  // { 0: 512, 1: 0, ... }
let simVars  = {};   // { varName: value }
let simRunning = false;
let simTimer = null;
let simSpeed = 1000;  // ms per loop tick
let simTick  = 0;
let simLoopStmts = [];
let simSetupDone = false;
let simGlobalInits = {};  // global variable initial values, applied at sim start
let serialLog = [];

// analog wave generator state
let analogWaveActive = false, analogWaveTimer = null, analogWavePhase = 0;
let analogWaveType = "sine";

// serial monitor state
let serialRxCount = 0, serialTxCount = 0;
let serialShowTimestamp = false;
let serialBaud = 9600;
let serialBuffer = [];

function initSimPins() {
  simPins = {};
  for (let i = 0; i < currentBoard.digital; i++) {
    simPins[i] = { mode: "OFF", value: "LOW", pwm: 0 };
  }
  simAnalog = {};
  for (let i = 0; i < currentBoard.analog; i++) {
    simAnalog[i] = 0;
  }
  simVars = {};
}

// ── build the simulation program from compiled C++ ────────
let simSetupStmts = [];  // statements from void setup()

function parseSimStmts(lines, pinMap) {
  const stmts = [];
  let i = 0;

  while (i < lines.length) {
    const t = lines[i].trim();
    i++;
    if (!t || t.startsWith("//")) continue;

    // ── if (cond) { ... } [else { ... }] ──
    const ifM = t.match(/^if\s*\((.+)\)\s*\{?$/);
    if (ifM) {
      const cond = ifM[1].trim();
      // collect then-body lines until matching }
      const thenLines = [], elseLines = [];
      let depth = t.endsWith("{") ? 1 : 0;
      if (depth === 0 && i < lines.length && lines[i].trim() === "{") { depth = 1; i++; }
      while (i < lines.length && depth > 0) {
        const ln = lines[i]; i++;
        const lt = ln.trim();
        if (lt === "{") { depth++; continue; }
        if (lt === "}") { depth--; if (depth === 0) break; }
        if (depth > 0) thenLines.push(lt);
      }
      // peek for else
      let elseIdx = i;
      if (elseIdx < lines.length && lines[elseIdx].trim().startsWith("} else") || (elseIdx < lines.length && lines[elseIdx].trim() === "else {")) {
        i = elseIdx + 1; depth = 1;
        while (i < lines.length && depth > 0) {
          const ln = lines[i]; i++;
          const lt = ln.trim();
          if (lt === "{") { depth++; continue; }
          if (lt === "}") { depth--; if (depth === 0) break; }
          if (depth > 0) elseLines.push(lt);
        }
      }
      stmts.push({
        op:   "if",
        cond:  cond,
        then:  parseSimStmts(thenLines, pinMap),
        else:  parseSimStmts(elseLines, pinMap),
      });
      continue;
    }

    // ── while (cond) { ... } ──
    const whileM = t.match(/^while\s*\((.+)\)\s*\{?$/);
    if (whileM) {
      const cond = whileM[1].trim();
      const bodyLines = [];
      let depth = t.endsWith("{") ? 1 : 0;
      if (depth === 0 && i < lines.length && lines[i].trim() === "{") { depth = 1; i++; }
      while (i < lines.length && depth > 0) {
        const ln = lines[i]; i++;
        const lt = ln.trim();
        if (lt === "{") { depth++; continue; }
        if (lt === "}") { depth--; if (depth === 0) break; }
        if (depth > 0) bodyLines.push(lt);
      }
      stmts.push({ op:"while", cond, body: parseSimStmts(bodyLines, pinMap) });
      continue;
    }

    // ── for (init; cond; incr) { ... } ──
    // Matches: for (int i = 0; i < N; i++) {
    //          for (int i = 0; i < N; i += M) {
    const forM = t.match(/^for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*([^;]+);\s*([^;]+);\s*(.+?)\s*\)\s*\{?$/);
    if (forM) {
      const [, varName, initExpr, condExpr, incrExpr] = forM;
      const bodyLines = [];
      let depth = t.endsWith("{") ? 1 : 0;
      if (depth === 0 && i < lines.length && lines[i].trim() === "{") { depth = 1; i++; }
      while (i < lines.length && depth > 0) {
        const ln = lines[i]; i++;
        const lt = ln.trim();
        if (lt === "{") { depth++; continue; }
        if (lt === "}") { depth--; if (depth === 0) break; }
        if (depth > 0) bodyLines.push(lt);
      }
      stmts.push({
        op: "for",
        var: varName,
        init: initExpr.trim(),
        cond: condExpr.trim(),
        incr: incrExpr.trim(),
        body: parseSimStmts(bodyLines, pinMap),
      });
      continue;
    }

    // ── skip lone braces ──
    if (t === "{" || t === "}") continue;

    // ── digitalWrite(PIN, HIGH/LOW) ──
    const dw = t.match(/^digitalWrite\((\w+),\s*(HIGH|LOW)\);$/);
    if (dw) {
      const pin = pinMap[dw[1]] !== undefined ? pinMap[dw[1]] : parseInt(dw[1]);
      if (!isNaN(pin)) { stmts.push({op:"dw", pin, val:dw[2]}); continue; }
    }

    // ── analogWrite(PIN, val) ──
    const aw = t.match(/^analogWrite\((\w+),\s*(.+)\);$/);
    if (aw) {
      const pin = pinMap[aw[1]] !== undefined ? pinMap[aw[1]] : parseInt(aw[1]);
      if (!isNaN(pin)) { stmts.push({op:"aw", pin, valExpr:aw[2]}); continue; }
    }

    // ── delay(ms) ──
    const dl = t.match(/^delay\((.+)\);$/);
    if (dl) { stmts.push({op:"delay", msExpr:dl[1]}); continue; }

    // ── Serial.begin(baud) ──
    const sb = t.match(/^Serial\.begin\((\d+)\);$/);
    if (sb) { stmts.push({op:"serial_begin", baud:parseInt(sb[1])}); continue; }

    // ── Serial.println(expr) ──
    const sp = t.match(/^Serial\.println\((.+)\);$/);
    if (sp) { stmts.push({op:"serial", msg:sp[1]}); continue; }

    // ── Serial.print(expr) ──
    const spr = t.match(/^Serial\.print\((.+)\);$/);
    if (spr) { stmts.push({op:"serial_print", msg:spr[1]}); continue; }

    // ── var = Serial.read() ──
    const srRead = t.match(/^(?:char|int|auto|String)\s+(\w+)\s*=\s*Serial\.read\(\);$/);
    if (srRead) { stmts.push({op:"serial_read_var", name:srRead[1]}); continue; }

    // ── typed/auto variable declaration ──
    const vd = t.match(/^(?:int|auto|float|bool|unsigned long|long|char|String)\s+(\w+)\s*=\s*(.+);$/);
    if (vd) { stmts.push({op:"setvar", name:vd[1], expr:vd[2]}); continue; }

    // ── augmented assignment ──
    const vau = t.match(/^(\w+)\s*([+\-*\/]?=)\s*(.+);$/);
    if (vau && !t.includes("==")) {
      if (vau[2] === "=") stmts.push({op:"setvar", name:vau[1], expr:vau[3]});
      else                stmts.push({op:"augvar", name:vau[1], op2:vau[2], expr:vau[3]});
      continue;
    }
  }
  return stmts;
}

function buildSimProgram(cpp) {
  simLoopStmts  = [];
  simSetupStmts = [];
  simSetupDone  = false;
  simGlobalInits = {};

  // ── 1. extract const int PIN_NAME = N declarations ──
  const pinDecls = [...cpp.matchAll(/const int (\w+)\s*=\s*(\d+);/g)];
  const pinMap = {};
  for (const m of pinDecls) pinMap[m[1]] = parseInt(m[2]);

  // ── 2. parse plain globals (int x = 0) — store as inits, don't touch simVars yet ──
  const globalDecls = [...cpp.matchAll(/^(?:int|float|bool|unsigned long|long)\s+(\w+)\s*=\s*([^;]+);/gm)];
  for (const m of globalDecls) {
    if (pinMap[m[1]] !== undefined) continue;  // skip pin constants
    try { simGlobalInits[m[1]] = eval(m[2]); } catch(e) { simGlobalInits[m[1]] = 0; }
  }

  // ── 3. extract pinMode calls → set pin modes ──
  const pmCalls = [...cpp.matchAll(/pinMode\((\w+),\s*(OUTPUT|INPUT(?:_PULLUP)?)\)/g)];
  for (const m of pmCalls) {
    const num = pinMap[m[1]] !== undefined ? pinMap[m[1]] : parseInt(m[1]);
    if (!isNaN(num) && simPins[num]) {
      simPins[num].mode = m[2] === "OUTPUT" ? "OUTPUT" : "INPUT";
    }
  }

  // ── 4. parse void setup() body ──
  const setupMatch = cpp.match(/void setup\s*\(\s*\)\s*\{([\s\S]*?)\n\}/m);
  if (setupMatch) {
    const setupLines = setupMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
    simSetupStmts = parseSimStmts(setupLines, pinMap);
  }

  // ── 5. parse void loop() body ──
  const loopMatch = cpp.match(/void loop\s*\(\s*\)\s*\{([\s\S]*?)\n\}/m);
  if (loopMatch) {
    const loopLines = loopMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
    simLoopStmts = parseSimStmts(loopLines, pinMap);
  }
}

// ── Serial TX queue — bytes sent FROM the user TO the MCU ─
let serialTxQueue = [];  // array of individual characters waiting to be read by Serial.read()

// ── execute all setup() statements immediately (once) ─────
function runSimSetup() {
  if (simSetupDone) return;
  simSetupDone = true;
  // Load global initial values into simVars NOW (at sim start, not at build time)
  // so they don't get clobbered by auto-recompile while the sim is running
  for (const [k, v] of Object.entries(simGlobalInits)) {
    simVars[k] = v;
  }
  for (const stmt of simSetupStmts) {
    execSimStmt(stmt);
  }
  updateSimUI();
}

// ── resolve a serial message expression to a display string ─
function resolveSerialMsg(raw) {
  let msg = raw.trim();
  // strip surrounding quotes → literal string
  if (/^".*"$/.test(msg)) return msg.slice(1, -1);
  // it's a variable or expression — resolve it
  const val = simVars[msg];
  if (val !== undefined) return String(val);
  // try evaluating as expression
  try {
    let expr = msg;
    for (const [k, v] of Object.entries(simVars)) {
      expr = expr.replace(new RegExp(`\\b${k}\\b`, "g"), JSON.stringify(v));
    }
    const result = eval(expr);
    return String(result);
  } catch(e) {}
  return msg; // fallback: show raw expression
}

// ── evaluate a condition in sim context ──────────────────
function simEvalCond(cond) {
  let c = cond.trim();
  // Serial.available() > 0  →  check the TX queue
  c = c.replace(/Serial\.available\(\)\s*>\s*0/g, () => serialTxQueue.length > 0 ? "true" : "false");
  c = c.replace(/Serial\.available\(\)/g, () => String(serialTxQueue.length));
  // replace known variables
  for (const [k, v] of Object.entries(simVars)) {
    c = c.replace(new RegExp(`\\b${k}\\b`, "g"), JSON.stringify(v));
  }
  // boolean keywords
  c = c.replace(/\btrue\b/g, "true").replace(/\bfalse\b/g, "false");
  try { return !!eval(c); } catch(e) { return false; }
}

// ── execute a single sim statement (recursive for if/while) ─
function execSimStmt(stmt) {
  switch (stmt.op) {

    case "dw":
      if (simPins[stmt.pin]) {
        simPins[stmt.pin].value = stmt.val;
        simPins[stmt.pin].mode  = "OUTPUT";
      }
      break;

    case "aw":
      if (simPins[stmt.pin]) {
        const v = typeof stmt.valExpr === "string" ? simEval(stmt.valExpr) : stmt.val;
        simPins[stmt.pin].pwm  = parseInt(v) || 0;
        simPins[stmt.pin].mode = "PWM";
      }
      break;

    case "serial_begin":
      serialBaud = stmt.baud;
      { const lbl = document.getElementById("serial-baud-label");
        if (lbl) lbl.textContent = stmt.baud + " baud"; }
      { const sel = document.getElementById("serial-baud-sel");
        if (sel) sel.value = String(stmt.baud); }
      serialAppend(`[Serial.begin(${stmt.baud}) — port open]`, "sys");
      break;

    case "serial":
      serialAppend(resolveSerialMsg(stmt.msg), "rx");
      break;

    case "serial_print":
      serialAppend(resolveSerialMsg(stmt.msg), "rx");
      break;

    case "serial_read_var":
      // consume one character from the TX queue
      if (serialTxQueue.length > 0) {
        simVars[stmt.name] = serialTxQueue.shift();
      } else {
        simVars[stmt.name] = "";   // nothing in buffer
      }
      break;

    case "setvar":
      simVars[stmt.name] = simEval(stmt.expr);
      break;

    case "addvar":
      simVars[stmt.name] = (simVars[stmt.name] || 0) + simEval(stmt.expr);
      break;

    case "augvar": {
      const cur = simVars[stmt.name] || 0;
      const rhs = simEval(stmt.expr);
      if      (stmt.op2 === "+=") simVars[stmt.name] = cur + rhs;
      else if (stmt.op2 === "-=") simVars[stmt.name] = cur - rhs;
      else if (stmt.op2 === "*=") simVars[stmt.name] = cur * rhs;
      else if (stmt.op2 === "/=") simVars[stmt.name] = rhs !== 0 ? cur / rhs : 0;
      break;
    }

    case "if":
      if (simEvalCond(stmt.cond)) {
        for (const s of (stmt.then || [])) execSimStmt(s);
      } else {
        for (const s of (stmt.else || [])) execSimStmt(s);
      }
      break;

    case "for": {
      // Execute: init → while(cond) { body; incr }
      // Parse and set the init variable
      const initVal = simEval(stmt.init);
      simVars[stmt.var] = initVal;
      // Guard against infinite loops
      let forGuard = 0;
      while (forGuard++ < 100000) {
        // Evaluate condition — substitute loop var
        let condExpr = stmt.cond;
        // replace known vars including the loop counter
        for (const [k, v] of Object.entries(simVars)) {
          condExpr = condExpr.replace(new RegExp(`\\b${k}\\b`, "g"), JSON.stringify(v));
        }
        let condResult = false;
        try { condResult = !!eval(condExpr); } catch(e) { break; }
        if (!condResult) break;
        // Execute body
        for (const s of (stmt.body || [])) execSimStmt(s);
        // Execute increment: i++ → i += 1,  i-- → i -= 1,  i += M → i += M
        const inc = stmt.incr.trim();
        if (/^\w+\+\+$/.test(inc)) {
          simVars[stmt.var] = (simVars[stmt.var] || 0) + 1;
        } else if (/^\w+--$/.test(inc)) {
          simVars[stmt.var] = (simVars[stmt.var] || 0) - 1;
        } else {
          const incrM = inc.match(/^(\w+)\s*([+\-*\/])=\s*(.+)$/);
          if (incrM) {
            const rhs = simEval(incrM[3]);
            const cur = simVars[incrM[1]] || 0;
            if      (incrM[2] === "+") simVars[incrM[1]] = cur + rhs;
            else if (incrM[2] === "-") simVars[incrM[1]] = cur - rhs;
            else if (incrM[2] === "*") simVars[incrM[1]] = cur * rhs;
            else if (incrM[2] === "/") simVars[incrM[1]] = rhs !== 0 ? cur / rhs : 0;
          }
        }
      }
      break;
    }

    case "while": {
      // max iterations guard to prevent infinite loops in the sim
      let guard = 0;
      while (simEvalCond(stmt.cond) && guard++ < 100000) {
        for (const s of (stmt.body || [])) execSimStmt(s);
      }
      break;
    }

    case "delay":
      // delays are skipped in the simulator (each simStep tick represents one loop pass)
      break;

    default:
      break;
  }
}

// ── eval a simple expression in sim context ────────────────
function simEval(expr) {
  expr = expr.trim();
  if (expr === "HIGH") return "HIGH";
  if (expr === "LOW")  return "LOW";
  if (expr === "true") return true;
  if (expr === "false") return false;
  // Serial.available() → queue length
  expr = expr.replace(/Serial\.available\(\)/g, () => String(serialTxQueue.length));
  // Serial.read() → consume one char from queue
  expr = expr.replace(/Serial\.read\(\)/g, () => {
    if (serialTxQueue.length > 0) return JSON.stringify(serialTxQueue.shift());
    return '""';
  });
  // replace analogRead(N) with simAnalog value
  expr = expr.replace(/analogRead\((\d+)\)/g, (_, n) => simAnalog[parseInt(n)] || 0);
  // replace digitalRead(pin) → 0 or 1
  expr = expr.replace(/digitalRead\((\w+)\)/g, (_, p) => {
    const num = parseInt(p);
    if (!isNaN(num) && simPins[num]) return simPins[num].value === "HIGH" ? 1 : 0;
    return 0;
  });
  // replace known var names with their values
  for (const [k, v] of Object.entries(simVars)) {
    expr = expr.replace(new RegExp(`\\b${k}\\b`, "g"), JSON.stringify(v));
  }
  try { return eval(expr); } catch(e) { return 0; }
}

let simStmtIdx = 0;
let simDelayRemaining = 0;

function simStep() {
  if (!simLoopStmts.length) return;
  if (simStmtIdx >= simLoopStmts.length) simStmtIdx = 0;

  const stmt = simLoopStmts[simStmtIdx];
  simStmtIdx++;

  execSimStmt(stmt);

  simTick++;
  updateSimUI();
}
