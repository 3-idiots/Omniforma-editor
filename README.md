# Omniforma Editor
### by 3 idiots

---

## Overview

Omniforma Editor is a browser-based visual programming environment for microcontrollers. It combines a drag-and-drop block editor, a MicroPython text editor, a multi-stage code compiler, a static validator, and a live pin-level simulator — all running entirely in the browser with no installation, no backend server, and no build tools required.

The project is built for students, hobbyists, and educators who want to program Arduino-family boards and MicroPython-capable devices without needing the Arduino IDE or a separate Python editor. The user snaps blocks together, sees the generated code in real time, catches errors before flashing, and simulates execution on a virtual board.
---
## Preview
    https://3-idiots.github.io/Omniforma-editor/
---

## Core Features

### 1. Visual Block Editor (Blockly)
A full Blockly workspace with a categorised toolbox covering 11 top-level groups. Every block category uses a distinct colour scheme. The workspace supports zoom, grid snapping, undo/redo, a trashcan, and a starter-block shortcut.

### 2. MicroPython Text Editor
A Monaco-style textarea editor with a line-number gutter, live debounced compile (700 ms after the last keystroke), syntax-highlight output, Ctrl+Enter to run, Ctrl+/ to toggle comments, Tab for four-space indentation, Enter auto-indent on block headers, and a toolbar of quick-insert snippets.

### 3. Four-Stage Compilation Pipeline
Every compile run produces four artefacts shown in the output panel:

| Tab | Content |
|-----|---------|
| MicroPython | The .py source that would run on-device |
| Arduino C++ | A complete Arduino sketch (.ino) |
| AVR Assembly | A minimal educational AVR assembly listing |
| Intel HEX | The flashable binary with a 32-byte dump |

The pipeline is: Blocks → JSON tree → MicroPython → C++ → ASM/HEX. When the editor is in text mode the MicroPython source is transpiled directly to C++ using `mcuSourceToCpp()`.

### 4. Static Validator
Two independent validators run after every compile, before the ASM/HEX stage:

**Arduino C++ validator** (`validateCpp`) checks:
- Undeclared identifiers — two-pass scan, string-literal-stripped, dot-preceded method tokens skipped
- `Serial.print` or `Serial.println` used without `Serial.begin`
- `analogWrite()` called on a non-PWM pin, with the named constant resolved to its pin number via the `const int` declarations in the sketch
- `pinMode` called with an invalid mode string
- Missing `void setup()` or `void loop()`
- `delay(0)` no-ops

**MicroPython validator** (`validatePython`) checks:
- `NameError` — undefined variable references, two-pass, string-literal-stripped
- Missing colon at the end of a `def`, `if`, `while`, `for`, or `else` header
- `uart` used before `UART()` assignment
- `sleep_ms` or `ticks_ms` used without the corresponding `from utime import`
- Integer division by zero literal
- Tab characters used for indentation

Errors block the ASM/HEX stage. Warnings allow compilation but display an orange notice. All findings are shown in the panel error bar with line numbers and full messages.

### 5. Live Simulator
A pin-level simulator that parses the compiled C++ and executes it statement by statement in JavaScript without touching real hardware.

**Execution model:**
- `buildSimProgram(cpp)` parses `void setup()` and `void loop()` bodies into an executable statement tree
- Global variables (`int x = 0`) are stored in `simGlobalInits` at parse time and applied to `simVars` only when the user presses Run, preventing auto-recompile from corrupting running state
- `runSimSetup()` executes setup() once synchronously on first Run
- `simStep()` executes one loop() statement per tick and updates the UI

**Supported C++ constructs in the simulator:**
- `if / else if / else`
- `while` loops with guard against infinite loops
- `for` loops — all increment forms: `i++`, `i--`, `i += N`, `i -= N`, `i *= N`
- `digitalWrite` / `analogWrite`
- `delay(ms)` — shown in the clock display, not actually delayed
- `Serial.begin` / `Serial.print` / `Serial.println` / `Serial.read`
- Typed variable declarations and augmented assignments

**Digital pin table** — shows every pin with its mode badge (OUTPUT / INPUT / PWM / OFF), a HIGH/LOW toggle button for INPUT pins, a voltage bar, and a numeric voltage label. Clicking a toggle button manually drives an INPUT pin HIGH or LOW.

