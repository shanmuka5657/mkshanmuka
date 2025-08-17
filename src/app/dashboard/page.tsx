
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowRight, FileCheck2, FileText, Fingerprint } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    title: 'Credit Analysis',
    description: 'Upload a CIBIL report for an in-depth, AI-powered analysis of credit health.',
    href: '/credit',
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

export default function DashboardPage() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);
    
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
