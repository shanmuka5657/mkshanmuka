
'use client';

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Landmark, ShieldCheck, FileWarning, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import { getLoanEligibility, LoanEligibilityOutput } from "@/ai/flows/loan-eligibility";
import { getFinancialRiskAssessment, FinancialRiskOutput } from "@/ai/flows/financial-risk-assessment";
import { getCreditUnderwriting, CreditUnderwritingOutput, CreditUnderwritingInput } from "@/ai/flows/credit-underwriting";
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
    underwriting: boolean;
};

export function FinancialsView({ analysisResult, onBack }: FinancialsViewProps) {
  const [estimatedIncome, setEstimatedIncome] = useState('');
  const [loading, setLoading] = useState<LoadingState>({ risk: false, rating: false, eligibility: false, underwriting: false });
  const [financialRisk, setFinancialRisk] = useState<FinancialRiskOutput | null>(null);
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
        const financialRiskOutput = await getFinancialRiskAssessment({ analysisResult, estimatedIncome: income });
        setFinancialRisk(financialRiskOutput);
        setLoading(prev => ({ ...prev, risk: false }));
        
        // Use the risk assessment without guarantor loans for the primary rating/eligibility flow.
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
    if (!loanEligibility || !aiRating || !financialRisk) {
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
        const riskAssessmentForRating = await getRiskAssessment({ analysisResult });

        const underwritingInput: CreditUnderwritingInput = {
            analysisResult,
            aiRating,
            loanEligibility,
            riskAssessment: riskAssessmentForRating, // Pass the full dual-assessment object
            estimatedIncome: Number(estimatedIncome),
            employmentType,
            loanType,
            desiredLoanAmount: amount,
            desiredTenure: Number(desiredTenure),
            userComments,
        };
        
        const underwritingOutput = await getCreditUnderwriting(underwritingInput);
        setUnderwriting(underwritingOutput);
        toast({ title: 'Underwriting Complete', description: 'AI has made a decision.' });

    } catch (error: any).