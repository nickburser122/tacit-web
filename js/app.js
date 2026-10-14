const App = (() => {
  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  const launcher = $('launcher');
  const hero = $('hero');
  const input = $('search-input');
  const list = $('results');
  const home = $('home');
  const hint = $('hint');
  const greetingEl = $('greeting');
  const clockBlock = $('clock-block');
  const timeEl = $('clock-time');
  const dateEl = $('clock-date');
  const themeButton = $('theme-button');
  const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
  const THEME_COLORS = { dark: '#131211', light: '#ebe9e4' };

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
  let hintIndex = 0;

  const S = () => Store.state.settings;
  const isHome = () => !input.value.trim();

  function applyTheme() {
    const theme = S().theme;
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = dark ? 'dark' : 'light';
    if (root.dataset.theme === next) return;
    const paint = () => {
      root.dataset.theme = next;
      for (const m of themeMetas) m.content = dark ? THEME_COLORS.dark : THEME_COLORS.light;
    };
    if (document.startViewTransition && document.visibilityState === 'visible' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(paint);
    } else {
      paint();
    }
  }

  function toggleTheme() {
    S().theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    Store.changed('settings');
  }

  function applyLight() {
    const s = S();
    applyTheme();
    I18n.apply(s.lang);
    launcher.classList.toggle('bar-bottom', s.barBottom);
    launcher.classList.toggle('bar-top', !s.barBottom);
    input.placeholder = I18n.t('hints')[hintIndex] || I18n.t('search');
    document.querySelector('label[for="search-input"]').textContent = I18n.t('search');
    $('panel-button').setAttribute('aria-label', I18n.t('panel'));
    themeButton.setAttribute('aria-label', I18n.t('cmd_theme'));
    themeButton.title = I18n.t('cmd_theme');
    clockBlock.hidden = !s.clock && !s.date;
    timeEl.hidden = !s.clock;
    dateEl.hidden = !s.date;
    greetingEl.hidden = !s.greeting;
    hero.hidden = !s.clock && !s.date && !s.greeting;
    Engine.configure({
      strictness: s.strictness, transliterate: s.transliterate, kindOrder: s.kindOrder,
      usage: s.learn ? Store.state.usage : {}
    });
    const sig = [I18n.lang, s.clock, s.date, s.greeting, s.name, s.accent].join('|');
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

  function greetingText(now) {
    const h = now.getHours();
    const g = I18n.t(h >= 5 && h < 12 ? 'greet_morning' : h >= 12 && h < 17 ? 'greet_afternoon' : 'greet_evening');
    const name = S().name.trim();
    return name ? I18n.t('greet_name', { g, name }) : g;
  }

  function tick(force) {
    const now = new Date();
    const minute = now.getHours() * 60 + now.getMinutes();
    if (!force && minute === lastMinute) return;
    lastMinute = minute;
    Sky.apply(root, now, S().accent);
    greetingEl.textContent = greetingText(now);
    if (!clockBlock.hidden) {
      if (fmtLang !== I18n.lang) {
        timeFmt = new Intl.DateTimeFormat(I18n.lang, { hour: 'numeric', minute: '2-digit' });
        dateFmt = new Intl.DateTimeFormat(I18n.lang, { weekday: 'long', day: 'numeric', month: 'long' });
        fmtLang = I18n.lang;
      }
      const nodes = timeFmt.formatToParts(now).map(part => {
        if (part.type === 'dayPeriod') return UI.el('span', { class: 'period', text: part.value });
        if (part.type === 'literal' && part.value.trim() === ':') return UI.el('span', { class: 'colon', text: ':' });
        return document.createTextNode(part.value);
      });
      timeEl.replaceChildren(...nodes);
      dateEl.textContent = dateFmt.format(now);
    }
  }

  function flash(text, ms) {
    hint.textContent = text;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { hint.textContent = ''; }, ms || 1400);
  }

  function updateTitle() {
    const timers = Store.state.timers;
    let title = 'Tacit';
    const finished = timers.find(t => t.done);
    const running = timers.filter(t => !t.done).sort((a, b) => a.end - b.end)[0];
    if (finished) title = '✓ ' + (finished.label || I18n.t('timer_done')) + ' · Tacit';
    else if (running) title = Timers.format(Timers.remaining(running, Date.now())) + ' · Tacit';
    if (document.title !== title) document.title = title;
  }

  function hueOffset(label) {
    let h = 0;
    for (const c of label) h = (h * 31 + c.codePointAt(0)) >>> 0;
    return (h % 25) - 12;
  }

  function nextPlaceholder() {
    const hints = I18n.t('hints');
    hintIndex = (hintIndex + 1) % hints.length;
    input.placeholder = hints[hintIndex];
  }

  function render() {
    const homeMode = isHome();
    list.classList.toggle('tiles', homeMode);
    const fragment = document.createDocumentFragment();
    const count = rows.length;
    const reverse = S().barBottom && !homeMode;
    for (let i = 0; i < count; i++) {
      const logical = reverse ? count - 1 - i : i;
      fragment.append(homeMode ? renderTile(rows[logical], logical) : renderRow(rows[logical], logical));
    }
    list.replaceChildren(fragment);
    if (homeMode) renderHome();
    else home.hidden = true;
    updateSelection();
  }

  function glyphNode(item) {
    const glyph = UI.el('div', { class: 'glyph', 'aria-hidden': 'true' });
    const content = UI.glyphFor(item);
    glyph.append(content);
    if (content.nodeType === 3 && [...content.textContent].length > 1) glyph.classList.add('duo');
    return glyph;
  }

  function renderTile(item, logical) {
    const li = UI.el('li', {
      class: 'tile ' + item.kind + (item.pinned ? ' pinned' : ''), role: 'option', id: 'r-' + logical, 'data-index': logical,
      'aria-selected': logical === selected ? 'true' : 'false'
    });
    li.style.setProperty('--o', hueOffset(item.label));
    li.append(glyphNode(item), UI.el('div', { class: 'title', text: item.label, dir: 'auto' }));
    if (logical < 9) li.append(UI.el('kbd', { class: 'num', text: String(logical + 1), 'aria-hidden': 'true' }));
    return li;
  }

  function renderRow(item, logical) {
    const li = UI.el('li', {
      class: 'result ' + item.kind + (item.pinned ? ' pinned' : '') + (item.done ? ' done' : ''), role: 'option', id: 'r-' + logical,
      'data-index': logical, 'aria-selected': logical === selected ? 'true' : 'false'
    });
    const texts = UI.el('div', { class: 'texts' },
      UI.el('div', { class: 'title', text: item.label, dir: 'auto' }),
      item.sub ? UI.el('div', { class: 'sub', text: item.sub, dir: 'auto' }) : null
    );
    li.append(glyphNode(item), texts);
    if (item.kind === 'person') li.append(personActions(item));
    return li;
  }

  function blockHead(title, count) {
    return UI.el('div', { class: 'block-head' }, UI.el('h2', { text: title }), count === undefined ? null : UI.el('span', { text: String(count) }));
  }

  function taskNode(task) {
    const t = I18n.t;
    return UI.el('li', { class: 'task' + (task.done ? ' done' : ''), 'data-id': task.id },
      UI.el('button', { type: 'button', class: 'task-check', role: 'checkbox', 'aria-checked': task.done ? 'true' : 'false',
        'aria-label': task.done ? t('task_open') : t('task_finish') }),
      UI.el('span', { class: 'task-text', text: task.text, dir: 'auto' }),
      UI.el('button', { type: 'button', class: 'remove-btn task-remove', 'aria-label': t('task_remove'), title: t('task_remove'), html: UI.icons.close })
    );
  }

  function tasksBlock() {
    const tasks = Store.state.tasks;
    if (!tasks.length) return null;
    const open = tasks.filter(t => !t.done);
    const recent = tasks.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 3);
    return UI.el('section', { class: 'block', 'aria-label': I18n.t('tasks_title') },
      blockHead(I18n.t('tasks_title'), open.length),
      UI.el('ul', { class: 'tasks' }, ...[...open.slice(0, 6), ...recent].map(taskNode)));
  }

  function timerNode(timer, now) {
    const ring = UI.el('span', { html: '<svg class="ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="track" cx="22" cy="22" r="19"/><circle class="prog" cx="22" cy="22" r="19" pathLength="100"/></svg>' });
    const li = UI.el('li', { class: 'timer' + (timer.done ? ' done' : ''), 'data-timer': timer.id },
      ring.firstChild,
      UI.el('div', { class: 'texts' },
        UI.el('div', { class: 'time', text: timer.done ? I18n.t('timer_done') : Timers.format(Timers.remaining(timer, now)) }),
        timer.label ? UI.el('div', { class: 'sub', text: timer.label, dir: 'auto' }) : null),
      UI.el('button', { type: 'button', class: 'remove-btn timer-dismiss', 'aria-label': timer.done ? I18n.t('timer_dismiss') : I18n.t('timer_stop'),
        title: timer.done ? I18n.t('timer_dismiss') : I18n.t('timer_stop'), html: UI.icons.close })
    );
    li.querySelector('.prog').style.strokeDashoffset = timer.done ? 0 : String(100 * (1 - Timers.remaining(timer, now) / timer.total));
    return li;
  }

  function timersBlock(now) {
    const timers = Store.state.timers;
    if (!timers.length) return null;
    return UI.el('section', { class: 'block', 'aria-label': I18n.t('timers_title') },
      blockHead(I18n.t('timers_title'), timers.length), UI.el('ul', { class: 'timers' }, ...timers.map(t => timerNode(t, now))));
  }

  function renderHome() {
    const now = Date.now();
    const blocks = [];
    const tasks = S().homeTasks ? tasksBlock() : null;
    if (tasks) blocks.push(tasks);
    const timers = timersBlock(now);
    if (timers) blocks.push(timers);
    home.replaceChildren(...blocks);
    home.hidden = !blocks.length;
  }

  function updateTimers(now) {
    for (const li of home.querySelectorAll('.timer:not(.done)')) {
      const timer = Store.state.timers.find(t => t.id === li.dataset.timer);
      if (!timer) continue;
      const left = Timers.remaining(timer, now);
      li.querySelector('.time').textContent = Timers.format(left);
      li.querySelector('.prog').style.strokeDashoffset = String(100 * (1 - left / timer.total));
    }
  }

  function addTask(text) {
    const value = String(text).trim();
    if (!value) return false;
    Store.state.tasks.push({ id: Store.uid(), text: value, done: false, created: Date.now() });
    Store.changed('tasks');
    return true;
  }

  function toggleTask(id) {
    const task = Store.state.tasks.find(t => t.id === id);
    if (!task) return;
    task.done = !task.done;
    task.doneAt = task.done ? Date.now() : 0;
    Store.changed('tasks');
  }

  function removeTask(id) {
    Store.state.tasks = Store.state.tasks.filter(t => t.id !== id);
    Store.changed('tasks');
  }

  function clearDone() {
    const before = Store.state.tasks.length;
    Store.state.tasks = Store.state.tasks.filter(t => !t.done);
    if (Store.state.tasks.length !== before) Store.changed('tasks');
    flash(I18n.t('tasks_cleared'));
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

  function run(keep) {
    if (stale) reindex();
    rows = Compose.compose(input.value, Store.state).rows;
    selected = keep ? Math.min(selected, Math.max(0, rows.length - 1)) : 0;
    launcher.classList.toggle('searching', !isHome());
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

  function randomUuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64;
    b[8] = (b[8] & 63) | 128;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  function randomPassword(length) {
    const sets = ['abcdefghijkmnopqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '!?#$%&*-_+='];
    const all = sets.join('');
    const buf = new Uint8Array(1);
    const limit = 256 - (256 % all.length);
    const pick = () => {
      for (;;) {
        crypto.getRandomValues(buf);
        if (buf[0] < limit) return all[buf[0] % all.length];
      }
    };
    for (;;) {
      let out = '';
      for (let i = 0; i < length; i++) out += pick();
      if (sets.every(set => [...set].some(c => out.includes(c)))) return out;
    }
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
      case 'color':
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
      case 'task-add':
        if (addTask(item.payload)) flash(I18n.t('task_added'));
        input.value = S().prefixes.tasks + ' ';
        run();
        input.focus();
        break;
      case 'task':
        toggleTask(item.id);
        break;
      case 'timer':
        Timers.start(item.payload);
        flash(I18n.t('timer_started'));
        input.value = '';
        run();
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
    if (item.kind === 'calc' || item.kind === 'color') entries.push([t('copy'), () => copy(item.payload)]);
    if (item.kind === 'web' && !item.isEngine) entries.push([t('copy') + ': ' + item.label, () => copy(item.label)]);
    if (item.kind === 'task') {
      entries.push([item.done ? t('task_open') : t('task_finish'), () => toggleTask(item.id)]);
      entries.push([t('task_remove'), () => removeTask(item.id)]);
    }
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
      Timers.restore();
      flash(I18n.t('saved'));
    } catch (e) {
      flash('JSON?');
    }
  }

  function command(id) {
    switch (id) {
      case 'panel': Panel.open(); break;
      case 'theme': toggleTheme(); break;
      case 'clock': S().clock = !S().clock; Store.changed('settings'); break;
      case 'lang': S().lang = I18n.lang === 'ar' ? 'en' : 'ar'; Store.changed(); break;
      case 'add-link': addLink(); break;
      case 'add-person': addPerson(); break;
      case 'add-snippet': addSnippet(); break;
      case 'save-clip': captureClipboard(true); break;
      case 'clear-clip':
        if (confirm(I18n.t('data_clear_clip_confirm'))) { Store.state.clips = []; Store.changed('clips'); }
        break;
      case 'clear-tasks': clearDone(); break;
      case 'uuid': copy(randomUuid()); break;
      case 'password': copy(randomPassword(20)); break;
      case 'timestamp': copy(String(Math.floor(Date.now() / 1000))); break;
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

  function columns() {
    const tracks = getComputedStyle(list).gridTemplateColumns;
    return tracks && tracks !== 'none' ? tracks.split(' ').length : 1;
  }

  function moveGrid(dx, dy) {
    if (!rows.length) return;
    const flip = root.dir === 'rtl' ? -1 : 1;
    selected = Math.max(0, Math.min(rows.length - 1, selected + dx * flip + dy * columns()));
    updateSelection();
  }

  function rowOf(target) {
    const li = target.closest('.result, .tile');
    return li ? { li, index: Number(li.dataset.index) } : null;
  }

  list.addEventListener('click', e => {
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

  home.addEventListener('click', e => {
    const check = e.target.closest('.task-check');
    if (check) { toggleTask(check.closest('.task').dataset.id); return; }
    const remove = e.target.closest('.task-remove');
    if (remove) { removeTask(remove.closest('.task').dataset.id); return; }
    const stop = e.target.closest('.timer-dismiss');
    if (stop) Timers.dismiss(stop.closest('.timer').dataset.timer);
  });

  input.addEventListener('input', () => run());

  input.addEventListener('keydown', e => {
    if (e.isComposing) return;
    const homeMode = isHome();
    if (e.key === 'ArrowDown') { e.preventDefault(); if (homeMode) moveGrid(0, 1); else move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (homeMode) moveGrid(0, -1); else move(-1); }
    else if (homeMode && e.key === 'ArrowRight') { e.preventDefault(); moveGrid(1, 0); }
    else if (homeMode && e.key === 'ArrowLeft') { e.preventDefault(); moveGrid(-1, 0); }
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
  themeButton.addEventListener('click', () => { toggleTheme(); input.focus({ preventScroll: true }); });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); Panel.toggle(); return; }
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyT') { e.preventDefault(); toggleTheme(); return; }
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
    if (document.visibilityState !== 'visible') return;
    tick();
    updateTimers(Date.now());
    updateTitle();
    if (!Panel.isOpen()) input.focus({ preventScroll: true });
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  Store.onChange(scope => {
    if (scope === 'tasks' || scope === 'timers') {
      if (isHome()) renderHome();
      else if (!Panel.isOpen() && Compose.parse(input.value, Store.state).scope === 'task') run(true);
      updateTitle();
      return;
    }
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
    Timers.on({
      tick: now => { updateTimers(now); updateTitle(); },
      finish: timer => flash(I18n.t('timer_done') + (timer.label ? ': ' + timer.label : ''), 6000)
    });
    applySettings();
    Timers.restore();
    if (!handleUrlQuery()) run();
    updateTitle();
    input.focus({ preventScroll: true });
    const unlock = () => { if (Timers.running().length) Timers.unlock(); };
    document.addEventListener('pointerdown', unlock, { once: true, capture: true });
    document.addEventListener('keydown', unlock, { once: true, capture: true });
    setInterval(() => { if (!document.hidden) tick(); }, 15000);
    setInterval(() => { if (!document.hidden && !input.value) nextPlaceholder(); }, 7000);
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  return { init, run, refresh: run, command, copy, flash, addLink, addPerson, addSnippet, exportAll, importAll, captureClipboard, ingestClip, applySettings,
    get input() { return input; } };
})();
