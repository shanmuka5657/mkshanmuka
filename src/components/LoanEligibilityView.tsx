
'use client';

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Scale, PiggyBank, BarChart, Lightbulb, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { getLoanEligibility, LoanEligibilityInput, LoanEligibilityOutput } from "@/ai/flows/loan-eligibility";
import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import type { AiRatingOutput } from "@/ai/flows/ai-rating";
import { getAiRating } from "@/ai/flows/ai-rating";
import { getRiskAssessment } from "@/ai/flows/risk-assessment";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface LoanEligibilityViewProps {
  analysisResult: AnalyzeCreditReportOutput;
  onBack: () => void;
}

export function LoanEligibilityView({ analysisResult, onBack }: LoanEligibilityViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<LoanEligibilityOutput | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState<number | ''>('');
  const [aiRating, setAiRating] = useState<AiRatingOutput | null>(null);

  const { toast } = useToast();

  const handleRunAnalysis = async () => {
    if (!monthlyIncome) {
        toast({ variant: 'destructive', title: 'Income Required', description: 'Please enter an estimated monthly income.'});
        return;
    }
    setIsLoading(true);
    setEligibilityResult(null);

    try {
        // Step 1: Get Risk Assessment and AI Rating if not already present
        let currentAiRating = aiRating;
        if (!currentAiRating) {
            const { output: riskAssessment } = await getRiskAssessment({ analysisResult });
            if (!riskAssessment) throw new Error("Could not get risk assessment for rating.");
            const { output: ratingOutput } = await getAiRating({ analysisResult, riskAssessment: riskAssessment.assessmentWithGuarantor });
            currentAiRating = ratingOutput;
            setAiRating(ratingOutput);
        }
        
        if (!currentAiRating) throw new Error("Could not generate AI rating.");

        // Step 2: Get Loan Eligibility
        const input: LoanEligibilityInput = {
            aiScore: currentAiRating.riskScore,
            rating: currentAiRating.rating,
            monthlyIncome: Number(monthlyIncome),
            totalMonthlyEMI: analysisResult.emiDetails.totalEmi,
            analysisResult: analysisResult,
        };
        const { output: eligibilityOutput } = await getLoanEligibility(input);
        setEligibilityResult(eligibilityOutput);
        toast({ title: "Eligibility Assessed", description: "Your estimated loan eligibility is ready."});

    } catch (error: any) {
      console.error("Error getting loan eligibility:", error);
      toast({
        variant: "destructive",
        title: "Failed to Assess Eligibility",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main View
      </Button>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Scale /> Loan Eligibility Estimator</CardTitle>
            <CardDescription>Enter your estimated income to get an AI-powered personal loan eligibility projection.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="max-w-sm space-y-2">
                <Label htmlFor="income">Estimated Net Monthly Income (INR)</Label>
                <Input
                    id="income"
                    type="number"
                    placeholder="e.g., 50000"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={isLoading}
                />
            </div>
        </CardContent>
        <CardContent>
            <Button onClick={handleRunAnalysis} disabled={isLoading || !monthlyIncome}>
                {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <BarChart className="mr-2" />}
                Calculate Eligibility
            </Button>
        </CardContent>
      </Card>

      {isLoading && !eligibilityResult && (
        <Card className="text-center p-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-xl font-semibold">AI is calculating your eligibility...</h3>
        </Card>
      )}

      {eligibilityResult && (
        <Card>
          <CardHeader>
            <CardTitle>Eligibility Results</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                <PiggyBank className="mx-auto h-8 w-8 text-green-600 mb-2"/>
                <CardDescription>Eligible Loan Amount</CardDescription>
                <p className="text-3xl font-bold text-green-700">₹{eligibilityResult.eligibleLoanAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                <TrendingUp className="mx-auto h-8 w-8 text-blue-600 mb-2"/>
                <CardDescription>Estimated Interest Rate</CardDescription>
                <p className="text-3xl font-bold text-blue-700">{eligibilityResult.estimatedInterestRate}</p>
            </div>
             <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200">
                <Scale className="mx-auto h-8 w-8 text-yellow-600 mb-2"/>
                <CardDescription>Affordable EMI</CardDescription>
                <p className="text-3xl font-bold text-yellow-700">₹{eligibilityResult.repaymentCapacity.toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
           <CardContent>
              <Alert>
                  <AlertTitle className="font-semibold">Eligibility Summary</AlertTitle>
                  <AlertDescription>{eligibilityResult.eligibilitySummary}</AlertDescription>
              </Alert>
          </CardContent>
          <CardContent>
               <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><Lightbulb /> Suggestions to Increase Eligibility</h3>
               <div className="space-y-2">
                   {eligibilityResult.suggestionsToIncreaseEligibility.map((suggestion, index) => (
                       <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-md text-sm">
                           <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                           <p>{suggestion}</p>
                       </div>
                   ))}
               </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
