
// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('ServiceWorker registered');

      // Check for updates daily
      setInterval(() => registration.update(), 24 * 60 * 60 * 1000);

      // Request Notification Permission
      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('Notification permission granted');
          }
        });
      }

      // Register Background Sync
      if ('SyncManager' in window) {
        // This is a placeholder for a button that would trigger a sync.
        // You would need a button with id="sync-button" in your UI for this to work.
        const syncButton = document.getElementById('sync-button');
        if (syncButton) {
            syncButton.addEventListener('click', () => {
              registration.sync.register('sync-credit-data')
                .then(() => console.log('Background sync registered'))
                .catch(err => console.error('Sync registration failed:', err));
            });
        }
      }

    } catch (err) {
      console.error('ServiceWorker registration failed:', err);
    }
  });
}

// Install PWA prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installButton = document.getElementById('install-button');
  if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
            deferredPrompt = null;
        });
      });
  }
});
