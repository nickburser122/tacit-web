const Sky = (() => {
  const stops = [
    [0, 224], [4.5, 224], [6, 18], [7.5, 30], [10, 40], [15, 40],
    [17.5, 22], [18.8, 8], [20.5, 224], [24, 224]
  ].map(([t, h]) => [t, Color.hslToRgb(h, 70, 56)]);

  const fixedHue = { ember: 34, sage: 146, azure: 212, rose: 350 };

  function mix(t) {
    for (let i = 1; i < stops.length; i++) {
      if (t > stops[i][0]) continue;
      const [t0, a] = stops[i - 1];
      const [t1, b] = stops[i];
      const f = (t - t0) / (t1 - t0);
      return Color.rgbToHsl(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
    }
    return Color.rgbToHsl(...stops[stops.length - 1][1]);
  }

  function at(date) {
    const t = date.getHours() + date.getMinutes() / 60;
    const [hue, sat] = mix(t);
    const day = t >= 6 && t < 18;
    const p = day ? (t - 6) / 12 : ((t - 18 + 24) % 24) / 12;
    const arc = Math.pow(Math.sin(Math.PI * p), 0.6);
    return {
      hue,
      sat: Math.max(30, Math.min(70, sat * 0.95)),
      x: 10 + 80 * p,
      y: day ? 28 - 36 * arc : 28 - 30 * arc,
      intensity: day ? 0.3 + 0.7 * arc : 0.3 + 0.28 * arc,
      day
    };
  }

  function apply(root, date, accent) {
    const s = at(date);
    const style = root.style;
    style.setProperty('--sky-hue', s.hue.toFixed(1));
    style.setProperty('--sky-i', s.intensity.toFixed(3));
    style.setProperty('--sun-x', s.x.toFixed(2) + '%');
    style.setProperty('--sun-y', s.y.toFixed(2) + '%');
    if (accent === 'graphite') {
      style.setProperty('--hue', s.hue.toFixed(1));
      style.setProperty('--acc-s', '0%');
    } else if (fixedHue[accent] !== undefined) {
      style.setProperty('--hue', String(fixedHue[accent]));
      style.setProperty('--acc-s', '58%');
    } else {
      style.setProperty('--hue', s.hue.toFixed(1));
      style.setProperty('--acc-s', s.sat.toFixed(1) + '%');
    }
    return s;
  }

  return { at, apply, fixedHue };
})();
