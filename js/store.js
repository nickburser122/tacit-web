const Store = (() => {
  const KEY = 'tacit.v1';
  const USAGE_TTL = 90 * 86400000;
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  const defaultEngines = () => Providers.defaults().map(d => ({ id: uid(), aliases: [], ...d }));

  const defaultLinks = () => [
    ['Gmail', 'https://mail.google.com', 'mail, email'],
    ['YouTube', 'https://www.youtube.com', ''],
    ['WhatsApp Web', 'https://web.whatsapp.com', 'wa'],
    ['Google Calendar', 'https://calendar.google.com', 'cal'],
    ['Google Drive', 'https://drive.google.com', 'drive'],
    ['OpenStreetMap', 'https://www.openstreetmap.org', 'maps, map, خرائط'],
    ['Lingva Translate', 'https://lingva.ml', 'translate, ترجمة'],
    ['Wikipedia', 'https://www.wikipedia.org', 'wiki'],
    ['GitHub', 'https://github.com', ''],
    ['F-Droid', 'https://f-droid.org', '']
  ].map(([name, url, aliases]) => ({ id: uid(), name, url, aliases: splitList(aliases), pinned: false }));

  const coarse = () => {
    try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; }
  };

  const defaultSettings = () => ({
    theme: 'system',
    lang: 'auto',
    accent: 'ember',
    name: '',
    greeting: false,
    homeTasks: true,
    barBottom: coarse(),
    clock: true,
    date: true,
    results: 8,
    chipMax: 10,
    strictness: 'normal',
    transliterate: true,
    learn: true,
    newTab: false,
    defaultEngine: 'ddg',
    translateArabicTo: 'en',
    translateOtherTo: 'ar',
    stripTrackers: true,
    hijri: false,
    countryCode: '',
    clearAfter: true,
    clipEnabled: true,
    clipCaptureOnFocus: false,
    clipDenied: 0,
    clipDays: 0,
    clipMax: 200,
    timerSound: true,
    timerNotify: true,
    sensitivePolicy: 'skip',
    kindOrder: ['link', 'set', 'person', 'snippet', 'command', 'action', 'calc', 'web', 'clip'],
    prefixes: { calc: '=', clip: 'cb ', people: '@', snippets: ';', commands: '>', tasks: '+', notes: 'note ' }
  });

  function splitList(text) {
    return [...new Set(String(text || '').split(/[,،;]/).map(s => s.trim()).filter(Boolean))];
  }

  function fresh() {
    const state = {
      version: 2,
      settings: defaultSettings(),
      links: defaultLinks(),
      people: [],
      snippets: [],
      sets: [],
      notes: [],
      engines: defaultEngines(),
      commandAliases: {},
      pins: [],
      clips: [],
      tasks: [],
      timers: [],
      usage: {}
    };
    Catalog.sync(state, uid, true);
    return state;
  }

  function cleanUsage(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [k, e] of Object.entries(raw)) {
      if (e && typeof e.n === 'number' && typeof e.t === 'number') out[k] = { n: e.n, t: e.t };
    }
    return out;
  }

  function cleanKindOrder(order, base) {
    const list = Array.isArray(order) ? order.filter(k => typeof k === 'string') : [];
    for (const k of base) {
      if (list.includes(k)) continue;
      const at = list.indexOf('web');
      if (at < 0) list.push(k);
      else list.splice(at, 0, k);
    }
    return list;
  }

  function merge(data) {
    const base = fresh();
    if (!data || typeof data !== 'object') return base;
    const out = { ...base, ...data };
    out.settings = { ...base.settings, ...(data.settings || {}) };
    out.settings.prefixes = { ...base.settings.prefixes, ...((data.settings || {}).prefixes || {}) };
    out.settings.kindOrder = cleanKindOrder(out.settings.kindOrder, base.settings.kindOrder);
    for (const k of ['links', 'people', 'snippets', 'sets', 'notes', 'engines', 'clips', 'pins', 'tasks', 'timers']) if (!Array.isArray(out[k])) out[k] = base[k];
    if (!out.commandAliases || typeof out.commandAliases !== 'object') out.commandAliases = {};
    out.usage = cleanUsage(data.usage);
    out.links = out.links.filter(l => l && (!l.url || Links.safe(l.url)));
    out.sets = out.sets.filter(s => s && Array.isArray(s.urls)).map(s => ({ ...s, urls: s.urls.filter(u => Links.safe(u)) }));
    out.engines = out.engines.filter(e => e && typeof e.url === 'string' && (!e.url || Links.safe(e.url.replace(/\{[a-z]+\}/g, 'https://x'))));
    if ((data.version || 1) < 2) out.engines = Providers.migrate(out.engines, uid);
    for (const e of out.engines) if (!e.cat) e.cat = 'web';
    out.catalog = data.catalog;
    Catalog.sync(out, uid, false);
    out.version = 2;
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
    uid, splitList, changed, replace, reset, fresh, merge, touch, pruneUsage, resetUsage, flush,
    onChange: fn => listeners.add(fn)
  };
})();
