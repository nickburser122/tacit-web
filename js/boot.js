(function () {
  try {
    var raw = localStorage.getItem('tacit.boot');
    var s = raw ? JSON.parse(raw) : (JSON.parse(localStorage.getItem('tacit.v1') || '{}').settings || {});
    var theme = s.theme || 'system';
    var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', dark ? '#1c1b19' : '#f6f2ea');
    var lang = s.lang === 'ar' || s.lang === 'en' ? s.lang : ((navigator.language || 'en').toLowerCase().indexOf('ar') === 0 ? 'ar' : 'en');
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
