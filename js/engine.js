const Engine = (() => {
  const Tier = {
    NONE: 0, TYPO: 1, SUBSEQUENCE: 2, INITIALS: 3, WORD_PREFIX: 4, FULL_PREFIX: 5, EXACT: 6,
    ALIAS_PREFIX: 7, ALIAS_EXACT: 8, SCALE: 100000
  };

  const Frecency = {
    HALF: 14 * 86400000,
    bump(map, key, now) {
      const e = map[key];
      const n = e ? e.n * Math.pow(0.5, (now - e.t) / Frecency.HALF) + 1 : 1;
      map[key] = { n, t: now };
    },
    bonus(e, now) {
      if (!e) return 0;
      const decay = Math.pow(0.5, Math.max(0, now - e.t) / Frecency.HALF);
      return Math.min(400, 90 * Math.log2(1 + e.n * decay));
    }
  };

  let items = [];
  let strictness = 'normal';
  let transliterate = true;
  let kindRank = {};
  let kindCount = 1;
  let usage = {};
  const misses = [];

  const encode = (tier, bonus) => tier * Tier.SCALE + Math.max(0, Math.min(9999, bonus));
  const tierOf = score => Math.floor(score / Tier.SCALE);

  function makeName(full, variant) {
    const w = Norm.words(full);
    return { full, words: w, initials: w.map(x => x[0]).join(''), compact: w.join(''), variant: !!variant };
  }

  function index(item) {
    const seen = new Set();
    const names = [];
    for (const raw of [item.label, ...(item.extra || [])]) {
      if (!raw) continue;
      const n = Norm.normalize(Norm.splitCamel(raw)).trim();
      if (!n) continue;
      const forms = transliterate ? [n, ...Norm.variants(n)] : [n];
      forms.forEach((f, i) => {
        if (seen.has(f)) return;
        seen.add(f);
        names.push(makeName(f, i > 0));
      });
    }
    item._names = names;
    item._aliases = (item.aliases || []).map(a => Norm.normalize(a).trim()).filter(Boolean);
    return item;
  }

  function typoAllowed(q) {
    if (strictness === 'off' || q.length < 3) return 0;
    if (strictness === 'loose') return q.length < 5 ? 1 : 2;
    return q.length < 6 ? 1 : 2;
  }

  function firstLetterOk(q, w) {
    if (!w.length) return false;
    return q[0] === w[0] || (q.length > 1 && w.length > 1 && q[0] === w[1] && q[1] === w[0]);
  }

  function prefixDistance(q, w, allowed) {
    const n = q.length;
    const m = Math.min(w.length, n + 2);
    if (n > 60) return Infinity;
    const shortest = Math.max(1, n - allowed + 1);
    if (m < shortest) return Infinity;
    let pp = new Array(m + 1).fill(0);
    let p = new Array(m + 1);
    let c = new Array(m + 1);
    for (let j = 0; j <= m; j++) p[j] = j;
    for (let i = 1; i <= n; i++) {
      c[0] = i;
      for (let j = 1; j <= m; j++) {
        const cost = q[i - 1] === w[j - 1] ? 0 : 1;
        let v = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + cost);
        if (i > 1 && j > 1 && q[i - 1] === w[j - 2] && q[i - 2] === w[j - 1]) v = Math.min(v, pp[j - 2] + 1);
        c[j] = v;
      }
      const t = pp; pp = p; p = c; c = t;
    }
    let best = Infinity;
    for (let j = shortest; j <= m; j++) if (p[j] < best) best = p[j];
    return best;
  }

  function subsequenceScore(q, name) {
    if (q.length < 2) return 0;
    const text = name.full;
    let position = 0;
    let score = 0;
    let previous = -2;
    for (const ch of q) {
      if (ch === ' ') continue;
      const found = text.indexOf(ch, position);
      if (found < 0) return 0;
      const atWordStart = found === 0 || text[found - 1] === ' ' || text[found - 1] === '-';
      if (found === previous + 1) score += 30;
      else if (atWordStart) score += 25;
      else score += 5 - Math.min(4, found - position);
      previous = found;
      position = found + 1;
    }
    if (text.length && text[0] !== q[0]) score -= 20;
    return score >= q.length * 12 ? Math.max(1, score) : 0;
  }

  function typoScore(q, words) {
    const allowed = typoAllowed(q);
    if (!allowed) return 0;
    let best = 0;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (!firstLetterOk(q, w)) continue;
      const d = prefixDistance(q, w, allowed);
      if (d <= allowed) best = Math.max(best, Math.max(1, 500 - d * 100 - i * 10 - w.length));
    }
    return best;
  }

  function scoreSingle(q, name, typo) {
    const lengthBonus = 1000 - Math.min(999, name.full.length);
    if (name.full === q || name.compact === q) return encode(Tier.EXACT, lengthBonus);
    if (name.full.startsWith(q) || name.compact.startsWith(q)) return encode(Tier.FULL_PREFIX, lengthBonus);
    for (let i = 0; i < name.words.length; i++) {
      if (name.words[i].startsWith(q)) return encode(Tier.WORD_PREFIX, lengthBonus - i * 10);
    }
    if (q.length >= 2 && name.initials.startsWith(q)) return encode(Tier.INITIALS, lengthBonus);
    const sub = subsequenceScore(q, name);
    if (sub > 0) return encode(Tier.SUBSEQUENCE, sub);
    if (!typo) return 0;
    const t = typoScore(q, name.words);
    return t > 0 ? encode(Tier.TYPO, t) : 0;
  }

  function wordTier(qw, w, typo) {
    if (w === qw) return Tier.EXACT;
    if (w.startsWith(qw)) return Tier.WORD_PREFIX;
    if (!typo) return Tier.NONE;
    const allowed = typoAllowed(qw);
    if (allowed && firstLetterOk(qw, w) && prefixDistance(qw, w, allowed) <= allowed) return Tier.TYPO;
    return Tier.NONE;
  }

  function scoreMulti(queryWords, name, typo) {
    const used = new Array(name.words.length).fill(false);
    let worst = Tier.ALIAS_EXACT;
    let sum = 0;
    let last = -1;
    let ordered = true;
    for (const qw of queryWords) {
      let bestTier = 0;
      let bestIndex = -1;
      for (let i = 0; i < name.words.length; i++) {
        if (used[i]) continue;
        const t = wordTier(qw, name.words[i], typo);
        if (t > bestTier) { bestTier = t; bestIndex = i; }
      }
      if (!bestTier) return 0;
      used[bestIndex] = true;
      if (bestIndex < last) ordered = false;
      last = bestIndex;
      worst = Math.min(worst, bestTier);
      sum += bestTier;
    }
    return encode(worst, sum * 100 + (ordered ? 50 : 0) + (100 - Math.min(99, name.full.length)));
  }

  function score(q, queryWords, item, typo) {
    let best = 0;
    for (const alias of item._aliases) {
      if (alias === q) return encode(Tier.ALIAS_EXACT, 1000);
      if (alias.startsWith(q)) best = Math.max(best, encode(Tier.ALIAS_PREFIX, 1000 - alias.length));
    }
    for (const name of item._names) {
      let v = queryWords.length > 1 ? scoreMulti(queryWords, name, typo) : scoreSingle(q, name, typo);
      if (v > 0 && name.variant) v = Math.max(tierOf(v) * Tier.SCALE + 1, v - 400);
      if (v > best) best = v;
    }
    return best;
  }

  function adjust(value, item, now) {
    const rank = kindRank[item.kind] ?? kindCount;
    return value + (item.pinned ? 500 : 0) + (kindCount - rank) * 20 + Frecency.bonus(usage[item.key], now);
  }

  function compare(a, b) {
    return b.score - a.score || a.item.label.length - b.item.label.length || a.item.label.localeCompare(b.item.label);
  }

  function insertTop(out, hit, limit) {
    if (out.length === limit && compare(hit, out[limit - 1]) >= 0) return;
    let i = Math.min(out.length, limit - 1);
    out[i] = hit;
    while (i > 0 && compare(out[i], out[i - 1]) < 0) {
      const t = out[i];
      out[i] = out[i - 1];
      out[i - 1] = t;
      i--;
    }
  }

  function recent(limit, kinds, now) {
    const out = [];
    for (const it of items) {
      if (kinds && !kinds.has(it.kind)) continue;
      const bonus = it.kind === 'command' ? 0 : Frecency.bonus(usage[it.key], now);
      if (!it.pinned && !bonus) continue;
      out.push({ item: it, score: (it.pinned ? 10000 : 0) + bonus + 1 });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, limit);
  }

  function search(raw, limit, kinds) {
    limit = Math.max(1, limit | 0);
    const now = Date.now();
    const q = Norm.normalize(raw).trim();
    if (!q) return recent(limit, kinds, now);
    const queryWords = Norm.words(q);
    const single = queryWords.length === 1 ? queryWords[0] : q;
    const out = [];
    let matched = 0;
    misses.length = 0;
    for (const it of items) {
      if (kinds && !kinds.has(it.kind)) continue;
      const s = score(single, queryWords, it, false);
      if (s > 0) {
        matched++;
        insertTop(out, { item: it, score: adjust(s, it, now), raw: s }, limit);
      } else misses.push(it);
    }
    if (matched < limit && strictness !== 'off') {
      for (const it of misses) {
        const s = score(single, queryWords, it, true);
        if (s > 0) insertTop(out, { item: it, score: adjust(s, it, now), raw: s }, limit);
      }
    }
    misses.length = 0;
    return out;
  }

  function setItems(list) {
    items = list.map(index);
  }

  function configure(options) {
    if (options.strictness) strictness = options.strictness;
    if (typeof options.transliterate === 'boolean') transliterate = options.transliterate;
    if (options.kindOrder) {
      kindRank = {};
      options.kindOrder.forEach((k, i) => { kindRank[k] = i; });
      kindCount = Object.keys(kindRank).length || 1;
    }
    if (options.usage) usage = options.usage;
  }

  return { Tier, tierOf, setItems, search, configure, prefixDistance, frecency: Frecency, all: () => items };
})();
