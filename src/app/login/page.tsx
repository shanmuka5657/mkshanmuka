
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { emailLoginAction, emailSignupAction } from '@/app/actions';


export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleAuthSuccess = (type: 'login' | 'signup') => {
    toast({
      title: 'Success!',
      description: type === 'login' ? 'Welcome back!' : 'Your account has been created.',
    });
    router.push('/dashboard');
    router.refresh(); 
  };

  const handleAuthError = (errorCode: string) => {
    let description = 'An unexpected error occurred. Please try again.';
    
    switch (errorCode) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            description = 'Invalid email or password. Please try again.';
            break;
        case 'auth/email-already-in-use':
            description = 'This email address is already in use by another account.';
            break;
        case 'auth/weak-password':
            description = 'The password is too weak. Please choose a stronger password (at least 6 characters).';
            break;
        case 'auth/invalid-email':
            description = 'Please enter a valid email address.';
            break;
        case 'auth/network-request-failed':
             description = 'Network error. Please check your internet connection and try again.';
             break;
        default:
             // Keep the generic message for unknown codes
             break;
    }
    
    toast({
      variant: 'destructive',
      title: 'Authentication Failed',
      description: description,
    });
  };
  
  const handleAuth = async (type: 'login' | 'signup', event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const authAction = type === 'login' ? emailLoginAction : emailSignupAction;

    try {
      const result = await authAction(formData);

      if (result?.error) {
        throw new Error(result.error);
      }
      
      if (result?.idToken) {
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: result.idToken }),
        });

        if (!response.ok) {
          const { error } = await response.json();
          throw new Error(error || 'Failed to create session.');
        }

        handleAuthSuccess(type);
      } else {
        throw new Error('Authentication failed to return an ID token.');
      }
    } catch (error: any) {
      handleAuthError(error.message);
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
              <form onSubmit={(e) => handleAuth('login', e)}>
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
                      <Input id="email-login" name="email" type="email" placeholder="m@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-login">Password</Label>
                      <Input id="password-login" name="password" type="password" required />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Login
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>
            <TabsContent value="signup">
               <form onSubmit={(e) => handleAuth('signup', e)}>
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
                      <Input id="email-signup" name="email" type="email" placeholder="m@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-signup">Password</Label>
                      <Input id="password-signup" name="password" type="password" required />
                    </div>
                  </CardContent>
                  <CardFooter>
                     <Button type="submit" disabled={isLoading} className="w-full">
                       {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign Up
                    </Button>
                  </CardFooter>
                </Card>
               </form>
            </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}
