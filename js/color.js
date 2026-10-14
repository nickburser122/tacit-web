const Color = (() => {
  function hslToRgb(h, s, l) {
    const hue = ((h % 360) + 360) % 360;
    const sat = Math.max(0, Math.min(100, s)) / 100;
    const lig = Math.max(0, Math.min(100, l)) / 100;
    const k = n => (n + hue / 30) % 12;
    const a = sat * Math.min(lig, 1 - lig);
    const f = n => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }

  function rgbToHsl(r, g, b) {
    const R = r / 255, G = g / 255, B = b / 255;
    const max = Math.max(R, G, B), min = Math.min(R, G, B);
    const l = (max + min) / 2;
    const d = max - min;
    if (!d) return [0, 0, l * 100];
    const s = d / (1 - Math.abs(2 * l - 1));
    let h;
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    return [(h * 60 + 360) % 360, s * 100, l * 100];
  }

  function parse(raw) {
    const v = String(raw).trim().toLowerCase();
    let rgb = null;
    let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
    if (m) {
      const hex = m[1].length === 3 ? m[1].replace(/./g, c => c + c) : m[1];
      rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
    }
    if (!rgb && (m = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/.exec(v))) {
      rgb = [+m[1], +m[2], +m[3]];
      if (rgb.some(n => n > 255)) return null;
    }
    if (!rgb && (m = /^hsla?\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/.exec(v))) {
      if (+m[2] > 100 || +m[3] > 100) return null;
      rgb = hslToRgb(+m[1], +m[2], +m[3]).map(Math.round);
    }
    if (!rgb) return null;
    const [h, s, l] = rgbToHsl(...rgb).map(Math.round);
    return {
      hex: '#' + rgb.map(n => n.toString(16).padStart(2, '0')).join(''),
      rgb: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
      hsl: `hsl(${h}, ${s}%, ${l}%)`
    };
  }

  return { hslToRgb, rgbToHsl, parse };
})();
