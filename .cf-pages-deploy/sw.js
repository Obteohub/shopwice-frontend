const CACHE_NAME = 'shopwice-cache-v7';
const ASSETS_TO_CACHE = [
  '/',
  '/pwa-offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/favicon.png',
  '/logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        ASSETS_TO_CACHE.map(async (asset) => {
          const response = await fetch(asset, { cache: 'no-cache' });
          if (!response || response.status !== 200) {
            throw new Error(`Failed to precache ${asset}`);
          }
          await cache.put(asset, response);
        }),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  let requestUrl;
  try {
    requestUrl = new URL(event.request.url);
  } catch {
    return;
  }

  if (requestUrl.protocol !== 'http:' && requestUrl.protocol !== 'https:') return;
  if (requestUrl.origin !== self.location.origin) return;

  // Keep navigation network-first to prevent stale app shell and broken hydration after deploy.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/pwa-offline') || caches.match('/');
      }),
    );
    return;
  }

  // Cache only core PWA static assets; avoid caching JS chunks/API responses.
  if (ASSETS_TO_CACHE.includes(requestUrl.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {
                // Ignore non-cacheable request/response pairs (e.g. unsupported schemes).
              });
            });
          }
          return networkResponse;
        });
      }),
    );
  }
});
