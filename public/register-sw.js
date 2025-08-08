
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

      // Example of how background sync could be triggered.
      // In a real app, a button with id 'sync-button' would trigger this.
      if ('SyncManager' in window) {
        const syncButton = document.getElementById('sync-button');
        if (syncButton) {
          syncButton.addEventListener('click', () => {
            registration.sync.register('sync-actions')
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
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update UI to notify the user they can install the PWA
  const installButton = document.getElementById('install-button');
  if (installButton) {
    installButton.style.display = 'block';

    installButton.addEventListener('click', () => {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        deferredPrompt = null;
        installButton.style.display = 'none';
      });
    });
  }
});
