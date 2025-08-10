
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/ui/logo';
import { LogIn, Loader2 } from 'lucide-react';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Redirect if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/credit');
      } else {
        setIsCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    signInAnonymously(auth)
      .then(() => {
        toast({
          title: 'Authentication Successful',
          description: 'Redirecting to the app...',
        });
        // The onAuthStateChanged listener above will handle the redirect
      })
      .catch((error) => {
        console.error("Anonymous sign-in failed:", error);
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'Could not connect to the authentication service. Please check your connection and Firebase configuration.',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  if (isCheckingAuth) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary"/>
        </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
             <Logo />
          </div>
          <CardTitle className="text-2xl">Welcome to CreditWise AI</CardTitle>
          <CardDescription>Click below to start your secure session.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent>
            {/* Content can be added here if needed in the future */}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Continue to App
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
