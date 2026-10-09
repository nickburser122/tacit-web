const Norm = (() => {
  const marks = /[\u0300-\u036f\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
  const separators = /[^\p{L}\p{Nd}]+/u;

  const arabicLatin = {
    'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'g', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z', 'ر': 'r',
    'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f',
    'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'a', 'و': 'o', 'ي': 'y', 'ء': 'a', 'پ': 'p',
    'چ': 'ch', 'گ': 'g', 'ڤ': 'v'
  };

  function normalize(input) {
    const str = String(input);
    if (!/[^\x00-\x7f]/.test(str)) return str.toLowerCase();
    let out = '';
    for (const ch of str) {
      switch (ch) {
        case 'أ': case 'إ': case 'آ': case 'ٱ': out += 'ا'; break;
        case 'ة': out += 'ه'; break;
        case 'ى': out += 'ي'; break;
        case 'ؤ': out += 'و'; break;
        case 'ئ': out += 'ي'; break;
        case 'ـ': break;
        default: {
          const code = ch.charCodeAt(0);
          if (code >= 0x660 && code <= 0x669) out += String(code - 0x660);
          else if (code >= 0x6F0 && code <= 0x6F9) out += String(code - 0x6F0);
          else out += ch;
        }
      }
    }
    return out.normalize('NFD').replace(marks, '').toLowerCase();
  }

  function words(normalized) {
    return normalized.split(separators).filter(Boolean);
  }

  function splitCamel(raw) {
    return String(raw).replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2');
  }

  function hasArabic(text) {
    return /[\u0600-\u06FF]/.test(text);
  }

  function toLatin(normalizedArabic) {
    let out = '';
    for (const ch of normalizedArabic) out += arabicLatin[ch] ?? ch;
    return out;
  }

  function variants(normalized) {
    if (!hasArabic(normalized)) return [];
    const basic = toLatin(normalized);
    const collapsed = basic.replace(/aa/g, 'a').replace(/yy/g, 'y');
    const list = [
      basic,
      collapsed,
      basic.replace(/g/g, 'j'),
      basic.replace(/q/g, 'k'),
      collapsed.replace(/my/g, 'mi').replace(/ya/g, 'ia'),
      collapsed.replace(/o/g, 'ou')
    ];
    return [...new Set(list)];
  }

  function digits(text) {
    const n = normalize(text);
    let out = '';
    for (let i = 0; i < n.length; i++) {
      const c = n[i];
      if (c >= '0' && c <= '9') out += c;
      else if (c === '+' && out.length === 0) out += c;
    }
    return out;
  }

  return { normalize, words, splitCamel, hasArabic, variants, digits };
})();
