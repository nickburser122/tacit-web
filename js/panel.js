const Panel = (() => {
  const { el } = UI;
  const t = k => I18n.t(k);
  let root = null;
  let body = null;
  let tabsNode = null;
  let current = 'links';
  let focusId = null;
  let filter = '';
  let clipMessage = '';

  const tabs = ['links', 'people', 'snippets', 'engines', 'commands', 'settings', 'data', 'keys'];
  const tabIcons = { links: 'link', people: 'people', snippets: 'snippet', engines: 'web', commands: 'command', settings: 'settings', data: 'data', keys: 'keys' };

  const tables = {
    links: {
      list: () => Store.state.links,
      blank: () => ({ id: Store.uid(), name: '', url: '', aliases: [] }),
      cols: [
        { key: 'name', label: 'col_name' },
        { key: 'url', label: 'col_url', type: 'url' },
        { key: 'aliases', label: 'col_aliases', list: true }
      ],
      csv: ['name', 'url', 'aliases'],
      pinKey: r => 'link:' + r.id
    },
    people: {
      list: () => Store.state.people,
      blank: () => ({ id: Store.uid(), name: '', phones: [], emails: [], aliases: [] }),
      cols: [
        { key: 'name', label: 'col_name' },
        { key: 'phones', label: 'col_phones', list: true, type: 'tel' },
        { key: 'emails', label: 'col_emails', list: true },
        { key: 'aliases', label: 'col_aliases', list: true }
      ],
      csv: ['name', 'phones', 'emails', 'aliases'],
      pinKey: r => 'person:' + r.id
    },
    snippets: {
      list: () => Store.state.snippets,
      blank: () => ({ id: Store.uid(), trigger: '', title: '', body: '', aliases: [] }),
      cols: [
        { key: 'trigger', label: 'col_trigger' },
        { key: 'title', label: 'col_title' },
        { key: 'body', label: 'col_body', multiline: true },
        { key: 'aliases', label: 'col_aliases', list: true }
      ],
      csv: ['trigger', 'title', 'body', 'aliases'],
      pinKey: r => 'snippet:' + r.id
    },
    engines: {
      list: () => Store.state.engines,
      blank: () => ({ id: Store.uid(), prefix: '', name: '', url: '', aliases: [] }),
      cols: [
        { key: 'prefix', label: 'col_prefix' },
        { key: 'name', label: 'col_name' },
        { key: 'url', label: 'col_template', type: 'url' },
        { key: 'aliases', label: 'col_aliases', list: true }
      ],
      csv: ['prefix', 'name', 'url', 'aliases'],
      pinKey: r => 'engine:' + r.id
    }
  };

  function build() {
    root = el('div', { id: 'panel', role: 'dialog', 'aria-modal': 'true', hidden: true });
    const head = el('header', { class: 'panel-head' });
    head.append(
      el('button', { type: 'button', class: 'icon-btn', id: 'panel-close', 'aria-label': t('back'),
        html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>', onclick: close }),
      el('h1', { id: 'panel-title', text: t('panel') })
    );
    tabsNode = el('nav', { class: 'panel-tabs', role: 'tablist' });
    body = el('div', { class: 'panel-body' });
    root.append(head, tabsNode, body);
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !document.querySelector('.dialog-backdrop')) {
        const tag = e.target.tagName;
        if ((tag === 'INPUT' || tag === 'TEXTAREA') && e.target.value && e.target.type === 'search') return;
        e.preventDefault();
        close();
      }
    });
    document.body.append(root);
  }

  function renderTabs() {
    tabsNode.replaceChildren(...tabs.map(name => el('button', {
      type: 'button', class: 'tab', role: 'tab', title: t('tab_' + name), 'aria-label': t('tab_' + name),
      'aria-selected': name === current ? 'true' : 'false',
      onclick: () => { current = name; filter = ''; focusId = null; render(); }
    }, el('span', { class: 'tab-icon', html: UI.icons[tabIcons[name]] }), el('span', { class: 'tab-label', text: t('tab_' + name) }))));
  }

  function render() {
    root.querySelector('#panel-title').textContent = t('panel');
    root.querySelector('#panel-close').setAttribute('aria-label', t('back'));
    renderTabs();
    tabsNode.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    const inner = el('div', { class: 'panel-inner' });
    if (tables[current]) inner.append(...tableView(current));
    else if (current === 'commands') inner.append(...commandsView());
    else if (current === 'settings') inner.append(settingsView());
    else if (current === 'data') inner.append(...dataView());
    else if (current === 'keys') inner.append(UI.keysNode());
    body.replaceChildren(inner);
  }

  function sharedAliases() {
    const owners = new Map();
    const add = (alias, owner) => {
      const k = Norm.normalize(alias);
      if (!owners.has(k)) owners.set(k, new Set());
      owners.get(k).add(owner);
    };
    for (const name of Object.keys(tables)) for (const r of tables[name].list()) for (const a of r.aliases || []) add(a, name + r.id);
    for (const [id, list] of Object.entries(Store.state.commandAliases)) for (const a of list) add(a, 'command' + id);
    return [...owners.entries()].filter(([, s]) => s.size > 1).map(([k]) => k);
  }

  function save(rerender) {
    Store.changed();
    if (rerender) render();
  }

  function tableView(name) {
    const spec = tables[name];
    const list = spec.list();
    const search = el('input', { type: 'search', placeholder: t('filter'), value: filter, 'aria-label': t('filter'), dir: 'auto' });
    let frame = 0;
    search.addEventListener('input', () => {
      filter = search.value;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tbodyFill);
    });
    const more = el('button', {
      type: 'button', class: 'tool-btn', title: t('more'), 'aria-label': t('more'), 'aria-haspopup': 'menu', html: UI.icons.more,
      onclick: () => {
        const entries = [
          [t('fill_initials'), () => fillInitials(spec)],
          [t('export_csv'), () => exportCsv(name)],
          [t('import_csv'), () => importCsv(name)]
        ];
        if (name === 'links') entries.push([t('import_bookmarks'), importBookmarks]);
        if (name === 'people') entries.push([t('import_vcf'), importVcf]);
        UI.menu(t('more'), entries, more, more);
      }
    });
    const toolbar = el('div', { class: 'toolbar' }, search,
      el('button', { type: 'button', class: 'tool-btn primary', title: t('add_row'), 'aria-label': t('add_row'), html: UI.icons.plus, onclick: () => {
        const row = spec.blank();
        list.push(row);
        focusId = row.id;
        filter = '';
        save(true);
      } }),
      more
    );

    const shared = sharedAliases();
    const sharedNode = el('div', { class: 'shared' });
    if (shared.length) sharedNode.append(t('shared_aliases') + ': ', el('b', { text: shared.slice(0, 20).join(', ') }));

    const table = el('table', { class: 'grid' });
    const headRow = el('tr', {}, ...spec.cols.map(c => el('th', { text: t(c.label), scope: 'col' })),
      el('th', { text: t('col_pin'), scope: 'col' }), el('th', {}));
    table.append(el('thead', {}, headRow));
    const tbody = el('tbody');
    table.append(tbody);

    function tbodyFill() {
      const needle = Norm.normalize(filter);
      const visible = list.filter(r => !needle || spec.cols.some(c => {
        const v = r[c.key];
        return Norm.normalize(Array.isArray(v) ? v.join(' ') : v || '').includes(needle);
      }));
      tbody.replaceChildren(...visible.map(r => rowNode(name, spec, r, shared)));
    }
    tbodyFill();

    const notes = [];
    if (name === 'snippets') notes.push(el('p', { class: 'note', text: '{date} {time} {datetime} {clipboard} · {date:dd/MM/yyyy}' }));
    if (name === 'engines') notes.push(el('p', { class: 'note', text: 'https://example.com/search?q=%s' }));

    setTimeout(() => {
      if (!focusId) return;
      const target = body.querySelector(`[data-row="${focusId}"] input, [data-row="${focusId}"] textarea`);
      target?.focus();
      focusId = null;
    });

    return [toolbar, ...notes, sharedNode, el('div', { class: 'table-wrap' }, table)];
  }

  function rowNode(name, spec, row, shared) {
    const tr = el('tr', { 'data-row': row.id });
    for (const c of spec.cols) {
      const value = Array.isArray(row[c.key]) ? row[c.key].join(', ') : (row[c.key] || '');
      const field = c.multiline
        ? el('textarea', { 'aria-label': t(c.label), dir: 'auto', rows: '1' })
        : el('input', { 'aria-label': t(c.label), dir: c.type === 'url' ? 'ltr' : 'auto', type: 'text', spellcheck: 'false', autocomplete: 'off' });
      field.value = value;
      field.addEventListener('input', () => {
        row[c.key] = c.list ? Store.splitList(field.value) : field.value;
        Store.changed();
      });
      field.addEventListener('change', () => {
        if (c.type === 'url' && field.value && !/^[a-z][a-z0-9+.-]*:/i.test(field.value) && name !== 'engines') {
          field.value = 'https://' + field.value.trim();
          row[c.key] = field.value;
          Store.changed();
        }
      });
      const td = el('td', {}, field);
      if (c.key === 'aliases' && (row.aliases || []).some(a => shared.includes(Norm.normalize(a)))) td.classList.add('conflict');
      tr.append(td);
    }
    const pinKey = spec.pinKey(row);
    const pin = el('input', { type: 'checkbox', 'aria-label': t('col_pin') });
    pin.checked = Store.state.pins.includes(pinKey);
    pin.addEventListener('change', () => {
      Store.state.pins = pin.checked ? [...Store.state.pins, pinKey] : Store.state.pins.filter(k => k !== pinKey);
      Store.changed();
    });
    tr.append(el('td', { class: 'cell-center' }, pin));
    tr.append(el('td', { class: 'cell-center' }, el('button', {
      type: 'button', class: 'row-remove', 'aria-label': t('remove_row'), text: '×',
      onclick: () => {
        const list = spec.list();
        list.splice(list.indexOf(row), 1);
        Store.state.pins = Store.state.pins.filter(k => k !== pinKey);
        save(true);
      }
    })));
    return tr;
  }

  function fillInitials(spec) {
    let changed = 0;
    for (const r of spec.list()) {
      if ((r.aliases || []).length) continue;
      const source = r.name || r.title || '';
      const words = Norm.words(Norm.normalize(source));
      if (words.length < 2) continue;
      r.aliases = [words.map(w => w[0]).join('')];
      changed++;
    }
    if (changed) save(true);
  }

  function exportCsv(name) {
    const spec = tables[name];
    const rows = [spec.csv, ...spec.list().map(r => spec.csv.map(k => Array.isArray(r[k]) ? r[k].join(', ') : (r[k] || '')))];
    UI.download(`tacit-${name}.csv`, '\ufeff' + Importers.Csv.encode(rows), 'text/csv');
  }

  async function importCsv(name) {
    const text = await UI.pickFile('.csv,text/csv');
    if (!text) return;
    const spec = tables[name];
    const rows = Importers.Csv.decode(text.replace(/^\ufeff/, '')).filter(r => r.some(Boolean));
    if (!rows.length) return;
    const header = rows[0].map(h => h.trim().toLowerCase());
    const hasHeader = spec.csv.some(k => header.includes(k));
    const keys = hasHeader ? header : spec.csv;
    const list = spec.list();
    const keyField = spec.csv[0] === 'prefix' ? 'prefix' : 'name';
    let count = 0;
    for (const r of hasHeader ? rows.slice(1) : rows) {
      const obj = {};
      keys.forEach((k, i) => { if (spec.csv.includes(k)) obj[k] = r[i] ?? ''; });
      const existing = obj[keyField] ? list.find(x => Norm.normalize(x[keyField] || '') === Norm.normalize(obj[keyField])) : null;
      const target = existing || spec.blank();
      for (const c of spec.cols) if (c.key in obj) target[c.key] = c.list ? Store.splitList(obj[c.key]) : obj[c.key];
      if (!existing) list.push(target);
      count++;
    }
    save(true);
    App.flash(I18n.t('rows_imported', { n: count }));
  }

  async function importBookmarks() {
    const html = await UI.pickFile('.html,.htm,text/html');
    if (!html) return;
    const found = Importers.bookmarks(html);
    const known = new Set(Store.state.links.map(l => l.url));
    let n = 0;
    for (const b of found) {
      if (known.has(b.url)) continue;
      Store.state.links.push({ id: Store.uid(), ...b });
      n++;
    }
    save(true);
    App.flash(I18n.t('rows_imported', { n }));
  }

  async function importVcf() {
    const text = await UI.pickFile('.vcf,text/vcard,text/x-vcard');
    if (!text) return;
    const found = Importers.vcards(text);
    let n = 0;
    for (const p of found) {
      const existing = Store.state.people.find(x => Norm.normalize(x.name) === Norm.normalize(p.name));
      if (existing) {
        existing.phones = [...new Set([...existing.phones, ...p.phones])];
        existing.emails = [...new Set([...existing.emails, ...p.emails])];
      } else {
        Store.state.people.push({ id: Store.uid(), ...p });
      }
      n++;
    }
    save(true);
    App.flash(I18n.t('rows_imported', { n }));
  }

  function commandsView() {
    const table = el('table', { class: 'grid' });
    table.append(el('thead', {}, el('tr', {}, el('th', { text: t('col_command') }), el('th', { text: t('col_aliases') }), el('th', { text: t('col_pin') }))));
    const tbody = el('tbody');
    for (const c of Compose.commands) {
      const field = el('input', { type: 'text', dir: 'auto', 'aria-label': t('col_aliases') + ' ' + t(c.key) });
      field.value = (Store.state.commandAliases[c.id] || []).join(', ');
      field.addEventListener('input', () => {
        Store.state.commandAliases[c.id] = Store.splitList(field.value);
        Store.changed();
      });
      const pinKey = 'command:' + c.id;
      const pin = el('input', { type: 'checkbox', 'aria-label': t('col_pin') });
      pin.checked = Store.state.pins.includes(pinKey);
      pin.addEventListener('change', () => {
        Store.state.pins = pin.checked ? [...Store.state.pins, pinKey] : Store.state.pins.filter(k => k !== pinKey);
        Store.changed();
      });
      tbody.append(el('tr', {}, el('td', { class: 'readonly', text: t(c.key) }), el('td', {}, field), el('td', { class: 'cell-center' }, pin)));
    }
    table.append(tbody);
    return [el('div', { class: 'table-wrap' }, table)];
  }

  function settingsView() {
    const s = Store.state.settings;
    const wrap = el('div', { class: 'settings' });
    let n = 0;
    const id = () => 'set-' + (n++);

    const section = title => {
      const sec = el('section', {}, el('h2', { text: t(title) }));
      wrap.append(sec);
      return sec;
    };

    const toggle = (sec, label, key, after) => {
      const i = id();
      const input = el('input', { type: 'checkbox', id: i, role: 'switch' });
      input.checked = !!s[key];
      input.addEventListener('change', () => { s[key] = input.checked; Store.changed(); after?.(); });
      sec.append(el('div', { class: 'setting' }, el('label', { for: i, text: t(label) }), el('span', { class: 'switch' }, input, el('span'))));
    };

    const select = (sec, label, key, options) => {
      const i = id();
      const dd = UI.dropdown(options, s[key], v => { s[key] = v; Store.changed(); if (key === 'lang') render(); }, { id: i });
      sec.append(el('div', { class: 'setting' }, el('label', { for: i, text: t(label) }), dd));
    };

    const number = (sec, label, key, min, max) => {
      const i = id();
      const inp = el('input', { type: 'number', id: i, min, max, inputmode: 'numeric' });
      inp.value = s[key];
      inp.addEventListener('change', () => {
        const v = Math.max(min, Math.min(max, parseInt(inp.value, 10) || 0));
        inp.value = v;
        s[key] = v;
        Store.changed();
      });
      sec.append(el('div', { class: 'setting' }, el('label', { for: i, text: t(label) }), inp));
    };

    const text = (sec, label, getter, setter, width) => {
      const i = id();
      const inp = el('input', { type: 'text', id: i, dir: 'ltr', spellcheck: 'false' });
      inp.value = getter();
      if (width) inp.style.maxWidth = width;
      inp.addEventListener('input', () => { setter(inp.value); Store.changed(); });
      sec.append(el('div', { class: 'setting' }, el('label', { for: i, text: t(label) }), inp));
    };

    const look = section('set_look');
    select(look, 'set_theme', 'theme', [['system', t('theme_system')], ['dark', t('theme_dark')], ['light', t('theme_light')]]);
    select(look, 'set_lang', 'lang', [['auto', t('lang_auto')], ['en', 'English'], ['ar', 'العربية']]);
    toggle(look, 'set_bar_bottom', 'barBottom');
    toggle(look, 'set_clock', 'clock');
    toggle(look, 'set_date', 'date');
    number(look, 'set_results', 'results', 3, 30);

    const search = section('set_search');
    select(search, 'set_fuzzy', 'strictness', [['off', t('fuzzy_off')], ['normal', t('fuzzy_normal')], ['loose', t('fuzzy_loose')]]);
    toggle(search, 'set_translit', 'transliterate');
    toggle(search, 'set_learn', 'learn');
    select(search, 'set_engine', 'defaultEngine', Store.state.engines.filter(e => e.prefix).map(e => [e.prefix, e.name]));
    const orderBox = el('div', { class: 'order-list' });
    const drawOrder = () => {
      orderBox.replaceChildren(...s.kindOrder.map((k, i) => el('span', { class: 'order-chip' }, t('kind_' + k),
        el('button', { type: 'button', 'aria-label': '↑ ' + t('kind_' + k), text: document.documentElement.dir === 'rtl' ? '›' : '‹',
          onclick: () => { if (i > 0) { [s.kindOrder[i - 1], s.kindOrder[i]] = [s.kindOrder[i], s.kindOrder[i - 1]]; Store.changed(); drawOrder(); } } }),
        el('button', { type: 'button', 'aria-label': '↓ ' + t('kind_' + k), text: document.documentElement.dir === 'rtl' ? '‹' : '›',
          onclick: () => { if (i < s.kindOrder.length - 1) { [s.kindOrder[i + 1], s.kindOrder[i]] = [s.kindOrder[i], s.kindOrder[i + 1]]; Store.changed(); drawOrder(); } } })
      )));
    };
    drawOrder();
    search.append(el('div', { class: 'setting' }, el('label', { text: t('set_order') })), orderBox);

    const actions = section('set_actions');
    toggle(actions, 'set_newtab', 'newTab');
    toggle(actions, 'set_clear', 'clearAfter');
    text(actions, 'set_country', () => s.countryCode, v => { s.countryCode = v.replace(/\D/g, ''); }, '90px');

    const clip = section('set_clip');
    toggle(clip, 'set_clip_on', 'clipEnabled');
    toggle(clip, 'set_clip_focus', 'clipCaptureOnFocus', async () => {
      if (!s.clipCaptureOnFocus) return;
      const r = await ClipAccess.read({ mode: 'manual' });
      if (r.ok) { clipMessage = ''; App.ingestClip(r.text); return; }
      s.clipCaptureOnFocus = false;
      clipMessage = t(r.reason === 'unsupported' ? 'clip_unsupported' : 'clip_blocked_help');
      Store.changed('settings');
      render();
    });
    const warn = !!(clipMessage || s.clipDenied);
    clip.append(el('p', { class: 'note' + (warn ? ' warn' : ''), text: clipMessage || t(s.clipDenied ? 'clip_blocked_help' : 'set_clip_focus_note') }));
    if (s.clipDenied) {
      clip.append(el('div', { class: 'toolbar' }, el('button', { type: 'button', class: 'btn', text: t('set_clip_retry'), onclick: async () => {
        s.clipDenied = 0;
        const r = await ClipAccess.read({ mode: 'manual' });
        if (r.ok) { clipMessage = ''; App.ingestClip(r.text); }
        else clipMessage = t(r.reason === 'unsupported' ? 'clip_unsupported' : 'clip_blocked_help');
        Store.changed('settings');
        render();
      } })));
    }
    number(clip, 'set_clip_days', 'clipDays', 0, 3650);
    number(clip, 'set_clip_max', 'clipMax', 0, 100000);
    select(clip, 'set_sensitive', 'sensitivePolicy', [['skip', t('sens_skip')], ['expire', t('sens_expire')], ['hide', t('sens_hide')]]);

    const prefixes = section('set_prefixes');
    for (const [key, label] of [['calc', 'p_calc'], ['clip', 'p_clip'], ['people', 'p_people'], ['snippets', 'p_snippets'], ['commands', 'p_commands']]) {
      text(prefixes, label, () => s.prefixes[key], v => { s.prefixes[key] = v; }, '90px');
    }
    return wrap;
  }

  function dataView() {
    const base = location.href.split(/[?#]/)[0];
    const card = (title, note, ...children) => el('div', { class: 'card' }, el('h3', { text: t(title) }),
      note ? el('p', { class: 'note', text: t(note) }) : null, ...children);
    const urlTemplate = base + '?q=%s';
    return [
      el('p', { class: 'note', text: t('data_storage') }),
      el('div', { class: 'data-grid' },
        card('data_export', null, el('div', { class: 'toolbar' },
          el('button', { type: 'button', class: 'btn primary', text: t('data_export'), onclick: App.exportAll }),
          el('button', { type: 'button', class: 'btn', text: t('data_import'), onclick: App.importAll }))),
        card('data_url', 'data_url_note', el('code', { text: urlTemplate }),
          el('div', { class: 'toolbar' }, el('button', { type: 'button', class: 'btn', text: t('copy'), onclick: () => App.copy(urlTemplate) }))),
        card('data_home', 'data_home_note', el('code', { text: base }),
          el('div', { class: 'toolbar' }, el('button', { type: 'button', class: 'btn', text: t('copy'), onclick: () => App.copy(base) }))),
        card('data_clear_clip', null, el('div', { class: 'toolbar' },
          el('button', { type: 'button', class: 'btn danger', text: t('data_clear_clip'), onclick: () => {
            if (confirm(t('data_clear_clip_confirm'))) { Store.state.clips = []; Store.changed('clips'); }
          } }),
          el('button', { type: 'button', class: 'btn danger', text: t('data_clear_usage'), onclick: () => Store.resetUsage() }),
          el('button', { type: 'button', class: 'btn danger', text: t('data_reset'), onclick: () => {
            if (confirm(t('data_reset_confirm'))) { Store.reset(); render(); }
          } })))
      )
    ];
  }

  function open(tab, rowId) {
    if (!root) build();
    if (tab) current = tab;
    focusId = rowId || null;
    filter = '';
    clipMessage = '';
    root.hidden = false;
    document.getElementById('launcher').inert = true;
    render();
    if (rowId) {
      setTimeout(() => {
        const row = body.querySelector(`[data-row="${rowId}"]`);
        row?.scrollIntoView({ block: 'center' });
        row?.querySelector('input, textarea')?.focus();
      });
    } else {
      tabsNode.querySelector('[aria-selected="true"]')?.focus();
    }
  }

  function close() {
    if (!root) return;
    root.hidden = true;
    document.getElementById('launcher').inert = false;
    App.refresh();
    App.input.focus({ preventScroll: true });
  }

  return {
    open, close,
    toggle: () => (root && !root.hidden ? close() : open()),
    isOpen: () => !!root && !root.hidden
  };
})();
