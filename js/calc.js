const Calc = (() => {
  class CalcError extends Error {}

  function parseExpression(input) {
    let pos = 0;
    const peek = () => input[pos];
    const skip = () => { while (input[pos] === ' ') pos++; };
    const lookingAt = word => input.startsWith(word, pos) && !/[a-z]/.test(input[pos + word.length] || '');

    function additive() {
      let left = multiplicative();
      for (;;) {
        skip();
        const op = peek();
        if (op !== '+' && op !== '-') return left;
        pos++;
        const right = multiplicative();
        const delta = right.percent ? left.v * right.v : right.v;
        left = { v: op === '+' ? left.v + delta : left.v - delta };
      }
    }

    function multiplicative() {
      let left = unary();
      for (;;) {
        skip();
        const c = peek();
        if (c === '*') { pos++; left = { v: left.v * unary().v }; }
        else if (c === '/') {
          pos++;
          const d = unary().v;
          if (d === 0) throw new CalcError('div0');
          left = { v: left.v / d };
        } else if (lookingAt('mod')) {
          pos += 3;
          const d = unary().v;
          if (d === 0) throw new CalcError('div0');
          left = { v: left.v % d };
        } else if (c === '(' || (c && /[a-zπ√]/.test(c))) {
          left = { v: left.v * unary().v };
        } else return left;
      }
    }

    function unary() {
      skip();
      if (peek() === '-') { pos++; const r = unary(); return { v: -r.v, percent: r.percent }; }
      if (peek() === '+') { pos++; return unary(); }
      return power();
    }

    function power() {
      const base = postfix();
      skip();
      if (peek() === '^') {
        pos++;
        const e = unary().v;
        const r = Math.pow(base.v, e);
        if (!isFinite(r)) throw new CalcError('range');
        return { v: r };
      }
      return base;
    }

    function postfix() {
      let value = primary();
      for (;;) {
        skip();
        if (peek() === '!') { pos++; value = { v: factorial(value.v) }; }
        else if (peek() === '%') { pos++; value = { v: value.v / 100, percent: true }; }
        else return value;
      }
    }

    function primary() {
      skip();
      const c = peek();
      if (c === undefined) throw new CalcError('incomplete');
      if (c === '(') {
        pos++;
        const inner = additive();
        skip();
        if (peek() === ')') pos++;
        return { v: inner.v };
      }
      if (/[0-9.]/.test(c)) return { v: number() };
      if (/[a-zπ√]/.test(c)) return { v: identifier() };
      throw new CalcError('unexpected');
    }

    function number() {
      const m = /^(\d*\.?\d+|\d+\.)(e-?\d+)?/.exec(input.slice(pos));
      if (!m) throw new CalcError('number');
      pos += m[0].length;
      return parseFloat(m[0]);
    }

    function identifier() {
      if (peek() === 'π') { pos++; return Math.PI; }
      if (peek() === '√') { pos++; return fn('sqrt', argument()); }
      const m = /^[a-z]+/.exec(input.slice(pos));
      pos += m[0].length;
      const name = m[0];
      if (name === 'pi') return Math.PI;
      if (name === 'e') return Math.E;
      if (name === 'tau') return Math.PI * 2;
      return fn(name, argument());
    }

    function argument() {
      skip();
      if (peek() === '(') {
        pos++;
        const v = additive().v;
        skip();
        if (peek() === ')') pos++;
        return v;
      }
      return unary().v;
    }

    function fn(name, x) {
      const rad = d => d * Math.PI / 180;
      const deg = r => r * 180 / Math.PI;
      const table = {
        sqrt: () => { if (x < 0) throw new CalcError('neg'); return Math.sqrt(x); },
        cbrt: () => Math.cbrt(x), abs: () => Math.abs(x),
        sin: () => Math.sin(rad(x)), cos: () => Math.cos(rad(x)), tan: () => Math.tan(rad(x)),
        asin: () => deg(Math.asin(x)), acos: () => deg(Math.acos(x)), atan: () => deg(Math.atan(x)),
        ln: () => Math.log(x), log: () => Math.log10(x), exp: () => Math.exp(x),
        round: () => Math.round(x), floor: () => Math.floor(x), ceil: () => Math.ceil(x)
      };
      if (!table[name]) throw new CalcError('unknown');
      const r = table[name]();
      if (!isFinite(r)) throw new CalcError('range');
      return r;
    }

    function factorial(n) {
      if (n < 0 || n > 170 || !Number.isInteger(n)) throw new CalcError('fact');
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    }

    const result = additive();
    skip();
    if (pos !== input.length) throw new CalcError('trailing');
    return result.v;
  }

  const U = (symbol, dim, factor, ...names) => ({ symbol, dim, factor, names: [symbol, ...names] });
  const units = [
    U('mm', 'len', 0.001, 'millimeter', 'millimeters', 'millimetre', 'millimetres'),
    U('cm', 'len', 0.01, 'centimeter', 'centimeters', 'centimetre', 'centimetres'),
    U('m', 'len', 1, 'meter', 'meters', 'metre', 'metres'),
    U('km', 'len', 1000, 'kilometer', 'kilometers', 'kilometre', 'kilometres', 'kms'),
    U('in', 'len', 0.0254, 'inch', 'inches'),
    U('ft', 'len', 0.3048, 'foot', 'feet'),
    U('yd', 'len', 0.9144, 'yard', 'yards'),
    U('mi', 'len', 1609.344, 'mile', 'miles'),
    U('nmi', 'len', 1852, 'nautical mile', 'nautical miles'),
    U('mg', 'mass', 0.000001, 'milligram', 'milligrams'),
    U('g', 'mass', 0.001, 'gram', 'grams'),
    U('kg', 'mass', 1, 'kilogram', 'kilograms', 'kilo', 'kilos'),
    U('t', 'mass', 1000, 'tonne', 'tonnes', 'ton', 'tons'),
    U('oz', 'mass', 0.028349523125, 'ounce', 'ounces'),
    U('lb', 'mass', 0.45359237, 'lbs', 'pound', 'pounds'),
    U('st', 'mass', 6.35029318, 'stone', 'stones'),
    U('ml', 'vol', 0.001, 'milliliter', 'milliliters', 'millilitre', 'millilitres'),
    U('l', 'vol', 1, 'liter', 'liters', 'litre', 'litres'),
    U('tsp', 'vol', 0.00492892159375, 'teaspoon', 'teaspoons'),
    U('tbsp', 'vol', 0.01478676478125, 'tablespoon', 'tablespoons'),
    U('floz', 'vol', 0.0295735295625, 'fl oz', 'fluid ounce', 'fluid ounces'),
    U('cup', 'vol', 0.2365882365, 'cups'),
    U('pt', 'vol', 0.473176473, 'pint', 'pints'),
    U('qt', 'vol', 0.946352946, 'quart', 'quarts'),
    U('gal', 'vol', 3.785411784, 'gallon', 'gallons'),
    U('m2', 'area', 1, 'sqm', 'square meter', 'square meters'),
    U('km2', 'area', 1e6, 'square kilometer', 'square kilometers'),
    U('ft2', 'area', 0.09290304, 'sqft', 'square foot', 'square feet'),
    U('ha', 'area', 10000, 'hectare', 'hectares'),
    U('acre', 'area', 4046.8564224, 'acres'),
    U('feddan', 'area', 4200, 'feddans'),
    U('kmh', 'speed', 1 / 3.6, 'km/h', 'kph'),
    U('mph', 'speed', 0.44704),
    U('ms', 'speed', 1, 'm/s'),
    U('kn', 'speed', 0.514444, 'knot', 'knots'),
    U('b', 'data', 1, 'byte', 'bytes'),
    U('kb', 'data', 1e3, 'kilobyte', 'kilobytes'),
    U('mb', 'data', 1e6, 'megabyte', 'megabytes'),
    U('gb', 'data', 1e9, 'gigabyte', 'gigabytes'),
    U('tb', 'data', 1e12, 'terabyte', 'terabytes'),
    U('kib', 'data', 1024), U('mib', 'data', 1048576), U('gib', 'data', 1073741824),
    U('s', 'time', 1, 'sec', 'secs', 'second', 'seconds'),
    U('min', 'time', 60, 'mins', 'minute', 'minutes'),
    U('h', 'time', 3600, 'hr', 'hrs', 'hour', 'hours'),
    U('d', 'time', 86400, 'day', 'days'),
    U('wk', 'time', 604800, 'week', 'weeks'),
    U('yr', 'time', 31557600, 'year', 'years'),
    U('c', 'temp', 1, '°c', 'celsius'),
    U('f', 'temp', 1, '°f', 'fahrenheit'),
    U('k', 'temp', 1, 'kelvin')
  ];
  const unitByName = new Map();
  units.forEach(u => u.names.forEach(n => { if (!unitByName.has(n)) unitByName.set(n, u); }));

  function convert(value, from, to) {
    if (from.dim !== to.dim) throw new CalcError('dim');
    if (from.dim !== 'temp') return value * from.factor / to.factor;
    const c = from.symbol === 'c' ? value : from.symbol === 'f' ? (value - 32) / 1.8 : value - 273.15;
    return to.symbol === 'c' ? c : to.symbol === 'f' ? c * 1.8 + 32 : c + 273.15;
  }

  const cities = {
    cairo: 'Africa/Cairo', alexandria: 'Africa/Cairo', egypt: 'Africa/Cairo', london: 'Europe/London', uk: 'Europe/London',
    dublin: 'Europe/Dublin', paris: 'Europe/Paris', berlin: 'Europe/Berlin', madrid: 'Europe/Madrid', rome: 'Europe/Rome',
    amsterdam: 'Europe/Amsterdam', vienna: 'Europe/Vienna', zurich: 'Europe/Zurich', stockholm: 'Europe/Stockholm',
    athens: 'Europe/Athens', istanbul: 'Europe/Istanbul', moscow: 'Europe/Moscow', kyiv: 'Europe/Kyiv', lisbon: 'Europe/Lisbon',
    riyadh: 'Asia/Riyadh', jeddah: 'Asia/Riyadh', mecca: 'Asia/Riyadh', dubai: 'Asia/Dubai', 'abu dhabi': 'Asia/Dubai',
    doha: 'Asia/Qatar', kuwait: 'Asia/Kuwait', manama: 'Asia/Bahrain', muscat: 'Asia/Muscat', amman: 'Asia/Amman',
    beirut: 'Asia/Beirut', damascus: 'Asia/Damascus', baghdad: 'Asia/Baghdad', jerusalem: 'Asia/Jerusalem', gaza: 'Asia/Gaza',
    tehran: 'Asia/Tehran', karachi: 'Asia/Karachi', delhi: 'Asia/Kolkata', mumbai: 'Asia/Kolkata', india: 'Asia/Kolkata',
    dhaka: 'Asia/Dhaka', bangkok: 'Asia/Bangkok', jakarta: 'Asia/Jakarta', singapore: 'Asia/Singapore',
    'kuala lumpur': 'Asia/Kuala_Lumpur', 'hong kong': 'Asia/Hong_Kong', beijing: 'Asia/Shanghai', shanghai: 'Asia/Shanghai',
    taipei: 'Asia/Taipei', seoul: 'Asia/Seoul', tokyo: 'Asia/Tokyo', japan: 'Asia/Tokyo', manila: 'Asia/Manila',
    sydney: 'Australia/Sydney', melbourne: 'Australia/Melbourne', perth: 'Australia/Perth', auckland: 'Pacific/Auckland',
    honolulu: 'Pacific/Honolulu', 'los angeles': 'America/Los_Angeles', la: 'America/Los_Angeles', 'san francisco': 'America/Los_Angeles',
    sf: 'America/Los_Angeles', seattle: 'America/Los_Angeles', vancouver: 'America/Vancouver', denver: 'America/Denver',
    phoenix: 'America/Phoenix', chicago: 'America/Chicago', dallas: 'America/Chicago', houston: 'America/Chicago',
    'mexico city': 'America/Mexico_City', 'new york': 'America/New_York', nyc: 'America/New_York', ny: 'America/New_York',
    boston: 'America/New_York', miami: 'America/New_York', washington: 'America/New_York', toronto: 'America/Toronto',
    montreal: 'America/Toronto', 'sao paulo': 'America/Sao_Paulo', 'buenos aires': 'America/Argentina/Buenos_Aires',
    bogota: 'America/Bogota', lima: 'America/Lima', santiago: 'America/Santiago', casablanca: 'Africa/Casablanca',
    tunis: 'Africa/Tunis', algiers: 'Africa/Algiers', tripoli: 'Africa/Tripoli', khartoum: 'Africa/Khartoum',
    lagos: 'Africa/Lagos', nairobi: 'Africa/Nairobi', johannesburg: 'Africa/Johannesburg', 'addis ababa': 'Africa/Addis_Ababa',
    utc: 'UTC', gmt: 'UTC'
  };

  function zoneOf(name) {
    const key = name.trim();
    if (cities[key]) return cities[key];
    if (key.includes('/')) {
      const z = key.split('/').map(p => p.split(/[_ ]/).map(s => s[0].toUpperCase() + s.slice(1)).join('_')).join('/');
      try { new Intl.DateTimeFormat('en', { timeZone: z }); return z; } catch { return null; }
    }
    return null;
  }

  function zoneParts(date, zone) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    const get = t => parseInt(parts.find(p => p.type === t).value, 10);
    return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour') % 24, mi: get('minute') };
  }

  function zoneOffsetMinutes(date, zone) {
    const p = zoneParts(date, zone);
    const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
    return Math.round((asUtc - Math.floor(date.getTime() / 60000) * 60000) / 60000);
  }

  const pad = n => String(n).padStart(2, '0');
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  const dayOnly = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const daysBetween = (a, b) => Math.round((dayOnly(b) - dayOnly(a)) / 86400000);
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function roll(date, today, forward) {
    if (forward && date < today) return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
    if (!forward && date > today) return new Date(date.getFullYear() - 1, date.getMonth(), date.getDate());
    return date;
  }

  function monthOf(s) { const i = months.findIndex(m => s.startsWith(m)); return i < 0 ? null : i; }
  function weekdayOf(s) { const i = weekdays.findIndex(w => s.startsWith(w)); return i < 0 ? null : i; }

  function nextWeekday(today, wd, includeToday) {
    let diff = (wd - today.getDay() + 7) % 7;
    if (diff === 0 && !includeToday) diff = 7;
    return addDays(today, diff);
  }

  function parseDate(text, today, forward) {
    const t = text.trim();
    if (t === 'today' || t === 'now') return today;
    if (t === 'tomorrow') return addDays(today, 1);
    if (t === 'yesterday') return addDays(today, -1);
    if (t === 'christmas' || t === 'xmas') return roll(new Date(today.getFullYear(), 11, 25), today, forward);
    if (t === 'new year' || t === 'new years') return roll(new Date(today.getFullYear(), 0, 1), today, forward);
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = /^(next|last|this)\s+([a-z]+)$/.exec(t);
    if (m) {
      const wd = weekdayOf(m[2]);
      if (wd === null) return null;
      if (m[1] === 'next') return nextWeekday(today, wd, false);
      if (m[1] === 'this') return nextWeekday(today, wd, true);
      let diff = (today.getDay() - wd + 7) % 7;
      if (diff === 0) diff = 7;
      return addDays(today, -diff);
    }
    m = /^([a-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/.exec(t);
    if (m && monthOf(m[1]) !== null) {
      const d = new Date(m[3] ? +m[3] : today.getFullYear(), monthOf(m[1]), +m[2]);
      return m[3] ? d : roll(d, today, forward);
    }
    m = /^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/.exec(t);
    if (m && monthOf(m[2]) !== null) {
      const d = new Date(m[3] ? +m[3] : today.getFullYear(), monthOf(m[2]), +m[1]);
      return m[3] ? d : roll(d, today, forward);
    }
    const wd = weekdayOf(t);
    if (wd !== null && t.length >= 3) {
      if (forward) return nextWeekday(today, wd, false);
      let diff = (today.getDay() - wd + 7) % 7;
      if (diff === 0) diff = 7;
      return addDays(today, -diff);
    }
    return null;
  }

  const wordOps = [
    ['multiplied by', '*'], ['divided by', '/'], ['to the power of', '^'], ['squared', '^2'], ['cubed', '^3'],
    ['plus', '+'], ['minus', '-'], ['times', '*'], ['over', '/'], ['x', '*'], ['square root of', 'sqrt'],
    ['root of', 'sqrt'], ['half of', '0.5*'], ['quarter of', '0.25*'], ['third of', '(1/3)*'],
    ['double', '2*'], ['twice', '2*'], ['triple', '3*'], ['of', '*']
  ].map(([w, s]) => [new RegExp(`(?<=[\\s\\d)])${w.replace(/ /g, '\\s')}(?=[\\s\\d(])`, 'g'), s]);

  let clock = () => new Date();
  let decimals = 10;

  function format(v) {
    if (!isFinite(v)) throw new CalcError('range');
    if (v === 0) return '0';
    const abs = Math.abs(v);
    if (abs >= 1e15 || abs < 1e-9) return v.toPrecision(10).replace(/\.?0+e/, 'e');
    const fixed = v.toFixed(decimals).replace(/\.?0+$/, '');
    return fixed === '-0' ? '0' : fixed;
  }

  function prepare(raw) {
    let t = Norm.normalize(raw).trim().replace(/^=/, '').replace(/=$/, '').trim();
    t = t.replace(/٫/g, '.').replace(/−/g, '-').replace(/\*\*/g, '^').replace(/×/g, '*').replace(/÷/g, '/');
    t = t.replace(/(?<=\d),(?=\d{3}(\D|$))/g, '');
    t = t.replace(/(?<=\d),(?=\d)/g, '.');
    return t.replace(/\s+/g, ' ');
  }

  function looksLikeMath(raw) {
    const t = prepare(raw);
    if (!t || t.length > 120) return false;
    if (/\d/.test(t) && /[+\-*/^%!()=a-z]/.test(t)) return true;
    return /^(time |days |sqrt|now )/.test(t);
  }

  const result = (display, copy) => ({ display, copy: copy ?? display });

  function tryTime(t) {
    let m = /^(?:time|now|what time is it)\s+(?:in|at)\s+(.+)$/.exec(t);
    if (m) {
      const zone = zoneOf(m[1]);
      if (!zone) return null;
      const now = clock();
      const p = zoneParts(now, zone);
      const label = new Intl.DateTimeFormat(undefined, { timeZone: zone, weekday: 'short', day: 'numeric', month: 'short' }).format(now);
      return result(`${pad(p.h)}:${pad(p.mi)}, ${label}`, `${pad(p.h)}:${pad(p.mi)}`);
    }
    m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+([a-z ]+?)\s+(?:in|to)\s+([a-z ]+)$/.exec(t);
    if (m) {
      const from = zoneOf(m[4]);
      const to = zoneOf(m[5]);
      if (!from || !to) return null;
      let h = +m[1];
      const mi = m[2] ? +m[2] : 0;
      if (m[3] === 'pm' && h < 12) h += 12;
      if (m[3] === 'am' && h === 12) h = 0;
      if (h > 23 || mi > 59) return null;
      const now = clock();
      const p = zoneParts(now, from);
      const guess = new Date(Date.UTC(p.y, p.mo - 1, p.d, h, mi));
      const instant = new Date(guess.getTime() - zoneOffsetMinutes(guess, from) * 60000);
      const q = zoneParts(instant, to);
      const day = new Intl.DateTimeFormat(undefined, { timeZone: to, weekday: 'short' }).format(instant);
      return result(`${pad(q.h)}:${pad(q.mi)}, ${day}`, `${pad(q.h)}:${pad(q.mi)}`);
    }
    return null;
  }

  function tryDates(t) {
    const today = dayOnly(clock());
    let m = /^days?\s+(?:until|till|to)\s+(.+)$/.exec(t);
    if (m) {
      const d = parseDate(m[1], today, true);
      if (!d) return null;
      const n = daysBetween(today, d);
      return result(`${n} days`, String(n));
    }
    m = /^days?\s+since\s+(.+)$/.exec(t);
    if (m) {
      const d = parseDate(m[1], today, false);
      if (!d) return null;
      const n = daysBetween(d, today);
      return result(`${n} days`, String(n));
    }
    m = /^(\d{4}-\d{2}-\d{2}|today)\s*-\s*(\d{4}-\d{2}-\d{2}|today)$/.exec(t);
    if (m) {
      const a = parseDate(m[1], today, true);
      const b = parseDate(m[2], today, true);
      const n = daysBetween(b, a);
      return result(`${n} days`, String(n));
    }
    m = /^(today|tomorrow|yesterday|now|next [a-z]+|last [a-z]+|\d{4}-\d{2}-\d{2})\s*([+-])\s*(\d+)\s*(days?|weeks?|months?|years?|d|w|m|y)$/.exec(t);
    if (m) {
      const start = parseDate(m[1], today, true);
      if (!start) return null;
      const n = +m[3] * (m[2] === '-' ? -1 : 1);
      const u = m[4][0];
      let r;
      if (u === 'd') r = addDays(start, n);
      else if (u === 'w') r = addDays(start, n * 7);
      else if (u === 'm') r = new Date(start.getFullYear(), start.getMonth() + n, start.getDate());
      else r = new Date(start.getFullYear() + n, start.getMonth(), start.getDate());
      const label = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(r);
      return result(label, iso(r));
    }
    return null;
  }

  function parseInteger(s) {
    let m;
    if ((m = /^0x([0-9a-f]+)$/.exec(s))) return BigInt('0x' + m[1]);
    if ((m = /^0b([01]+)$/.exec(s))) return BigInt('0b' + m[1]);
    if ((m = /^0o([0-7]+)$/.exec(s))) return BigInt('0o' + m[1]);
    const v = parseExpression(s);
    if (!Number.isInteger(v)) return null;
    return BigInt(v);
  }

  function tryBase(t) {
    const m = /^(.+?)\s+(?:in|to|as)\s+(hex|hexadecimal|binary|bin|octal|oct|decimal|dec)$/.exec(t);
    if (!m) return null;
    const n = parseInteger(m[1].trim());
    if (n === null) return null;
    const target = m[2];
    const neg = n < 0n;
    const abs = neg ? -n : n;
    const sign = neg ? '-' : '';
    let s;
    if (target.startsWith('hex')) s = sign + '0x' + abs.toString(16).toUpperCase();
    else if (target.startsWith('bin')) s = sign + '0b' + abs.toString(2);
    else if (target.startsWith('oct')) s = sign + '0o' + abs.toString(8);
    else s = n.toString();
    return result(s);
  }

  function tryConversion(t) {
    const m = /^(-?[0-9.]+(?:e-?\d+)?)\s*([a-z°'"/ 0-9]+?)\s+(?:in|to|as|into|=|->)\s+([a-z°'"/ 0-9]+)$/.exec(t);
    if (!m) return null;
    const from = unitByName.get(m[2].trim());
    const to = unitByName.get(m[3].trim());
    if (!from || !to) return null;
    const v = format(convert(parseFloat(m[1]), from, to));
    return result(`${v} ${to.symbol}`, v);
  }

  function tryPercent(t) {
    let m = /^([0-9.]+)\s*%\s*of\s+(.+)$/.exec(t);
    if (m) return result(format(parseExpression(m[2]) * parseFloat(m[1]) / 100));
    m = /^([0-9.]+)\s*%\s*off\s+(.+)$/.exec(t);
    if (m) return result(format(parseExpression(m[2]) * (1 - parseFloat(m[1]) / 100)));
    m = /^(.+?)\s+is\s+what\s*%\s*of\s+(.+)$/.exec(t);
    if (m) {
      const whole = parseExpression(m[2]);
      if (whole === 0) throw new CalcError('div0');
      const v = format(parseExpression(m[1]) * 100 / whole);
      return result(`${v}%`, v);
    }
    return null;
  }

  function tryArithmetic(t) {
    let e = ` ${t} `;
    for (const [re, s] of wordOps) e = e.replace(re, s);
    e = e.replace(/\s+/g, ' ').trim();
    if (!/\d/.test(e) && !/pi|π/.test(e)) return null;
    if (/^[\d. ]+$/.test(e)) return null;
    return result(format(parseExpression(e)));
  }

  function evaluate(raw) {
    const t = prepare(raw);
    if (!t) return null;
    try {
      return tryTime(t) || tryDates(t) || tryBase(t) || tryConversion(t) || tryPercent(t) || tryArithmetic(t);
    } catch (e) {
      return null;
    }
  }

  return {
    evaluate, looksLikeMath, format,
    setClock: fn => { clock = fn; },
    setDecimals: n => { decimals = n; }
  };
})();
