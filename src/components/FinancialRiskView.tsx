
'use client';

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Briefcase, FileText, Info, Percent } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { getFinancialRiskAssessment, FinancialRiskInput, FinancialRiskOutput } from "@/ai/flows/financial-risk-assessment";
import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { cn } from "@/lib/utils";

interface FinancialRiskViewProps {
  analysisResult: AnalyzeCreditReportOutput;
  onBack: () => void;
}

const getRiskRatingStyles = (rating: string) => {
    switch (rating) {
        case 'Low': return "bg-green-100 text-green-800 border-green-300";
        case 'Medium': return "bg-yellow-100 text-yellow-800 border-yellow-300";
        case 'High': return "bg-orange-100 text-orange-800 border-orange-300";
        case 'Very High': return "bg-red-100 text-red-800 border-red-300";
        default: return "bg-muted";
    }
}

const PointWiseList = ({ text }: { text: string }) => {
    const points = text.split(/\s*-\s+|\s*\*\s+/).filter(p => p.trim());
    return (
        <ul className="space-y-1 text-sm text-muted-foreground">
            {points.map((point, index) => (
                <li key={index} className="flex items-start gap-2">
                    <Info className="h-3 w-3 mt-1 flex-shrink-0 text-primary" />
                    <span>{point}</span>
                </li>
            ))}
        </ul>
    );
};

export function FinancialRiskView({ analysisResult, onBack }: FinancialRiskViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [income, setIncome] = useState<number | ''>('');
  const [riskAssessment, setRiskAssessment] = useState<FinancialRiskOutput | null>(null);
  const { toast } = useToast();

  const handleRunAnalysis = async () => {
    if (!income) {
        toast({ variant: 'destructive', title: 'Income required', description: 'Please enter an estimated monthly income.'});
        return;
    }
    
    setIsLoading(true);
    setRiskAssessment(null);
    try {
      const input: FinancialRiskInput = { analysisResult, estimatedIncome: Number(income) };
      const { output } = await getFinancialRiskAssessment(input);
      setRiskAssessment(output);
      toast({title: "Financial Risk Assessed", description: "The AI has completed its analysis."});
    } catch (error: any) {
      console.error("Error getting financial risk assessment:", error);
      toast({
        variant: "destructive",
        title: "Failed to Assess Risk",
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
          <CardTitle className="flex items-center gap-2"><Briefcase /> Financial Risk Assessment</CardTitle>
          <CardDescription>Enter your estimated monthly income to get an AI-powered analysis of your overall financial health, including DTI ratio and debt composition.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="max-w-sm space-y-2">
                <Label htmlFor="income">Estimated Net Monthly Income (INR)</Label>
                <Input
                    id="income"
                    type="number"
                    placeholder="e.g., 50000"
                    value={income}
                    onChange={(e) => setIncome(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={isLoading}
                />
            </div>
        </CardContent>
        <CardContent>
             <Button onClick={handleRunAnalysis} disabled={isLoading || !income}>
                {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <FileText className="mr-2" />}
                Assess Financial Risk
            </Button>
        </CardContent>
      </Card>
      
      {isLoading && !riskAssessment && (
        <Card className="text-center p-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-xl font-semibold">AI is analyzing your financial risk...</h3>
        </Card>
      )}

      {riskAssessment && (
        <Card>
            <CardHeader>
                <CardTitle>Assessment Results</CardTitle>
                <div className={cn("p-4 rounded-lg text-center border mt-2", getRiskRatingStyles(riskAssessment.financialRiskRating))}>
                    <CardDescription>Overall Financial Risk Rating</CardDescription>
                    <div className="text-3xl font-bold">{riskAssessment.financialRiskRating}</div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold flex items-center gap-2"><Percent /> Debt-to-Income (DTI) Analysis</h3>
                    <p className="text-2xl font-bold text-primary my-2">{riskAssessment.dtiAnalysis.dtiPercentage.toFixed(2)}%</p>
                    <PointWiseList text={riskAssessment.dtiAnalysis.explanation} />
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold">Debt Composition Analysis</h3>
                    <p className="text-2xl font-bold text-primary my-2">{riskAssessment.debtComposition.unsecuredDebtPercentage.toFixed(2)}% <span className="text-sm text-muted-foreground font-normal">Unsecured</span></p>
                    <PointWiseList text={riskAssessment.debtComposition.explanation} />
                </div>
                 <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold">Credit Utilization Analysis</h3>
                    <p className="text-2xl font-bold text-primary my-2">{riskAssessment.creditUtilizationAnalysis.overallUtilization.toFixed(2)}%</p>
                    <PointWiseList text={riskAssessment.creditUtilizationAnalysis.explanation} />
                </div>
                <Alert>
                    <AlertTitle className="font-semibold">Overall Outlook</AlertTitle>
                    <AlertDescription>
                        <PointWiseList text={riskAssessment.overallOutlook} />
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
      )}

    </div>
  );
}
