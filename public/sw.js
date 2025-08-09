// This is a basic service worker
self.addEventListener('fetch', function(event) {
  // Basic cache-first strategy
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('install', (event) => {
  console.log('Service worker installed');
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
});
