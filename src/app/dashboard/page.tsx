
'use client';

import { FileText, PlusCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="bg-background font-body text-foreground">
       <main className="container mx-auto p-4 md:p-8">
            <div className="text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Welcome to CreditWise AI</h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Your suite of tools for intelligent credit analysis.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="flex items-center text-2xl">
                                <FileText className="mr-3 h-6 w-6 text-primary" />
                                Get Started
                            </CardTitle>
                            <CardDescription>
                                Begin by analyzing your first credit report to see your AI-powered insights.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-16 px-4 border-2 border-dashed rounded-lg">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-xl font-semibold">Ready to Analyze?</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Upload a credit report to unlock powerful insights and financial analysis.
                        </p>
                        <Button asChild className="mt-6">
                            <Link href="/credit">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Analyze Your First Report
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
       </main>
    </div>
  );
}
