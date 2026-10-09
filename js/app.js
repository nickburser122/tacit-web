const App = (() => {
  const $ = id => document.getElementById(id);
  const launcher = $('launcher');
  const input = $('search-input');
  const list = $('results');
  const hint = $('hint');
  const clockBlock = $('clock-block');
  const timeEl = $('clock-time');
  const dateEl = $('clock-date');

  let rows = [];
  let selected = 0;
  let hintTimer = null;
  let stale = false;
  let timeFmt = null;
  let dateFmt = null;
  let fmtLang = '';
  let lastMinute = -1;
  let pressTimer = null;
  let lastAutoRead = 0;
  let clockSig = '';
  const themeMetas = document.querySelectorAll('meta[name="theme-color"]');

  const S = () => Store.state.settings;

  function applyTheme() {
    const theme = S().theme;
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = dark ? 'dark' : 'light';
    const root = document.documentElement;
    if (root.dataset.theme === next) return;
    const paint = () => {
      root.dataset.theme = next;
      for (const m of themeMetas) m.content = dark ? '#1c1b19' : '#f6f2ea';
    };
    if (document.startViewTransition && document.visibilityState === 'visible' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(paint);
    } else {
      paint();
    }
  }

  function applyLight() {
    const s = S();
    applyTheme();
    I18n.apply(s.lang);
    launcher.classList.toggle('bar-bottom', s.barBottom);
    launcher.classList.toggle('bar-top', !s.barBottom);
    input.placeholder = I18n.t('search');
    $('panel-button').setAttribute('aria-label', I18n.t('panel'));
    clockBlock.hidden = !s.clock && !s.date;
    timeEl.hidden = !s.clock;
    dateEl.hidden = !s.date;
    Engine.configure({
      strictness: s.strictness, transliterate: s.transliterate, kindOrder: s.kindOrder,
      usage: s.learn ? Store.state.usage : {}
    });
    const sig = I18n.lang + '|' + s.clock + '|' + s.date;
    tick(sig !== clockSig);
    clockSig = sig;
  }

  function reindex() {
    Engine.setItems(Compose.buildItems(Store.state));
    stale = false;
  }

  function applySettings() {
    applyLight();
    reindex();
  }

  function tick(force) {
    if (clockBlock.hidden) return;
    const now = new Date();
    const minute = now.getHours() * 60 + now.getMinutes();
    if (!force && minute === lastMinute) return;
    lastMinute = minute;
    if (fmtLang !== I18n.lang) {
      timeFmt = new Intl.DateTimeFormat(I18n.lang, { hour: '2-digit', minute: '2-digit' });
      dateFmt = new Intl.DateTimeFormat(I18n.lang, { weekday: 'long', day: 'numeric', month: 'long' });
      fmtLang = I18n.lang;
    }
    const nodes = timeFmt.formatToParts(now).map(part => {
      if (part.type !== 'dayPeriod') return document.createTextNode(part.value);
      const span = document.createElement('span');
      span.className = 'period';
      span.textContent = part.value;
      return span;
    });
    timeEl.replaceChildren(...nodes);
    dateEl.textContent = dateFmt.format(now);
  }

  function flash(text, ms) {
    hint.textContent = text;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { hint.textContent = ''; }, ms || 1400);
  }

  function render() {
    const bottom = S().barBottom;
    const fragment = document.createDocumentFragment();
    const count = rows.length;
    for (let i = 0; i < count; i++) {
      const logical = bottom ? count - 1 - i : i;
      fragment.append(renderRow(rows[logical], logical));
    }
    if (!count && !input.value.trim()) fragment.append(emptyNode());
    list.replaceChildren(fragment);
    updateSelection();
  }

  function emptyNode() {
    const p = S().prefixes;
    const entries = [[p.calc, 'calc', 'p_calc'], [p.people, 'people', 'p_people'], [p.snippets, 'snippet', 'p_snippets'],
      [p.commands, 'command', 'p_commands'], [p.clip, 'clip', 'p_clip']].filter(([k]) => k && k.trim());
    return UI.el('li', { class: 'empty', role: 'presentation' },
      ...entries.map(([k, icon, label]) => UI.el('button', {
        type: 'button', class: 'chip', 'data-prefix': k, title: I18n.t(label), 'aria-label': I18n.t(label)
      }, UI.el('kbd', { text: k.trim() }), UI.el('span', { class: 'chip-icon', html: UI.icons[icon] || UI.icons.action }))));
  }

  function renderRow(item, logical) {
    const li = UI.el('li', {
      class: 'result ' + item.kind + (item.pinned ? ' pinned' : ''), role: 'option', id: 'r-' + logical, 'data-index': logical,
      'aria-selected': logical === selected ? 'true' : 'false'
    });
    const glyph = UI.el('div', { class: 'glyph', 'aria-hidden': 'true' });
    glyph.append(UI.glyphFor(item));
    const texts = UI.el('div', { class: 'texts' },
      UI.el('div', { class: 'title', text: item.label, dir: 'auto' }),
      item.sub ? UI.el('div', { class: 'sub', text: item.sub, dir: 'auto' }) : null
    );
    li.append(glyph, texts);
    if (item.kind === 'person') li.append(personActions(item));
    return li;
  }

  function personActions(item) {
    const p = item.person;
    const t = I18n.t;
    const box = UI.el('div', { class: 'actions' });
    const add = (icon, label) => box.append(UI.el('button', {
      type: 'button', class: 'action-btn', 'data-action': icon, 'aria-label': label + ' ' + item.label, title: label, html: UI.icons[icon]
    }));
    if (p.phones?.length) {
      add('call', t('call'));
      add('message', t('message'));
      add('whatsapp', t('whatsapp'));
    }
    if (p.emails?.length) add('email', t('email'));
    return box;
  }

  function personAction(item, action) {
    const p = item.person;
    Store.touch(item.key);
    if (action === 'call') withNumber(p, n => openUrl('tel:' + n));
    else if (action === 'message') withNumber(p, n => openUrl('sms:' + n));
    else if (action === 'whatsapp') withNumber(p, n => openUrl('https://wa.me/' + international(n), true));
    else if (action === 'email') openUrl('mailto:' + p.emails[0]);
  }

  function withNumber(person, run) {
    const phones = person.phones || [];
    if (phones.length <= 1) return run(phones[0]);
    const anchor = document.getElementById('r-' + selected) || input;
    UI.menu(person.name, phones.map(n => [n, () => run(n)]), anchor, input);
  }

  function international(num) {
    const digits = num.replace(/[^\d+]/g, '');
    const code = (S().countryCode || '').replace(/\D/g, '');
    if (digits.startsWith('+')) return digits.slice(1);
    if (digits.startsWith('00')) return digits.slice(2);
    if (code && digits.startsWith('0')) return code + digits.slice(1);
    if (code && !digits.startsWith(code)) return code + digits;
    return digits;
  }

  function updateSelection() {
    for (const li of list.children) {
      if (li.dataset.index === undefined) continue;
      li.setAttribute('aria-selected', Number(li.dataset.index) === selected ? 'true' : 'false');
    }
    const active = document.getElementById('r-' + selected);
    if (active) {
      input.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function run() {
    if (stale) reindex();
    rows = Compose.compose(input.value, Store.state).rows;
    selected = 0;
    render();
  }

  function openUrl(url, external) {
    const newTab = S().newTab || external;
    if (/^(tel|sms|mailto):/i.test(url)) {
      window.location.href = url;
    } else if (newTab) {
      window.open(url, '_blank', 'noopener');
    } else {
      window.location.href = url;
    }
    afterLeave();
  }

  function afterLeave() {
    if (S().clearAfter) {
      input.value = '';
      run();
    }
  }

  async function copy(text, message) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = UI.el('textarea', {});
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    flash(message || I18n.t('copied'));
    input.focus({ preventScroll: true });
  }

  function expandSnippet(body, clipboardText) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const fmt = (pattern, fallback) => {
      const p = pattern || fallback;
      return p.replace(/yyyy|MM|dd|HH|mm|ss/g, t => ({
        yyyy: now.getFullYear(), MM: pad(now.getMonth() + 1), dd: pad(now.getDate()),
        HH: pad(now.getHours()), mm: pad(now.getMinutes()), ss: pad(now.getSeconds())
      })[t]);
    };
    return body.replace(/\{(date|time|datetime|clipboard)(?::([^}]+))?\}/g, (_, kind, pattern) => {
      if (kind === 'date') return fmt(pattern, 'yyyy-MM-dd');
      if (kind === 'time') return fmt(pattern, 'HH:mm');
      if (kind === 'datetime') return fmt(pattern, 'yyyy-MM-dd HH:mm');
      return clipboardText || '';
    });
  }

  async function activate(item, newTab) {
    if (!item) return;
    if (!item.transient) Store.touch(item.key);
    switch (item.kind) {
      case 'link':
        if (newTab) { window.open(item.payload, '_blank', 'noopener'); afterLeave(); }
        else openUrl(item.payload);
        break;
      case 'web':
        if (item.isEngine) {
          input.value = item.engine.prefix + ' ';
          run();
          input.focus();
          break;
        }
        if (newTab) { window.open(item.payload, '_blank', 'noopener'); afterLeave(); }
        else openUrl(item.payload);
        break;
      case 'action':
        if (newTab && !item.payload.startsWith('mailto:')) { window.open(item.payload, '_blank', 'noopener'); afterLeave(); }
        else openUrl(item.payload);
        break;
      case 'person': {
        const p = item.person;
        if (p.phones?.length) withNumber(p, n => openUrl('tel:' + n));
        else if (p.emails?.length) openUrl('mailto:' + p.emails[0]);
        break;
      }
      case 'calc':
        copy(item.payload);
        break;
      case 'snippet': {
        let clip = '';
        let fallback = false;
        if (/\{clipboard/.test(item.payload)) {
          const r = await ClipAccess.read({ mode: 'assist' });
          if (r.ok) clip = r.text;
          else { clip = Store.state.clips[0]?.text || ''; fallback = true; }
        }
        copy(expandSnippet(item.payload, clip), fallback ? I18n.t('clip_fallback') : undefined);
        break;
      }
      case 'clip':
        copy(item.payload);
        break;
      case 'command':
        command(item.payload);
        break;
    }
  }

  function secondary(item, anchor) {
    const entries = [];
    const t = I18n.t;
    const persistent = ['link', 'person', 'snippet', 'command'].includes(item.kind) || item.isEngine;
    if (persistent) {
      entries.push([t('aliases'), () => editAliases(item)]);
      const pinned = Store.state.pins.includes(item.key);
      entries.push([pinned ? t('unpin') : t('pin'), () => {
        Store.state.pins = pinned ? Store.state.pins.filter(k => k !== item.key) : [...Store.state.pins, item.key];
        Store.changed();
      }]);
    }
    if (item.kind === 'link' || (item.kind === 'web' && !item.isEngine) || (item.kind === 'action' && item.url)) {
      entries.push([t('openNewTab'), () => { window.open(item.payload, '_blank', 'noopener'); afterLeave(); }]);
      entries.push([t('copy'), () => copy(item.payload)]);
    }
    if (item.kind === 'action' && item.url && !item.payload.startsWith('mailto:')) {
      entries.push([t('saveLink'), () => addLink({ url: item.payload, name: item.label })]);
    }
    if (item.kind === 'person' && item.id && item.id !== 'num') {
      entries.push([t('edit'), () => Panel.open('people', item.id)]);
      for (const n of item.person.phones || []) entries.push([n, () => copy(n)]);
    }
    if (item.kind === 'snippet') entries.push([t('edit'), () => Panel.open('snippets', item.id)]);
    if (item.kind === 'link') entries.push([t('edit'), () => Panel.open('links', item.id)]);
    if (item.kind === 'calc') entries.push([t('copy'), () => copy(item.payload)]);
    if (item.kind === 'web' && !item.isEngine) entries.push([t('copy') + ': ' + item.label, () => copy(item.label)]);
    if (item.kind === 'clip') {
      entries.push([t('saveSnippet'), () => {
        Store.state.snippets.push({ id: Store.uid(), trigger: '', title: '', body: item.payload, aliases: [] });
        Store.changed();
        flash(t('saved'));
      }]);
      entries.push([t('delete'), () => {
        Store.state.clips = Store.state.clips.filter(c => c.id !== item.id);
        Store.changed('clips');
      }]);
    }
    UI.menu(item.label, entries, anchor, input);
  }

  function findSource(item) {
    const map = { link: 'links', person: 'people', snippet: 'snippets' };
    if (item.isEngine) return Store.state.engines.find(e => e.id === item.id);
    if (map[item.kind]) return Store.state[map[item.kind]].find(x => x.id === item.id);
    return null;
  }

  function editAliases(item) {
    const source = findSource(item);
    const current = item.kind === 'command' ? (Store.state.commandAliases[item.id] || []) : (source?.aliases || []);
    UI.dialog(item.label, [{ name: 'aliases', label: I18n.t('col_aliases'), value: current.join(', ') }], v => {
      const aliases = Store.splitList(v.aliases);
      if (item.kind === 'command') Store.state.commandAliases[item.id] = aliases;
      else if (source) source.aliases = aliases;
      Store.changed();
    });
  }

  function addLink(prefill) {
    const p = prefill || {};
    UI.dialog(I18n.t('cmd_add_link'), [
      { name: 'name', label: I18n.t('col_name'), value: p.name || '' },
      { name: 'url', label: I18n.t('col_url'), value: p.url || '', type: 'url' },
      { name: 'aliases', label: I18n.t('col_aliases') }
    ], v => {
      if (!v.name.trim() || !v.url.trim()) return;
      const url = /^[a-z][a-z0-9+.-]*:/i.test(v.url.trim()) ? v.url.trim() : 'https://' + v.url.trim();
      Store.state.links.push({ id: Store.uid(), name: v.name.trim(), url, aliases: Store.splitList(v.aliases) });
      Store.changed();
      flash(I18n.t('saved'));
    });
  }

  function addPerson() {
    UI.dialog(I18n.t('cmd_add_person'), [
      { name: 'name', label: I18n.t('col_name') },
      { name: 'phones', label: I18n.t('col_phones'), type: 'tel' },
      { name: 'emails', label: I18n.t('col_emails'), type: 'email' },
      { name: 'aliases', label: I18n.t('col_aliases') }
    ], v => {
      if (!v.name.trim()) return;
      Store.state.people.push({ id: Store.uid(), name: v.name.trim(), phones: Store.splitList(v.phones),
        emails: Store.splitList(v.emails), aliases: Store.splitList(v.aliases) });
      Store.changed();
      flash(I18n.t('saved'));
    });
  }

  function addSnippet(body) {
    UI.dialog(I18n.t('cmd_add_snippet'), [
      { name: 'trigger', label: I18n.t('col_trigger') },
      { name: 'title', label: I18n.t('col_title') },
      { name: 'body', label: I18n.t('col_body') + '  {date} {time} {clipboard}', multiline: true, value: body || '' }
    ], v => {
      if (!v.body) return;
      Store.state.snippets.push({ id: Store.uid(), trigger: v.trigger.trim(), title: v.title.trim(), body: v.body, aliases: [] });
      Store.changed();
      flash(I18n.t('saved'));
    });
  }

  function storeClip(text) {
    const settings = S();
    if (!settings.clipEnabled || !text || !text.trim() || text.length > 100000) return false;
    const kind = Sensitive.classify(text);
    if (kind && settings.sensitivePolicy === 'skip') return false;
    const now = Date.now();
    const clips = Store.state.clips.filter(c => c.text !== text);
    clips.unshift({ id: Store.uid(), text, time: now, hidden: !!kind,
      expires: kind && settings.sensitivePolicy === 'expire' ? now + 60000 : 0 });
    Store.state.clips = prune(clips);
    Store.changed('clips');
    return true;
  }

  function prune(clips) {
    const now = Date.now();
    let out = clips.filter(c => !c.expires || c.expires > now);
    if (S().clipDays > 0) out = out.filter(c => now - c.time < S().clipDays * 86400000);
    if (S().clipMax > 0) out = out.slice(0, S().clipMax);
    return out;
  }

  async function captureClipboard(explicit) {
    const r = await ClipAccess.read({ mode: explicit ? 'manual' : 'auto' });
    if (!r.ok) {
      if (explicit) flash(I18n.t(r.reason === 'unsupported' ? 'clip_unsupported' : 'clip_blocked_help'), 4200);
      return;
    }
    if (!r.text) { if (explicit) flash(I18n.t('clip_empty')); return; }
    if (Store.state.clips[0]?.text === r.text) { if (explicit) flash(I18n.t('saved')); return; }
    if (storeClip(r.text)) flash(I18n.t('saved'));
  }

  function ingestClip(text) {
    if (text && storeClip(text)) flash(I18n.t('saved'));
  }

  function exportAll() {
    UI.download('tacit-backup.json', JSON.stringify({ tacit_backup: 1, ...Store.state }, null, 2), 'application/json');
  }

  async function importAll() {
    const text = await UI.pickFile('application/json,.json');
    if (!text) return;
    try {
      const data = JSON.parse(text);
      delete data.tacit_backup;
      Store.replace(data);
      flash(I18n.t('saved'));
    } catch (e) {
      flash('JSON?');
    }
  }

  function command(id) {
    switch (id) {
      case 'panel': Panel.open(); break;
      case 'theme': {
        const order = ['system', 'dark', 'light'];
        S().theme = order[(order.indexOf(S().theme) + 1) % order.length];
        Store.changed('settings');
        flash(I18n.t('theme_' + S().theme));
        break;
      }
      case 'clock': S().clock = !S().clock; Store.changed('settings'); break;
      case 'lang': S().lang = I18n.lang === 'ar' ? 'en' : 'ar'; Store.changed(); break;
      case 'add-link': addLink(); break;
      case 'add-person': addPerson(); break;
      case 'add-snippet': addSnippet(); break;
      case 'save-clip': captureClipboard(true); break;
      case 'clear-clip':
        if (confirm(I18n.t('data_clear_clip_confirm'))) { Store.state.clips = []; Store.changed('clips'); }
        break;
      case 'export': exportAll(); break;
      case 'import': importAll(); break;
      case 'keys': UI.info(I18n.t('keys_title'), UI.keysNode()); break;
    }
    if (id !== 'panel') {
      input.value = '';
      run();
    }
  }

  function move(delta) {
    if (!rows.length) return;
    const visualDelta = S().barBottom ? -delta : delta;
    selected = Math.max(0, Math.min(rows.length - 1, selected + visualDelta));
    updateSelection();
  }

  function rowOf(target) {
    const li = target.closest('.result');
    return li ? { li, index: Number(li.dataset.index) } : null;
  }

  list.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (chip) {
      input.value = chip.dataset.prefix;
      run();
      input.focus();
      return;
    }
    const hit = rowOf(e.target);
    const item = hit && rows[hit.index];
    if (!item) return;
    selected = hit.index;
    const button = e.target.closest('.action-btn');
    if (button) {
      updateSelection();
      personAction(item, button.dataset.action);
      return;
    }
    activate(item, e.ctrlKey || e.metaKey);
  });

  list.addEventListener('contextmenu', e => {
    const hit = rowOf(e.target);
    const item = hit && rows[hit.index];
    if (!item) return;
    e.preventDefault();
    selected = hit.index;
    updateSelection();
    secondary(item, hit.li);
  });

  list.addEventListener('touchstart', e => {
    const hit = rowOf(e.target);
    if (!hit) return;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      const item = rows[hit.index];
      if (!item) return;
      selected = hit.index;
      secondary(item, hit.li);
    }, 550);
  }, { passive: true });

  const cancelPress = () => clearTimeout(pressTimer);
  list.addEventListener('touchend', cancelPress);
  list.addEventListener('touchcancel', cancelPress);
  list.addEventListener('touchmove', cancelPress, { passive: true });

  input.addEventListener('input', run);

  input.addEventListener('keydown', e => {
    if (e.isComposing) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); activate(rows[selected], e.ctrlKey || e.metaKey); }
    else if (e.key === 'Tab' && rows[selected]) {
      e.preventDefault();
      secondary(rows[selected], document.getElementById('r-' + selected) || input);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (input.value) { input.value = ''; run(); }
      else input.blur();
    } else if (e.altKey && /^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const i = Number(e.key) - 1;
      if (rows[i]) { selected = i; activate(rows[i], e.ctrlKey || e.metaKey); }
    }
  });

  $('search-bar').addEventListener('submit', e => e.preventDefault());
  $('panel-button').addEventListener('click', () => Panel.open());

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); Panel.toggle(); return; }
    const typing = e.target.closest('input, textarea, select, [contenteditable]');
    if (Panel.isOpen() || UI.menuOpen || document.querySelector('.dialog-backdrop')) return;
    if (!typing && e.key === '/') { e.preventDefault(); input.focus(); return; }
    if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
      input.focus();
    }
  });

  window.addEventListener('focus', () => {
    if (!S().clipEnabled || !S().clipCaptureOnFocus || Panel.isOpen()) return;
    const now = Date.now();
    if (now - lastAutoRead < 3000) return;
    lastAutoRead = now;
    captureClipboard(false);
  });

  window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    tick(true);
    input.focus({ preventScroll: true });
  });

  document.addEventListener('copy', () => {
    if (!S().clipEnabled) return;
    const text = String(window.getSelection() || '');
    if (text) storeClip(text);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !Panel.isOpen()) {
      tick();
      input.focus({ preventScroll: true });
    }
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  Store.onChange(scope => {
    applyLight();
    if (scope === 'settings') return;
    if (scope === 'all') stale = true;
    if (!Panel.isOpen()) run();
  });

  function handleUrlQuery() {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q === null) return false;
    input.value = q;
    run();
    history.replaceState(null, '', location.pathname + location.hash);
    if (params.get('go') === '1' && rows[0]) activate(rows[0], false);
    return true;
  }

  function init() {
    Store.state.clips = prune(Store.state.clips);
    Store.pruneUsage();
    applySettings();
    if (!handleUrlQuery()) run();
    input.focus({ preventScroll: true });
    setInterval(() => { if (!document.hidden) tick(); }, 15000);
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  return { init, run, refresh: run, command, copy, flash, addLink, addPerson, addSnippet, exportAll, importAll, captureClipboard, ingestClip, applySettings,
    get input() { return input; } };
})();
