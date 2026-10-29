const Providers = (() => {
  const CATEGORIES = ['web', 'knowledge', 'dictionary', 'translate', 'code', 'social', 'video', 'maps'];
  const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const LANG_CODE = /^[a-z]{2,3}(?:-[a-z0-9]{2,4})?$/i;
  const PLACEHOLDER = /\{(host|lang|from|to|q)\}|%s/g;

  const DEFAULTS = [
    { prefix: 'ddg', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', cat: 'web', priv: true },
    { prefix: 'b', name: 'Brave Search', url: 'https://search.brave.com/search?q=%s', cat: 'web', priv: true },
    { prefix: 'sp', name: 'Startpage', url: 'https://www.startpage.com/sp/search?query=%s', cat: 'web', priv: true },
    { prefix: 'mj', name: 'Mojeek', url: 'https://www.mojeek.com/search?q=%s', cat: 'web', priv: true },
    { prefix: 'sx', name: 'SearXNG', url: '{host}/search?q=%s', cat: 'web', priv: true, host: '', hostDefault: '' },
    { prefix: 'g', name: 'Google', url: 'https://www.google.com/search?q=%s', cat: 'web', priv: false },
    { prefix: 'w', name: 'Wikipedia', url: 'https://{lang}.wikipedia.org/w/index.php?search=%s', cat: 'knowledge', priv: true },
    { prefix: 'd', name: 'Wiktionary', url: 'https://{lang}.wiktionary.org/w/index.php?search=%s', cat: 'dictionary', priv: true },
    { prefix: 'tr', name: 'Translate', url: '{host}/{from}/{to}/{q}', cat: 'translate', priv: true,
      host: 'https://lingva.ml', hostDefault: 'https://lingva.ml' },
    { prefix: 'gh', name: 'GitHub', url: 'https://github.com/search?q=%s', cat: 'code', priv: false, jump: 'repo' },
    { prefix: 'cg', name: 'Codeberg', url: 'https://codeberg.org/explore/repos?q=%s', cat: 'code', priv: true },
    { prefix: 'mdn', name: 'MDN', url: 'https://developer.mozilla.org/search?q=%s', cat: 'code', priv: true },
    { prefix: 'r', name: 'Reddit', url: '{host}/search?q=%s', cat: 'social', priv: false, jump: 'reddit',
      host: 'https://www.reddit.com', hostDefault: 'https://www.reddit.com' },
    { prefix: 'yt', name: 'YouTube', url: '{host}/results?search_query=%s', cat: 'video', priv: false,
      host: 'https://www.youtube.com', hostDefault: 'https://www.youtube.com' },
    { prefix: 'map', name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/search?query=%s', cat: 'maps', priv: true }
  ];

  const LEGACY = {
    ddg: 'https://duckduckgo.com/?q=%s',
    g: 'https://www.google.com/search?q=%s',
    w: 'https://en.wikipedia.org/w/index.php?search=%s',
    yt: 'https://www.youtube.com/results?search_query=%s',
    map: 'https://www.openstreetmap.org/search?query=%s',
    gh: 'https://github.com/search?q=%s'
  };

  const INTENT_BOOST = {
    repo: { code: 3 },
    reddit: { social: 3 },
    word: { dictionary: 3, translate: 2, knowledge: 1 },
    arabicWord: { dictionary: 3, translate: 3 },
    phrase: { translate: 1 },
    place: { maps: 1 },
    plain: {}
  };

  const clone = d => ({ ...d });
  const defaults = () => DEFAULTS.map(clone);

  const hasHost = e => e.url.includes('{host}');

  const hostOf = e => Links.normalizeHost(e.host) || Links.normalizeHost(e.hostDefault);

  const usable = e => !!(e && e.url && (!hasHost(e) || hostOf(e)));

  function scriptOf(text) {
    return ARABIC.test(text) ? 'ar' : 'latin';
  }

  function wikiLang(text) {
    return ARABIC.test(text) ? 'ar' : 'en';
  }

  function targets(text, state, forced) {
    const s = (state && state.settings) || {};
    const arabicTo = LANG_CODE.test(s.translateArabicTo || '') ? s.translateArabicTo : 'en';
    const otherTo = LANG_CODE.test(s.translateOtherTo || '') ? s.translateOtherTo : 'ar';
    if (forced && LANG_CODE.test(forced)) return forced.toLowerCase();
    return ARABIC.test(text) ? arabicTo : otherTo;
  }

  function build(engine, text, opts) {
    const o = opts || {};
    const state = o.state;
    const encoded = encodeURIComponent(text);
    const plus = encoded.replace(/%20/g, '+');
    return engine.url.replace(PLACEHOLDER, (m, name) => {
      if (m === '%s') return plus;
      switch (name) {
        case 'host': return hostOf(engine);
        case 'lang': return wikiLang(text);
        case 'from': return 'auto';
        case 'to': return targets(text, state, o.to);
        default: return encoded;
      }
    });
  }

  function home(engine) {
    if (hasHost(engine)) return hostOf(engine);
    return Links.origin(engine.url);
  }

  function wantsTarget(engine) {
    return engine.url.includes('{to}');
  }

  function intentOf(text) {
    const t = text.trim();
    if (!t) return 'plain';
    if (/^\/?(r|u|user)\/[A-Za-z0-9_-]{2,21}$/i.test(t)) return 'reddit';
    if (/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/.test(t)) return 'repo';
    const words = t.split(/\s+/);
    if (words.length === 1 && t.length <= 28 && /^[\p{L}\p{M}'-]+$/u.test(t)) return ARABIC.test(t) ? 'arabicWord' : 'word';
    if (words.length >= 2 && words.length <= 12 && ARABIC.test(t)) return 'phrase';
    if (/\b(near|restaurant|cafe|pharmacy|hospital|street|road)\b|قريب|شارع|صيدلية|مستشفى/i.test(t)) return 'place';
    return 'plain';
  }

  function rank(text, state) {
    const list = state.engines.filter(e => e.prefix && e.name && usable(e));
    const boost = INTENT_BOOST[intentOf(text)] || {};
    const def = list.find(e => e.prefix === state.settings.defaultEngine) || list[0];
    const scored = list.map((e, i) => ({ e, s: (e === def ? 100 : 0) + (boost[e.cat] || 0) * 10 - i * 0.01 }));
    scored.sort((a, b) => b.s - a.s);
    return scored.map(x => x.e);
  }

  function direct(text, state) {
    const t = text.trim();
    const rows = [];
    if (!t || /\s/.test(t)) return rows;
    for (const e of state.engines) {
      if (!e.jump || !usable(e)) continue;
      if (e.jump === 'repo') {
        const m = /^([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})$/.exec(t);
        if (m && /[A-Za-z]/.test(m[1]) && /[A-Za-z]/.test(m[2]) && !/^-|-$/.test(m[1]) && !/^(r|u|user)$/i.test(m[1])) {
          rows.push({ key: 'jump:' + e.id, kind: 'action', label: m[1] + '/' + m[2], sub: e.name, payload: Links.origin(e.url) + '/' + m[1] + '/' + m[2], transient: true, url: true });
        }
      } else if (e.jump === 'reddit') {
        const m = /^\/?(r|u|user)\/([A-Za-z0-9_-]{2,21})$/i.exec(t);
        if (m) {
          const kind = m[1].toLowerCase() === 'r' ? 'r' : 'u';
          rows.push({ key: 'jump:' + e.id, kind: 'action', label: kind + '/' + m[2], sub: e.name, payload: hostOf(e) + '/' + kind + '/' + m[2], transient: true, url: true });
        }
      }
    }
    return rows;
  }

  function parseScoped(trimmed, state) {
    const lower = trimmed.toLowerCase();
    const engines = state.engines.filter(e => e.prefix && usable(e)).sort((a, b) => b.prefix.length - a.prefix.length);
    for (const e of engines) {
      const prefix = e.prefix.toLowerCase();
      if (lower.startsWith(prefix + ' ')) return { scope: 'web', text: trimmed.slice(prefix.length + 1).trim(), engine: e };
      if (wantsTarget(e) && lower.startsWith(prefix) && /[>:]/.test(trimmed.charAt(prefix.length))) {
        const m = /^[>:]([A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,4})?)(?:\s+(.*))?$/.exec(trimmed.slice(prefix.length));
        if (m) return { scope: 'web', text: (m[2] || '').trim(), engine: e, to: m[1].toLowerCase() };
      }
    }
    return null;
  }

  function migrate(engines, uid) {
    const out = engines.map(e => {
      const next = { ...e };
      if (!next.cat) next.cat = 'web';
      const legacy = LEGACY[next.prefix];
      const fresh = DEFAULTS.find(d => d.prefix === next.prefix);
      if (legacy && fresh && next.url === legacy) {
        Object.assign(next, { url: fresh.url, cat: fresh.cat, priv: fresh.priv });
        if (fresh.jump) next.jump = fresh.jump;
        if ('hostDefault' in fresh) { next.host = next.host || fresh.host; next.hostDefault = fresh.hostDefault; }
      }
      return next;
    });
    const prefixes = new Set(out.map(e => (e.prefix || '').toLowerCase()));
    const names = new Set(out.map(e => (e.name || '').toLowerCase()));
    for (const d of DEFAULTS) {
      if (prefixes.has(d.prefix) || names.has(d.name.toLowerCase())) continue;
      out.push({ id: uid(), aliases: [], ...d });
    }
    return out;
  }

  return { CATEGORIES, defaults, build, home, targets, hostOf, hasHost, usable, wantsTarget, intentOf, rank, direct, parseScoped, migrate, scriptOf, LANG_CODE };
})();
