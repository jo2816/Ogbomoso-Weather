// ============================================================
//  OGBOMOSO WEATHER ALERT — SERVICE WORKER
//  Enables offline mode & "Add to Home Screen" on Android
// ============================================================

const CACHE_NAME = 'ogbomoso-weather-v1';

// Files to cache for offline use
const FILES_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ---- INSTALL: cache all files ----
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Caching app files');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ---- ACTIVATE: clean up old caches ----
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ---- FETCH: serve from cache when offline ----
self.addEventListener('fetch', event => {
  // For weather API calls — try network first, fall back to cache
  if (event.request.url.includes('open-meteo.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Save latest weather response to cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline: return last cached weather data
          return caches.match(event.request);
        })
    );
    return;
  }

  // For all other files — try cache first, then network
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(response => {
        // Cache any new files fetched
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    }).catch(() => {
      // If completely offline, return cached index.html
      return caches.match('./index.html');
    })
  );
});
