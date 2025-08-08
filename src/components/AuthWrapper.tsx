
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { BottomNavbar } from './BottomNavbar';

const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Service Worker Registration Logic
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('ServiceWorker registration successful');
            
            // Request Notification Permission
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                console.log('Notification permission granted');
              }
            });
            
            // Register Periodic Sync for widgets
            if ('periodicSync' in registration) {
              registration.periodicSync.register('update-widget-data', {
                minInterval: 24 * 60 * 60 * 1000 // Daily updates
              }).then(() => {
                console.log('Periodic sync for widgets registered');
              }).catch(err => {
                console.log('Periodic sync registration failed: ', err);
              });
            }
          })
          .catch(err => {
            console.log('ServiceWorker registration failed: ', err);
          });
      });
    }

    // File Handler Registration
    if ('launchQueue' in window) {
      (window as any).launchQueue.setConsumer(async (launchParams: { files: any[]; }) => {
        if (launchParams.files && launchParams.files.length > 0) {
          const fileHandle = launchParams.files[0];
          // You would typically pass the file handle to the component that can process it
          // For now, we'll just log it and redirect to the credit page.
          console.log('App launched with file:', fileHandle.name);
          router.push('/credit');
        }
      });
    }

    // Protocol Handler Registration - note: may require user interaction to activate
    if ('registerProtocolHandler' in navigator) {
      try {
        (navigator as any).registerProtocolHandler('web+creditwise', '/handle-protocol?url=%s', 'CreditWise AI Handler');
        console.log('Protocol handler registration attempted.');
      } catch (e) {
        console.error('Protocol handler registration failed:', e);
      }
    }

    // Edge Side Panel Integration
    if ('sidePanel' in window) {
      console.log('Side Panel API is available.');
      // You can programmatically control the side panel here if needed
    }

    // Auth logic
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (!isLoggedIn) {
      router.replace('/login');
    } else {
      setIsLoading(false);
    }
  }, [router, pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen">
       <main className="flex-1 pb-20">
         {children}
       </main>
      <BottomNavbar />
    </div>
  );
};

export default AuthWrapper;
