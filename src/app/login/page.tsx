
'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, User } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthState } from 'react-firebase-hooks/auth';

export default function LoginPage() {
  // Common state
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [user, loading] = useAuthState(auth);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Phone state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    // Redirect if user is already logged in
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (!window.recaptchaVerifier) {
      // Ensure the container exists and is visible (though invisible reCAPTCHA doesn't need a visible element)
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (recaptchaContainer) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainer, {
          'size': 'invisible',
          'callback': (response: any) => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
          }
        });
      }
    }
  }, []);


  const handleSuccessfulLogin = (user: User) => {
    if (!user.emailVerified && user.providerData.some(p => p.providerId === 'password')) {
        toast({
            variant: 'destructive',
            title: 'Verification Required',
            description: 'Please verify your email address. Check your inbox for the verification link.',
        });
        auth.signOut();
        return;
    }
    toast({
      title: 'Login Successful!',
      description: "Welcome back.",
    });
    router.push('/dashboard');
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
      let errorMessage = 'An unknown error occurred.';
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Invalid credentials. Please check your email and password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        default:
          errorMessage = 'An error occurred during login. Please try again.';
          break;
      }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        const fullPhoneNumber = `+91${phone}`; // Assuming Indian numbers
        const verifier = window.recaptchaVerifier;
        const result = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
        setConfirmationResult(result);
        setOtpSent(true);
        toast({
            title: 'OTP Sent',
            description: `An OTP has been sent to ${fullPhoneNumber}.`,
        });
    } catch (error: any) {
         let errorMessage = error.message || 'Please check the mobile number and try again.';
         if (error.code === 'auth/captcha-check-failed') {
            errorMessage = "Failed to verify reCAPTCHA. For local development, ensure 'localhost' is an authorized domain in your Firebase project's Authentication settings.";
         } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = "Mobile number sign-in is not enabled. Please enable it in your Firebase project's Authentication settings.";
         }
         toast({
            variant: 'destructive',
            title: 'Failed to Send OTP',
            description: errorMessage,
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!confirmationResult) return;
      setIsLoading(true);

      try {
          const result = await confirmationResult.confirm(otp);
          handleSuccessfulLogin(result.user);
      } catch (error: any) {
          toast({
            variant: 'destructive',
            title: 'OTP Verification Failed',
            description: error.message || 'The OTP is incorrect. Please try again.',
        });
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <main className="container flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Tabs defaultValue="email">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="mobile">Mobile Number</TabsTrigger>
            </TabsList>
            <div id="recaptcha-container"></div>
            <TabsContent value="email">
                <Card className="border-none shadow-none">
                    <form onSubmit={handleEmailLogin}>
                        <CardHeader className="text-center">
                            <div className="mx-auto bg-primary/10 p-3 rounded-full mb-4">
                                <LogIn className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle>Welcome Back!</CardTitle>
                            <CardDescription>
                            Enter your email below to log in to your account.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
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
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                            />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In with Email
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                                Don't have an account?{' '}
                                <Link href="/signup" className="text-primary hover:underline font-semibold">
                                    Sign Up
                                </Link>
                            </p>
                        </CardFooter>
                    </form>
                </Card>
            </TabsContent>
            <TabsContent value="mobile">
                <Card className="border-none shadow-none">
                    <form onSubmit={otpSent ? handleVerifyOtp : handlePhoneLogin}>
                        <CardHeader className="text-center">
                            <div className="mx-auto bg-primary/10 p-3 rounded-full mb-4">
                                <LogIn className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle>Welcome Back!</CardTitle>
                            <CardDescription>
                            {otpSent ? "Enter the OTP we sent to your phone." : "Enter your mobile number to get an OTP."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!otpSent ? (
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Mobile Number</Label>
                                    <div className="flex items-center">
                                        <span className="p-2 border rounded-l-md bg-muted text-muted-foreground text-sm">+91</span>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="9876543210"
                                            required
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            disabled={isLoading}
                                            className="rounded-l-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="otp">One-Time Password (OTP)</Label>
                                    <Input
                                        id="otp"
                                        type="text"
                                        placeholder="Enter 6-digit OTP"
                                        required
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {otpSent ? 'Verify OTP & Sign In' : 'Send OTP'}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                                Don't have an account?{' '}
                                <Link href="/signup" className="text-primary hover:underline font-semibold">
                                    Sign Up
                                </Link>
                            </p>
                        </CardFooter>
                    </form>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
