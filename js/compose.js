const Compose = (() => {
  const commands = [
    { id: 'panel', key: 'cmd_panel', extra: ['settings', 'preferences', 'options', 'الإعدادات'] },
    { id: 'theme', key: 'cmd_theme', extra: ['dark mode', 'light mode', 'black', 'white'] },
    { id: 'clock', key: 'cmd_clock', extra: ['time', 'date'] },
    { id: 'lang', key: 'cmd_lang', extra: ['arabic', 'english', 'العربية'] },
    { id: 'add-link', key: 'cmd_add_link', extra: ['bookmark', 'new link'] },
    { id: 'add-person', key: 'cmd_add_person', extra: ['contact', 'new contact'] },
    { id: 'add-snippet', key: 'cmd_add_snippet', extra: ['new snippet', 'text'] },
    { id: 'save-clip', key: 'cmd_save_clip', extra: ['paste', 'clipboard'] },
    { id: 'clear-clip', key: 'cmd_clear_clip', extra: ['clipboard', 'wipe'] },
    { id: 'export', key: 'cmd_export', extra: ['backup', 'json'] },
    { id: 'import', key: 'cmd_import', extra: ['restore', 'json'] },
    { id: 'keys', key: 'cmd_keys', extra: ['shortcuts', 'help', 'keyboard'] }
  ];

  function buildItems(state) {
    const pins = new Set(state.pins);
    const items = [];
    for (const l of state.links) {
      if (!l.name || !l.url) continue;
      let host = '';
      try { host = new URL(l.url).hostname.replace(/^www\./, ''); } catch (e) { host = l.url; }
      items.push({ key: 'link:' + l.id, id: l.id, kind: 'link', label: l.name, sub: host, extra: [host.split('.')[0]],
        payload: l.url, aliases: l.aliases, pinned: pins.has('link:' + l.id) });
    }
    for (const p of state.people) {
      if (!p.name) continue;
      items.push({ key: 'person:' + p.id, id: p.id, kind: 'person', label: p.name, sub: (p.phones[0] || p.emails[0] || ''),
        extra: [...(p.phones || [])], person: p, aliases: p.aliases, pinned: pins.has('person:' + p.id) });
    }
    for (const s of state.snippets) {
      if (!s.body) continue;
      const label = s.title || s.body.split('\n')[0].slice(0, 60);
      items.push({ key: 'snippet:' + s.id, id: s.id, kind: 'snippet', label, sub: s.body.replace(/\n/g, ' ').slice(0, 80),
        extra: s.trigger ? [s.trigger] : [], payload: s.body, aliases: s.aliases, pinned: pins.has('snippet:' + s.id) });
    }
    for (const c of commands) {
      items.push({ key: 'command:' + c.id, id: c.id, kind: 'command', label: I18n.t(c.key), sub: 'Tacit',
        extra: [I18n.tables.en[c.key], ...c.extra], payload: c.id, aliases: state.commandAliases[c.id] || [],
        pinned: pins.has('command:' + c.id) });
    }
    for (const e of state.engines) {
      if (!e.name || !e.url) continue;
      items.push({ key: 'engine:' + e.id, id: e.id, kind: 'web', label: e.name, sub: e.prefix ? e.prefix + ' ⎵' : '',
        extra: [], payload: e.url, engine: e, aliases: e.aliases, pinned: pins.has('engine:' + e.id), isEngine: true });
    }
    return items;
  }

  function parse(raw, state) {
    const p = state.settings.prefixes;
    const trimmed = raw.replace(/^\s+/, '');
    const scoped = [
      [p.clip, 'clip'], [p.calc, 'calc'], [p.people, 'person'], [p.snippets, 'snippet'], [p.commands, 'command']
    ].filter(([prefix]) => prefix).sort((a, b) => b[0].length - a[0].length);
    for (const [prefix, scope] of scoped) {
      if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) return { scope, text: trimmed.slice(prefix.length).trim() };
    }
    const engines = [...state.engines].filter(e => e.prefix).sort((a, b) => b.prefix.length - a.prefix.length);
    for (const e of engines) {
      const token = e.prefix.toLowerCase() + ' ';
      if (trimmed.toLowerCase().startsWith(token)) return { scope: 'web', text: trimmed.slice(token.length).trim(), engine: e };
    }
    return { scope: 'all', text: raw.trim() };
  }

  function recognize(text) {
    const v = text.trim();
    if (!v) return null;
    const norm = Norm.normalize(v);
    if (/^\+?[0-9][0-9 ()\-]{5,}$/.test(norm)) {
      const d = Norm.digits(v);
      if (d.replace('+', '').length >= 6) return { type: 'phone', value: d };
    }
    if (v.includes(' ')) return null;
    if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v)) return { type: 'email', value: v };
    if (/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(v) && !v.endsWith('.')) {
      return { type: 'url', value: /^https?:\/\//i.test(v) ? v : 'https://' + v };
    }
    if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/\S*)?$/i.test(v)) return { type: 'url', value: 'http://' + v };
    return null;
  }

  function engineUrl(engine, text) {
    return engine.url.replace('%s', encodeURIComponent(text).replace(/%20/g, '+'));
  }

  function defaultEngine(state) {
    return state.engines.find(e => e.prefix === state.settings.defaultEngine) || state.engines[0];
  }

  function webRow(engine, text) {
    return { key: 'web:' + engine.id, kind: 'web', label: text, sub: engine.name, payload: engineUrl(engine, text), transient: true };
  }

  function phoneRows(num) {
    return [{ key: 'num', kind: 'person', label: num, sub: I18n.t('kind_action'), transient: true,
      person: { id: 'num', name: num, phones: [num], emails: [] } }];
  }

  function clipRows(state, text) {
    const needle = Norm.normalize(text);
    return state.clips
      .filter(c => !needle || Norm.normalize(c.text).includes(needle))
      .map(c => ({
        key: 'clip:' + c.id, id: c.id, kind: 'clip', transient: true,
        label: c.hidden ? '••••••' : c.text.replace(/\s+/g, ' ').slice(0, 140),
        sub: c.hidden ? I18n.t('clip_hidden') : relative(c.time), payload: c.text, hidden: c.hidden
      }));
  }

  let rtf = null;
  let rtfLang = '';

  function relative(time) {
    const s = Math.round((Date.now() - time) / 1000);
    if (!rtf || rtfLang !== I18n.lang) {
      rtf = new Intl.RelativeTimeFormat(I18n.lang, { numeric: 'auto' });
      rtfLang = I18n.lang;
    }
    if (s < 60) return rtf.format(-s, 'second');
    if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
    if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
    return rtf.format(-Math.round(s / 86400), 'day');
  }

  function compose(raw, state) {
    const limit = Math.max(3, Math.min(30, state.settings.results | 0 || 8));
    const parsed = parse(raw, state);
    const text = parsed.text;
    const rows = [];
    const calcRow = t => {
      const r = Calc.evaluate(t);
      return r ? { key: 'calc', kind: 'calc', label: r.display, sub: t, payload: r.copy, transient: true } : null;
    };
    switch (parsed.scope) {
      case 'calc': { const r = calcRow(text); if (r) rows.push(r); break; }
      case 'web': if (text) rows.push(webRow(parsed.engine, text)); break;
      case 'clip': rows.push(...clipRows(state, text).slice(0, limit * 4)); break;
      case 'person': case 'snippet': case 'command':
        rows.push(...Engine.search(text, limit, new Set([parsed.scope])).map(h => h.item));
        break;
      default: {
        if (!text) {
          rows.push(...Engine.search('', limit).map(h => h.item));
          break;
        }
        const rec = recognize(text);
        const calc = !rec && Calc.looksLikeMath(text) ? calcRow(text) : null;
        const hits = Engine.search(text, limit);
        const exactAlias = hits.length && Engine.tierOf(hits[0].raw) >= Engine.Tier.ALIAS_EXACT;
        if (calc && !exactAlias) rows.push(calc);
        if (rec?.type === 'phone') rows.push(...phoneRows(rec.value));
        if (rec?.type === 'url') rows.push({ key: 'url', kind: 'action', label: rec.value.replace(/^https?:\/\//, ''), sub: I18n.t('open'), payload: rec.value, transient: true, url: true });
        if (rec?.type === 'email') rows.push({ key: 'mail', kind: 'action', label: rec.value, sub: I18n.t('email'), payload: 'mailto:' + rec.value, transient: true, url: true });
        for (const h of hits) if (rows.length < limit) rows.push(h.item);
        if (calc && exactAlias) rows.splice(1, 0, calc);
        const engine = defaultEngine(state);
        if (engine) rows.push(webRow(engine, text));
      }
    }
    return { rows, parsed };
  }

  return { buildItems, compose, parse, recognize, engineUrl, defaultEngine, commands };
})();
