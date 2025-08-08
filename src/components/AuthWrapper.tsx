
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
            
            // Register Periodic Sync
            if ('periodicSync' in registration) {
              registration.periodicSync.register('update-credit-scores', {
                minInterval: 24 * 60 * 60 * 1000 // 1 day
              }).then(() => {
                console.log('Periodic sync registered');
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
