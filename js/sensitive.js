const Sensitive = (() => {
  function luhn(digits) {
    let sum = 0;
    let dbl = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = digits.charCodeAt(i) - 48;
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
      dbl = !dbl;
    }
    return sum % 10 === 0;
  }

  function ibanValid(raw) {
    const iban = raw.replace(/ /g, '');
    if (iban.length < 15 || iban.length > 34) return false;
    const r = iban.slice(4) + iban.slice(0, 4);
    let rem = 0;
    for (const ch of r) {
      const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
      for (const d of v) rem = (rem * 10 + Number(d)) % 97;
    }
    return rem === 1;
  }

  function entropy(text) {
    const counts = {};
    for (const ch of text) counts[ch] = (counts[ch] || 0) + 1;
    let e = 0;
    for (const c of Object.values(counts)) {
      const p = c / text.length;
      e -= p * Math.log2(p);
    }
    return e;
  }

  function classify(text) {
    if (text.includes('-----BEGIN') && text.includes('PRIVATE KEY')) return 'key';
    if (/^\s*\d{4,8}\s*$/.test(text)) return 'otp';
    for (const m of text.toUpperCase().matchAll(/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}\b/g)) if (ibanValid(m[0])) return 'iban';
    for (const m of text.matchAll(/\b(?:\d[ -]?){13,19}\b/g)) {
      const d = m[0].replace(/\D/g, '');
      if (d.length >= 13 && d.length <= 19 && luhn(d)) return 'card';
    }
    const t = text.trim();
    if (/^[A-Za-z0-9_\-+/=.]{24,}$/.test(t) && entropy(t) >= 3.5 && /\d/.test(t) && /[A-Za-z]/.test(t) && !t.includes('/')) return 'token';
    return null;
  }

  return { classify, luhn, ibanValid };
})();
