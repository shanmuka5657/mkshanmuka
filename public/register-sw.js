
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

      // Register Background Sync - Note: This requires a UI element with id 'sync-button' to trigger.
      // Since it's not present in the current layout, this part will not throw an error,
      // but the event listener will not be attached to anything.
      const syncButton = document.getElementById('sync-button');
      if ('SyncManager' in window && syncButton) {
        syncButton.addEventListener('click', () => {
          registration.sync.register('sync-credit-data')
            .then(() => console.log('Background sync registered'))
            .catch(err => console.error('Sync registration failed:', err));
        });
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
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => {
                deferredPrompt = null;
            });
        }
    });
  }
});
