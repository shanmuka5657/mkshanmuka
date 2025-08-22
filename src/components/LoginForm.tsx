
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LoginFormProps {
    redirectPath: string;
}

export default function LoginForm({ redirectPath }: LoginFormProps) {
    // Common state
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('email');

    // Email state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Phone state
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [otpSent, setOtpSent] = useState(false);

    const handleSuccessfulLogin = (loggedInUser: User) => {
        if (loggedInUser.providerData.some(p => p.providerId === 'password') && !loggedInUser.emailVerified) {
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
        router.push(redirectPath);
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
                    errorMessage = error.message || 'An error occurred during login. Please try again.';
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
    
    const renderRecaptcha = () => {
        const recaptchaContainer = document.getElementById('recaptcha-container');
        if (recaptchaContainer) {
            // This flag is recommended to avoid reCAPTCHA Enterprise errors
            // during development when App Check is not configured.
            auth.settings.appVerificationDisabledForTesting = true;
            window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainer, {
                'size': 'invisible'
            });
            window.recaptchaVerifier.render();
        }
    }

    const handlePhoneLogin = async () => {
        setIsLoading(true);
        try {
            renderRecaptcha();
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

    const getWelcomeText = () => {
      if (otpSent) return "Enter the OTP we sent to your phone.";
      if (activeTab === 'email') return "Enter your email below to log in.";
      return "Enter your mobile number to get an OTP.";
  }

    return (
        <div className="w-full max-w-md mt-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="mobile">Mobile Number</TabsTrigger>
                </TabsList>
                <div className="text-center py-8">
                    <Button variant="outline" size="icon" className="h-16 w-16 rounded-full mx-auto mb-6">
                        <LogIn className="h-8 w-8" />
                    </Button>
                    <h1 className="text-3xl font-bold">Welcome Back!</h1>
                    <p className="text-muted-foreground mt-2">{getWelcomeText()}</p>
                </div>
                <TabsContent value="email">
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In with Email
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
                                Verify OTP & Sign In
                            </Button>
                         </form>
                    ) : (
                         <form onSubmit={(e) => { e.preventDefault(); handlePhoneLogin(); }} className="space-y-4">
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
                Don't have an account?{' '}
                <Link href="/signup" className="text-primary hover:underline font-semibold">
                    Sign Up
                </Link>
            </p>
        </div>
    );
}
