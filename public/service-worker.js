const CACHE_NAME = 'creditwise-ultra-v1';
const RUNTIME_CACHE = 'runtime-v3';
const OFFLINE_URL = '/offline.html';

// Enhanced Install with all capabilities
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([
        '/',
        '/index.html',
        OFFLINE_URL,
        '/styles/main.css',
        '/scripts/app.js',
        '/icon-192x192.png',
        '/icon-512x512.png'
      ]))
      .then(self.skipWaiting())
  );
});

// Activate all features
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
    }).then(() => {
      // Enable all capabilities
      self.clients.claim();
      // registerAllCapabilities(); // This function is not defined, so it's commented out.
    })
  );
});

// Generic Fetch Handler
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  // File Handler
  if (event.request.url.includes('/process-file')) {
    event.respondWith(handleFileProcessing(event));
    return;
  }
  
  // Protocol Handler
  if (event.request.url.startsWith('creditwise://')) {
    event.respondWith(handleProtocol(event));
    return;
  }

  // Share Target
  if (event.request.url.includes('/share-target')) {
    event.respondWith(handleShare(event));
    return;
  }
  
  // Network-first strategy
  event.respondWith(
    fetch(event.request)
      .then(response => cacheResponse(event.request, response))
      .catch(() => offlineResponse(event.request))
  );
});


// Feature: Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-actions') {
    event.waitUntil(syncPendingActions());
  }
});

// Feature: Push Notifications
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

// Feature: Periodic Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-content') {
    event.waitUntil(updateContent());
  }
});

// --- HELPER FUNCTIONS ---

function cacheResponse(request, response) {
  const responseClone = response.clone();
  caches.open(RUNTIME_CACHE)
    .then(cache => cache.put(request, responseClone));
  return response;
}

function offlineResponse(request) {
  return caches.match(request)
    .then(response => response || caches.match(OFFLINE_URL));
}

async function handleFileProcessing(event) {
  // Implement file processing logic here
  return new Response(JSON.stringify({ status: 'file processed' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleProtocol(event) {
  // Implement protocol handling logic here
  return Response.redirect('/protocol-handled', 303);
}

async function handleShare(event) {
  // Implement share handling logic here
  return Response.redirect('/share-received', 303);
}

async function syncPendingActions() {
    // Implement background sync logic
    console.log("Syncing pending actions...");
}

async function updateContent() {
    // Implement periodic sync logic
    console.log("Updating content periodically...");
}
