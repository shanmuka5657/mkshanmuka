
'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function ProtocolHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const fullUrl = searchParams.get('url');
    if (fullUrl) {
      try {
        const url = new URL(fullUrl);
        const path = url.hostname; // In 'web+creditwise://credit', hostname is 'credit'

        switch (path) {
          case 'credit':
            router.replace('/credit');
            break;
          case 'verify':
            router.replace('/verify');
            break;
          case 'cross-verify':
            router.replace('/cross-verify');
            break;
          default:
            // Fallback to the main credit page
            router.replace('/credit');
            break;
        }
      } catch (error) {
        console.error('Invalid protocol URL:', error);
        router.replace('/');
      }
    } else {
        // If no URL is provided, just go home
        router.replace('/');
    }
  }, [searchParams, router]);

  // This component will be replaced by the redirect, so it doesn't need to return anything complex.
  return null;
}


export default function HandleProtocolPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Redirecting you to the app...</p>
      <Suspense fallback={null}>
        <ProtocolHandler />
      </Suspense>
    </div>
  );
}
