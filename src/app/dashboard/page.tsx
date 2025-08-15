
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowRight, FileCheck2, FileText, Fingerprint, Save, User, Edit } from 'lucide-react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const features = [
  {
    title: 'Credit Analysis',
    description: 'Upload a CIBIL report for an in-depth, AI-powered analysis of credit health.',
    href: '/',
    icon: <FileText className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Verify PDF',
    description: 'Perform a forensic analysis on any PDF to detect signs of tampering or alteration.',
    href: '/verify',
    icon: <Fingerprint className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Cross-Verify Documents',
    description: 'Compare CIBIL, Bank Statements, and Salary Slips to find discrepancies.',
    href: '/cross-verify',
    icon: <FileCheck2 className="h-8 w-8 text-primary" />,
  },
];

interface UserDetails {
    name: string;
    mobile: string;
    pan: string;
    cibilScore: string;
    totalEmi: string;
    address: string;
}

const initialDetails: UserDetails = {
    name: '',
    mobile: '',
    pan: '',
    cibilScore: '',
    totalEmi: '',
    address: '',
};

export default function DashboardPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [details, setDetails] = useState<UserDetails>(initialDetails);
    const [isEditing, setIsEditing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setIsMounted(true);
        try {
            const savedDetails = localStorage.getItem('userDetails');
            if (savedDetails) {
                setDetails(JSON.parse(savedDetails));
            } else {
                setIsEditing(true); // If no details, start in editing mode
            }
        } catch (error) {
            console.error("Failed to load user details from local storage", error);
            setIsEditing(true);
        }
    }, []);

    // Effect to listen for changes in local storage from other tabs/pages
    useEffect(() => {
        const handleStorageChange = () => {
            try {
                const savedDetails = localStorage.getItem('userDetails');
                if (savedDetails) {
                    setDetails(JSON.parse(savedDetails));
                }
            } catch (error) {
                console.error("Failed to update details from storage change", error);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setDetails(prev => ({ ...prev, [id]: value }));
    };

    const handleSave = () => {
        try {
            localStorage.setItem('userDetails', JSON.stringify(details));
            toast({ title: "Details Saved!", description: "Your information has been saved locally on this device." });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save user details to local storage", error);
            toast({ variant: 'destructive', title: "Save Failed", description: "Could not save details to local storage." });
        }
    };
    
    if (!isMounted) {
        return null; // or a loading spinner
    }

  return (
    <main className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          Welcome to CreditWise AI
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Your personal dashboard to manage key financial data and access powerful analysis tools.
        </p>
      </div>
      
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <User className="h-6 w-6 text-primary" />
                    <CardTitle>My Details</CardTitle>
                </div>
                {!isEditing && (
                     <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                )}
            </div>
            <CardDescription>This information is automatically populated from your last analysis and saved on your device.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
             <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={details.name} onChange={handleInputChange} disabled={!isEditing} placeholder="Populated from report" />
            </div>
             <div>
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input id="mobile" value={details.mobile} onChange={handleInputChange} disabled={!isEditing} placeholder="Populated from report" />
            </div>
            <div>
                <Label htmlFor="pan">PAN Card Number</Label>
                <Input id="pan" value={details.pan} onChange={handleInputChange} disabled={!isEditing} placeholder="Populated from report" />
            </div>
            <div>
                <Label htmlFor="cibilScore">CIBIL Score</Label>
                <Input id="cibilScore" type="number" value={details.cibilScore} onChange={handleInputChange} disabled={!isEditing} placeholder="Populated from report" />
            </div>
             <div>
                <Label htmlFor="totalEmi">Total Monthly EMI (₹)</Label>
                <Input id="totalEmi" type="number" value={details.totalEmi} onChange={handleInputChange} disabled={!isEditing} placeholder="Populated from report" />
            </div>
            <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={details.address} onChange={handleInputChange} disabled={!isEditing} placeholder="Populated from report" />
            </div>
        </CardContent>
        {isEditing && (
            <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button onClick={handleSave}><Save className="mr-2 h-4 w-4"/>Save Details</Button>
            </CardFooter>
        )}
      </Card>

      <div className="text-center mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Analysis Tools</h2>
        <p className="mt-2 text-md text-muted-foreground">Use our AI-powered tools for deeper insights.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Link href={feature.href} key={feature.title} className="group">
            <Card className="h-full flex flex-col hover:shadow-lg hover:border-primary transition-all">
              <CardHeader className="flex-row items-center gap-4 space-y-0">
                {feature.icon}
                <div className="flex-1">
                  <CardTitle>{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
              <CardContent className="flex justify-end items-center">
                  <span className="text-sm font-semibold text-primary group-hover:underline">
                    Use Tool
                  </span>
                  <ArrowRight className="ml-2 h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
