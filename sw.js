const CACHE = 'tacit-v5';
const PAGE = new URL('index.html', self.registration.scope).href;
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest',
  'icons/tacit.svg', 'icons/tacit-maskable.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png',
  'icons/apple-touch-icon.png', 'icons/favicon.ico', 'icons/favicon-32.png',
  'fonts/readex-latin.woff2', 'fonts/readex-arabic.woff2',
  'css/tacit.css', 'css/panel.css',
  'js/boot.js', 'js/normalize.js', 'js/engine.js', 'js/calc.js', 'js/sensitive.js', 'js/store.js', 'js/i18n.js', 'js/clipaccess.js',
  'js/color.js', 'js/sky.js', 'js/timers.js', 'js/compose.js', 'js/importers.js', 'js/ui.js', 'js/panel.js', 'js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(ASSETS.map(asset => cache.add(asset))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  const key = request.mode === 'navigate' ? PAGE : request;
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(key, { ignoreSearch: key === PAGE });
      const network = fetch(request).then(response => {
        if (response.ok && !response.redirected) cache.put(key, response.clone());
        return response;
      });
      if (hit) {
        event.waitUntil(network.catch(() => {}));
        return hit;
      }
      try {
        return await network;
      } catch (e) {
        return (await cache.match(PAGE)) || Response.error();
      }
    })
  );
});
