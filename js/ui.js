const UI = (() => {
  const svg = paths => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;

  const icons = {
    link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    snippet: svg('<path d="M7 7h10M7 12h10M7 17h6"/>'),
    command: svg('<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M12.5 8.5v7"/>'),
    calc: svg('<rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M8.5 8h7"/><path stroke-width="2" d="M9 12.5h.01M12 12.5h.01M15 12.5h.01M9 16h.01M12 16h.01M15 16h.01"/>'),
    web: svg('<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16"/>'),
    clip: svg('<rect x="7" y="5" width="10" height="15" rx="2"/><path d="M10 5V4h4v1"/>'),
    action: svg('<path d="M9 6l6 6-6 6"/>'),
    call: svg('<path d="M6 4h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2z"/>'),
    message: svg('<path d="M4 6h16v10H9l-5 4z"/>'),
    whatsapp: svg('<path d="M5 19l1.2-3.6A7.5 7.5 0 1 1 9 18.3z"/><path d="M9.5 9.5c0 3 2 5 5 5"/>'),
    email: svg('<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 8l8 5 8-5"/>'),
    caret: svg('<path d="M7 10l5 5 5-5"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    more: svg('<path stroke-width="2.4" d="M5 12h.01M12 12h.01M19 12h.01"/>'),
    people: svg('<circle cx="12" cy="9" r="3.5"/><path d="M5 19c.8-3.4 3.7-5 7-5s6.2 1.6 7 5"/>'),
    settings: svg('<path d="M5 8h9M18 8h1M5 16h1M10 16h9"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>'),
    data: svg('<ellipse cx="12" cy="6.5" rx="6.5" ry="2.5"/><path d="M5.5 6.5v11c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-11M5.5 12c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5"/>'),
    keys: svg('<rect x="3.5" y="7" width="17" height="10" rx="2.5"/><path stroke-width="2" d="M7 11h.01M10.5 11h.01M14 11h.01M17 11h.01"/><path d="M8 14h8"/>')
  };

  function glyphFor(item) {
    if (item.kind === 'person') {
      const initials = item.label.split(/\s+/).filter(Boolean).slice(0, 2).map(w => [...w][0]).join('').toUpperCase();
      return document.createTextNode(initials || '·');
    }
    if (item.kind === 'link') {
      const first = [...item.label.trim()][0];
      return document.createTextNode((first || '·').toUpperCase());
    }
    const name = icons[item.kind] ? item.kind : 'action';
    let template = glyphCache[name];
    if (!template) {
      const span = document.createElement('span');
      span.innerHTML = icons[name];
      template = glyphCache[name] = span.firstChild;
    }
    return template.cloneNode(true);
  }

  const glyphCache = {};

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children) if (c !== null && c !== undefined) node.append(c);
    return node;
  }

  let openMenu = null;

  function closeMenu() {
    if (!openMenu) return;
    const { node, outside, scroll, returnFocus, trigger } = openMenu;
    node.remove();
    document.removeEventListener('mousedown', outside, true);
    document.removeEventListener('scroll', scroll, true);
    window.removeEventListener('resize', closeMenu);
    openMenu = null;
    trigger?.setAttribute('aria-expanded', 'false');
    returnFocus?.focus({ preventScroll: true });
  }

  function place(node, anchor, below) {
    const rect = anchor.getBoundingClientRect();
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    const rtl = document.documentElement.dir === 'rtl';
    const edge = below ? (rtl ? rect.right - w : rect.left) : (rtl ? rect.left : rect.right - w);
    const left = Math.max(12, Math.min(window.innerWidth - w - 12, edge));
    let top;
    if (below) {
      top = rect.bottom + 6;
      if (top + h > window.innerHeight - 12) top = Math.max(12, rect.top - h - 6);
    } else {
      top = rect.top - h - 6;
      if (top < 12) top = Math.min(window.innerHeight - h - 12, rect.bottom + 6);
    }
    node.style.left = left + 'px';
    node.style.top = top + 'px';
  }

  function popover({ kind, title, entries, anchor, returnFocus, current, trigger }) {
    closeMenu();
    if (!entries.length) return;
    const list = kind === 'listbox';
    const node = el('div', {
      class: list ? 'menu menu-list' : 'menu', role: list ? 'listbox' : 'menu', 'aria-label': title || null
    });
    if (!list) node.append(el('div', { class: 'menu-title', text: title }));
    const buttons = entries.map(([label, run, value]) => {
      const button = el('button', {
        type: 'button', role: list ? 'option' : 'menuitem', 'aria-selected': list ? String(value === current) : null,
        onclick: () => { closeMenu(); run(); }
      });
      if (list) button.append(el('span', { class: 'check', html: icons.check }), el('span', { class: 'menu-label', text: label, dir: 'auto' }));
      else button.textContent = label;
      return button;
    });
    buttons.forEach(b => node.append(b));
    document.body.append(node);
    if (list && trigger) node.style.minWidth = Math.max(160, trigger.offsetWidth) + 'px';
    place(node, anchor, list);

    let index = list ? Math.max(0, entries.findIndex(e => e[2] === current)) : 0;
    let typed = '';
    let typedAt = 0;
    const highlight = i => {
      index = (i + buttons.length) % buttons.length;
      buttons.forEach((b, k) => { if (k === index) b.setAttribute('data-active', ''); else b.removeAttribute('data-active'); });
      buttons[index].focus({ preventScroll: true });
      buttons[index].scrollIntoView?.({ block: 'nearest' });
    };

    node.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) { e.preventDefault(); highlight(index + 1); }
      else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) { e.preventDefault(); highlight(index - 1); }
      else if (e.key === 'Home') { e.preventDefault(); highlight(0); }
      else if (e.key === 'End') { e.preventDefault(); highlight(buttons.length - 1); }
      else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); buttons[index].click(); }
      else if (list && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const now = Date.now();
        typed = now - typedAt > 700 ? e.key.toLowerCase() : typed + e.key.toLowerCase();
        typedAt = now;
        const hit = entries.findIndex(([label]) => label.toLowerCase().startsWith(typed));
        if (hit >= 0) highlight(hit);
      }
    });

    const outside = e => {
      if (!node.contains(e.target) && !(trigger && trigger.contains(e.target))) closeMenu();
    };
    const scroll = e => { if (!node.contains(e.target)) closeMenu(); };
    document.addEventListener('mousedown', outside, true);
    document.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', closeMenu);
    openMenu = { node, outside, scroll, returnFocus, trigger };
    highlight(index);
  }

  function menu(title, entries, anchor, returnFocus) {
    popover({ kind: 'menu', title, entries, anchor, returnFocus });
  }

  function dropdown(options, value, onChange, attrs) {
    let current = String(value);
    const label = el('span', { class: 'select-label', dir: 'auto' });
    const button = el('button', { type: 'button', class: 'select', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', ...(attrs || {}) },
      label, el('span', { class: 'caret', html: icons.caret }));
    const sync = () => { label.textContent = (options.find(([v]) => String(v) === current) || options[0])[1]; };
    sync();
    const open = () => {
      button.setAttribute('aria-expanded', 'true');
      popover({
        kind: 'listbox', title: button.getAttribute('aria-label') || '', anchor: button, returnFocus: button, trigger: button, current,
        entries: options.map(([v, text]) => [text, () => { current = String(v); sync(); onChange(v); }, String(v)])
      });
    };
    button.addEventListener('click', () => (openMenu && openMenu.trigger === button ? closeMenu() : open()));
    button.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); }
    });
    return button;
  }

  function dialog(title, fields, onSave) {
    closeMenu();
    const inputs = {};
    const form = el('form', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    form.append(el('h2', { text: title }));
    for (const f of fields) {
      const id = 'f-' + f.name;
      form.append(el('label', { for: id, class: 'visually-hidden', text: f.label }));
      const input = f.multiline
        ? el('textarea', { id, placeholder: f.label, dir: 'auto' })
        : el('input', { id, placeholder: f.label, dir: 'auto', type: f.type || 'text', autocomplete: 'off', spellcheck: 'false' });
      input.value = f.value || '';
      inputs[f.name] = input;
      form.append(input);
    }
    const backdrop = el('div', { class: 'dialog-backdrop' }, form);
    const previous = document.activeElement;
    const close = () => { backdrop.remove(); previous?.focus({ preventScroll: true }); };
    form.append(el('div', { class: 'row-end' },
      el('button', { type: 'button', class: 'btn', text: I18n.t('cancel'), onclick: close }),
      el('button', { type: 'submit', class: 'btn primary', text: I18n.t('save') })
    ));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const values = {};
      for (const [k, v] of Object.entries(inputs)) values[k] = v.value;
      onSave(values);
      close();
    });
    backdrop.addEventListener('mousedown', e => { if (e.target === backdrop) close(); });
    backdrop.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
    document.body.append(backdrop);
    Object.values(inputs)[0]?.focus();
  }

  function info(title, node) {
    closeMenu();
    const box = el('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, tabindex: '-1' });
    box.append(el('h2', { text: title }), node);
    const backdrop = el('div', { class: 'dialog-backdrop' }, box);
    const previous = document.activeElement;
    const close = () => { backdrop.remove(); previous?.focus({ preventScroll: true }); };
    box.append(el('div', { class: 'row-end' }, el('button', { type: 'button', class: 'btn primary', text: I18n.t('ok'), onclick: close })));
    backdrop.addEventListener('mousedown', e => { if (e.target === backdrop) close(); });
    backdrop.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); close(); } });
    document.body.append(backdrop);
    box.focus();
  }

  function keysNode() {
    const list = el('div', { class: 'keys-list' });
    for (const [k, d] of I18n.t('keys')) list.append(el('kbd', { text: k }), el('span', { text: d }));
    const p = Store.state.settings.prefixes;
    const engines = Store.state.engines.filter(e => e.prefix).map(e => [e.prefix + ' ⎵', e.name]);
    for (const [k, d] of [[p.calc, I18n.t('p_calc')], [p.clip.trim() + ' ⎵', I18n.t('p_clip')], [p.people, I18n.t('p_people')],
      [p.snippets, I18n.t('p_snippets')], [p.commands, I18n.t('p_commands')], ...engines]) {
      list.append(el('kbd', { text: k }), el('span', { text: d }));
    }
    return list;
  }

  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const a = el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function pickFile(accept) {
    return new Promise(resolve => {
      const input = el('input', { type: 'file', accept });
      input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return resolve(null);
        file.text().then(resolve);
      });
      input.click();
    });
  }

  return { icons, glyphFor, el, menu, dropdown, closeMenu, dialog, info, keysNode, download, pickFile, get menuOpen() { return !!openMenu; } };
})();
