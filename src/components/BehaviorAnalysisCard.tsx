
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Loader2, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { cn } from "@/lib/utils";
import type { SummarizePaymentBehaviorInput } from "@/ai/flows/summarize-payment-behavior";

export type BehaviorAnalysisData = {
    rating: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'No Data';
    summary: string;
    paymentTrend: { month: string, onTime: number, late: number }[];
    totalPayments: number;
    onTimePayments: number;
    latePayments: number;
    paymentHistoryForAI?: SummarizePaymentBehaviorInput['paymentHistory'];
};

interface BehaviorAnalysisCardProps {
    analysis: BehaviorAnalysisData | null;
    isLoading: boolean;
}

const getRatingStyles = (rating: BehaviorAnalysisData['rating']) => {
    switch (rating) {
        case 'Excellent': return 'text-green-500 border-green-500';
        case 'Good': return 'text-blue-500 border-blue-500';
        case 'Fair': return 'text-yellow-500 border-yellow-500';
        case 'Poor': return 'text-red-500 border-red-500';
        default: return 'text-muted-foreground border-border';
    }
}

export function BehaviorAnalysisCard({ analysis, isLoading }: BehaviorAnalysisCardProps) {

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!analysis || analysis.rating === 'No Data') {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <HelpCircle className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">No Active Accounts</h3>
                <p>There are no active accounts with this ownership type to analyze.</p>
            </div>
        )
    }

    const onTimePercentage = analysis.totalPayments > 0 ? (analysis.onTimePayments / analysis.totalPayments) * 100 : 100;

    return (
        <Card className="border-none shadow-none">
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                <div className="md:col-span-1 space-y-4">
                    <Card className={cn("p-4 text-center", getRatingStyles(analysis.rating))}>
                        <CardDescription>Payment Behavior Rating</CardDescription>
                        <CardTitle className="text-4xl">{analysis.rating}</CardTitle>
                    </Card>
                    <Alert>
                        <AlertTitle>AI Summary</AlertTitle>
                        <AlertDescription>{analysis.summary || 'Generating summary...'}</AlertDescription>
                    </Alert>
                </div>
                <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <Card className="p-3">
                            <CardDescription>On-Time Payments</CardDescription>
                            <CardTitle className="text-green-500">{onTimePercentage.toFixed(0)}%</CardTitle>
                        </Card>
                         <Card className="p-3">
                            <CardDescription>Late Payments</CardDescription>
                            <CardTitle className="text-red-500">{analysis.latePayments}</CardTitle>
                        </Card>
                         <Card className="p-3">
                            <CardDescription>Total Payments</CardDescription>
                            <CardTitle>{analysis.totalPayments}</CardTitle>
                        </Card>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Payment Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div style={{ width: '100%', height: 200 }}>
                                <ResponsiveContainer>
                                    <BarChart data={analysis.paymentTrend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                                        <Bar dataKey="onTime" stackId="a" fill="#22c55e" name="On-Time" />
                                        <Bar dataKey="late" stackId="a" fill="#ef4444" name="Late" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    )
}
