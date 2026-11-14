const Links = (() => {
  const UNSAFE = /^(javascript|data|vbscript|blob|file):/i;
  const TRACKING = /^(utm_[a-z0-9_]+|fbclid|gclid|gclsrc|dclid|gbraid|wbraid|msclkid|mc_cid|mc_eid|igshid|yclid|twclid|ttclid|li_fat_id|_hsenc|_hsmi|mkt_tok|vero_id|ref_src)$/i;
  const SHARE_HOSTS = /(^|\.)(youtube\.com|youtu\.be|spotify\.com)$/i;

  function safe(url) {
    const flat = String(url == null ? '' : url).replace(/[\x00-\x20\xad\u200b-\u200f\u2028\u2029\ufeff]/g, '');
    return flat !== '' && !UNSAFE.test(flat);
  }

  function clean(raw) {
    const text = String(raw);
    let url;
    try { url = new URL(text); } catch (e) { return { url: text, removed: 0 }; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { url: text, removed: 0 };
    let removed = 0;
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING.test(key) || (key === 'si' && SHARE_HOSTS.test(url.hostname))) {
        url.searchParams.delete(key);
        removed++;
      }
    }
    if (!removed) return { url: text, removed: 0 };
    return { url: url.href.replace(/\?$/, ''), removed };
  }

  function origin(template) {
    try { return new URL(template.replace(/\{[a-z]+\}|%s/g, 'x')).origin; } catch (e) { return ''; }
  }

  function normalizeHost(value) {
    let v = String(value || '').trim();
    if (!v) return '';
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = 'https://' + v;
    if (!/^https?:\/\//i.test(v)) return '';
    try {
      const u = new URL(v);
      return (u.origin + u.pathname).replace(/\/+$/, '');
    } catch (e) {
      return '';
    }
  }

  function wantsNewTab(settings, kind, override, flip) {
    const base = override === 'new' || override === 'same' ? override : (kind === 'search' ? settings.openSearch : settings.openLinks);
    return (base === 'new') !== !!flip;
  }

  return { safe, clean, origin, normalizeHost, wantsNewTab };
})();
