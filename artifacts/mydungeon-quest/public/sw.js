// THE QUIET RECORD — the service worker is retired. This destructor is served
// so every OLD installation stands down on its next update check: caches
// cleared, registration removed, open pages steered back to the network.
// (Deleting the file outright would leave installed workers serving stale
// caches indefinitely — a failed update check keeps the old registration.)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    const pages = await self.clients.matchAll({ type: 'window' });
    for (const page of pages) page.navigate(page.url).catch(() => {});
  })());
});
