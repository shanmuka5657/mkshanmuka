
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main dashboard page immediately
    router.replace('/dashboard');
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
            <Logo />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>Redirecting to your dashboard...</p>
        </div>
      </div>
    </main>
  );
}
