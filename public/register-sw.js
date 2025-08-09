if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

let deferredPrompt;
const installButton = document.getElementById('install-button');

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update UI to notify the user they can install the PWA
  if (installButton) {
    installButton.style.display = 'block';
  }
});

if (installButton) {
  installButton.addEventListener('click', async () => {
    // Hide the app provided install promotion
    installButton.style.display = 'none';
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    deferredPrompt = null;
  });
}

window.addEventListener('appinstalled', () => {
  // Hide the install button
  if (installButton) {
    installButton.style.display = 'none';
  }
  // Clear the deferredPrompt so it can be garbage collected
  deferredPrompt = null;
  console.log('PWA was installed');
});
