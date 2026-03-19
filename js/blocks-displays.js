/*
 * blocks-displays.js
 * Blockly block definitions for display and light output components:
 *
 *   OLED SSD1306  : begin, print, println, setCursor, setTextSize,
 *                   drawRect, drawCircle, drawLine, clear, display, invert
 *   NeoPixel      : begin, setPixelColor, fill, setBrightness, show, clear
 *   RGB LED       : set RGB values, off
 *   TM1637        : begin, showNumber, setBrightness
 *
 * Depends on: colours.js (C object)
 */

Blockly.Blocks['mcu_oled_begin']={init(){
  this.appendDummyInput()
    .appendField("OLED.begin(").appendField(new Blockly.FieldNumber(128,1),"W")
    .appendField("x").appendField(new Blockly.FieldNumber(64,1),"H").appendField(")  addr")
    .appendField(new Blockly.FieldTextInput("0x3C"),"ADDR");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.oled);
}};
Blockly.Blocks['mcu_oled_print']={init(){
  this.appendDummyInput()
    .appendField("OLED.print(").appendField(new Blockly.FieldTextInput("hello"),"VAL").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.oled);
}};
Blockly.Blocks['mcu_oled_println']={init(){
  this.appendDummyInput()
    .appendField("OLED.println(").appendField(new Blockly.FieldTextInput("hello"),"VAL").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.oled);
}};
Blockly.Blocks['mcu_oled_set_cursor']={init(){
  this.appendDummyInput()
    .appendField("OLED.setCursor(x").appendField(new Blockly.FieldNumber(0,0),"X")
    .appendField("y").appendField(new Blockly.FieldNumber(0,0),"Y").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.oled);
}};
Blockly.Blocks['mcu_oled_set_size']={init(){
  this.appendDummyInput()
    .appendField("OLED.setTextSize(").appendField(new Blockly.FieldNumber(1,1,4),"SIZE").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.oled);
}};
Blockly.Blocks['mcu_oled_draw_rect']={init(){
  this.appendDummyInput()
    .appendField("OLED.drawRect x").appendField(new Blockly.FieldNumber(0,0),"X")
    .appendField("y").appendField(new Blockly.FieldNumber(0,0),"Y")
    .appendField("w").appendField(new Blockly.FieldNumber(20,1),"W")
    .appendField("h").appendField(new Blockly.FieldNumber(10,1),"H");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.oled);
}};
Blockly.Blocks['mcu_oled_draw_circle']={init(){
  this.appendDummyInput()
    .appendField("OLED.drawCircle x").appendField(new Blockly.FieldNumber(64,0),"X")
    .appendField("y").appendField(new Blockly.FieldNumber(32,0),"Y")
    .appendField("r").appendField(new Blockly.FieldNumber(10,1),"R");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.oled);
}};
Blockly.Blocks['mcu_oled_draw_line']={init(){
  this.appendDummyInput()
    .appendField("OLED.drawLine x0").appendField(new Blockly.FieldNumber(0,0),"X0")
    .appendField("y0").appendField(new Blockly.FieldNumber(0,0),"Y0")
    .appendField("x1").appendField(new Blockly.FieldNumber(127,0),"X1")
    .appendField("y1").appendField(new Blockly.FieldNumber(63,0),"Y1");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.oled);
}};
Blockly.Blocks['mcu_oled_clear']={init(){
  this.appendDummyInput().appendField("OLED.clearDisplay()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.oled);
}};
Blockly.Blocks['mcu_oled_display']={init(){
  this.appendDummyInput().appendField("OLED.display()  ← push to screen");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.oled);
}};
Blockly.Blocks['mcu_oled_invert']={init(){
  this.appendDummyInput()
    .appendField("OLED.invertDisplay(")
    .appendField(new Blockly.FieldDropdown([["true","true"],["false","false"]]),"INV")
    .appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.oled);
}};

