'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithPopup,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleAuthSuccess = (user: User) => {
    toast({
      title: 'Success!',
      description: `Welcome, ${user.email}`,
    });
    router.push('/dashboard');
    // We also need to trigger a router refresh to ensure the new auth state is picked up by server components/layouts
    router.refresh();
  };

  const handleAuthError = (error: any) => {
    console.error("Authentication Error:", error);
    toast({
      variant: 'destructive',
      title: 'Authentication Failed',
      description: error.message || 'An unknown error occurred.',
    });
  };

  const handleApiAuth = async (endpoint: 'login' | 'signup') => {
      setIsLoading(true);
      try {
          const response = await fetch(`/api/auth/session`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password, type: endpoint }),
          });

          const { user, error } = await response.json();

          if (!response.ok || error) {
              throw new Error(error || 'An unknown error occurred.');
          }
          
          if (user) {
              handleAuthSuccess(user);
          } else {
              throw new Error('Authentication failed, please try again.');
          }

      } catch (error: any) {
          handleAuthError(error);
      } finally {
          setIsLoading(false);
      }
  }

  const handleLogin = () => handleApiAuth('login');
  const handleSignUp = () => handleApiAuth('signup');
  
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const idToken = await result.user.getIdToken();
        
        // Use the session API for Google sign-in as well to get the cookie
        const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken, type: 'google' }),
        });

        if (!response.ok) {
            const { error } = await response.json();
            throw new Error(error || "Google sign-in failed.");
        }

        handleAuthSuccess(result.user);

    } catch (error) {
        handleAuthError(error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <div className="w-full max-w-md p-4">
             <div className="flex justify-center mb-6">
                <Logo />
            </div>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login</CardTitle>
                  <CardDescription>
                    Enter your email below to login to your account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-login">Email</Label>
                    <Input id="email-login" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-login">Password</Label>
                    <Input id="password-login" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleLogin} disabled={isLoading} className="w-full">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>Sign Up</CardTitle>
                  <CardDescription>
                    Create a new account to get started.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-signup">Email</Label>
                    <Input id="email-signup" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signup">Password</Label>
                    <Input id="password-signup" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                </CardContent>
                <CardFooter>
                   <Button onClick={handleSignUp} disabled={isLoading} className="w-full">
                     {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign Up
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
             <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-muted/30 px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#4285F4" d="M24 9.5c3.21 0 5.95 1.13 8.16 3.24l6.4-6.4C34.33 2.61 29.56 0 24 0 14.52 0 6.66 5.54 3.01 13.5l7.98 6.19C12.8 14.15 17.96 9.5 24 9.5z"></path>
                  <path fill="#34A853" d="M46.99 24.5c0-1.56-.14-3.08-.4-4.5H24v8.51h12.8c-.55 2.76-2.19 5.1-4.82 6.74l7.98 6.19c4.68-4.32 7.42-10.42 7.42-16.94z"></path>
                  <path fill="#FBBC05" d="M10.99 28.19c-.5-1.5-.78-3.1-.78-4.7s.28-3.2.78-4.7l-7.98-6.19C1.19 16.29 0 20.02 0 24c0 3.98 1.19 7.71 3.01 10.81l7.98-6.62z"></path>
                  <path fill="#EA4335" d="M24 48c5.56 0 10.33-1.84 13.75-4.94l-7.98-6.19c-1.84 1.23-4.17 1.96-6.77 1.96-6.04 0-11.2-4.65-13.01-10.81L3.01 34.5C6.66 42.46 14.52 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              }
              Google
            </Button>
          </Tabs>
      </div>
    </div>
  );
}
