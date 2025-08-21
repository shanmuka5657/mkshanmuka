
'use client';

import React from 'react';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { Logo } from './ui/logo';
import { Card, CardContent } from './ui/card';

interface PrintHeaderProps {
  analysisResult: AnalyzeCreditReportOutput;
}

export function PrintHeader({ analysisResult }: PrintHeaderProps) {
  const { customerDetails, cibilScore } = analysisResult;

  return (
    <div className="print-header mb-6">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
            <Logo />
            <div className="text-right">
                <h2 className="text-xl font-bold">Credit Analysis Report</h2>
                <p className="text-sm text-muted-foreground">Generated on: {new Date().toLocaleDateString()}</p>
            </div>
        </div>
        
        <Card>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center justify-center p-4">
                    <p className="text-sm text-muted-foreground">Official CIBIL Score</p>
                    <h2 className="text-6xl font-bold text-primary my-2">{cibilScore > 0 ? cibilScore : 'N/A'}</h2>
                </div>
                <div>
                    <h3 className="font-semibold mb-3">Consumer Information</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Name</span> <strong>{customerDetails.name}</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Date of Birth</span> <strong>{customerDetails.dateOfBirth}</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">PAN</span> <strong>{customerDetails.pan}</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Mobile Number</span> <strong>{customerDetails.mobileNumber}</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Address</span> <strong className="text-right">{customerDetails.address}</strong></div>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

    