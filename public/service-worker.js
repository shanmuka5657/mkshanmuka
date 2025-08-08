
const CACHE_NAME = 'creditwise-v3';
const OFFLINE_URL = '/offline.html';
const RUNTIME_CACHE = 'runtime-v1';

// Pre-cache critical resources
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/app.js',
  '/icon-192x192.png',
  OFFLINE_URL
];

// Install phase
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate phase
self.addEventListener('activate', (event) => {
  // Clean old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );

  // Enable periodic sync if supported
  if (self.registration.periodicSync) {
    self.registration.periodicSync.register('credit-updates', {
      minInterval: 24 * 60 * 60 * 1000 // 24 hours
    }).catch(err => {
      console.log('Periodic sync registration failed:', err);
    });
  }
});

// Fetch handler with network-first strategy
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
      .catch(() => {
        // Offline fallback
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return caches.match(event.request);
      })
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-credit-data') {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  const cache = await caches.open(RUNTIME_CACHE);
  const requests = await cache.keys();
  
  // Process pending requests
  for (const request of requests) {
    if (request.url.includes('/api/')) {
      try {
        await fetch(request);
        await cache.delete(request);
      } catch (err) {
        console.error('Sync failed for:', request.url, err);
      }
    }
  }
}

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {
    title: 'CreditWise Update',
    body: 'Your credit score has been updated',
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow(event.notification.data.url);
      })
  );
});

// Share Target Handler
async function handleShare(event) {
  const formData = await event.request.formData();
  const sharedData = {
    title: formData.get('title'),
    text: formData.get('text'),
    url: formData.get('url')
  };

  // Store share data in IndexedDB
  await storeShareData(sharedData);

  return Response.redirect('/shared?success=1', 303);
}

async function storeShareData(data) {
  // Implement IndexedDB storage
  const db = await indexedDB.open('CreditWiseShareDB', 1);
  
  db.onupgradeneeded = (event) => {
    const db = event.target.result;
    db.createObjectStore('shares', { keyPath: 'id', autoIncrement: true });
  };

  return new Promise((resolve) => {
    db.onsuccess = () => {
      const tx = db.result.transaction('shares', 'readwrite');
      tx.objectStore('shares').add({
        ...data,
        timestamp: Date.now()
      });
      resolve();
    };
  });
}
