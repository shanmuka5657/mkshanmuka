
'use client';

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// Dynamically import the main login form component
const LoginForm = lazy(() => import('@/components/LoginForm'));

function LoginPage() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  return (
    <main className="container flex flex-col items-center justify-center p-4">
       <Suspense fallback={<Loader2 className="animate-spin h-12 w-12" />}>
         <LoginForm redirectPath={redirectPath} />
       </Suspense>
    </main>
  );
}


// Wrap the page component in Suspense for the lazy-loaded LoginForm
export default function LoginPageWrapper() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="animate-spin h-12 w-12" />
            </div>
        }>
            <LoginPage />
        </Suspense>
    )
}