/* ── IR SENSOR ──────────────────────────────────────────── */
Blockly.Blocks['mcu_ir_obstacle']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("obstacle"),"VAR")
    .appendField("= IR obstacle  pin").appendField(new Blockly.FieldNumber(3,0,53),"PIN");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.ir);
}};
Blockly.Blocks['mcu_ir_line']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("onLine"),"VAR")
    .appendField("= IR line sensor  pin").appendField(new Blockly.FieldNumber(4,0,53),"PIN");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.ir);
}};
Blockly.Blocks['mcu_ir_begin']={init(){
  this.appendDummyInput()
    .appendField("IRrecv.begin(pin").appendField(new Blockly.FieldNumber(11,0,53),"PIN").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.ir);
}};
Blockly.Blocks['mcu_ir_receive']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("recv"),"VAR")
    .appendField("= IR.decode()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.ir);
}};
Blockly.Blocks['mcu_ir_value']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("code"),"VAR")
    .appendField("= IR.value()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.ir);
}};

/* ── PIR MOTION ─────────────────────────────────────────── */
Blockly.Blocks['mcu_pir_read']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("motion"),"VAR")
    .appendField("= PIR pin").appendField(new Blockly.FieldNumber(5,0,53),"PIN");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.pir);
}};

/* ── SOIL / WATER ───────────────────────────────────────── */
Blockly.Blocks['mcu_soil_read']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("moisture"),"VAR")
    .appendField("= soil sensor A").appendField(new Blockly.FieldNumber(0,0,15),"CH");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.soil);
}};

/* ── SOUND SENSOR ───────────────────────────────────────── */
Blockly.Blocks['mcu_sound_read']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("sound"),"VAR")
    .appendField("= sound sensor A").appendField(new Blockly.FieldNumber(1,0,15),"CH");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.sound);
}};

/* ── LDR LIGHT ──────────────────────────────────────────── */
Blockly.Blocks['mcu_ldr_read']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("light"),"VAR")
    .appendField("= LDR A").appendField(new Blockly.FieldNumber(0,0,15),"CH");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.ldr);
}};

/* ── DS18B20 TEMP SENSOR ────────────────────────────────── */
Blockly.Blocks['mcu_ds18b20_begin']={init(){
  this.appendDummyInput()
    .appendField("DS18B20.begin(pin").appendField(new Blockly.FieldNumber(8,0,53),"PIN").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.ds18);
}};
Blockly.Blocks['mcu_ds18b20_read']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("temp"),"VAR")
    .appendField("= DS18B20.getTempC()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.ds18);
}};

