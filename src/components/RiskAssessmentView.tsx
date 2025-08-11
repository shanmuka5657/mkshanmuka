
'use client';

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Shield, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { getRiskAssessment, RiskAssessmentInput, RiskAssessmentOutput } from "@/ai/flows/risk-assessment";
import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { AnalysisCard } from "./AnalysisCard";

interface RiskAssessmentViewProps {
  analysisResult: AnalyzeCreditReportOutput;
  onBack: () => void;
}

const getRiskLevelStyles = (level: string) => {
    switch (level) {
        case 'Low':
            return {
                badge: 'bg-green-100 text-green-800 border-green-200',
                text: 'text-green-600',
                icon: <CheckCircle className="text-green-500" />
            };
        case 'Medium':
            return {
                badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                text: 'text-yellow-600',
                icon: <AlertTriangle className="text-yellow-500" />
            };
        case 'High':
        case 'Very High':
            return {
                badge: 'bg-red-100 text-red-800 border-red-200',
                text: 'text-red-600',
                icon: <AlertTriangle className="text-red-500" />
            };
        default:
            return {
                badge: 'bg-gray-100 text-gray-800 border-gray-200',
                text: 'text-gray-600',
                icon: <Shield />
            };
    }
}

export function RiskAssessmentView({ analysisResult, onBack }: RiskAssessmentViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessmentOutput | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const runAnalysis = async () => {
      setIsLoading(true);
      try {
        const input: RiskAssessmentInput = { analysisResult };
        const { output } = await getRiskAssessment(input);
        setRiskAssessment(output);
      } catch (error: any) {
        console.error("Error getting risk assessment:", error);
        toast({
          variant: "destructive",
          title: "Failed to get AI Risk Assessment",
          description: error.message || "An unknown error occurred.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    runAnalysis();
  }, [analysisResult, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">AI is conducting a deep risk assessment...</p>
      </div>
    );
  }

  if (!riskAssessment) {
    return (
      <div className="text-center">
        <p className="mb-4">Could not load the AI Risk Assessment.</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="mr-2" /> Back
        </Button>
      </div>
    );
  }
  
  const riskStyles = getRiskLevelStyles(riskAssessment.riskLevel);

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack} className="no-print">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main View
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield /> AI Risk Assessment</CardTitle>
          <CardDescription>A technical analysis of the credit profile, focusing on quantifiable risk factors and financial metrics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 flex flex-col items-center justify-center text-center">
                <CardDescription className="mb-2">Overall Risk Score</CardDescription>
                <div className={cn("text-7xl font-bold", riskStyles.text)}>{riskAssessment.riskScore}</div>
                <p className="text-muted-foreground text-sm">out of 100 (higher is riskier)</p>
            </Card>
            <div className="p-6 bg-muted/50 rounded-lg flex flex-col justify-center">
                 <div className="flex items-center gap-3">
                    {riskStyles.icon}
                    <h3 className="text-xl font-semibold">Risk Level: <span className={riskStyles.text}>{riskAssessment.riskLevel}</span></h3>
                </div>
                <p className="text-muted-foreground mt-2 pl-10">
                    This rating is based on payment history, debt burden, credit utilization, and recent credit inquiries.
                </p>
            </div>
          </div>
          
          <AnalysisCard title="Key Risk Factors">
              <div className="space-y-3">
                {riskAssessment.riskFactors.map((factor, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-md">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold">{factor.factor}</h4>
                             <Badge variant={factor.severity === 'High' ? 'destructive' : factor.severity === 'Medium' ? 'secondary' : 'default'} className="capitalize">{factor.severity}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{factor.details}</p>
                    </div>
                ))}
              </div>
          </AnalysisCard>

          <AnalysisCard title="Financial Risk Metrics">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">Probability of Default (PD)</p>
                    <p className="text-2xl font-bold">{riskAssessment.probabilityOfDefault}%</p>
                </div>
                 <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">Loss Given Default (LGD)</p>
                    <p className="text-2xl font-bold">{riskAssessment.lossGivenDefault}%</p>
                </div>
                 <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">Exposure at Default (EAD)</p>
                    <p className="text-2xl font-bold">₹{riskAssessment.exposureAtDefault.toLocaleString('en-IN')}</p>
                </div>
                 <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <p className="text-sm text-red-700 dark:text-red-300">Expected Loss (EL)</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">₹{riskAssessment.expectedLoss.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-muted/50 rounded-md text-sm text-muted-foreground">
                <h4 className="font-semibold text-foreground mb-2">How PD is Calculated:</h4>
                <p>{riskAssessment.defaultProbabilityExplanation}</p>
              </div>
          </AnalysisCard>

           <AnalysisCard title="Suggested Mitigations">
                <div className="space-y-3">
                {riskAssessment.suggestedMitigations.map((mitigation, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-blue-800 dark:text-blue-300">{mitigation.factor}</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-400">{mitigation.action}</p>
                        </div>
                    </div>
                ))}
                </div>
            </AnalysisCard>

        </CardContent>
      </Card>
    </div>
  );
}
