
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, sendEmailVerification, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';

export default function SignupPage() {
  // Common state
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Email state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Phone state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [activeTab, setActiveTab] = useState('email');

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password.length < 6) {
        toast({
            variant: 'destructive',
            title: 'Signup Failed',
            description: 'Password must be at least 6 characters long.',
        });
        setIsLoading(false);
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      
      toast({
        title: 'Verification Email Sent',
        description: 'Please check your inbox to activate your account.',
      });

      setIsSuccess(true);
    } catch (error: any) {
      let errorMessage = 'An unknown error occurred.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email address is already in use.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'The password is too weak.';
          break;
        default:
          errorMessage = 'An error occurred during signup. Please try again.';
          break;
      }
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
    const renderRecaptcha = () => {
        const recaptchaContainer = document.getElementById('recaptcha-container');
        if (recaptchaContainer) {
            // This is the fix for the development environment
            auth.settings.appVerificationDisabledForTesting = true;
            window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainer, {
                'size': 'invisible'
            });
        }
    }

  const handlePhoneSignup = async () => {
    setIsLoading(true);
    try {
        renderRecaptcha();
        await window.recaptchaVerifier.render();
        const fullPhoneNumber = `+91${phone}`;
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
            errorMessage = "Failed to verify reCAPTCHA. For local development, ensure 'localhost' is an authorized domain in your Firebase project's Authentication settings AND check that your API key has no HTTP referrer restrictions in Google Cloud Console.";
         } else if (error.code === 'auth/too-many-requests') {
            errorMessage = "You've tried to send an OTP too many times. Please wait a while before trying again.";
         } else if (error.code === 'auth/network-request-failed') {
            errorMessage = "Network error. Please check your internet connection and ensure your browser isn't blocking reCAPTCHA.";
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
            title: 'Signup Successful!',
            description: "Your account has been created.",
          });
          setIsSuccess(true);
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

  const getWelcomeText = () => {
      if (otpSent) return "Enter the OTP we sent to your phone.";
      if (activeTab === 'email') return "Enter your details below to get started.";
      return "Enter your mobile number to get an OTP.";
  }

  if (isSuccess) {
    return (
        <main className="container flex items-center justify-center p-4">
            <Card className="w-full max-w-sm text-center">
                 <CardHeader>
                    <div className="mx-auto bg-green-100 p-3 rounded-full mb-4">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <CardTitle>Verification Required!</CardTitle>
                    <CardDescription>
                        {email ? (
                            <>A verification link has been sent to <strong>{email}</strong>. Please check your inbox to activate your account.</>
                        ) : (
                            <>Your account has been created successfully!</>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href="/login">Proceed to Login</Link>
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
  }

  return (
    <main className="container flex flex-col items-center justify-center p-4">
      <div id="recaptcha-container" />
      <div className="w-full max-w-md mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="mobile">Mobile Number</TabsTrigger>
            </TabsList>
            <div className="text-center py-8">
                <Button variant="outline" size="icon" className="h-16 w-16 rounded-full mx-auto mb-6">
                    <UserPlus className="h-8 w-8" />
                </Button>
                <h1 className="text-3xl font-bold">Create an Account</h1>
                <p className="text-muted-foreground mt-2">{getWelcomeText()}</p>
            </div>
            <TabsContent value="email">
                <form onSubmit={handleEmailSignup} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" type="text" placeholder="John Doe" required value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} placeholder="Must be at least 6 characters" />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign Up with Email
                    </Button>
                </form>
            </TabsContent>
            <TabsContent value="mobile">
                {otpSent ? (
                     <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="otp">One-Time Password (OTP)</Label>
                            <Input id="otp" type="text" placeholder="Enter 6-digit OTP" required value={otp} onChange={(e) => setOtp(e.target.value)} disabled={isLoading} />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Verify OTP & Sign Up
                        </Button>
                    </form>
                ) : (
                     <form onSubmit={(e) => { e.preventDefault(); handlePhoneSignup(); }} className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="phone">Mobile Number</Label>
                            <div className="flex items-center">
                                <span className="p-2 border rounded-l-md bg-muted text-muted-foreground text-sm">+91</span>
                                <Input id="phone" type="tel" placeholder="9876543210" required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isLoading} className="rounded-l-none" />
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send OTP
                        </Button>
                    </form>
                )}
            </TabsContent>
        </Tabs>
        <p className="text-xs text-muted-foreground text-center mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-semibold">
                Sign In
            </Link>
        </p>
      </div>
    </main>
  );
}
