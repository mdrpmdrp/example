const CACHE_NAME = 'esplocationlog-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  '../../icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(event.request);
      if (
        !response ||
        response.status !== 200 ||
        (response.type !== 'basic' && response.type !== 'cors')
      ) {
        return response;
      }

      const cache = await caches.open(CACHE_NAME);
      await cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      return caches.match('./index.html');
    }
  })());
});
