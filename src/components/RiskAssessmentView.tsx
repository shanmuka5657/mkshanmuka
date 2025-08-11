
'use client';

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Shield, AlertTriangle, CheckCircle, Lightbulb, Sparkles, MinusCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { getRiskAssessment, RiskAssessmentInput, RiskAssessmentOutput } from "@/ai/flows/risk-assessment";
import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { AnalysisCard } from "./AnalysisCard";
import { Separator } from "./ui/separator";

interface RiskAssessmentViewProps {
  analysisResult: AnalyzeCreditReportOutput;
  onBack: () => void;
}

const getRiskLevelStyles = (level: string) => {
    switch (level) {
        case 'Low':
            return { text: 'text-green-600', icon: <CheckCircle className="text-green-500" /> };
        case 'Medium':
            return { text: 'text-yellow-600', icon: <AlertTriangle className="text-yellow-500" /> };
        case 'High':
        case 'Very High':
            return { text: 'text-red-600', icon: <AlertTriangle className="text-red-500" /> };
        default:
            return { text: 'text-gray-600', icon: <Shield /> };
    }
};

const RiskColumn = ({ assessment, title }: { assessment: RiskAssessmentOutput['assessmentWithGuarantor'], title: string }) => {
    const riskStyles = getRiskLevelStyles(assessment.riskLevel);
    return (
        <div className="space-y-4">
            <CardHeader className="p-0">
                <CardTitle className="flex items-center gap-2">{riskStyles.icon} {title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-0">
                <div className="p-6 bg-muted/50 rounded-lg flex flex-col items-center justify-center text-center">
                    <CardDescription className="mb-1">Risk Score</CardDescription>
                    <div className={cn("text-6xl font-bold", riskStyles.text)}>{assessment.riskScore}</div>
                    <p className="text-muted-foreground text-sm">out of 100</p>
                    <Badge variant={assessment.riskLevel === 'High' || assessment.riskLevel === 'Very High' ? 'destructive' : 'secondary'} className="mt-2">{assessment.riskLevel} Risk</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-2 bg-muted rounded-md">
                        <p className="text-xs text-muted-foreground">Prob. of Default</p>
                        <p className="text-lg font-bold">{assessment.probabilityOfDefault}%</p>
                    </div>
                    <div className="p-2 bg-muted rounded-md">
                        <p className="text-xs text-muted-foreground">Loss Given Default</p>
                        <p className="text-lg font-bold">{assessment.lossGivenDefault}%</p>
                    </div>
                     <div className="p-2 bg-muted rounded-md col-span-2">
                        <p className="text-xs text-muted-foreground">Exposure at Default</p>
                        <p className="text-lg font-bold">₹{assessment.exposureAtDefault.toLocaleString('en-IN')}</p>
                    </div>
                     <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-md col-span-2">
                        <p className="text-xs text-red-700 dark:text-red-300">Expected Loss</p>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">₹{assessment.expectedLoss.toLocaleString('en-IN')}</p>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold mb-2">Key Risk Factors</h4>
                    <div className="space-y-2">
                        {assessment.riskFactors.map((factor, index) => (
                            <div key={index} className="p-2 bg-muted/50 rounded-md text-xs">
                                <div className="flex justify-between items-center">
                                    <h5 className="font-semibold">{factor.factor}</h5>
                                    <Badge variant={factor.severity === 'High' ? 'destructive' : factor.severity === 'Medium' ? 'secondary' : 'default'} className="capitalize">{factor.severity}</Badge>
                                </div>
                                <p className="text-muted-foreground mt-1">{factor.details}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </div>
    )
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

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack} className="no-print">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main View
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield /> AI Risk Assessment</CardTitle>
          <CardDescription>A technical analysis of the credit profile, with a side-by-side comparison showing the impact of guarantor loans.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <RiskColumn assessment={riskAssessment.assessmentWithGuarantor} title="With Guarantor Loans" />
            <RiskColumn assessment={riskAssessment.assessmentWithoutGuarantor} title="Without Guarantor Loans" />
        </CardContent>
      </Card>

       <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lightbulb />Suggested Mitigations</CardTitle>
                 <CardDescription>Actionable suggestions to improve the risk profile, based on the complete assessment.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                {riskAssessment.assessmentWithGuarantor.suggestedMitigations.map((mitigation, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-blue-800 dark:text-blue-300">{mitigation.factor}</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-400">{mitigation.action}</p>
                        </div>
                    </div>
                ))}
                </div>
            </CardContent>
       </Card>

       <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles />How It Works</CardTitle>
             <CardDescription>The AI analyzes your entire credit report to calculate a technical risk score.</CardDescription>
        </CardHeader>
        <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li><strong>Payment History:</strong> Checks for on-time payments, late payments (delinquencies), and their frequency.</li>
                <li><strong>Debt Load & Utilization:</strong> Measures total debt, the mix of secured vs. unsecured loans, and how much of your available credit you are using.</li>
                <li><strong>Credit Inquiries:</strong> Notes the number of recent applications for new credit, which can indicate risk.</li>
                <li><strong>Negative Marks:</strong> Identifies adverse account statuses like 'Written-Off' or 'Settled', which significantly impact the risk score.</li>
                <li><strong>Dual Analysis:</strong> The AI runs this entire process twice—once with your full report, and a second time ignoring any loans you are a guarantor for, allowing you to see the direct impact on your risk profile.</li>
            </ul>
        </CardContent>
       </Card>

    </div>
  );
}
