"use strict";

(() => {
  const { rgbToHex, hexToRgb, rgbToCmyk, cmykToRgb, rgbToHsv, hsvToRgb } = ColorModels;
  const initialHex = "#5B5AE6";
  const models = [
    { id: "cmyk", title: "CMYK", channels: [["C", "Cyan", 100, "%"], ["M", "Magenta", 100, "%"], ["Y", "Yellow", 100, "%"], ["K", "Black", 100, "%"]] },
    { id: "rgb", title: "RGB", channels: [["R", "Red", 255, ""], ["G", "Green", 255, ""], ["B", "Blue", 255, ""]] },
    { id: "hsv", title: "HSV", channels: [["H", "Hue", 360, "°"], ["S", "Saturation", 100, "%"], ["V", "Value", 100, "%"]] },
  ];
  const state = { rgb: hexToRgb(initialHex), cmyk: [], hsv: [] };
  state.cmyk = rgbToCmyk(state.rgb);
  state.hsv = rgbToHsv(state.rgb);
  const $ = (selector) => document.querySelector(selector);
  const nativeColor = $("#native-color");
  const controls = [];
  const format = (value, places = 1) => String(Number(value.toFixed(places)));

  function applyColor(source, values) {
    // Preserve the edited coordinates: CMYK is not unique, and HSV can retain saturation at black.
    state[source] = [...values];
    if (source === "cmyk") state.rgb = cmykToRgb(values);
    if (source === "hsv") state.rgb = hsvToRgb(values);
    if (source !== "cmyk") state.cmyk = rgbToCmyk(state.rgb);
    if (source !== "hsv") state.hsv = rgbToHsv(state.rgb, state.hsv[0]);
    render();
  }

  function changeChannel(model, index, value) {
    const next = [...state[model]];
    next[index] = value;
    applyColor(model, next);
  }

  function trackGradient(model, index) {
    if (model === "hsv" && index === 0) return "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)";
    const max = models.find((item) => item.id === model).channels[index][2];
    const stops = [0, .25, .5, .75, 1].map((position) => {
      const values = [...state[model]];
      values[index] = max * position;
      const rgb = model === "rgb" ? values : model === "cmyk" ? cmykToRgb(values) : hsvToRgb(values);
      return rgbToHex(rgb);
    });
    return `linear-gradient(to right, ${stops.join(", ")})`;
  }

  function render() {
    nativeColor.value = rgbToHex(state.rgb).toLowerCase();

    for (const { model, index, input, slider } of controls) {
      const value = state[model][index];
      if (document.activeElement !== input) input.value = format(value, model === "rgb" ? 0 : 1);
      slider.value = value;
      slider.style.background = trackGradient(model, index);
      slider.setAttribute("aria-valuetext", `${format(value)}${model === "rgb" ? "" : model === "hsv" && index === 0 ? " degrees" : " percent"}`);
      if (document.activeElement !== input) input.removeAttribute("aria-invalid");
    }
    for (const model of models) {
      if (!$(`[data-model="${model.id}"] [aria-invalid="true"]`)) $(`#${model.id}-error`).textContent = "";
    }
  }

  for (const model of models) {
    const card = document.createElement("section");
    card.className = "panel model-card";
    card.dataset.model = model.id;
    card.setAttribute("aria-labelledby", `${model.id}-title`);
    card.innerHTML = `<h2 id="${model.id}-title">${model.title}</h2><div class="channels"></div><p class="input-error model-error" id="${model.id}-error" aria-live="polite"></p>`;
    $("#model-grid").append(card);

    model.channels.forEach(([letter, name, max, unit], index) => {
      const id = `${model.id}-${letter.toLowerCase()}`;
      const channel = document.createElement("div");
      channel.className = "channel";
      // Number inputs can display a locale-specific comma even when their value contains a dot.
      channel.innerHTML = `<div class="channel-top"><label for="${id}"><span class="channel-letter">${letter}</span><span class="channel-name">${name}</span></label><div class="number-field"><input id="${id}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="${model.title} ${name}" aria-describedby="${model.id}-error"><span aria-hidden="true">${unit}</span></div></div><input type="range" id="${id}-slider" min="0" max="${max}" step="${model.id === "rgb" ? 1 : .1}" aria-label="${model.title} ${name} slider">`;
      card.querySelector(".channels").append(channel);
      const input = channel.querySelector('input[type="text"]');
      const slider = channel.querySelector('input[type="range"]');
      controls.push({ model: model.id, index, input, slider });
      const error = () => {
        input.setAttribute("aria-invalid", "true");
        $(`#${model.id}-error`).textContent = `${name}: enter a number from 0 to ${max}${unit}.`;
      };
      input.addEventListener("input", () => {
        const text = input.value.trim();
        const value = /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) ? Number(text) : NaN;
        if (!Number.isFinite(value) || value < 0 || value > max) {
          error();
          return;
        }
        input.removeAttribute("aria-invalid");
        $(`#${model.id}-error`).textContent = "";
        changeChannel(model.id, index, value);
      });
      input.addEventListener("blur", () => {
        if (input.getAttribute("aria-invalid") === "true") return;
        input.value = format(state[model.id][index], model.id === "rgb" ? 0 : 1);
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          const step = model.id === "rgb" ? 1 : .1;
          const value = Math.min(max, Math.max(0, state[model.id][index] + (event.key === "ArrowUp" ? step : -step)));
          input.value = format(value, model.id === "rgb" ? 0 : 1);
          input.removeAttribute("aria-invalid");
          changeChannel(model.id, index, Number(input.value));
        }
        if (event.key === "Escape") {
          input.value = format(state[model.id][index], model.id === "rgb" ? 0 : 1);
          input.removeAttribute("aria-invalid");
          $(`#${model.id}-error`).textContent = "";
          input.blur();
        }
        if (event.key === "Enter" && input.getAttribute("aria-invalid") !== "true") input.blur();
      });
      slider.addEventListener("input", () => changeChannel(model.id, index, Number(slider.value)));
    });
  }

  nativeColor.addEventListener("input", () => applyColor("rgb", hexToRgb(nativeColor.value)));

  render();
})();
