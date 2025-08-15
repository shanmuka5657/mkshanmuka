
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist';
import {
  UploadCloud,
  FileText,
  Trash2,
  Loader2,
  ClipboardCheck,
  BarChart,
  User,
  Sparkles
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast"
import { analyzeCreditReport, AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { AiAgentChat } from '@/components/CreditChat';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AnalysisDashboard } from '@/components/AnalysisDashboard';
import { CreditSummaryView } from '@/components/CreditSummaryView';
import { RiskAssessmentView } from '@/components/RiskAssessmentView';
import { AiRatingView } from '@/components/AiRatingView';
import { FinancialsView } from '@/components/FinancialsView';


const initialAnalysis: AnalyzeCreditReportOutput = {
  customerDetails: {
    name: 'N/A',
    dateOfBirth: 'N/A',
    pan: 'N/A',
    gender: 'N/A',
    mobileNumber: 'N/A',
    address: 'N/A',
  },
  reportSummary: {
    accountSummary: {
      total: 'N/A',
      active: 'N/A',
      closed: 'N/A',
      settled: 'N/A',
      writtenOff: 'N/A',
      doubtful: 'N/A',
      highCredit: 'N/A',
      currentBalance: 'N/A',
      overdue: 'N/A',
      creditUtilization: 'N/A',
      debtToLimitRatio: 'N/A',
    },
    enquirySummary: {
      total: 'N/A',
      past30Days: 'N/A',
      past12Months: 'N/A',
      past24Months: 'N/A',
      recentDate: 'N/A',
    },
  },
  allAccounts: [],
  emiDetails: {
    totalEmi: 0,
    activeLoans: [],
  }
};


const SummaryBox = ({ title, value, isLoading = false, valueClassName = '' }: { title: string; value: string | number; isLoading?: boolean; valueClassName?: string }) => (
  <Card className="text-center p-3 bg-muted/30">
    <CardDescription className="text-xs text-muted-foreground">{title}</CardDescription>
    {isLoading ? <Loader2 className="h-6 w-6 mx-auto animate-spin" /> : <CardTitle className={cn("text-lg font-bold", valueClassName)}>{value}</CardTitle>}
  </Card>
);

export default function CreditPage() {
  const [creditFile, setCreditFile] = useState<File | null>(null);
  const [creditFileName, setCreditFileName] = useState('');
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cibilScore, setCibilScore] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeCreditReportOutput | null>(null);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [isTextExtracted, setIsTextExtracted] = useState(false);
  
  const { toast } = useToast()
  const creditFileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
  
    const selectedFile = selectedFiles[0];
    if (selectedFile) {
        resetState();
        setCreditFile(selectedFile);
        setCreditFileName(selectedFile.name);
        processFile(selectedFile);
    }
  };
  
  const resetState = () => {
    setCreditFile(null);
    setCreditFileName('');
    setRawText('');
    setIsProcessing(false);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setCibilScore(null);
    setActiveView(null);
    setIsTextExtracted(false);
    if (creditFileInputRef.current) {
      creditFileInputRef.current.value = '';
    }
  };

  const processFile = async (selectedFile: File) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) {
          const pdf = await getDocument({ data: buffer }).promise;
          let textContent = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const text = await page.getTextContent();
            textContent += text.items.map(item => 'str' in item ? item.str : '').join(' ');
          }
          setRawText(textContent);
          
          const scoreMatch = textContent.match(/(?:CIBIL (?:TRANSUNION )?SCORE|CREDITVISION. SCORE)\s*(\d{3})/i);
          const extractedScore = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
          setCibilScore(extractedScore);
          setIsTextExtracted(true);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process the PDF file.",
      })
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleAnalyzeCreditReport = async () => {
    if (!rawText) {
        toast({ variant: 'destructive', title: 'Error', description: 'No report text to analyze.' });
        return;
    }
    setIsAnalyzing(true);
    try {
        const { output, usage } = await analyzeCreditReport({ creditReportText: rawText });
        if (output) {
            setAnalysisResult(output);
            toast({ title: "Credit Report Analysis Complete", description: "Your AI-powered summary is ready." });
        } else {
             throw new Error("AI returned an empty response.");
        }


    } catch (error: any) {
        console.error('Error analyzing report:', error);
        const errorMessage = error.message || "An unknown error occurred.";
        let errorTitle = "An Error Occurred";
        let userFriendlyMessage = "Something went wrong. Please try again.";

        if (errorMessage.includes('429')) {
            errorTitle = "Rate Limit Reached";
            userFriendlyMessage = "You've made too many requests in a short time. Please wait a moment before trying again.";
        } else if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
            errorTitle = "AI Service Busy";
            userFriendlyMessage = "The AI service is currently experiencing high traffic. Please try again in a moment.";
        } else if (errorMessage.includes('API key not valid')) {
            errorTitle = "Invalid API Key";
            userFriendlyMessage = "The AI service API key is not configured correctly. Please contact support.";
        }

         toast({
            variant: "destructive",
            title: errorTitle,
            description: userFriendlyMessage,
        });
    } finally {
        setIsAnalyzing(false);
    }
  };
  
  const renderActiveView = () => {
    if (!analysisResult) return null;

    switch (activeView) {
      case 'summary':
        return <CreditSummaryView analysisResult={analysisResult} onBack={() => setActiveView(null)} />;
      case 'risk':
        return <RiskAssessmentView analysisResult={analysisResult} onBack={() => setActiveView(null)} />;
      case 'rating':
        return <AiRatingView analysisResult={analysisResult} onBack={() => setActiveView(null)} />;
      case 'financials':
        return <FinancialsView analysisResult={analysisResult} onBack={() => setActiveView(null)} />;
      default:
        return null;
    }
  }

  const { customerDetails, reportSummary } = analysisResult || initialAnalysis;
  const isAnalysisComplete = !!analysisResult;
  const isReadyForAnalysis = isTextExtracted && !isAnalyzing && !isAnalysisComplete;
  
  if (activeView && analysisResult) {
      return (
          <main className="container mx-auto p-4 md:p-8 space-y-6">
              {renderActiveView()}
          </main>
      );
  }

  return (
    <div className="bg-muted/30 font-body text-foreground">
      <main className="container mx-auto p-4 md:p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Credit Analysis</h1>
            <p className="mt-2 text-md text-muted-foreground max-w-2xl mx-auto">Upload your CIBIL report PDF to unlock instant AI-powered insights, personalized scoring, and actionable advice.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg gap-2">
                <UploadCloud className="text-primary" />
                Upload Your CIBIL Report (PDF)
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <Button onClick={() => creditFileInputRef.current?.click()} disabled={isProcessing || isAnalyzing}>
                        <UploadCloud className="mr-2" />
                        {creditFile ? 'Choose Another File' : 'Choose PDF File'}
                    </Button>
                    <Input ref={creditFileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                    <span className="text-sm text-muted-foreground flex-1 min-w-0 truncate">{creditFileName}</span>
                    {creditFile && (
                        <Button variant="ghost" size="icon" onClick={resetState} disabled={isProcessing || isAnalyzing}>
                            <Trash2 className="h-5 w-5" />
                            <span className="sr-only">Remove file</span>
                        </Button>
                    )}
                </div>

                {isProcessing && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing PDF...
                    </div>
                )}
                
                {isReadyForAnalysis && (
                    <div className="mt-4">
                        <Button onClick={handleAnalyzeCreditReport} size="lg">
                            <Sparkles className="mr-2 h-5 w-5"/>
                            Analyze Report
                        </Button>
                    </div>
                )}
                
                {isAnalyzing && (
                     <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        AI is analyzing your report... this may take a moment.
                    </div>
                )}

                {isAnalysisComplete && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-sm text-green-800">
                        <ClipboardCheck className="h-5 w-5"/>
                        <div>
                            <h4 className="font-semibold">Analysis Complete!</h4>
                            <p className="text-xs">Your AI-powered insights are ready. Use the dashboard below to explore.</p>
                        </div>
                    </div>
                )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><User className="text-primary"/>Credit Score & Consumer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center justify-center p-4">
                    <p className="text-sm text-muted-foreground">Official CIBIL Score</p>
                    <h2 className="text-6xl font-bold text-primary my-2">{cibilScore ?? 'N/A'}</h2>
                    {cibilScore && <Progress value={cibilScore} maxValue={900} />}
                </div>
                <div>
                    <h3 className="font-semibold mb-3">AI-Extracted Consumer Information</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Name</span> <strong>{customerDetails.name}</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Date of Birth</span> <strong>{customerDetails.dateOfBirth}</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Gender</span> <strong>{customerDetails.gender}</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">PAN</span> <strong>{customerDetails.pan}</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Mobile Number</span> <strong>{customerDetails.mobileNumber}</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Address</span> <strong className="text-right">{customerDetails.address}</strong></div>
                    </div>
                </div>
            </CardContent>
          </Card>

           <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><FileText className="text-primary" />Report Summary</CardTitle>
                    <CardDescription>This summary is generated by an AI analyzing your CIBIL report.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold mb-3">Account Summary</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <SummaryBox title="Total Accounts" value={reportSummary.accountSummary.total} />
                            <SummaryBox title="Active Accounts" value={reportSummary.accountSummary.active} />
                            <SummaryBox title="High Credit/Sanc. Amt" value={reportSummary.accountSummary.highCredit} />
                            <SummaryBox title="Current Balance" value={reportSummary.accountSummary.currentBalance} valueClassName={reportSummary.accountSummary.currentBalance !== 'N/A' && reportSummary.accountSummary.currentBalance !== '₹0' ? "text-destructive" : ""} />
                            <SummaryBox title="Overdue Amount" value={reportSummary.accountSummary.overdue} valueClassName={reportSummary.accountSummary.overdue !== 'N/A' && reportSummary.accountSummary.overdue !== '₹0' ? "text-destructive" : ""} />
                            <SummaryBox title="Written-Off" value={reportSummary.accountSummary.writtenOff} />
                            <SummaryBox title="Settled" value={reportSummary.accountSummary.settled} />
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold mb-3">Enquiry Summary</h3>
                        <div className="grid grid-cols-2 gap-3">
                             <SummaryBox title="Total Enquiries" value={reportSummary.enquirySummary.total} />
                             <SummaryBox title="Last 30 Days" value={reportSummary.enquirySummary.past30Days} />
                             <SummaryBox title="Last 12 Months" value={reportSummary.enquirySummary.past12Months} />
                             <SummaryBox title="Last 24 Months" value={reportSummary.enquirySummary.past24Months} />
                             <SummaryBox title="Most Recent Enquiry" value={reportSummary.enquirySummary.recentDate} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AnalysisDashboard 
                analysisResult={analysisResult} 
                onSelectView={setActiveView}
            />

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                    <div className="flex items-center gap-2 font-semibold">
                        <BarChart className="text-primary"/>Raw Report Text & Cost
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Card>
                    <CardContent className="pt-4">
                        <pre className="text-xs bg-muted p-4 rounded-lg max-h-96 overflow-auto whitespace-pre-wrap">{rawText || "Upload a report to see the raw extracted text."}</pre>
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
      </main>
      <AiAgentChat cibilReportAvailable={!!rawText} />
    </div>
  );
}
