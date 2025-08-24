
'use client';

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Landmark, ShieldCheck, FileWarning, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import { getFinancialRiskAssessment, FinancialRiskOutput } from "@/ai/flows/financial-risk-assessment";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface FinancialsViewProps {
  analysisResult: AnalyzeCreditReportOutput;
  onBack: () => void;
}

export function FinancialsView({ analysisResult, onBack }: FinancialsViewProps) {
  const [estimatedIncome, setEstimatedIncome] = useState('');
  const [fixedObligations, setFixedObligations] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [financialRisk, setFinancialRisk] = useState<FinancialRiskOutput | null>(null);

  const { toast } = useToast();

  const handleRunFinancialAnalysis = async () => {
    const income = Number(estimatedIncome);
    const obligations = Number(fixedObligations);

    if (!income || income <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Income', description: 'Please enter a valid monthly income.' });
      return;
    }
     if (isNaN(obligations) || obligations < 0) {
      toast({ variant: 'destructive', title: 'Invalid Obligations', description: 'Please enter a valid amount for fixed obligations.' });
      return;
    }

    setIsLoading(true);
    setFinancialRisk(null);
    
    try {
        const financialRiskOutput = await getFinancialRiskAssessment({ 
            analysisResult, 
            estimatedIncome: income,
            monthlyFixedObligations: obligations,
        });
        setFinancialRisk(financialRiskOutput);
        
        toast({ title: 'Financial Analysis Complete', description: 'The financial risk assessment is ready.' });

    } catch (error: any) {
      
      toast({
        variant: "destructive",
        title: "Financial Analysis Failed",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
        setIsLoading(false);
    }
  };

  const isButtonDisabled = isLoading || !estimatedIncome;

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main View
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Landmark />Financial Risk Assessment</CardTitle>
          <CardDescription>Enter income and fixed obligations to generate a detailed financial risk profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                    <Label htmlFor="income">Estimated Monthly Income (INR)</Label>
                    <Input id="income" type="number" placeholder="e.g., 75000" value={estimatedIncome} onChange={e => setEstimatedIncome(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="obligations">Monthly Fixed Obligations (e.g., Rent)</Label>
                    <Input id="obligations" type="number" placeholder="e.g., 20000" value={fixedObligations} onChange={e => setFixedObligations(e.target.value)} />
                </div>
                <Button onClick={handleRunFinancialAnalysis} disabled={isButtonDisabled}>
                    {isLoading ? <Loader2 className="mr-2 animate-spin" /> : null}
                    {isLoading ? 'Analyzing...' : 'Run Financial Analysis'}
                </Button>
            </div>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
            <CardContent className="pt-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-muted-foreground">AI is running a deep financial analysis...</p>
            </CardContent>
        </Card>
      )}

      {financialRisk && (
        <Card>
            <CardHeader>
                <CardTitle>Financial Risk Assessment Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert className={cn(financialRisk.financialRiskRating === 'Low' && 'border-green-500', financialRisk.financialRiskRating === 'Medium' && 'border-yellow-500', financialRisk.financialRiskRating === 'High' && 'border-orange-500', financialRisk.financialRiskRating === 'Very High' && 'border-red-500')}>
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>Overall Financial Risk: {financialRisk.financialRiskRating}</AlertTitle>
                    <AlertDescription>{financialRisk.overallOutlook}</AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4">
                        <CardDescription>DTI Ratio</CardDescription>
                        <p className="text-2xl font-bold">{financialRisk.dtiAnalysis.dtiPercentage}%</p>
                        <p className="text-xs text-muted-foreground mt-1">{financialRisk.dtiAnalysis.explanation}</p>
                    </Card>
                    <Card className="p-4">
                        <CardDescription>FOIR</CardDescription>
                        <p className="text-2xl font-bold">{financialRisk.foirAnalysis.foirPercentage}%</p>
                        <p className="text-xs text-muted-foreground mt-1">{financialRisk.foirAnalysis.explanation}</p>
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
      )}
    </div>
  );
}
