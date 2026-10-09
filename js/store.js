const Store = (() => {
  const KEY = 'tacit.v1';
  const USAGE_TTL = 90 * 86400000;
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  const defaultEngines = () => [
    { id: uid(), prefix: 'ddg', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', aliases: [] },
    { id: uid(), prefix: 'g', name: 'Google', url: 'https://www.google.com/search?q=%s', aliases: [] },
    { id: uid(), prefix: 'w', name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?search=%s', aliases: [] },
    { id: uid(), prefix: 'yt', name: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s', aliases: [] },
    { id: uid(), prefix: 'map', name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/search?query=%s', aliases: [] },
    { id: uid(), prefix: 'gh', name: 'GitHub', url: 'https://github.com/search?q=%s', aliases: [] }
  ];

  const defaultLinks = () => [
    ['Gmail', 'https://mail.google.com', 'mail, email'],
    ['YouTube', 'https://www.youtube.com', ''],
    ['WhatsApp Web', 'https://web.whatsapp.com', 'wa'],
    ['Google Calendar', 'https://calendar.google.com', 'cal'],
    ['Google Drive', 'https://drive.google.com', 'drive'],
    ['Google Maps', 'https://maps.google.com', 'maps'],
    ['Google Translate', 'https://translate.google.com', 'translate, ترجمة'],
    ['Wikipedia', 'https://www.wikipedia.org', 'wiki'],
    ['GitHub', 'https://github.com', ''],
    ['F-Droid', 'https://f-droid.org', '']
  ].map(([name, url, aliases]) => ({ id: uid(), name, url, aliases: splitList(aliases), pinned: false }));

  const defaultSettings = () => ({
    theme: 'system',
    lang: 'auto',
    barBottom: true,
    clock: true,
    date: false,
    results: 8,
    strictness: 'normal',
    transliterate: true,
    learn: true,
    newTab: false,
    defaultEngine: 'ddg',
    countryCode: '',
    clearAfter: true,
    clipEnabled: true,
    clipCaptureOnFocus: false,
    clipDenied: 0,
    clipDays: 0,
    clipMax: 200,
    sensitivePolicy: 'skip',
    kindOrder: ['link', 'person', 'snippet', 'command', 'action', 'calc', 'web', 'clip'],
    prefixes: { calc: '=', clip: 'cb ', people: '@', snippets: ';', commands: '>' }
  });

  function splitList(text) {
    return [...new Set(String(text || '').split(/[,،;]/).map(s => s.trim()).filter(Boolean))];
  }

  function fresh() {
    return {
      version: 1,
      settings: defaultSettings(),
      links: defaultLinks(),
      people: [],
      snippets: [],
      engines: defaultEngines(),
      commandAliases: {},
      pins: [],
      clips: [],
      usage: {}
    };
  }

  function cleanUsage(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [k, e] of Object.entries(raw)) {
      if (e && typeof e.n === 'number' && typeof e.t === 'number') out[k] = { n: e.n, t: e.t };
    }
    return out;
  }

  function merge(data) {
    const base = fresh();
    if (!data || typeof data !== 'object') return base;
    const out = { ...base, ...data };
    out.settings = { ...base.settings, ...(data.settings || {}) };
    out.settings.prefixes = { ...base.settings.prefixes, ...((data.settings || {}).prefixes || {}) };
    for (const k of ['links', 'people', 'snippets', 'engines', 'clips', 'pins']) if (!Array.isArray(out[k])) out[k] = base[k];
    if (!out.commandAliases || typeof out.commandAliases !== 'object') out.commandAliases = {};
    out.usage = cleanUsage(data.usage);
    return out;
  }

  let state;
  try {
    state = merge(JSON.parse(localStorage.getItem(KEY)));
  } catch (e) {
    state = fresh();
  }

  const listeners = new Set();
  let saveTimer = null;
  let pending = false;

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = null;
    pending = false;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      localStorage.setItem('tacit.boot', JSON.stringify({ theme: state.settings.theme, lang: state.settings.lang }));
    } catch (e) {
      console.warn('Tacit: storage full or blocked', e);
    }
  }

  function schedule() {
    pending = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 250);
  }

  function flush() {
    if (pending) persist();
  }

  function changed(scope, immediate) {
    if (immediate) {
      pending = true;
      persist();
    } else schedule();
    const s = scope || 'all';
    listeners.forEach(fn => fn(s));
  }

  function touch(key) {
    if (!key || !state.settings.learn) return;
    Engine.frecency.bump(state.usage, key, Date.now());
    schedule();
  }

  function pruneUsage() {
    const now = Date.now();
    const u = state.usage;
    for (const k of Object.keys(u)) if (now - u[k].t > USAGE_TTL) delete u[k];
  }

  function resetUsage() {
    state.usage = {};
    changed('usage');
  }

  function replace(data) {
    state = merge(data);
    changed('all', true);
  }

  function reset() {
    state = fresh();
    changed('all', true);
  }

  window.addEventListener('storage', e => {
    if (e.key !== KEY) return;
    try {
      state = merge(JSON.parse(e.newValue));
      listeners.forEach(fn => fn('all'));
    } catch (err) {
      console.warn(err);
    }
  });

  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });

  return {
    get state() { return state; },
    uid, splitList, changed, replace, reset, fresh, touch, pruneUsage, resetUsage, flush,
    onChange: fn => listeners.add(fn)
  };
})();
