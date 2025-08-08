// service-worker.js

const CACHE_NAME = 'creditwise-ai-v1';
const OFFLINE_URL = '/offline.html';
const ASSETS_TO_CACHE = [
  '/',
  '/offline.html'
];

// Install Service Worker and cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first strategy with offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          console.log('Fetch failed; returning offline page instead.', error);
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_URL);
          return cachedResponse;
        }
      })()
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});


// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-credit-data') {
    event.waitUntil(syncCreditData());
  }
});

async function syncCreditData() {
  // Implement your background sync logic here
  console.log('Background sync event for sync-credit-data triggered.');
  // Example: You might try to re-send failed API requests.
}

// Periodic Sync (requires permission)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-credit-scores') {
    event.waitUntil(updateCreditScores());
  }
});

async function updateCreditScores() {
  // Fetch fresh credit data periodically
  console.log('Periodic sync event for update-credit-scores triggered.');
  // const response = await fetch('/api/credit-scores');
  // const data = await response.json();
  
  // Broadcast update to all clients
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'CREDIT_SCORE_UPDATE',
      data: { message: 'New scores available!' } // Mock data
    });
  });
}

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body || 'New credit score update available',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'CreditWise AI', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0 && 'focus' in clientList[0]) {
        return clientList[0].focus();
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