**Analog input sliders** — one slider per analog channel with board-specific channel names and millivolt display. A waveform generator can inject sine, triangle, square, sawtooth, or noise signals across all channels simultaneously for testing ADC-reading code.

**Execution clock** — shows elapsed simulated ticks and the current simulation speed.

**Speed selector** — four presets: 1x (1000 ms/tick), 2x (500 ms), 5x (200 ms), 20x (50 ms).

### 6. Serial Monitor
A full serial monitor panel embedded inside the simulator:
- Colour-coded output: green (MCU RX), blue (user TX), grey (system messages)
- Character-level TX queue (`serialTxQueue`) that feeds `Serial.read()` in the simulator
- Sending a message while the sim is running triggers an immediate `simStep`
- Quick-send buttons: 1, 0, HIGH, LOW, STATUS, RESET
- Baud rate selector (4800 / 9600 / 57600 / 115200)
- Optional HH:MM:SS.mmm timestamps
- Autoscroll checkbox
- RX / TX byte counters
- Export log as `serial_log.txt`
- STATUS command returns current pin states and tick count

### 7. Board Support
Six boards with full pin metadata used by both the simulator and the validator:

| Board | MCU | Digital | Analog | PWM pins |
|-------|-----|---------|--------|----------|
| Arduino Uno | ATmega328P | 14 | 6 | 3, 5, 6, 9, 10, 11 |
| Arduino Mega 2560 | ATmega2560 | 54 | 16 | 2–13, 44–46 |
| Arduino Nano | ATmega328P | 14 | 8 | 3, 5, 6, 9, 10, 11 |
| ESP32 DevKit | ESP32 | 30 | 18 | 20 PWM-capable pins |
| Raspberry Pi Pico | RP2040 | 26 | 3 | GP0–GP22 |
| Arduino Leonardo | ATmega32U4 | 20 | 12 | 3, 5, 6, 9, 10, 11, 13 |

Every board also stores a `nonPwmPins` list so the validator can give a precise error when `analogWrite()` is called on a pin that cannot do PWM.

### 8. Block-to-Code Generation
The pipeline from blocks to code goes through an intermediate JSON tree produced by `serializer.js`:

`Blockly workspace → blockToJSON() → JSON tree → emitter → source code`

**MicroPython emitter** (`emitter-micropython.js`) auto-generates:
- `from machine import` statements based on which blocks are present
- `Pin`, `PWM`, `UART`, `ADC`, `I2C`, `SPI` object initialisations
- `neopixel`, `ssd1306`, `dht`, `ds18x20`, `tm1637` library usage
- A `while True:` main loop wrapping all loop-body blocks

**Arduino C++ emitter** (`emitter-cpp.js`) uses a two-pass approach:
- Pass 1: structural blocks (imports, pin setups, setup/loop/func bodies, sensor init blocks) fill output buckets: `includes`, `globals`, `setupPin`, `setupBody`, `loopBody`
- Pass 2: stray top-level blocks are placed by their vertical position relative to `setup()` and `loop()` — above setup → globals (with type promotion), between setup and loop → end of setup body, below loop → end of loop body

### 9. Mode Switching
Switching between Blocks and MicroPython Editor modes shows a warning modal explaining what will be lost, with Cancel and Confirm buttons. Switching blocks → text converts the current workspace to MicroPython. Switching text → blocks resets the workspace to starter blocks.

### 10. Collapsible Panels and Resize
All three panels (Blockly / editor, output, simulator) are independently collapsible to a 36-pixel stub. On desktop, clicking the stub or toggle button expands the panel. On mobile, panels stack vertically and the stubs become horizontal bars. Drag handles between panels allow freeform resizing, with `Blockly.svgResize()` called after every drag event.

---

## Block Categories and Blocks (92 total)

