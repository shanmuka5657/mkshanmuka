
'use client';

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, ShieldAlert, Zap, GitCommit, ShieldCheck, ShieldClose, HelpCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { getRiskAssessment, RiskAssessmentOutput } from "@/ai/flows/risk-assessment";
import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface RiskAssessmentViewProps {
  analysisResult: AnalyzeCreditReportOutput;
  onBack: () => void;
}

const getRiskLevelStyles = (level: string) => {
    const l = level.toLowerCase();
    if (l === 'low') return { text: 'text-green-500', bg: 'bg-green-500' };
    if (l === 'medium') return { text: 'text-yellow-500', bg: 'bg-yellow-500' };
    if (l === 'high') return { text: 'text-orange-500', bg: 'bg-orange-500' };
    if (l === 'very high') return { text: 'text-red-500', bg: 'bg-red-500' };
    return { text: 'text-gray-500', bg: 'bg-gray-500' };
};

const getSeverityBadge = (severity: 'Low' | 'Medium' | 'High') => {
    if (severity === 'Low') return <Badge variant="success">Low</Badge>;
    if (severity === 'Medium') return <Badge variant="secondary">Medium</Badge>;
    if (severity === 'High') return <Badge variant="destructive">High</Badge>;
    return <Badge variant="outline">{severity}</Badge>;
}

const AssessmentColumn = ({ assessment, title }: { assessment: RiskAssessmentOutput['assessmentWithGuarantor'], title: string }) => {
    const riskStyles = getRiskLevelStyles(assessment.riskLevel);
    return (
        <div>
            <CardHeader className="p-0 mb-4">
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <div className="space-y-4">
                <Card className="text-center p-4">
                    <CardDescription>AI Risk Level</CardDescription>
                    <CardTitle className={cn("text-3xl font-bold my-1", riskStyles.text)}>{assessment.riskLevel}</CardTitle>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-muted-foreground">Score:</span>
                        <span className="text-lg font-bold">{assessment.riskScore}/100</span>
                    </div>
                </Card>
                <div>
                    <h4 className="font-semibold text-sm mb-2">Key Risk Factors</h4>
                    <div className="space-y-2">
                        {assessment.riskFactors.map((factor, index) => (
                             <div key={index} className="text-xs p-2 bg-muted/50 rounded-md">
                                <div className="flex justify-between items-start">
                                    <span className="font-semibold">{factor.factor}</span>
                                    {getSeverityBadge(factor.severity)}
                                </div>
                                <p className="text-muted-foreground mt-1">{factor.details}</p>
                            </div>
                        ))}
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold text-sm mb-2">Suggested Mitigations</h4>
                    <div className="space-y-2">
                         {assessment.suggestedMitigations.map((mitigation, index) => (
                             <div key={index} className="text-xs p-2 border-l-2 border-green-500 bg-green-50 dark:bg-green-900/10 rounded-r-md">
                                <p className="font-semibold">{mitigation.factor}</p>
                                <p className="text-muted-foreground mt-1">{mitigation.action}</p>
                            </div>
                        ))}
                    </div>
                </div>
                 <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-sm font-semibold">Financial Metrics</AccordionTrigger>
                        <AccordionContent className="text-xs space-y-2 pt-2">
                            <div className="flex justify-between p-2 rounded bg-muted/50"><span>Probability of Default (PD)</span> <strong>{assessment.probabilityOfDefault}%</strong></div>
                            <div className="flex justify-between p-2 rounded bg-muted/50"><span>Loss Given Default (LGD)</span> <strong>{assessment.lossGivenDefault}%</strong></div>
                            <div className="flex justify-between p-2 rounded bg-muted/50"><span>Exposure at Default (EAD)</span> <strong>₹{assessment.exposureAtDefault.toLocaleString('en-IN')}</strong></div>
                            <div className="flex justify-between p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300"><span>Expected Loss (EL)</span> <strong>₹{assessment.expectedLoss.toLocaleString('en-IN')}</strong></div>
                        </AccordionContent>
                    </AccordionItem>
                 </Accordion>

            </div>
        </div>
    )
}

export function RiskAssessmentView({ analysisResult, onBack }: RiskAssessmentViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [assessment, setAssessment] = useState<RiskAssessmentOutput | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const runAnalysis = async () => {
      setIsLoading(true);
      try {
        const { output } = await getRiskAssessment({ analysisResult });
        setAssessment(output);
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
        <p className="text-muted-foreground">Performing dual risk-assessment...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="text-center">
        <p className="mb-4">Could not load the risk assessment.</p>
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
          <CardTitle className="flex items-center gap-2"><ShieldAlert /> AI Risk Assessment</CardTitle>
          <CardDescription>
            A technical analysis of your credit profile, showing a side-by-side comparison of your risk with and without guarantor loans included.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <AssessmentColumn assessment={assessment.assessmentWithGuarantor} title="With Guarantor Loans" />
            <AssessmentColumn assessment={assessment.assessmentWithoutGuarantor} title="Without Guarantor Loans" />
        </CardContent>
         <CardFooter>
            <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>Why two assessments?</AlertTitle>
                <AlertDescription>
                    By separating your personal loans from loans where you are a guarantor, you can clearly see the financial risk and responsibility you've taken on for others. This helps lenders understand your direct liabilities versus your contingent liabilities.
                </AlertDescription>
            </Alert>
        </CardFooter>
      </Card>
    </div>
  );
}
