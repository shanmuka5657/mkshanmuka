
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/ui/logo';
import { LogIn } from 'lucide-react';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  // Redirect if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/credit');
      }
    });
    return () => unsubscribe();
  }, [router]);


  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Please enter both email and password.',
      });
      return;
    }
    
    // For this demo, we'll allow any email/password to work for simplicity,
    // but a real app would use `signInWithEmailAndPassword`.
    // We'll simulate a successful login and then redirect.
    
    toast({
      title: 'Login Successful',
      description: 'Redirecting to the app...',
    });
    
    // In a real app, you would use this:
    /*
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed in 
        const user = userCredential.user;
        toast({
          title: 'Login Successful',
          description: 'Welcome back!',
        });
        router.push('/credit');
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: errorMessage,
        });
      });
    */

    // For the demo, we just redirect. The /credit page will handle anon sign-in.
    router.push('/credit');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
             <Logo />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Enter any email and password to continue.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              <LogIn className="mr-2 h-4 w-4" />
              Continue to App
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

    