const CACHE_NAME = 'pogoda-lokalna-v21';
const CORE_ASSETS = ['./', './index.html', './favicon.svg', './manifest.webmanifest', './summary.css?v=2.1', './summary.js?v=2.1'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('pogoda-lokalna-') && key !== CACHE_NAME)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (!response.ok) throw new Error('Navigation failed');
        // Only the application entry point may replace the offline page.
        if (url.pathname === new URL('./', self.registration.scope).pathname || url.pathname === new URL('./index.html', self.registration.scope).pathname) {
          try { await cache.put('./index.html', response.clone()); } catch {}
        }
        return response;
      } catch {
        return (await cache.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  if (!CORE_ASSETS.some(asset => new URL(asset, self.registration.scope).href === url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) { try { await cache.put(request, response.clone()); } catch {} }
    return response;
  })());
});
