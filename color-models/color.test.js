"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { rgbToHex, hexToRgb, rgbToCmyk, cmykToRgb, rgbToHsv, hsvToRgb } = require("./color.js");

function near(actual, expected, tolerance = 1e-8) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) <= tolerance, `${actual} differs from ${expected} at channel ${index}`));
}

const referenceColors = [
  { rgb: [255, 0, 0], cmyk: [0, 100, 100, 0], hsv: [0, 100, 100] },
  { rgb: [255, 255, 0], cmyk: [0, 0, 100, 0], hsv: [60, 100, 100] },
  { rgb: [0, 255, 0], cmyk: [100, 0, 100, 0], hsv: [120, 100, 100] },
  { rgb: [0, 255, 255], cmyk: [100, 0, 0, 0], hsv: [180, 100, 100] },
  { rgb: [0, 0, 255], cmyk: [100, 100, 0, 0], hsv: [240, 100, 100] },
  { rgb: [255, 0, 255], cmyk: [0, 100, 0, 0], hsv: [300, 100, 100] },
  { rgb: [255, 255, 255], cmyk: [0, 0, 0, 0], hsv: [0, 0, 100] },
  { rgb: [0, 0, 0], cmyk: [0, 0, 0, 100], hsv: [0, 0, 0] },
  { rgb: [128, 128, 128], cmyk: [0, 0, 0, 100 - 128 / 255 * 100], hsv: [0, 0, 128 / 255 * 100] },
];

test("primary, secondary, white, black and gray conversions match reference values", () => {
  for (const { rgb, cmyk, hsv } of referenceColors) {
    near(rgbToCmyk(rgb), cmyk);
    near(cmykToRgb(cmyk), rgb);
    near(rgbToHsv(rgb), hsv);
    near(hsvToRgb(hsv), rgb);
  }
});

test("intermediate HSV hues, partial saturation and brightness", () => {
  near(hsvToRgb([30, 50, 80]), [204, 153, 102]);
  near(rgbToHsv([204, 153, 102]), [30, 50, 80]);
  near(hsvToRgb([330, 100, 100]), [255, 0, 127.5]);
  near(hsvToRgb([360, 100, 100]), [255, 0, 0]);
  near(hsvToRgb([222, 100, 0]), [0, 0, 0]);
});

test("CMYK uses all four ink channels, including non-canonical combinations", () => {
  near(cmykToRgb([20, 40, 60, 50]), [102, 76.5, 51]);
  near(cmykToRgb([20, 40, 60, 100]), [0, 0, 0]);
  near(cmykToRgb([100, 100, 100, 0]), [0, 0, 0]);
});

test("achromatic colors retain a provided hue without NaN or division by zero", () => {
  near(rgbToHsv([0, 0, 0], 210), [210, 0, 0]);
  near(rgbToHsv([255, 255, 255], 210), [210, 0, 100]);
  near(rgbToCmyk([0, 0, 0]), [0, 0, 0, 100]);
});

test("HEX parsing accepts shorthand and rejects incomplete or invalid input", () => {
  assert.deepEqual(hexToRgb(" #f0A "), [255, 0, 170]);
  assert.deepEqual(hexToRgb("5b5ae6"), [91, 90, 230]);
  assert.equal(rgbToHex([91, 90, 230]), "#5B5AE6");
  assert.equal(rgbToHex([.4, 127.6, 254.9]), "#0080FF");
  for (const input of ["", "#", "#12", "#1234", "#12345", "#12G456", "#12345678", "##123456"]) assert.equal(hexToRgb(input), null);
});

test("full-precision round trips and cross-model conversions remain stable across the RGB cube", () => {
  for (const r of [0, 1, 17, 64, 127, 128, 191, 254, 255]) {
    for (const g of [0, 1, 17, 64, 127, 128, 191, 254, 255]) {
      for (const b of [0, 1, 17, 64, 127, 128, 191, 254, 255]) {
        const rgb = [r, g, b];
        near(cmykToRgb(rgbToCmyk(rgb)), rgb);
        near(hsvToRgb(rgbToHsv(rgb)), rgb);
        near(hsvToRgb(rgbToHsv(cmykToRgb(rgbToCmyk(rgb)))), rgb);
        assert.equal(rgbToHex(hsvToRgb(rgbToHsv(rgb))), rgbToHex(rgb));
      }
    }
  }
});
