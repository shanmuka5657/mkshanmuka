
'use client';

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Landmark, ShieldCheck, FileWarning, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import { getLoanEligibility, LoanEligibilityOutput } from "@/ai/flows/loan-eligibility";
import { getFinancialRiskAssessment, FinancialRiskOutput } from "@/ai/flows/financial-risk-assessment";
import { getAiRating, AiRatingOutput } from "@/ai/flows/ai-rating";
import { getRiskAssessment, RiskAssessmentOutput } from "@/ai/flows/risk-assessment";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FinancialsViewProps {
  analysisResult: AnalyzeCreditReportOutput;
  onBack: () => void;
}

type LoadingState = {
    risk: boolean;
    rating: boolean;
    eligibility: boolean;
};

export function FinancialsView({ analysisResult, onBack }: FinancialsViewProps) {
  const [estimatedIncome, setEstimatedIncome] = useState('');
  const [loading, setLoading] = useState<LoadingState>({ risk: false, rating: false, eligibility: false });
  const [financialRisk, setFinancialRisk] = useState<FinancialRiskOutput | null>(null);
  const [aiRating, setAiRating] = useState<AiRatingOutput | null>(null);
  const [loanEligibility, setLoanEligibility] = useState<LoanEligibilityOutput | null>(null);

  const { toast } = useToast();

  const handleRunFinancialAnalysis = async () => {
    const income = Number(estimatedIncome);
    if (!income || income <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Income', description: 'Please enter a valid monthly income.' });
      return;
    }

    setLoading({ risk: true, rating: true, eligibility: true });
    setFinancialRisk(null);
    setAiRating(null);
    setLoanEligibility(null);
    
    try {
        const financialRiskOutput = await getFinancialRiskAssessment({ analysisResult, estimatedIncome: income });
        setFinancialRisk(financialRiskOutput);
        setLoading(prev => ({ ...prev, risk: false }));
        
        const riskAssessmentForRating = await getRiskAssessment({ analysisResult });
        
        const aiRatingOutput = await getAiRating({ analysisResult, riskAssessment: riskAssessmentForRating.assessmentWithoutGuarantor });
        setAiRating(aiRatingOutput);
        setLoading(prev => ({ ...prev, rating: false }));

        const loanEligibilityOutput = await getLoanEligibility({
            aiScore: aiRatingOutput.riskScore,
            rating: aiRatingOutput.rating,
            monthlyIncome: income,
            totalMonthlyEMI: analysisResult.emiDetails.totalEmi,
            analysisResult,
        });
        setLoanEligibility(loanEligibilityOutput);
        setLoading(prev => ({ ...prev, eligibility: false }));
        
        toast({ title: 'Financial Analysis Complete', description: 'Loan eligibility and financial risk have been calculated.' });

    } catch (error: any) {
      
      toast({
        variant: "destructive",
        title: "Financial Analysis Failed",
        description: error.message || "An unknown error occurred.",
      });
      setLoading({ risk: false, rating: false, eligibility: false });
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main View
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Landmark />Financial Analysis</CardTitle>
          <CardDescription>Enter your income to assess loan eligibility and financial risk.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="income">Estimated Monthly Income (INR)</Label>
                    <Input id="income" type="number" placeholder="e.g., 75000" value={estimatedIncome} onChange={e => setEstimatedIncome(e.target.value)} />
                </div>
                <Button onClick={handleRunFinancialAnalysis} disabled={loading.eligibility || !estimatedIncome}>
                    {(loading.risk || loading.rating || loading.eligibility) ? <Loader2 className="mr-2 animate-spin" /> : null}
                    {(loading.risk || loading.rating || loading.eligibility) ? 'Analyzing...' : 'Run Financial Analysis'}
                </Button>
            </div>
        </CardContent>
      </Card>

      {(loading.risk || loading.rating || loading.eligibility) && (
        <Card>
            <CardContent className="pt-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-muted-foreground">AI is running a deep financial analysis...</p>
            </CardContent>
        </Card>
      )}

      {financialRisk && aiRating && loanEligibility && (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Loan Eligibility Results</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold text-lg">Eligibility Summary</h3>
                        <p className="text-sm text-muted-foreground mt-2">{loanEligibility.eligibilitySummary}</p>
                        <h4 className="font-semibold mt-4">Suggestions to Increase Eligibility</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                            {loanEligibility.suggestionsToIncreaseEligibility.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <Card className="p-4 bg-muted/50 text-center">
                            <CardDescription>Eligible Loan Amount</CardDescription>
                            <p className="text-4xl font-bold text-primary">₹{loanEligibility.eligibleLoanAmount.toLocaleString('en-IN')}</p>
                        </Card>
                        <Card className="p-4 bg-muted/50 text-center">
                            <CardDescription>Estimated Interest Rate</CardDescription>
                            <p className="text-2xl font-semibold">{loanEligibility.estimatedInterestRate}</p>
                        </Card>
                        <Card className="p-4 bg-muted/50 text-center">
                            <CardDescription>Available for new EMI</CardDescription>
                            <p className="text-2xl font-semibold">₹{loanEligibility.repaymentCapacity.toLocaleString('en-IN')} / month</p>
                        </Card>
                    </div>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <CardTitle>Financial Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Alert className={cn(financialRisk.financialRiskRating === 'Low' && 'border-green-500', financialRisk.financialRiskRating === 'Medium' && 'border-yellow-500', financialRisk.financialRiskRating === 'High' && 'border-orange-500', financialRisk.financialRiskRating === 'Very High' && 'border-red-500')}>
                        <FileWarning className="h-4 w-4" />
                        <AlertTitle>Overall Financial Risk: {financialRisk.financialRiskRating}</AlertTitle>
                        <AlertDescription>{financialRisk.overallOutlook}</AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-4">
                             <CardDescription>Debt-to-Income (DTI) Ratio</CardDescription>
                            <p className="text-2xl font-bold">{financialRisk.dtiAnalysis.dtiPercentage}%</p>
                            <p className="text-xs text-muted-foreground mt-1">{financialRisk.dtiAnalysis.explanation}</p>
                        </Card>
                         <Card className="p-4">
                            <CardDescription>Unsecured Debt</CardDescription>
                            <p className="text-2xl font-bold">{financialRisk.debtComposition.unsecuredDebtPercentage}%</p>
                             <p className="text-xs text-muted-foreground mt-1">{financialRisk.debtComposition.explanation}</p>
                        </Card>
                         <Card className="p-4">
                             <CardDescription>Credit Utilization</CardDescription>
                            <p className="text-2xl font-bold">{financialRisk.creditUtilizationAnalysis.overallUtilization}%</p>
                             <p className="text-xs text-muted-foreground mt-1">{financialRisk.creditUtilizationAnalysis.explanation}</p>
                        </Card>
                    </div>
                </CardContent>
            </Card>
        </>
      )}

    </div>
  );
}
