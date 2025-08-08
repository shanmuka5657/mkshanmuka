// service-worker.js

const CACHE_NAME = 'creditwise-ai-v2';
const OFFLINE_URL = '/offline.html';
const RUNTIME_CACHE = 'runtime-cache';

const ASSETS_TO_CACHE = [
  '/',
  '/offline.html',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/maskable_icon.png'
];

// Install Service Worker and cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('Cache addAll failed:', err))
  );
});

// Activate Service Worker and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== RUNTIME_CACHE) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event listener
self.addEventListener('fetch', (event) => {
  // Handle file_handlers launch
  if (event.request.url.endsWith('/credit') && event.request.method === 'POST') {
    return event.respondWith(handleFileLaunch(event));
  }

  // Handle protocol_handlers requests
  if (event.request.url.includes('/handle-protocol')) {
    return event.respondWith(handleProtocol(event));
  }
  
  // Network-first strategy for navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
      .catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Stale-while-revalidate for other requests
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      });
    })
  );
});


// File Handler Logic - Redirects to the main app to handle the file
async function handleFileLaunch(event) {
    if (!self.launchQueue) {
        return new Response("File handling not supported.", { status: 400 });
    }

    return new Promise(resolve => {
        const channel = new MessageChannel();
        let redirectUrl = '/credit'; // Default redirect

        channel.port1.onmessage = (e) => {
            if (e.data.redirectUrl) {
                resolve(Response.redirect(e.data.redirectUrl, 303));
            }
        };

        self.launchQueue.setConsumer(async (launchParams) => {
            if (launchParams.files && launchParams.files.length) {
                const fileHandle = launchParams.files[0];
                const file = await fileHandle.getFile();

                // Send file to the main client to get a URL/token
                const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
                if (clients[0]) {
                    clients[0].postMessage({ file: file }, [channel.port2]);
                } else {
                    // No client open, can't handle file directly, just redirect
                    resolve(Response.redirect(redirectUrl, 303));
                }
            } else {
                 resolve(Response.redirect(redirectUrl, 303));
            }
        });
    });
}


// Protocol Handler Logic
async function handleProtocol(event) {
  const url = new URL(event.request.url);
  const creditwiseUrl = url.searchParams.get('url');
  
  // Handle web+creditwise:// protocol URLs
  if (creditwiseUrl) {
      const route = creditwiseUrl.split('://')[1];
      return Response.redirect(`/${route}`, 303);
  }
  return Response.redirect('/', 303);
}

// Widget Update Logic
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-widget-data') {
    event.waitUntil(updateWidgetData());
  }
});

async function updateWidgetData() {
  try {
    const response = await fetch('/api/widget-data'); // This needs to be a real endpoint
    const data = await response.json();
    
    // Update widget data
    await self.widgets.updateByTag('credit-score-widget', {
        data: JSON.stringify(data),
    });

  } catch (error) {
    console.error('Failed to update widget data:', error);
  }
}

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-credit-data') {
    event.waitUntil(Promise.resolve()); // Placeholder for sync logic
  }
});

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'CreditWise AI', body: 'New update available.', url: '/' };
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: {
      url: data.url
    }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});