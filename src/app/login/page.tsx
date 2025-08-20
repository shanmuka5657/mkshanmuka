
'use client';

import { Suspense, lazy, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// Dynamically import the main login form component
const LoginForm = lazy(() => import('@/components/LoginForm'));

function LoginPage() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    // This effect ensures the reCAPTCHA verifier is initialized on the client side.
    if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (recaptchaContainer) {
        // Import Firebase auth and initialize RecaptchaVerifier only on the client.
        import('firebase/auth').then(({ RecaptchaVerifier, getAuth }) => {
          const auth = getAuth();
          if (auth) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainer, {
              'size': 'invisible',
              'callback': () => {
                // reCAPTCHA solved
              }
            });
          } else {
            console.error("Firebase Auth is not initialized.");
          }
        });
      }
    }
  }, []);

  return (
    <main className="container flex flex-col items-center justify-center p-4">
       <div id="recaptcha-container" />
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