/* ── NEOPIXEL / WS2812 ──────────────────────────────────── */
Blockly.Blocks['mcu_neo_begin']={init(){
  this.appendDummyInput()
    .appendField(new Blockly.FieldTextInput("strip"),"OBJ")
    .appendField("= NeoPixel(pin").appendField(new Blockly.FieldNumber(6,0,53),"PIN")
    .appendField("count").appendField(new Blockly.FieldNumber(8,1),"COUNT").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.neo);
}};
Blockly.Blocks['mcu_neo_set_pixel']={init(){
  this.appendDummyInput()
    .appendField(new Blockly.FieldTextInput("strip"),"OBJ")
    .appendField(".setPixelColor(#").appendField(new Blockly.FieldNumber(0,0),"IDX")
    .appendField("R").appendField(new Blockly.FieldNumber(255,0,255),"R")
    .appendField("G").appendField(new Blockly.FieldNumber(0,0,255),"G")
    .appendField("B").appendField(new Blockly.FieldNumber(0,0,255),"B").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.neo);
}};
Blockly.Blocks['mcu_neo_fill']={init(){
  this.appendDummyInput()
    .appendField(new Blockly.FieldTextInput("strip"),"OBJ")
    .appendField(".fill(R").appendField(new Blockly.FieldNumber(255,0,255),"R")
    .appendField("G").appendField(new Blockly.FieldNumber(0,0,255),"G")
    .appendField("B").appendField(new Blockly.FieldNumber(0,0,255),"B").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.neo);
}};
Blockly.Blocks['mcu_neo_brightness']={init(){
  this.appendDummyInput()
    .appendField(new Blockly.FieldTextInput("strip"),"OBJ")
    .appendField(".setBrightness(").appendField(new Blockly.FieldNumber(50,0,255),"BR").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.neo);
}};
Blockly.Blocks['mcu_neo_show']={init(){
  this.appendDummyInput()
    .appendField(new Blockly.FieldTextInput("strip"),"OBJ").appendField(".show()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.neo);
}};
Blockly.Blocks['mcu_neo_clear']={init(){
  this.appendDummyInput()
    .appendField(new Blockly.FieldTextInput("strip"),"OBJ").appendField(".clear()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.neo);
}};

/* ── RGB LED ────────────────────────────────────────────── */
Blockly.Blocks['mcu_rgb_set']={init(){
  this.appendDummyInput()
    .appendField("RGB LED  R-pin").appendField(new Blockly.FieldNumber(9,0,53),"RPIN")
    .appendField("G-pin").appendField(new Blockly.FieldNumber(10,0,53),"GPIN")
    .appendField("B-pin").appendField(new Blockly.FieldNumber(11,0,53),"BPIN")
    .appendField("→ R").appendField(new Blockly.FieldNumber(255,0,255),"R")
    .appendField("G").appendField(new Blockly.FieldNumber(0,0,255),"G")
    .appendField("B").appendField(new Blockly.FieldNumber(0,0,255),"B");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.rgb);
}};
Blockly.Blocks['mcu_rgb_off']={init(){
  this.appendDummyInput()
    .appendField("RGB LED OFF  R").appendField(new Blockly.FieldNumber(9,0,53),"RPIN")
    .appendField("G").appendField(new Blockly.FieldNumber(10,0,53),"GPIN")
    .appendField("B").appendField(new Blockly.FieldNumber(11,0,53),"BPIN");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.rgb);
}};

/* ── STEPPER MOTOR ──────────────────────────────────────── */
Blockly.Blocks['mcu_stepper_begin']={init(){
  this.appendDummyInput()
    .appendField("Stepper").appendField(new Blockly.FieldTextInput("motor"),"OBJ")
    .appendField("steps").appendField(new Blockly.FieldNumber(200,1),"STEPS")
    .appendField("pins IN1").appendField(new Blockly.FieldNumber(8,0,53),"P1")
    .appendField("IN2").appendField(new Blockly.FieldNumber(9,0,53),"P2")
    .appendField("IN3").appendField(new Blockly.FieldNumber(10,0,53),"P3")
    .appendField("IN4").appendField(new Blockly.FieldNumber(11,0,53),"P4");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.stepper);
}};
Blockly.Blocks['mcu_stepper_step']={init(){
  this.appendDummyInput()
    .appendField(new Blockly.FieldTextInput("motor"),"OBJ")
    .appendField(".step(").appendField(new Blockly.FieldNumber(100,-10000,10000),"STEPS").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.stepper);
}};
Blockly.Blocks['mcu_stepper_speed']={init(){
  this.appendDummyInput()
    .appendField(new Blockly.FieldTextInput("motor"),"OBJ")
    .appendField(".setSpeed(").appendField(new Blockly.FieldNumber(60,1),"RPM").appendField(" RPM)");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.stepper);
}};

/* ── I2C ────────────────────────────────────────────────── */
Blockly.Blocks['mcu_i2c_begin']={init(){
  this.appendDummyInput().appendField("Wire.begin()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.i2c);
}};
Blockly.Blocks['mcu_i2c_begin_transmission']={init(){
  this.appendDummyInput()
    .appendField("Wire.beginTransmission(").appendField(new Blockly.FieldTextInput("0x3C"),"ADDR").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.i2c);
}};
Blockly.Blocks['mcu_i2c_write']={init(){
  this.appendDummyInput()
    .appendField("Wire.write(").appendField(new Blockly.FieldTextInput("0x00"),"VAL").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.i2c);
}};
Blockly.Blocks['mcu_i2c_end_transmission']={init(){
  this.appendDummyInput().appendField("Wire.endTransmission()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.i2c);
}};
Blockly.Blocks['mcu_i2c_request']={init(){
  this.appendDummyInput()
    .appendField("Wire.requestFrom(").appendField(new Blockly.FieldTextInput("0x3C"),"ADDR")
    .appendField("bytes").appendField(new Blockly.FieldNumber(1,1),"BYTES").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.i2c);
}};
Blockly.Blocks['mcu_i2c_read']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("data"),"VAR")
    .appendField("= Wire.read()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.i2c);
}};

