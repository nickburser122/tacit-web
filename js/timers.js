const Timers = (() => {
  const UNIT = {
    h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600,
    m: 60, min: 60, mins: 60, minute: 60, minutes: 60,
    s: 1, sec: 1, secs: 1, second: 1, seconds: 1
  };
  const MAX = 99 * 3600;
  const TOKEN = /^(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)(?![a-z])\s*(?:and\s+|,\s*)?/i;
  const CLOCK = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?![\d:])\s*/;
  const BARE = /^(\d+(?:\.\d+)?)(?![\d:a-z])\s*/i;

  let worker = null;
  let workerUrl = '';
  let fallback = 0;
  let audio = null;
  let hooks = { tick() {}, finish() {} };

  const settings = () => Store.state.settings;
  const list = () => Store.state.timers;

  function latinDigits(text) {
    return text.replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6F0));
  }

  function tidy(text) {
    return text.trim().replace(/^(?:to|about|for|:|-)\s+/i, '').trim();
  }

  function consume(text, allowBare) {
    let rest = text.trim();
    let total = 0;
    let found = false;
    let lastUnit = 0;
    let m;
    while ((m = TOKEN.exec(rest))) {
      lastUnit = UNIT[m[2].toLowerCase()];
      total += parseFloat(m[1]) * lastUnit;
      rest = rest.slice(m[0].length);
      found = true;
    }
    if (found && lastUnit === 3600 && (m = /^(\d{1,2})(?![\d:a-z])\s*/i.exec(rest))) {
      total += parseInt(m[1], 10) * 60;
      rest = rest.slice(m[0].length);
    }
    if (!found && (m = CLOCK.exec(rest))) {
      total = m[3] !== undefined ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[1] * 60 + +m[2];
      rest = rest.slice(m[0].length);
      found = true;
    }
    if (!found && allowBare && (m = BARE.exec(rest))) {
      total = parseFloat(m[1]) * 60;
      rest = rest.slice(m[0].length);
      found = true;
    }
    const seconds = Math.round(total);
    if (!found || seconds < 1 || seconds > MAX) return null;
    return { seconds, rest };
  }

  function parse(raw) {
    const t = latinDigits(String(raw)).trim().replace(/\s+/g, ' ');
    if (!t) return null;
    if (/^(pomodoro|pomo|بومودورو)$/i.test(t)) return { seconds: 1500, label: '', focus: true };
    let m = /^(?:timer|countdown|alarm|remind me in|remind me|remind in|مؤقت|منبه|ذكرني بعد)\s+(.+)$/i.exec(t);
    if (m) {
      const d = consume(m[1], true);
      return d ? { seconds: d.seconds, label: tidy(d.rest) } : null;
    }
    const d = consume(t, false);
    if (!d) return null;
    m = /^(?:timer|countdown|مؤقت)(?=\s|$)\s*(.*)$/i.exec(d.rest);
    if (m) return { seconds: d.seconds, label: tidy(m[1]) };
    if (!d.rest) return { seconds: d.seconds, label: '', bare: true };
    return null;
  }

  const pad = n => String(n).padStart(2, '0');

  function format(total) {
    const s = Math.max(0, Math.round(total));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
  }

  function remaining(timer, now) {
    return Math.max(0, Math.ceil((timer.end - now) / 1000));
  }

  function unlock() {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch (e) {}
  }

  function chime() {
    if (!settings().timerSound) return;
    unlock();
    if (!audio) return;
    const start = audio.currentTime;
    [[659.25, 0], [880, 0.2], [1318.5, 0.4]].forEach(([freq, delay]) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start + delay);
      gain.gain.linearRampToValueAtTime(0.16, start + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + 1.3);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(start + delay);
      osc.stop(start + delay + 1.4);
    });
  }

  function askPermission() {
    if (!settings().timerNotify || !('Notification' in window) || Notification.permission !== 'default') return;
    try { Notification.requestPermission(); } catch (e) {}
  }

  function notify(timer) {
    if (!settings().timerNotify || !('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible' && document.hasFocus()) return;
    try {
      new Notification(timer.label || 'Tacit', {
        body: I18n.t('timer_done') + ' · ' + format(timer.total), tag: 'tacit-' + timer.id, silent: true, icon: 'icons/icon-192.png'
      });
    } catch (e) {}
  }

  function pulse() {
    const now = Date.now();
    let fired = false;
    for (const timer of list()) {
      if (timer.done || timer.end > now) continue;
      timer.done = true;
      timer.doneAt = now;
      fired = true;
      chime();
      notify(timer);
      hooks.finish(timer);
    }
    if (fired) Store.changed('timers');
    hooks.tick(now, fired);
    ensureClock();
  }

  function stopClock() {
    if (worker) {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      worker = null;
    }
    if (fallback) {
      clearInterval(fallback);
      fallback = 0;
    }
  }

  function ensureClock() {
    const running = list().some(t => !t.done);
    if (!running) return stopClock();
    if (worker || fallback) return;
    try {
      workerUrl = URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},1000)'], { type: 'text/javascript' }));
      worker = new Worker(workerUrl);
      worker.onmessage = pulse;
      worker.onerror = () => {
        stopClock();
        fallback = setInterval(pulse, 1000);
      };
    } catch (e) {
      worker = null;
      fallback = setInterval(pulse, 1000);
    }
  }

  function start(spec) {
    const now = Date.now();
    const timer = { id: Store.uid(), label: spec.label || '', total: spec.seconds, end: now + spec.seconds * 1000, done: false };
    list().push(timer);
    unlock();
    askPermission();
    Store.changed('timers');
    ensureClock();
    return timer;
  }

  function dismiss(id) {
    const timers = Store.state.timers;
    const i = timers.findIndex(t => t.id === id);
    if (i < 0) return;
    timers.splice(i, 1);
    Store.changed('timers');
    ensureClock();
  }

  function restore() {
    const now = Date.now();
    const timers = Store.state.timers;
    let touched = false;
    for (let i = timers.length - 1; i >= 0; i--) {
      const t = timers[i];
      if (!t || typeof t.end !== 'number') { timers.splice(i, 1); touched = true; continue; }
      if (!t.done && t.end <= now) { t.done = true; t.doneAt = t.end; touched = true; }
      if (t.done && now - (t.doneAt || t.end) > 86400000) { timers.splice(i, 1); touched = true; }
    }
    if (touched) Store.changed('timers');
    ensureClock();
  }

  return {
    parse, parseDuration: text => consume(latinDigits(String(text)), true), format, remaining, start, dismiss, restore, unlock,
    running: () => list().filter(t => !t.done),
    on: next => { hooks = { ...hooks, ...next }; }
  };
})();
