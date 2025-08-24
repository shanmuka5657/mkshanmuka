
'use client';

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Loader2, Download, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
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

const getRiskLevelStyles = (level: string = '') => {
    const l = level ? level.toLowerCase() : '';
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

const AssessmentColumn = ({ title, assessment, isLoading }: { title: string, assessment: RiskAssessmentOutput | null, isLoading: boolean }) => {
    const riskStyles = getRiskLevelStyles(assessment?.riskLevel);
    
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground mt-2 text-sm">Analyzing {title.toLowerCase()}...</p>
            </div>
        );
    }
    
    if (!assessment) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-muted-foreground mt-2 text-sm">Could not load assessment.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">{title}</h3>
            <Card className="text-center p-4">
                <CardDescription>AI Risk Level</CardDescription>
                <CardTitle className={cn("text-3xl font-bold my-1", riskStyles.text)}>{assessment.riskLevel}</CardTitle>
                <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-muted-foreground">Score:</span>
                    <span className="text-lg font-bold">{assessment.riskScore}/100</span>
                </div>
            </Card>
            <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
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
        </div>
    );
};


export function RiskAssessmentView({ originalAnalysisResult, customizedAnalysisResult, onBack }: RiskAssessmentViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [originalAssessment, setOriginalAssessment] = useState<RiskAssessmentOutput | null>(null);
  const [customizedAssessment, setCustomizedAssessment] = useState<RiskAssessmentOutput | null>(null);
  
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const runAnalysis = async () => {
      setIsLoading(true);
      try {
        const [originalResult, customizedResult] = await Promise.all([
            getRiskAssessment({ analysisResult: originalAnalysisResult }),
            getRiskAssessment({ analysisResult: customizedAnalysisResult })
        ]);
        setOriginalAssessment(originalResult);
        setCustomizedAssessment(customizedResult);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Failed to Get AI Risk Assessment",
          description: error.message || "An unknown error occurred.",
        });
        setOriginalAssessment(null);
        setCustomizedAssessment(null);
      } finally {
        setIsLoading(false);
      }
    };

    runAnalysis();
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

  const assessment = customizedAssessment; // Use customized for the main display logic
  const riskStyles = getRiskLevelStyles(assessment?.riskLevel);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Summary View
        </Button>
        <Button onClick={handleDownload} disabled={isLoading || !assessment}>
          <Download className="mr-2 h-4 w-4" /> Download Report
        </Button>
      </div>
      
      <div ref={reportRef} className="printable-area">
         <div className="print-header">
            <PrintHeader analysisResult={customizedAnalysisResult} />
        </div>
        <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">AI Risk Assessment</h1>
            <p className="text-muted-foreground">This report compares the original CIBIL data with your customized version.</p>
        </div>

        {isLoading && (
             <Card className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground mt-4">Running AI Risk Analysis...</p>
             </Card>
        )}

        {!isLoading && (
            <Card>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                   <AssessmentColumn title="Original Risk" assessment={originalAssessment} isLoading={isLoading} />
                   <AssessmentColumn title="Customized Risk" assessment={customizedAssessment} isLoading={isLoading} />
                </CardContent>
                 <CardHeader>
                    <CardTitle>AI Reasoning for Customized Risk</CardTitle>
                 </CardHeader>
                 <CardContent>
                    {customizedAssessment ? (
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-2">
                                <AccordionTrigger className="text-sm font-semibold">Risk Score & PD</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2">
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle className="text-xs">Risk Score</AlertTitle>
                                        <AlertDescription className="text-xs">
                                            {customizedAssessment.riskScoreExplanation}
                                        </AlertDescription>
                                    </Alert>
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle className="text-xs">Probability of Default (PD)</AlertTitle>
                                        <AlertDescription className="text-xs">
                                            {customizedAssessment.defaultProbabilityExplanation}
                                        </AlertDescription>
                                    </Alert>
                                </AccordionContent>
                            </AccordionItem>
                             <AccordionItem value="item-3">
                                <AccordionTrigger className="text-sm font-semibold">EAD, LGD & EL</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2">
                                     <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle className="text-xs">Exposure at Default (EAD)</AlertTitle>
                                        <AlertDescription className="text-xs">
                                            {customizedAssessment.eadExplanation}
                                        </AlertDescription>
                                    </Alert>
                                     <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle className="text-xs">Loss Given Default (LGD)</AlertTitle>
                                        <AlertDescription className="text-xs">
                                            {customizedAssessment.lgdExplanation}
                                        </AlertDescription>
                                    </Alert>
                                     <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle className="text-xs">Expected Loss (EL)</AlertTitle>
                                        <AlertDescription className="text-xs">
                                            {customizedAssessment.elExplanation}
                                        </AlertDescription>
                                    </Alert>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    ) : <p className="text-sm text-muted-foreground">Reasoning not available.</p>}
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
