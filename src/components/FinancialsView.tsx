
'use client';

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Landmark, ShieldCheck, FileWarning, HelpCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import { getLoanEligibility, LoanEligibilityOutput } from "@/ai/flows/loan-eligibility";
import { getFinancialRiskAssessment, FinancialRiskOutput } from "@/ai/flows/financial-risk-assessment";
import { getCreditUnderwriting, CreditUnderwritingOutput, CreditUnderwritingInput } from "@/ai/flows/credit-underwriting";
import { getAiRating, AiRatingOutput } from "@/ai/flows/ai-rating";
import { getRiskAssessment, RiskAssessmentOutput } from "@/ai/flows/risk-assessment";

import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

interface FinancialsViewProps {
  analysisResult: AnalyzeCreditReportOutput;
  onBack: () => void;
}

type LoadingState = {
    risk: boolean;
    rating: boolean;
    eligibility: boolean;
    underwriting: boolean;
};

export function FinancialsView({ analysisResult, onBack }: FinancialsViewProps) {
  const [estimatedIncome, setEstimatedIncome] = useState('');
  const [loading, setLoading] = useState<LoadingState>({ risk: false, rating: false, eligibility: false, underwriting: false });
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessmentOutput | null>(null);
  const [aiRating, setAiRating] = useState<AiRatingOutput | null>(null);
  const [loanEligibility, setLoanEligibility] = useState<LoanEligibilityOutput | null>(null);
  const [underwriting, setUnderwriting] = useState<CreditUnderwritingOutput | null>(null);

  const [desiredLoanAmount, setDesiredLoanAmount] = useState('');
  const [desiredTenure, setDesiredTenure] = useState('36');
  const [loanType, setLoanType] = useState<CreditUnderwritingInput['loanType']>('Personal Loan');
  const [employmentType, setEmploymentType] = useState<CreditUnderwritingInput['employmentType']>('Salaried');
  const [userComments, setUserComments] = useState('');

  const { toast } = useToast();

  const handleRunFinancialAnalysis = async () => {
    const income = Number(estimatedIncome);
    if (!income || income <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Income', description: 'Please enter a valid monthly income.' });
      return;
    }

    setLoading({ risk: true, rating: true, eligibility: true, underwriting: false });
    setLoanEligibility(null);
    setUnderwriting(null);
    
    try {
        const { output: riskAssessmentOutput } = await getFinancialRiskAssessment({ analysisResult, estimatedIncome: income });
        setLoading(prev => ({ ...prev, risk: false }));
        
        // Use the risk assessment without guarantor loans for the primary rating/eligibility flow.
        const { output: riskAssessmentForRating } = await getRiskAssessment({ analysisResult });
        
        const { output: aiRatingOutput } = await getAiRating({ analysisResult, riskAssessment: riskAssessmentForRating.assessmentWithoutGuarantor });
        setAiRating(aiRatingOutput);
        setLoading(prev => ({ ...prev, rating: false }));

        const { output: loanEligibilityOutput } = await getLoanEligibility({
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
      console.error("Error during financial analysis:", error);
      toast({
        variant: "destructive",
        title: "Financial Analysis Failed",
        description: error.message || "An unknown error occurred.",
      });
      setLoading({ risk: false, rating: false, eligibility: false, underwriting: false });
    }
  };
  
  const handleRunUnderwriting = async () => {
    if (!loanEligibility || !aiRating || !riskAssessment) {
        toast({ variant: 'destructive', title: 'Missing Data', description: 'Please run the initial financial analysis first.' });
        return;
    }
    const amount = Number(desiredLoanAmount);
    if (!amount || amount <= 0) {
        toast({ variant: 'destructive', title: 'Invalid Loan Amount', description: 'Please enter a valid loan amount.' });
        return;
    }
    
    setLoading(prev => ({ ...prev, underwriting: true }));
    setUnderwriting(null);

    try {
        const { output: riskAssessmentForRating } = await getRiskAssessment({ analysisResult });

        const underwritingInput: CreditUnderwritingInput = {
            analysisResult,
            aiRating,
            loanEligibility,
            riskAssessment: riskAssessmentForRating.assessmentWithoutGuarantor, // Use the non-guarantor version
            estimatedIncome: Number(estimatedIncome),
            employmentType,
            loanType,
            desiredLoanAmount: amount,
            desiredTenure: Number(desiredTenure),
            userComments,
        };
        
        const { output: underwritingOutput } = await getCreditUnderwriting(underwritingInput);
        setUnderwriting(underwritingOutput);
        toast({ title: 'Underwriting Complete', description: 'AI has made a decision.' });

    } catch (error: any) {
      console.error("Error during underwriting:", error);
      toast({
        variant: "destructive",
        title: "Underwriting Failed",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
        setLoading(prev => ({ ...prev, underwriting: false }));
    }
  };
  
  const getDecisionBadge = (decision: string) => {
    const d = decision.toLowerCase();
    if (d === 'approved') return <Badge variant="success">Approved</Badge>;
    if (d === 'conditionally approved') return <Badge className="bg-blue-500 text-white hover:bg-blue-600">Conditionally Approved</Badge>;
    if (d === 'requires manual review') return <Badge variant="secondary">Manual Review</Badge>;
    if (d === 'declined') return <Badge variant="destructive">Declined</Badge>;
    return <Badge variant="outline">{decision}</Badge>;
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main View
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Landmark />Financial Analysis & Underwriting</CardTitle>
          <CardDescription>Enter your income to assess loan eligibility and run a full AI-powered underwriting simulation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="income">Estimated Monthly Income (INR)</Label>
                    <Input id="income" type="number" placeholder="e.g., 75000" value={estimatedIncome} onChange={e => setEstimatedIncome(e.target.value)} />
                </div>
                <Button onClick={handleRunFinancialAnalysis} disabled={loading.eligibility || !estimatedIncome}>
                    {loading.eligibility ? <Loader2 className="mr-2 animate-spin" /> : null}
                    {loading.eligibility ? 'Analyzing...' : 'Run Financial Analysis'}
                </Button>
            </div>
        </CardContent>
      </Card>

      {loanEligibility && (
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
      )}
      
      {loanEligibility && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck/>AI Underwriting Simulation</CardTitle>
                <CardDescription>Enter your desired loan details and have the AI make a final underwriting decision.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="loan-amount">Desired Loan Amount (INR)</Label>
                        <Input id="loan-amount" type="number" placeholder="e.g., 500000" value={desiredLoanAmount} onChange={e => setDesiredLoanAmount(e.target.value)}/>
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="tenure">Desired Tenure (Months)</Label>
                        <Select value={desiredTenure} onValueChange={setDesiredTenure}>
                            <SelectTrigger id="tenure"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="12">12 Months</SelectItem>
                                <SelectItem value="24">24 Months</SelectItem>
                                <SelectItem value="36">36 Months</SelectItem>
                                <SelectItem value="48">48 Months</SelectItem>
                                <SelectItem value="60">60 Months</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="loan-type">Loan Type</Label>
                        <Select value={loanType} onValueChange={setLoanType as (value: string) => void}>
                            <SelectTrigger id="loan-type"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Personal Loan">Personal Loan</SelectItem>
                                <SelectItem value="Auto Loan">Auto Loan</SelectItem>
                                <SelectItem value="Home Loan">Home Loan</SelectItem>
                                <SelectItem value="Loan Against Property">Loan Against Property</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="employment-type">Employment Type</Label>
                        <Select value={employmentType} onValueChange={setEmploymentType as (value: string) => void}>
                            <SelectTrigger id="employment-type"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Salaried">Salaried</SelectItem>
                                <SelectItem value="Self-employed">Self-employed</SelectItem>
                                <SelectItem value="Daily Wage Earner">Daily Wage Earner</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="comments">Additional Comments (Optional)</Label>
                        <Textarea id="comments" placeholder="e.g., 'The EMI for my car loan is incorrect in the report, it is actually lower.'" value={userComments} onChange={e => setUserComments(e.target.value)} />
                     </div>
                 </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleRunUnderwriting} disabled={loading.underwriting || !desiredLoanAmount}>
                    {loading.underwriting ? <Loader2 className="mr-2 animate-spin" /> : null}
                    Run AI Underwriting
                </Button>
            </CardFooter>
        </Card>
      )}

      {underwriting && (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Underwriting Decision</CardTitle>
                        <CardDescription>Final decision based on all available data.</CardDescription>
                    </div>
                    {getDecisionBadge(underwriting.underwritingDecision)}
                </div>
            </CardHeader>
            <CardContent>
                <Alert className="mb-6">
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>Underwriting Summary</AlertTitle>
                    <AlertDescription>{underwriting.underwritingSummary}</AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="font-semibold">Loan Terms</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="p-3 bg-muted rounded-md">
                                <p className="text-muted-foreground text-xs">Approved Amount</p>
                                <p className="font-semibold text-lg">₹{underwriting.approvedLoanAmount.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="p-3 bg-muted rounded-md">
                                <p className="text-muted-foreground text-xs">Interest Rate</p>
                                <p className="font-semibold text-lg">{underwriting.recommendedInterestRate}</p>
                            </div>
                            <div className="p-3 bg-muted rounded-md">
                                <p className="text-muted-foreground text-xs">Tenure</p>
                                <p className="font-semibold text-lg">{underwriting.recommendedTenure} months</p>
                            </div>
                        </div>
                        {underwriting.conditions.length > 0 && (
                             <div>
                                <h4 className="font-semibold">Conditions</h4>
                                <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                                    {underwriting.conditions.map((c, i) => <li key={i}>{c}</li>)}
                                </ul>
                            </div>
                        )}
                         <div>
                            <h4 className="font-semibold">Required Documents</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                                {underwriting.requiredDocuments.map((d, i) => <li key={i}>{d}</li>)}
                            </ul>
                        </div>
                    </div>
                     <div className="space-y-4">
                        <h4 className="font-semibold">Risk Metrics</h4>
                        <div className="p-3 border rounded-md">
                            <div className="flex justify-between items-center">
                                <Label>Probability of Default (PD)</Label>
                                <Badge variant="destructive">{underwriting.probabilityOfDefault}%</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{underwriting.riskMetricsExplanation.pd}</p>
                        </div>
                        <div className="p-3 border rounded-md">
                            <div className="flex justify-between items-center">
                                <Label>Loss Given Default (LGD)</Label>
                                <Badge variant="secondary">{underwriting.lossGivenDefault}%</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{underwriting.riskMetricsExplanation.lgd}</p>
                        </div>
                        <div className="p-3 border rounded-md">
                            <div className="flex justify-between items-center">
                                <Label>Final Profile Rating</Label>
                                <Badge className={cn(
                                    underwriting.finalProfileRating.includes('Low') && 'bg-green-500',
                                    underwriting.finalProfileRating.includes('Moderate') && 'bg-yellow-500',
                                    underwriting.finalProfileRating.includes('High') && 'bg-red-500',
                                )}>{underwriting.finalProfileRating}</Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

    