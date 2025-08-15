
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleAuthError = (errorMessage: string) => {
    console.error("Authentication Error:", errorMessage);
    let description = 'An unexpected error occurred. Please try again.';
    
    // Map server-side error codes to user-friendly messages
    switch (errorMessage) {
        case 'INVALID_LOGIN_CREDENTIALS':
            description = 'Invalid email or password. Please try again.';
            break;
        case 'EMAIL_EXISTS':
            description = 'This email address is already in use by another account.';
            break;
        case 'WEAK_PASSWORD':
            description = 'The password is too weak. Please choose a stronger password.';
            break;
        case 'INVALID_EMAIL':
            description = 'Please enter a valid email address.';
            break;
        case 'NETWORK_REQUEST_FAILED':
            description = 'Network error. Please check your internet connection and try again.';
            break;
        default:
            description = errorMessage;
            break;
    }
    
    toast({
      variant: 'destructive',
      title: 'Authentication Failed',
      description: description,
    });
  };

  const handleEmailAuth = async (type: 'login' | 'signup') => {
    setIsLoading(true);
    try {
      const action = type === 'login' ? emailLoginAction : emailSignupAction;
      const result = await action({ email, password });

      if (result.error || !result.idToken) {
        throw new Error(result.error || 'Authentication failed: No ID token returned.');
      }
      
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
                  <Button onClick={() => handleEmailAuth('login')} disabled={isLoading} className="w-full">
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
                   <Button onClick={() => handleEmailAuth('signup')} disabled={isLoading} className="w-full">
                     {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign Up
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}
