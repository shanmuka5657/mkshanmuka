
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

interface LoginFormProps {
    redirectPath: string;
}

export default function LoginForm({ redirectPath }: LoginFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSuccessfulLogin = (loggedInUser: User) => {
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

    return (
        <div className="w-full max-w-md mt-8">
            <div className="text-center py-8">
                <Button variant="outline" size="icon" className="h-16 w-16 rounded-full mx-auto mb-6">
                    <LogIn className="h-8 w-8" />
                </Button>
                <h1 className="text-3xl font-bold">Welcome Back!</h1>
                <p className="text-muted-foreground mt-2">Enter your email below to log in.</p>
            </div>
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
            <p className="text-xs text-muted-foreground text-center mt-6">
                Don't have an account?{' '}
                <Link href="/signup" className="text-primary hover:underline font-semibold">
                    Sign Up
                </Link>
            </p>
        </div>
    );
}
