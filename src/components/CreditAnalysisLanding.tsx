
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AnalysisDashboard } from '@/components/AnalysisDashboard';
import { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { User, BarChart, Shield, DollarSign } from 'lucide-react';
import { Badge } from './ui/badge';
import { getApprovalChanceFromRisk } from '@/app/credit/page';
import { cn } from '@/lib/utils';
import { RiskAssessmentOutput } from '@/ai/flows/risk-assessment';
import { Skeleton } from './ui/skeleton';
import React from 'react';


interface CreditAnalysisLandingProps {
    analysisResult: AnalyzeCreditReportOutput;
    riskAssessmentResult?: RiskAssessmentOutput | null;
    isLoading?: boolean;
    onSelectView: (view: string) => void;
    headerAction?: React.ReactNode;
}

export function CreditAnalysisLanding({ 
    analysisResult,
    riskAssessmentResult,
    isLoading,
    onSelectView,
    headerAction
}: CreditAnalysisLandingProps) {

    const { customerDetails, cibilScore } = analysisResult;
    const approvalChance = riskAssessmentResult ? getApprovalChanceFromRisk(riskAssessmentResult.riskScore) : null;
    const showSkeletons = isLoading;

    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row md:justify-between md:items-center text-center md:text-left gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Analysis for {customerDetails.name}</h1>
                    <p className="mt-2 text-md text-muted-foreground">
                        Use the dashboard below to explore detailed insights or edit the summary.
                    </p>
                </div>
                {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">CIBIL Score</CardTitle>
                        <BarChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{cibilScore > 0 ? cibilScore : 'N/A'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">AI Risk Score</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         {showSkeletons ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{riskAssessmentResult?.riskScore ?? 'N/A'} <span className="text-sm text-muted-foreground">/ 100</span></div>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approval Chance</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         {showSkeletons ? <Skeleton className="h-7 w-24" /> : approvalChance ? (
                            <div className={cn("text-2xl font-bold", approvalChance.color)}>{approvalChance.chance}</div>
                        ) : (
                            <div className="text-2xl font-bold">N/A</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <AnalysisDashboard
                analysisResult={analysisResult}
                onSelectView={onSelectView}
            />
        </div>
    )
}