/* ── SPI ────────────────────────────────────────────────── */
Blockly.Blocks['mcu_spi_begin']={init(){
  this.appendDummyInput().appendField("SPI.begin()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.spi);
}};
Blockly.Blocks['mcu_spi_transfer']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("recv"),"VAR")
    .appendField("= SPI.transfer(").appendField(new Blockly.FieldTextInput("0x00"),"VAL").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.spi);
}};
Blockly.Blocks['mcu_spi_end']={init(){
  this.appendDummyInput().appendField("SPI.end()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.spi);
}};

/* ── KEYPAD 4×4 ─────────────────────────────────────────── */
Blockly.Blocks['mcu_keypad_begin']={init(){
  this.appendDummyInput()
    .appendField("Keypad.begin(rows").appendField(new Blockly.FieldNumber(4,1,8),"ROWS")
    .appendField("cols").appendField(new Blockly.FieldNumber(4,1,8),"COLS").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.keypad);
}};
Blockly.Blocks['mcu_keypad_getkey']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("key"),"VAR")
    .appendField("= Keypad.getKey()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.keypad);
}};

/* ── RTC DS3231 ─────────────────────────────────────────── */
Blockly.Blocks['mcu_rtc_begin']={init(){
  this.appendDummyInput().appendField("RTC.begin()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.rtc);
}};
Blockly.Blocks['mcu_rtc_get_hour']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("h"),"VAR").appendField("= RTC.hour()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.rtc);
}};
Blockly.Blocks['mcu_rtc_get_minute']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("m"),"VAR").appendField("= RTC.minute()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.rtc);
}};
Blockly.Blocks['mcu_rtc_get_second']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("s"),"VAR").appendField("= RTC.second()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.rtc);
}};
Blockly.Blocks['mcu_rtc_get_date']={init(){
  this.appendDummyInput()
    .appendField("var").appendField(new Blockly.FieldTextInput("d"),"VAR").appendField("= RTC.date()");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.rtc);
}};
Blockly.Blocks['mcu_rtc_set_time']={init(){
  this.appendDummyInput()
    .appendField("RTC.setTime(h").appendField(new Blockly.FieldNumber(12,0,23),"H")
    .appendField("m").appendField(new Blockly.FieldNumber(0,0,59),"M")
    .appendField("s").appendField(new Blockly.FieldNumber(0,0,59),"S").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.rtc);
}};

/* ── TM1637 7-SEGMENT ───────────────────────────────────── */
Blockly.Blocks['mcu_tm1637_begin']={init(){
  this.appendDummyInput()
    .appendField("TM1637.begin(CLK").appendField(new Blockly.FieldNumber(2,0,53),"CLK")
    .appendField("DIO").appendField(new Blockly.FieldNumber(3,0,53),"DIO").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.tm);
}};
Blockly.Blocks['mcu_tm1637_show']={init(){
  this.appendDummyInput()
    .appendField("TM1637.showNumber(").appendField(new Blockly.FieldTextInput("1234"),"VAL").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.tm);
}};
Blockly.Blocks['mcu_tm1637_brightness']={init(){
  this.appendDummyInput()
    .appendField("TM1637.setBrightness(").appendField(new Blockly.FieldNumber(7,0,7),"BR").appendField(")");
  this.setPreviousStatement(true);this.setNextStatement(true);
  this.setColour(C.tm);
}};

// ═══════════════════════════════════════════════════════════
//  BLOCK → JSON SERIALIZER
// ═══════════════════════════════════════════════════════════
