
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) {
      // If Firebase didn't initialize, we can't check auth state.
      // The console log in firebase.ts should show the error.
      toast({
        variant: 'destructive',
        title: 'Firebase Not Initialized',
        description: 'Could not connect to Firebase. Please check the browser console and your .env file.',
        duration: 10000,
      });
      setIsCheckingAuth(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/credit');
      } else {
        setIsCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router, toast]);

  const handleAuthAction = async (action: 'login' | 'signup') => {
    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please enter both email and password.',
      });
      return;
    }
    setIsLoading(true);
    try {
      if (action === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({
          title: 'Signup Successful',
          description: 'Welcome! You are now logged in.',
          variant: 'default',
          className: 'bg-green-100 text-green-800'
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
         toast({
          title: 'Login Successful',
          description: 'Welcome back! You are now being redirected.',
        });
      }
      // The onAuthStateChanged listener will handle the redirect.
    } catch (error: any) {
      console.error("Firebase Auth Error:", error.code, error.message); // Detailed log
      
      let friendlyMessage = 'An unexpected error occurred. Please try again.';
      switch (error.code) {
        case 'auth/wrong-password':
          friendlyMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/user-not-found':
          friendlyMessage = 'No account found with this email. Please sign up or check for typos.';
          break;
        case 'auth/email-already-in-use':
          friendlyMessage = 'This email is already registered. Please log in instead.';
          break;
        case 'auth/weak-password':
          friendlyMessage = 'Password is too weak. It should be at least 6 characters long.';
          break;
        case 'auth/invalid-email':
          friendlyMessage = 'The email address is not valid.';
          break;
        case 'auth/invalid-credential':
             friendlyMessage = 'The email or password you entered is incorrect.';
             break;
        case 'auth/network-request-failed':
            friendlyMessage = 'Network error. Please check your internet connection.';
            break;
        case 'auth/invalid-api-key':
             friendlyMessage = 'Invalid API Key. Please check your NEXT_PUBLIC_FIREBASE_API_KEY in the .env file.';
             break;
        default:
            friendlyMessage = `An unexpected error occurred. (Code: ${error.code})`;
            break;
      }
      
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: friendlyMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isCheckingAuth) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Connecting to Firebase...</p>
        </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo />
          </div>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Login or create an account to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button onClick={() => handleAuthAction('login')} className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Login
          </Button>
          <Button onClick={() => handleAuthAction('signup')} className="w-full" variant="outline" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign Up
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
