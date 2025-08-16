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
import { auth } from '@/lib/firebase-client';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type AuthError,
} from 'firebase/auth';


// Helper function to map Firebase error codes to user-friendly messages
const mapFirebaseError = (errorCode: string): string => {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'This email address is already in use by another account.';
        case 'auth/operation-not-allowed':
            return 'Password sign-in is not enabled for this project.';
        case 'auth/weak-password':
            return 'The password is too weak.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
             return 'Invalid email or password. Please try again.';
        case 'auth/invalid-id-token':
            return "The user's credential is no longer valid. The user must sign in again.";
        case 'auth/user-disabled':
            return 'This account has been disabled by an administrator.';
        case 'auth/network-request-failed':
            return 'A network error occurred. Please check your connection and try again.';
        default:
            return 'An unexpected authentication error occurred. Please try again.';
    }
};


export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleAuthSuccess = () => {
    router.push('/dashboard');
    router.refresh();
  };

  const handleAuth = async (type: 'login' | 'signup', event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      if (type === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }

      toast({
        title: 'Success!',
        description: type === 'login' ? 'Welcome back!' : 'Your account has been created.',
      });
      handleAuthSuccess();

    } catch (error: any) {
        const authError = error as AuthError;
        let userFriendlyMessage = mapFirebaseError(authError.code);
         toast({
            variant: 'destructive',
            title: 'Authentication Failed',
            description: userFriendlyMessage,
        });
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