| Category | Blocks |
|----------|--------|
| Program | pin setup, pin mode, import library, setup(), loop(), function def, function call |
| Flow Control | if, if-else, if-elif-else, repeat N times, while, for-range, break, continue, return |
| Variables & Math | set var, change var, read var, math op (+/-/*//%%), map, constrain, compare, AND, OR, NOT, number literal, string literal, millis |
| Timing | delay ms, delay microseconds |
| Digital I/O | digitalWrite, digitalRead, analogRead, analogWrite, pulseIn, button read, debounced button, relay on, relay off |
| Serial | Serial.begin, Serial.print, Serial.println, Serial.available, Serial.read, Serial.readString |
| Sensors | DHT begin/temp/humidity, Ultrasonic init/cm/inch, DS18B20 begin/read, IR obstacle, IR line, IR remote begin/decode/value, PIR read, soil moisture, sound level, LDR light |
| Displays | OLED begin/print/println/setCursor/setTextSize/drawRect/drawCircle/drawLine/clear/display/invert, LCD begin/print/cursor/clear/backlight, TM1637 begin/showNumber/brightness |
| Actuators | Servo attach/write/read/detach, Stepper begin/step/setSpeed, Buzzer tone/noTone/beep |
| Lights | NeoPixel begin/setPixel/fill/brightness/show/clear, RGB LED set/off |
| Communication | I2C begin/beginTransmission/write/endTransmission/requestFrom/read, SPI begin/transfer/end, Keypad begin/getKey, RTC begin/getHour/getMinute/getSecond/getDate/setTime |

---

## File Structure

```
omniforma/
├── index.html                  App shell: HTML, toolbox XML, script/link tags
│
├── css/
│   ├── base.css                Reset, body, topbar, buttons, syntax colours
│   ├── layout.css              Main flex layout, board bar, mode tabs, resize handles
│   ├── panels.css              Output panel, tabs, collapse stub, error bar
│   ├── simulator.css           Simulator panel, pin rows, sliders, serial monitor
│   ├── editor.css              MicroPython editor, line-number gutter, badge
│   └── modal.css               Warning dialog + responsive breakpoints
│
└── js/
    ├── colours.js              Block colour palette (C object), pinConst helper
    ├── blocks-core.js          Program, control, I/O, vars, serial, servo, LCD, DHT, buzzer
    ├── blocks-sensors.js       Button, relay, ultrasonic, IR, PIR, soil, sound, LDR, DS18B20
    ├── blocks-displays.js      OLED, NeoPixel, RGB LED, TM1637
    ├── blocks-actuators.js     Stepper, I2C, SPI, keypad, RTC
    ├── serializer.js           Blockly workspace → JSON block tree
    ├── emitter-micropython.js  JSON tree → MicroPython source
    ├── emitter-cpp.js          JSON tree → Arduino C++ sketch
    ├── compiler.js             MicroPython→C++ transpiler, AVR gen, syntax highlighters
    ├── validator.js            validateCpp, validatePython, compile(), download handlers
    ├── boards.js               BOARDS definitions, selectBoard, renderBoardSVG
    ├── examples.js             Built-in example programs, loadExample()
    ├── simulator-core.js       State vars, parseSimStmts, buildSimProgram, execSimStmt, simStep
    ├── simulator-ui.js         simToggle/Reset, updateSimUI, renderPinTable, waveform gen
    ├── serial-monitor.js       serialAppend, serialSend, serialClear, export, baud
    ├── ui.js                   Mode switching, modal, editor toolbar, clearAll, downloads
    ├── panel-resize.js         toggleViewPanel, toggleSimPanel, initResizeHandle
    └── init.js                 Blockly inject, placeStarterBlocks, app startup
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Block editor | Google Blockly (loaded from unpkg CDN) |
| UI framework | Vanilla HTML / CSS / JavaScript — no React, no bundler |
| Styling | Plain CSS with custom properties, flex layout |
| Code generation | Custom emitters written in JavaScript |
| Simulation | Pure JavaScript interpreter — no WebAssembly, no native code |
| Deployment | Single folder, open index.html directly — no server required |

---

## Known Constraints

- The simulator executes C++ statement-by-statement in JavaScript. It does not implement the full C++ language — complex pointer arithmetic, structs, classes, and preprocessor directives are not supported.
- The AVR assembly and Intel HEX output are educational approximations, not a true cross-compiler. They are suitable for understanding code structure but not for direct flashing.
- The validator uses static analysis without a full type system. It catches the most common beginner errors but is not a substitute for the actual GCC compiler used by the Arduino IDE.
- Running the app requires an internet connection to load Blockly from the CDN. For fully offline use, Blockly can be downloaded and served locally.
