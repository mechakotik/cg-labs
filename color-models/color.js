(function (root) {
  "use strict";

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const wrapHue = (hue) => ((hue % 360) + 360) % 360;

  function rgbToHex(rgb) {
    return "#" + rgb.map((channel) => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  function hexToRgb(value) {
    let hex = value.trim().replace(/^#/, "");
    if (/^[\da-f]{3}$/i.test(hex)) hex = [...hex].map((digit) => digit + digit).join("");
    if (!/^[\da-f]{6}$/i.test(hex)) return null;
    return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  }

  function rgbToCmyk(rgb) {
    const [r, g, b] = rgb.map((channel) => channel / 255);
    const max = Math.max(r, g, b);
    if (max === 0) return [0, 0, 0, 100];
    return [(max - r) / max * 100, (max - g) / max * 100, (max - b) / max * 100, (1 - max) * 100];
  }

  function cmykToRgb([c, m, y, k]) {
    return [c, m, y].map((channel) => 255 * (1 - channel / 100) * (1 - k / 100));
  }

  function rgbHue([r, g, b], delta, max, fallbackHue) {
    // Achromatic colors have no unique hue; retain the user's last hue.
    if (delta < 1e-10) return fallbackHue;
    let hue;
    if (max === r) hue = (g - b) / delta;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    return wrapHue(hue * 60);
  }

  function rgbToHsv(rgb, fallbackHue = 0) {
    const channels = rgb.map((channel) => channel / 255);
    const max = Math.max(...channels);
    const delta = max - Math.min(...channels);
    return [rgbHue(channels, delta, max, fallbackHue), max === 0 ? 0 : delta / max * 100, max * 100];
  }

  function hueToRgb(hue, chroma, offset) {
    const h = wrapHue(hue) / 60;
    const x = chroma * (1 - Math.abs(h % 2 - 1));
    const sectors = [[chroma, x, 0], [x, chroma, 0], [0, chroma, x], [0, x, chroma], [x, 0, chroma], [chroma, 0, x]];
    return sectors[Math.floor(h)].map((channel) => (channel + offset) * 255);
  }

  function hsvToRgb([h, s, v]) {
    const chroma = v / 100 * s / 100;
    return hueToRgb(h, chroma, v / 100 - chroma);
  }

  const api = { clamp, wrapHue, rgbToHex, hexToRgb, rgbToCmyk, cmykToRgb, rgbToHsv, hsvToRgb };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ColorModels = api;
})(globalThis);
