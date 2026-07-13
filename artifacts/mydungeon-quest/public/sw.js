const CACHE = 'mydungeon-cinematic-v1';
const CORE = ['/', '/manifest.webmanifest', '/icon.svg', '/verify.html'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE))));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const clone = response.clone();
      caches.open(CACHE).then((c) => c.put(request, clone));
      return response;
    }).catch(() => caches.match(request).then((r) => r || caches.match('/'))));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    const clone = response.clone();
    caches.open(CACHE).then((c) => c.put(request, clone));
    return response;
  })));
});
