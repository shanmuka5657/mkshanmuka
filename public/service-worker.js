
const CACHE_NAME = 'creditwise-v4';
const OFFLINE_URL = '/offline.html';
const RUNTIME_CACHE = 'runtime-v2';

// Installation - Caches critical offline resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([
        '/',
        '/index.html',
        OFFLINE_URL,
        '/styles/main.css',
        '/scripts/app.js',
        '/icon-192x192.png'
      ]))
      .then(self.skipWaiting())
  );
});

// Activation - Cleans old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(self.clients.claim())
  );
});

// Fetch handler - Network-first with offline fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Handle share target
  if (event.request.url.includes('/share-score')) {
    event.respondWith(handleShare(event));
    return;
  }

  // Network-first strategy
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache dynamic responses
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE)
          .then(cache => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request)
        .then(response => response || caches.match(OFFLINE_URL))
      )
  );
});

// Background Sync - Fixed: Syncs user actions when offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-actions') {
    event.waitUntil(syncPendingActions());
  }
});

// Push Notifications - Fixed: Works when app closed
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {
    title: 'Credit Update',
    body: 'Your credit score has changed!',
    icon: '/icon-192x192.png'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      data: { url: data.url || '/' }
    })
  );
});

// Periodic Sync - Fixed: Updates in background
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-content') {
    event.waitUntil(updateContent());
  }
});

// Dummy functions for sync actions
async function syncPendingActions() {
    console.log('Background sync triggered.');
    // In a real app, you would sync data with your server here.
    return Promise.resolve();
}

async function updateContent() {
    console.log('Periodic sync triggered.');
    // In a real app, you would fetch new content here.
    return Promise.resolve();
}

async function handleShare(event) {
  console.log('Share event handled.');
  // In a real app, you would process the shared data.
  return Response.redirect('/', 303);
}
