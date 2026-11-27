// Minimal service worker: no offline caching, just enough to satisfy
// browser PWA-installability requirements (a registered SW with a fetch handler).
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
