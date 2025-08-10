
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If user is already logged in, redirect them to the credit page
        router.replace('/credit');
      } else {
        // No user, so we can stop showing the loading spinner
        setIsCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

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
      let userCredential;
      if (action === 'signup') {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        toast({
          title: 'Signup Successful',
          description: 'Welcome! You are now being redirected.',
          variant: 'default',
          className: 'bg-green-100 text-green-800'
        });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
         toast({
          title: 'Login Successful',
          description: 'Welcome back! You are now being redirected.',
        });
      }
      // The onAuthStateChanged listener will handle the redirect.
    } catch (error: any) {
      const errorCode = error.code;
      let friendlyMessage = 'An unexpected error occurred.';
      if (errorCode === 'auth/wrong-password') {
        friendlyMessage = 'Incorrect password. Please try again.';
      } else if (errorCode === 'auth/user-not-found') {
        friendlyMessage = 'No account found with this email. Please sign up.';
      } else if (errorCode === 'auth/email-already-in-use') {
        friendlyMessage = 'This email is already in use. Please log in.';
      } else if (errorCode === 'auth/weak-password') {
          friendlyMessage = 'Password should be at least 6 characters long.';
      } else if (errorCode === 'auth/invalid-email') {
          friendlyMessage = 'Please enter a valid email address.';
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
            <p className="text-muted-foreground">Checking authentication status...</p>
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
