
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { BottomNavbar } from './BottomNavbar';

// Define admin-only routes
const adminRoutes = ['/trainer'];

const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // This effect should run only on the client
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole');

    if (!isLoggedIn) {
      router.replace('/login');
      return; // Stop further execution
    }

    // Check if the current route is an admin route
    if (adminRoutes.includes(pathname)) {
      if (userRole === 'admin') {
        // User is admin and can access the route
        setIsAuthorized(true);
      } else {
        // User is not an admin, redirect them
        toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'You do not have permission to view this page.',
        });
        router.replace('/credit');
        return; // Stop further execution
      }
    } else {
      // Not an admin route, so access is granted
      setIsAuthorized(true);
    }

    setIsLoading(false);

  }, [router, pathname]);

  if (isLoading || !isAuthorized) {
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

// Basic toast placeholder for non-component files if needed.
// In a real app, you'd import this from your UI library.
const toast = (options: { title: string; description: string, variant?: string }) => {
    console.log(`Toast: ${options.title} - ${options.description}`);
};
