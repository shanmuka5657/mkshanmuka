
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
import { Loader2, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, sendEmailVerification, signOut, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // This sets up the reCAPTCHA verifier when the component mounts
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        toast({
          variant: 'destructive',
          title: 'Email Not Verified',
          description: 'Please check your inbox and click the verification link to activate your account.',
        });
        await signOut(auth);
        setIsLoading(false);
        return;
      }

      toast({
        title: 'Login Successful',
        description: "Welcome back!",
      });
      router.push('/dashboard');
    } catch (error: any) {
      let errorMessage = 'An unknown error occurred.';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-credential':
            errorMessage = 'Invalid credentials. Please check your email and password.';
            break;
        default:
          errorMessage = 'Please check your email and password.';
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
        const fullPhoneNumber = `+91${phone}`; // Assuming Indian numbers for now
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
         if (error.code === 'auth/operation-not-allowed') {
             errorMessage = 'Mobile number sign-in is not enabled for this project. Please enable it in your Firebase console under Authentication > Sign-in method.';
         }
         if (error.code === 'auth/captcha-check-failed') {
            errorMessage = "Failed to verify reCAPTCHA. For local development, ensure 'localhost' is an authorized domain in your Firebase project's Authentication settings.";
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
          await confirmationResult.confirm(otp);
          toast({
            title: 'Login Successful',
            description: "Welcome!",
          });
          router.push('/dashboard');
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
      <div id="recaptcha-container"></div>
      <div className="w-full max-w-md">
        <Tabs defaultValue="email">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="mobile">Mobile Number</TabsTrigger>
          </TabsList>
          <TabsContent value="email">
            <Card className="border-none shadow-none">
              <form onSubmit={handleEmailLogin}>
                <CardHeader className="text-center">
                  <div className="mx-auto bg-primary/10 p-3 rounded-full mb-4">
                    <KeyRound className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>
                    Enter your email and password to access your account.
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link href="#" className="text-xs text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
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
                    Sign In
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Don&apos;t have an account?{' '}
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
                    <KeyRound className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Sign In with Mobile</CardTitle>
                  <CardDescription>
                    {otpSent ? "Enter the OTP we sent to your phone." : "Enter your mobile number to receive an OTP."}
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
                    Don&apos;t have an account?{' '}
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
