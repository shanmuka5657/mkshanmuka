
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
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) {
      toast({
        variant: 'destructive',
        title: 'Firebase Not Initialized',
        description: 'Could not connect to Firebase. Please check the browser console.',
        duration: 10000,
      });
      setIsCheckingAuth(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        setIsCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router, toast]);

  const handleAuthAction = async () => {
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
      if (mode === 'signup') {
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
      console.error("Firebase Auth Error:", error.code, error.message);
      
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
        case 'auth/api-key-not-valid':
             friendlyMessage = 'The provided Firebase API key is not valid. Please check your configuration.';
             break;
        case 'auth/operation-not-allowed':
             friendlyMessage = 'Email/Password sign-in is not enabled in your Firebase project.';
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
  
  const toggleMode = () => {
    setMode(prevMode => (prevMode === 'login' ? 'signup' : 'login'));
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
          <CardTitle>{mode === 'login' ? 'Welcome Back!' : 'Create an Account'}</CardTitle>
          <CardDescription>{mode === 'login' ? 'Log in to continue to your account' : 'Enter your details to get started'}</CardDescription>
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
        <CardFooter className="flex flex-col gap-4">
          <Button onClick={handleAuthAction} className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (mode === 'login' ? <LogIn className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />)}
            {mode === 'login' ? 'Login' : 'Sign Up'}
          </Button>
           <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
            <button onClick={toggleMode} className="underline underline-offset-4 hover:text-primary font-semibold" disabled={isLoading}>
              {mode === 'login' ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
