const Tools = (() => {
  const t = (key, vars) => I18n.t(key, vars);

  const LATIN_TO_ARABIC = {
    q: 'ض', w: 'ص', e: 'ث', r: 'ق', t: 'ف', y: 'غ', u: 'ع', i: 'ه', o: 'خ', p: 'ح', '[': 'ج', ']': 'د',
    a: 'ش', s: 'س', d: 'ي', f: 'ب', g: 'ل', h: 'ا', j: 'ت', k: 'ن', l: 'م', ';': 'ك', "'": 'ط',
    z: 'ئ', x: 'ء', c: 'ؤ', v: 'ر', b: 'لا', n: 'ى', m: 'ة', ',': 'و', '.': 'ز', '/': 'ظ',
    H: 'أ', N: 'آ', Y: 'إ', '`': 'ذ'
  };

  const ARABIC_TO_LATIN = (() => {
    const out = {};
    for (const [latin, arabic] of Object.entries(LATIN_TO_ARABIC)) if (arabic.length === 1) out[arabic] = latin;
    return out;
  })();

  const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

  const K = (() => {
    const out = [];
    for (let n = 2; out.length < 64; n++) {
      let prime = true;
      for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
      if (!prime) continue;
      const c = Math.cbrt(n);
      out.push(Math.floor((c - Math.floor(c)) * 4294967296) >>> 0);
    }
    return out;
  })();

  const H0 = (() => {
    const out = [];
    for (let n = 2; out.length < 8; n++) {
      let prime = true;
      for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
      if (!prime) continue;
      const c = Math.sqrt(n);
      out.push(Math.floor((c - Math.floor(c)) * 4294967296) >>> 0);
    }
    return out;
  })();

  function sha256(bytes) {
    const length = bytes.length;
    const total = (((length + 9 + 63) >> 6) << 6);
    const data = new Uint8Array(total);
    data.set(bytes);
    data[length] = 0x80;
    const view = new DataView(data.buffer);
    view.setUint32(total - 8, Math.floor((length * 8) / 4294967296));
    view.setUint32(total - 4, (length * 8) >>> 0);
    const h = H0.slice();
    const w = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let offset = 0; offset < total; offset += 64) {
      for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
    }
    return h.map(x => x.toString(16).padStart(8, '0')).join('');
  }

  const utf8 = text => new TextEncoder().encode(text);

  function toBase64(text) {
    const bytes = utf8(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }

  function fromBase64(text) {
    const clean = text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length < 2) return null;
    try {
      const binary = atob(clean + '='.repeat((4 - (clean.length % 4)) % 4));
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (e) {
      return null;
    }
  }

  function swapLayout(text) {
    if (/[\u0600-\u06FF]/.test(text)) {
      return [...text].map(ch => ARABIC_TO_LATIN[ch] || ch).join('');
    }
    return [...text].map(ch => LATIN_TO_ARABIC[ch] || LATIN_TO_ARABIC[ch.toLowerCase()] || ch).join('');
  }

  function toLatinDigits(text) {
    return text.replace(/[٠-٩]/g, c => String(ARABIC_DIGITS.indexOf(c))).replace(/[۰-۹]/g, c => String(PERSIAN_DIGITS.indexOf(c)));
  }

  function toArabicDigits(text) {
    return text.replace(/[0-9]/g, c => ARABIC_DIGITS[Number(c)]);
  }

  function slug(text) {
    return text.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  }

  let hijriParts = null;
  let hijriOk = null;

  function hijriSupported() {
    if (hijriOk === null) {
      try {
        hijriParts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
        hijriOk = /islamic/.test(hijriParts.resolvedOptions().calendar);
      } catch (e) {
        hijriOk = false;
      }
    }
    return hijriOk;
  }

  function hijriOf(date) {
    if (!hijriSupported()) return null;
    const out = {};
    for (const p of hijriParts.formatToParts(date)) if (p.type === 'year' || p.type === 'month' || p.type === 'day') out[p.type] = parseInt(p.value, 10);
    return out.year ? out : null;
  }

  const hijriKey = h => h.year * 10000 + h.month * 100 + h.day;

  function gregorianOfHijri(year, month, day) {
    if (!hijriSupported() || month < 1 || month > 12 || day < 1 || day > 30) return null;
    const target = year * 10000 + month * 100 + day;
    let lo = Date.UTC(1882, 0, 1) / 86400000;
    let hi = Date.UTC(2174, 0, 1) / 86400000;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const h = hijriOf(new Date(mid * 86400000 + 43200000));
      if (!h) return null;
      const key = hijriKey(h);
      if (key === target) return new Date(mid * 86400000 + 43200000);
      if (key < target) lo = mid + 1;
      else hi = mid - 1;
    }
    return null;
  }

  function hijriLong(date, withWeekday) {
    if (!hijriSupported()) return '';
    try {
      const opts = { day: 'numeric', month: 'long', year: 'numeric' };
      if (withWeekday) opts.weekday = 'long';
      return new Intl.DateTimeFormat(I18n.lang + '-u-ca-islamic-umalqura', opts).format(date);
    } catch (e) {
      return '';
    }
  }

  function gregorianLong(date) {
    return new Intl.DateTimeFormat(I18n.lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
  }

  function row(name, label, sub, payload) {
    const flat = String(label).replace(/\s+/g, ' ').slice(0, 160);
    return { key: 'tool:' + name, kind: 'tool', label: flat, sub, payload: payload === undefined ? String(label) : payload, transient: true };
  }

  function hijriRows(arg) {
    if (!hijriSupported()) return [];
    if (!arg) {
      const now = new Date();
      const text = hijriLong(now, true);
      return text ? [row('hijri', text, t('tool_hijri'), text)] : [];
    }
    const m = /^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/.exec(arg.trim());
    if (!m) return [];
    const [a, b, c] = [m[1], m[2], m[3]].map(Number);
    const [year, month, day] = m[1].length === 4 || a > 31 ? [a, b, c] : [c, b, a];
    if (year >= 1250 && year <= 1600) {
      const date = gregorianOfHijri(year, month, day);
      if (!date) return [];
      const iso = date.toISOString().slice(0, 10);
      return [row('greg', gregorianLong(date), t('tool_gregorian') + ' · ' + iso, iso)];
    }
    if (year >= 1800 && year <= 2170 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(Date.UTC(year, month - 1, day, 12));
      if (date.getUTCMonth() !== month - 1) return [];
      const text = hijriLong(date, false);
      return text ? [row('hijri', text, t('tool_hijri'), text)] : [];
    }
    return [];
  }

  const HANDLERS = {
    b64: arg => [row('b64', toBase64(arg), t('tool_b64'))],
    unb64: arg => {
      const out = fromBase64(arg);
      return out === null ? [] : [row('unb64', out, t('tool_unb64'))];
    },
    url: arg => {
      const out = encodeURIComponent(arg);
      return out === arg ? [] : [row('url', out, t('tool_url'))];
    },
    unurl: arg => {
      try {
        const out = decodeURIComponent(arg.replace(/\+/g, ' '));
        return out === arg ? [] : [row('unurl', out, t('tool_unurl'))];
      } catch (e) {
        return [];
      }
    },
    sha256: arg => [row('sha256', sha256(utf8(arg)), t('tool_sha256'))],
    json: arg => {
      try {
        const value = JSON.parse(arg);
        if (value === null || typeof value !== 'object') return [];
        return [
          row('json-pretty', JSON.stringify(value, null, 2), t('tool_json_pretty')),
          row('json-min', JSON.stringify(value), t('tool_json_min'))
        ];
      } catch (e) {
        return [row('json-bad', String(e.message).slice(0, 120), t('tool_json_bad'), '')];
      }
    },
    digits: arg => {
      const out = [];
      if (/[٠-٩۰-۹]/.test(arg)) out.push(row('latin', toLatinDigits(arg), t('tool_latin_digits')));
      if (/[0-9]/.test(arg)) out.push(row('arabic', toArabicDigits(arg), t('tool_arabic_digits')));
      return out;
    },
    upper: arg => (arg.toUpperCase() === arg ? [] : [row('upper', arg.toUpperCase(), t('tool_upper'))]),
    lower: arg => (arg.toLowerCase() === arg ? [] : [row('lower', arg.toLowerCase(), t('tool_lower'))]),
    slug: arg => {
      const out = slug(arg);
      return out ? [row('slug', out, t('tool_slug'))] : [];
    },
    count: arg => {
      const words = (arg.trim().match(/\S+/g) || []).length;
      const chars = [...arg].length;
      const lines = arg.split('\n').length;
      return [row('count', t('tool_words', { n: words }), t('tool_count_sub', { c: chars, l: lines }), `${words} / ${chars} / ${lines}`)];
    },
    fix: arg => {
      const out = swapLayout(arg);
      return out === arg ? [] : [row('fix', out, t('tool_layout'))];
    }
  };

  const ALIASES = {
    b64: 'b64', base64: 'b64', unb64: 'unb64', b64d: 'unb64', debase64: 'unb64',
    url: 'url', urlenc: 'url', unurl: 'unurl', urld: 'unurl', urldec: 'unurl',
    sha256: 'sha256', sha: 'sha256', json: 'json', digits: 'digits', nums: 'digits', ارقام: 'digits', أرقام: 'digits',
    upper: 'upper', lower: 'lower', slug: 'slug', count: 'count', wc: 'count', len: 'count',
    fix: 'fix', layout: 'fix', تصحيح: 'fix'
  };

  const HIJRI_WORDS = new Set(['hijri', 'هجري', 'هجرى']);

  function parse(raw) {
    const text = String(raw).trim();
    if (!text) return [];
    const lower = text.toLowerCase();
    if (HIJRI_WORDS.has(lower) || lower === 'التاريخ الهجري') return hijriRows('');
    const m = /^(\S+)\s+([\s\S]+)$/.exec(text);
    if (!m) return [];
    const head = m[1].toLowerCase();
    if (HIJRI_WORDS.has(head)) return hijriRows(m[2]);
    const name = ALIASES[head];
    return name ? HANDLERS[name](m[2]) : [];
  }

  return { parse, sha256, utf8, toBase64, fromBase64, swapLayout, toLatinDigits, toArabicDigits, slug, hijriLong, hijriOf, gregorianOfHijri, hijriSupported };
})();
