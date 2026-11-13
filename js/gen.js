const Gen = (() => {
  const t = (key, vars) => I18n.t(key, vars);

  const pool = new Uint32Array(256);
  let at = 256;

  function u32() {
    if (at >= 256) {
      crypto.getRandomValues(pool);
      at = 0;
    }
    return pool[at++];
  }

  function unit() {
    return (u32() * 2097152 + (u32() >>> 11)) / 9007199254740992;
  }

  function below(n) {
    if (n <= 1) return 0;
    if (n <= 4294967296) {
      const limit = 4294967296 - (4294967296 % n);
      for (;;) {
        const v = u32();
        if (v < limit) return v % n;
      }
    }
    return Math.floor(unit() * n);
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const NUM = '-?\\d+(?:\\.\\d+)?';
  const RANGE = new RegExp('^(' + NUM + ')(?:\\.\\.|~|-)(' + NUM + ')(?:f(\\d{1,2}))?$');
  const SINGLE = new RegExp('^' + NUM + '$');
  const AMBIGUOUS = 'il1Lo0O';
  const SETS = {
    l: 'abcdefghijklmnopqrstuvwxyz',
    u: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    d: '0123456789',
    s: '!?#$%&*-_+='
  };
  const CLASS_IDS = ['l', 'u', 'd', 's'];

  const unique = text => [...new Set(text)].join('');
  const strip = (text, banned) => [...text].filter(c => !banned.includes(c)).join('');
  const decimalsOf = raw => (raw.split('.')[1] || '').length;

  function parsePassword(tokens) {
    const spec = { len: 20, count: 1, on: null, pct: {}, amb: false, no: '', sym: null, hex: false };
    for (const tok of tokens) {
      let m;
      if (/^\d+$/.test(tok)) spec.len = clamp(+tok, 1, 512);
      else if ((m = /^[x×](\d{1,2})$/i.exec(tok))) spec.count = clamp(+m[1], 1, 20);
      else if ((m = /^([ludsLUDS])(\d{1,3})%?$/.exec(tok))) spec.pct[m[1].toLowerCase()] = Math.min(100, +m[2]);
      else if (/^[ludsLUDS]+$/.test(tok)) {
        spec.on = spec.on || new Set();
        for (const c of tok.toLowerCase()) spec.on.add(c);
      } else if (/^amb$/i.test(tok)) spec.amb = true;
      else if (/^hex$/i.test(tok)) spec.hex = true;
      else if ((m = /^no=(.+)$/i.exec(tok))) spec.no += m[1];
      else if ((m = /^sym=(.+)$/i.exec(tok))) spec.sym = m[1];
      else return null;
    }
    return spec;
  }

  function passwordClasses(spec) {
    if (spec.hex) return [{ id: 'h', chars: '0123456789abcdef', pct: null }];
    const active = new Set(spec.on || CLASS_IDS);
    for (const id of Object.keys(spec.pct)) {
      if (spec.pct[id] > 0) active.add(id);
      else active.delete(id);
    }
    const out = [];
    for (const id of CLASS_IDS) {
      if (!active.has(id)) continue;
      let chars = id === 's' && spec.sym ? spec.sym : SETS[id];
      if (!spec.amb && !(id === 's' && spec.sym)) chars = strip(chars, AMBIGUOUS);
      if (spec.no) chars = strip(chars, spec.no);
      chars = unique(chars);
      if (chars) out.push({ id, chars, pct: id in spec.pct ? spec.pct[id] : null });
    }
    return out;
  }

  function shares(list, len) {
    const free = list.filter(c => c.pct === null).length;
    const used = list.reduce((a, c) => a + (c.pct === null ? 0 : c.pct), 0);
    const weights = list.map(c => (c.pct !== null ? c.pct : free && used < 100 ? (100 - used) / free : 0));
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    const exact = weights.map(w => (len * w) / total);
    const counts = exact.map(Math.floor);
    let left = len - counts.reduce((a, b) => a + b, 0);
    const order = exact.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (let k = 0; left > 0; k = (k + 1) % order.length, left--) counts[order[k][1]]++;
    return counts;
  }

  function log2Factorial(n) {
    let sum = 0;
    for (let k = 2; k <= n; k++) sum += Math.log2(k);
    return sum;
  }

  function makePassword(spec, list) {
    const counts = shares(list, spec.len);
    const chars = [];
    let bits = log2Factorial(spec.len);
    list.forEach((c, i) => {
      bits += counts[i] * Math.log2(c.chars.length) - log2Factorial(counts[i]);
      for (let k = 0; k < counts[i]; k++) chars.push(c.chars[below(c.chars.length)]);
    });
    for (let i = chars.length - 1; i > 0; i--) {
      const j = below(i + 1);
      const tmp = chars[i];
      chars[i] = chars[j];
      chars[j] = tmp;
    }
    return { text: chars.join(''), bits: Math.round(bits) };
  }

  function row(name, label, sub, payload, extra) {
    const flat = String(label).replace(/\s+/g, ' ').slice(0, 160);
    return { key: 'gen:' + name, kind: 'tool', label: flat, sub, payload: payload === undefined ? String(label) : payload, transient: true, regen: true, ...(extra || {}) };
  }

  function passwordRows(tokens) {
    const spec = parsePassword(tokens);
    if (!spec) return [];
    const list = passwordClasses(spec);
    if (!list.length) return [];
    const made = [];
    for (let i = 0; i < spec.count; i++) made.push(makePassword(spec, list));
    const rows = made.map((p, i) => row('pw' + i, p.text, t('gen_pass_sub', { n: [...p.text].length, b: p.bits })));
    if (made.length > 1) rows.push(row('pw-all', t('gen_pass_all', { n: made.length }), t('gen_each'), made.map(p => p.text).join('\n')));
    return rows;
  }

  function pinRows(tokens) {
    return passwordRows(tokens.some(x => /^\d+$/.test(x)) ? [...tokens, 'd', 'amb'] : ['6', ...tokens, 'd', 'amb']);
  }

  function numberGen(lo, hi, dec) {
    if (lo > hi) [lo, hi] = [hi, lo];
    if (dec > 0) {
      return {
        dec,
        next: () => Number((lo + unit() * (hi - lo)).toFixed(dec)),
        span: Infinity
      };
    }
    lo = Math.ceil(lo);
    hi = Math.max(lo, Math.floor(hi));
    const span = hi - lo + 1;
    return { dec: null, next: () => lo + below(span), span, lo, hi };
  }

  function uniqueInts(gen, count) {
    const out = [];
    if (gen.span <= 4294967296) {
      const swaps = new Map();
      for (let i = 0; i < count; i++) {
        const j = i + below(gen.span - i);
        const atJ = swaps.has(j) ? swaps.get(j) : j;
        const atI = swaps.has(i) ? swaps.get(i) : i;
        swaps.set(j, atI);
        out.push(gen.lo + atJ);
      }
      return out;
    }
    const seen = new Set();
    while (out.length < count) {
      const v = gen.next();
      if (!seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
    return out;
  }

  const show = (v, dec) => (typeof v === 'number' && dec != null ? v.toFixed(dec) : String(v));

  function parseRand(tokens) {
    const spec = { nums: [], raw: [], count: 1, dec: null, int: false, uniq: false, sort: false, sep: null };
    for (const tok of tokens) {
      let m;
      if (/^(to|and|-|\.\.|~|→|إلى|الى)$/i.test(tok)) continue;
      if ((m = RANGE.exec(tok)) && !spec.nums.length) {
        spec.nums.push(+m[1], +m[2]);
        spec.raw.push(m[1], m[2]);
        if (m[3] !== undefined) spec.dec = clamp(+m[3], 0, 10);
      } else if (SINGLE.test(tok)) {
        spec.nums.push(+tok);
        spec.raw.push(tok);
      } else if ((m = /^[x×](\d{1,4})$/i.exec(tok))) spec.count = clamp(+m[1], 1, 1000);
      else if ((m = /^f(\d{1,2})$/i.exec(tok))) spec.dec = clamp(+m[1], 0, 10);
      else if (/^i(nt)?$/i.test(tok)) spec.int = true;
      else if (/^uniq(ue)?$/i.test(tok)) spec.uniq = true;
      else if (/^sort$/i.test(tok)) spec.sort = true;
      else if ((m = /^sep=(.*)$/i.exec(tok))) spec.sep = m[1];
      else return null;
    }
    if (spec.nums.length > 2) return null;
    if (spec.nums.length === 0) spec.nums = [1, 100];
    else if (spec.nums.length === 1) spec.nums = [1, spec.nums[0]];
    if (spec.nums.some(n => !Number.isFinite(n) || Math.abs(n) > 1e15)) return null;
    return spec;
  }

  function randValues(spec) {
    const [a, b] = spec.nums;
    const bound = Math.max(...spec.raw.map(decimalsOf), 0);
    const float = !spec.int && (spec.dec !== null ? spec.dec > 0 : spec.raw.some(r => r.includes('.')));
    const dec = float ? (spec.dec !== null ? spec.dec : Math.max(2, bound)) : 0;
    const gen = numberGen(a, b, dec);
    let count = spec.count;
    let values;
    if (!float && spec.uniq) {
      count = Math.min(count, gen.span);
      values = uniqueInts(gen, count);
    } else {
      values = [];
      for (let i = 0; i < count; i++) values.push(gen.next());
    }
    if (spec.sort) values.sort((x, y) => x - y);
    return { values, dec: float ? dec : null, lo: Math.min(a, b), hi: Math.max(a, b), float };
  }

  function randRows(tokens) {
    const spec = parseRand(tokens);
    if (!spec) return [];
    const r = randValues(spec);
    const strs = r.values.map(v => show(v, r.dec));
    const bounds = { a: r.float ? show(r.lo, r.dec) : r.lo, b: r.float ? show(r.hi, r.dec) : r.hi };
    if (strs.length === 1) {
      return [row('rand', strs[0], t(r.float ? 'gen_float' : 'gen_int', bounds))];
    }
    const sep = spec.sep !== null ? spec.sep.replace(/\\n/g, '\n').replace(/\\t/g, '\t') : '\n';
    const alts = [
      ['gen_comma', () => strs.join(', ')],
      ['gen_space', () => strs.join(' ')],
      ['gen_json', () => JSON.stringify(r.values.map(v => (typeof v === 'number' && r.dec != null ? Number(v.toFixed(r.dec)) : v)))]
    ];
    if (sep !== '\n') alts.unshift(['gen_lines', () => strs.join('\n')]);
    return [row('rand', strs.join(', '), t('gen_values', { n: strs.length, ...bounds }), strs.join(sep), { alts })];
  }

  function parseDate(text) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!m) return null;
    const ms = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return Number.isNaN(ms) ? null : ms;
  }

  const STR = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 15) | 64;
    b[8] = (b[8] & 63) | 128;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  function column(spec, index) {
    const parts = spec.split(':');
    const type = parts[0].toLowerCase();
    let m;
    if ((m = RANGE.exec(spec))) {
      const bound = Math.max(decimalsOf(m[1]), decimalsOf(m[2]));
      const forced = m[3] !== undefined ? clamp(+m[3], 0, 10) : null;
      const float = forced !== null ? forced > 0 : m[1].includes('.') || m[2].includes('.');
      const g = numberGen(+m[1], +m[2], float ? (forced !== null ? forced : Math.max(2, bound)) : 0);
      return { name: 'n' + (index + 1), next: () => g.next(), dec: g.dec };
    }
    if (type === 'pw' || type === 'pin') {
      const spec2 = parsePassword(type === 'pin' ? [parts[1] || '4', 'd', 'amb'] : parts.slice(1).filter(Boolean));
      if (!spec2) return null;
      const list = passwordClasses(spec2);
      if (!list.length) return null;
      return { name: type, next: () => makePassword(spec2, list).text, dec: null };
    }
    if (type === 'uuid') return { name: 'uuid', next: () => uuid(), dec: null };
    if (type === 'id') {
      const start = parts[1] !== undefined && /^-?\d+$/.test(parts[1]) ? +parts[1] : 1;
      const step = parts[2] !== undefined && /^-?\d+$/.test(parts[2]) ? +parts[2] : 1;
      return { name: 'id', next: (i) => start + i * step, dec: null };
    }
    if (type === 'pick') {
      const items = parts.slice(1).join(':').split(',').filter(s => s !== '');
      if (!items.length) return null;
      return { name: 'pick', next: () => items[below(items.length)], dec: null };
    }
    if (type === 'bool') return { name: 'bool', next: () => below(2) === 1, dec: null };
    if (type === 'hex' || type === 'str') {
      const n = clamp(+(parts[1] || 8) || 8, 1, 256);
      const chars = type === 'hex' ? '0123456789abcdef' : STR;
      return { name: type, next: () => { let s = ''; for (let k = 0; k < n; k++) s += chars[below(chars.length)]; return s; }, dec: null };
    }
    if (type === 'date') {
      let lo;
      let hi;
      if (parts[1]) {
        const d = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(parts[1]);
        if (!d) return null;
        lo = parseDate(d[1]);
        hi = parseDate(d[2]);
        if (lo === null || hi === null) return null;
      } else {
        hi = Date.now();
        lo = hi - 365 * 86400000;
      }
      if (lo > hi) [lo, hi] = [hi, lo];
      const days = Math.floor((hi - lo) / 86400000) + 1;
      return { name: 'date', next: () => new Date(lo + below(days) * 86400000).toISOString().slice(0, 10), dec: null };
    }
    return null;
  }

  function parseTable(tokens) {
    const spec = { rows: null, header: null, fmt: 'tsv', cols: [] };
    let named = false;
    for (const tok of tokens) {
      const low = tok.toLowerCase();
      if (/^\d+$/.test(tok) && spec.rows === null) { spec.rows = clamp(+tok, 1, 2000); continue; }
      if (low === 'h' || low === 'header') { spec.header = true; continue; }
      if (low === 'noh') { spec.header = false; continue; }
      if (['csv', 'tsv', 'json', 'md', 'markdown'].includes(low)) { spec.fmt = low === 'markdown' ? 'md' : low; continue; }
      let name = null;
      let body = tok;
      const labeled = /^([^=:\s.]+)=(.+)$/.exec(tok);
      if (labeled) {
        name = labeled[1];
        body = labeled[2];
      }
      const col = column(body, spec.cols.length);
      if (!col) return null;
      if (name) { col.name = name; named = true; }
      spec.cols.push(col);
    }
    if (!spec.cols.length) return null;
    if (spec.rows === null) spec.rows = 5;
    spec.rows = Math.min(spec.rows, Math.max(1, Math.floor(20000 / spec.cols.length)));
    if (spec.header === null) spec.header = named;
    const seen = new Map();
    for (const c of spec.cols) {
      const n = seen.get(c.name) || 0;
      seen.set(c.name, n + 1);
      if (n) c.name += n + 1;
    }
    return spec;
  }

  const FORMATS = {
    tsv: (head, body) => [...(head ? [head] : []), ...body].map(r => r.map(c => c.replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n'),
    csv: (head, body) => Importers.Csv.encode([...(head ? [head] : []), ...body]),
    md: (head, body, cols) => {
      const names = head || cols.map(c => c.name);
      const esc = c => c.replace(/\|/g, '\\|');
      const line = r => '| ' + r.map(esc).join(' | ') + ' |';
      return [line(names), '| ' + names.map(() => '---').join(' | ') + ' |', ...body.map(line)].join('\n');
    }
  };

  function tableRows(tokens) {
    const spec = parseTable(tokens);
    if (!spec) return [];
    const cells = [];
    for (let i = 0; i < spec.rows; i++) cells.push(spec.cols.map(c => c.next(i)));
    const body = cells.map(r => r.map((v, k) => show(v, spec.cols[k].dec)));
    const head = spec.header ? spec.cols.map(c => c.name) : null;
    const json = () => JSON.stringify(cells.map(r => {
      const o = {};
      spec.cols.forEach((c, k) => { o[c.name] = r[k]; });
      return o;
    }), null, 2);
    const build = {
      tsv: () => FORMATS.tsv(head, body),
      csv: () => FORMATS.csv(head, body),
      md: () => FORMATS.md(head, body, spec.cols),
      json
    };
    const order = ['tsv', 'csv', 'json', 'md'];
    const labels = { tsv: 'gen_tsv', csv: 'gen_csv', json: 'gen_json_table', md: 'gen_md' };
    const alts = order.filter(f => f !== spec.fmt).map(f => [labels[f], build[f]]);
    const preview = body.slice(0, 2).map(r => r.join(' · ')).join('  /  ') + (body.length > 2 ? '  …' : '');
    const sub = t('gen_table_sub', { r: spec.rows, c: spec.cols.length, f: spec.fmt.toUpperCase() });
    return [row('table', preview, sub, build[spec.fmt](), { alts })];
  }

  function uuidRows(tokens) {
    let count = 1;
    let upper = false;
    let plain = false;
    for (const tok of tokens) {
      let m;
      if ((m = /^[x×]?(\d{1,2})$/i.exec(tok))) count = clamp(+m[1], 1, 20);
      else if (/^upper$/i.test(tok)) upper = true;
      else if (/^(nodash|plain)$/i.test(tok)) plain = true;
      else return [];
    }
    const make = () => {
      let v = uuid();
      if (plain) v = v.replace(/-/g, '');
      return upper ? v.toUpperCase() : v;
    };
    const ids = [];
    for (let i = 0; i < count; i++) ids.push(make());
    const rows = ids.map((v, i) => row('uuid' + i, v, t('gen_uuid')));
    if (ids.length > 1) rows.push(row('uuid-all', t('gen_uuid_all', { n: ids.length }), t('gen_each'), ids.join('\n')));
    return rows;
  }

  const TRIGGERS = {
    pw: passwordRows, pass: passwordRows, password: passwordRows,
    pin: pinRows,
    rand: randRows, random: randRows, rnd: randRows,
    table: tableRows, tbl: tableRows,
    uuid: uuidRows, guid: uuidRows
  };
  const BARE = new Set(['pw', 'pin', 'rand', 'uuid', 'guid']);

  function parse(raw) {
    const text = String(raw).trim();
    const m = /^(\S+)(?:\s+([\s\S]*))?$/.exec(text);
    if (!m) return [];
    const head = m[1].toLowerCase();
    if (!Object.hasOwn(TRIGGERS, head)) return [];
    const handler = TRIGGERS[head];
    const rest = (m[2] || '').trim();
    const tokens = rest ? rest.split(/\s+/) : [];
    if (!tokens.length && !BARE.has(head)) return [];
    return handler(tokens);
  }

  function password(text) {
    const spec = parsePassword(String(text || '').split(/\s+/).filter(Boolean));
    if (!spec) return '';
    const list = passwordClasses(spec);
    return list.length ? makePassword(spec, list).text : '';
  }

  const escapeHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const escapeMd = s => String(s).replace(/([\[\]\\])/g, '\\$1');
  const safeMdUrl = u => String(u).replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\s/g, '%20');

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  function linkFormats(name, url) {
    const label = String(name || '').trim() || hostOf(url) || url;
    const out = [
      ['fmt_md', () => `[${escapeMd(label)}](${safeMdUrl(url)})`],
      ['fmt_html', () => `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`]
    ];
    const host = hostOf(url);
    if (host) out.push(['fmt_domain', () => host]);
    const cleaned = Links.clean(url);
    if (cleaned.removed) out.push(['fmt_clean', () => cleaned.url]);
    return out;
  }

  function linksAs(format, links) {
    const list = links.filter(l => l && l.name && l.url && Links.safe(l.url));
    switch (format) {
      case 'md': return list.map(l => `- [${escapeMd(l.name)}](${safeMdUrl(l.url)})`).join('\n');
      case 'urls': return list.map(l => l.url).join('\n');
      case 'csv': return Importers.Csv.encode([['name', 'url', 'aliases'], ...list.map(l => [l.name, l.url, (l.aliases || []).join(', ')])]);
      case 'json': return JSON.stringify(list.map(l => ({ name: l.name, url: l.url, aliases: l.aliases || [] })), null, 2);
      case 'html': {
        const items = list.map(l => {
          const short = (l.aliases || [])[0];
          return `    <DT><A HREF="${escapeHtml(l.url)}"${short ? ` SHORTCUTURL="${escapeHtml(short)}"` : ''}>${escapeHtml(l.name)}</A>`;
        });
        return `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n${items.join('\n')}\n</DL><p>\n`;
      }
      default: return '';
    }
  }

  return { parse, password, linkFormats, linksAs, parsePassword, parseRand, parseTable, below, unit };
})();
