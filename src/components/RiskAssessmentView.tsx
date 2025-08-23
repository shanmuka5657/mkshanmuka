
'use client';

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Loader2, ShieldAlert, Zap, GitCommit, ShieldCheck, ShieldClose, HelpCircle, TrendingUp, TrendingDown, Download, Replace } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { getRiskAssessment, RiskAssessmentOutput } from "@/ai/flows/risk-assessment";
import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PrintHeader } from './PrintHeader';

interface RiskAssessmentViewProps {
  originalAnalysisResult: AnalyzeCreditReportOutput;
  customizedAnalysisResult: AnalyzeCreditReportOutput;
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

const AssessmentColumn = ({ assessment, title, isLoading }: { assessment: RiskAssessmentOutput | null, title: string, isLoading: boolean }) => {
    if (isLoading) {
        return (
             <div>
                <CardHeader className="p-0 mb-4">
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <div className="flex flex-col items-center justify-center min-h-[300px] bg-muted/50 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">Calculating...</p>
                </div>
            </div>
        )
    }

    if (!assessment) {
        return (
             <div>
                <CardHeader className="p-0 mb-4">
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <div className="flex flex-col items-center justify-center min-h-[300px] bg-destructive/10 rounded-lg border border-destructive">
                    <ShieldClose className="h-8 w-8 text-destructive" />
                    <p className="text-sm text-destructive mt-2">Analysis Failed</p>
                </div>
            </div>
        )
    }

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

export function RiskAssessmentView({ originalAnalysisResult, customizedAnalysisResult, onBack }: RiskAssessmentViewProps) {
  const [isLoading, setIsLoading] = useState({ actual: true, customized: true });
  const [actualAssessment, setActualAssessment] = useState<RiskAssessmentOutput | null>(null);
  const [customizedAssessment, setCustomizedAssessment] = useState<RiskAssessmentOutput | null>(null);
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const runAnalyses = async () => {
      setIsLoading({ actual: true, customized: true });

      // Run both analyses in parallel
      const actualPromise = getRiskAssessment({ analysisResult: originalAnalysisResult }).catch(e => e);
      const customizedPromise = getRiskAssessment({ analysisResult: customizedAnalysisResult }).catch(e => e);

      const [actualResult, customizedResult] = await Promise.all([actualPromise, customizedPromise]);

      if (actualResult instanceof Error) {
        toast({ variant: "destructive", title: "Failed to get Actual AI Risk", description: actualResult.message });
        setActualAssessment(null);
      } else {
        setActualAssessment(actualResult);
      }
      setIsLoading(prev => ({ ...prev, actual: false }));
      
      if (customizedResult instanceof Error) {
        toast({ variant: "destructive", title: "Failed to get Customized AI Risk", description: customizedResult.message });
        setCustomizedAssessment(null);
      } else {
        setCustomizedAssessment(customizedResult);
      }
      setIsLoading(prev => ({ ...prev, customized: false }));
    };

    runAnalyses();
  }, [originalAnalysisResult, customizedAnalysisResult, toast]);

   const handleDownload = async () => {
        const elementToCapture = reportRef.current;
        if (!elementToCapture) return;

        toast({ title: "Preparing Download", description: "Generating PDF, please wait..." });
        
        document.body.classList.add('generating-pdf');

        const canvas = await html2canvas(elementToCapture, {
            scale: 2,
            useCORS: true,
            logging: true,
            windowWidth: 1200,
        });

        document.body.classList.remove('generating-pdf');
        
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        
        const imgWidth = pdfWidth - 40;
        const imgHeight = imgWidth / ratio;
        
        let heightLeft = imgHeight;
        let position = 20;

        pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 40);

        while (heightLeft > 0) {
            position = heightLeft - imgHeight + 20;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 40);
        }
        
        pdf.save(`RiskAssessment_${customizedAnalysisResult.customerDetails.name.replace(/ /g, '_')}.pdf`);
        
        toast({ title: "Download Ready!", description: "Your PDF has been downloaded." });
    };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Summary View
        </Button>
        <Button onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" /> Download Report
        </Button>
      </div>
      
      <div ref={reportRef} className="printable-area">
         <div className="print-header">
            <PrintHeader analysisResult={customizedAnalysisResult} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldAlert /> AI Risk Assessment</CardTitle>
            <CardDescription>
              A side-by-side comparison of the AI's risk assessment based on the original CIBIL report versus your customized version.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <AssessmentColumn assessment={actualAssessment} title="Actual AI Risk" isLoading={isLoading.actual} />
              <AssessmentColumn assessment={customizedAssessment} title="Customized AI Risk" isLoading={isLoading.customized} />
          </CardContent>
           <CardFooter>
              <Alert>
                  <Replace className="h-4 w-4" />
                  <AlertTitle>Why two assessments?</AlertTitle>
                  <AlertDescription>
                     This view allows you to perform powerful "what-if" analysis. By comparing the 'Actual Risk' from the original report to the 'Customized Risk' based on your edits, you can instantly see how changes like excluding loans or correcting EMIs impact the overall risk profile.
                  </AlertDescription>
              </Alert>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
