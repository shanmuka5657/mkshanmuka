
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  UploadCloud,
  FileText,
  Trash2,
  Loader2,
  ClipboardCheck,
  BarChart,
  User,
  Sparkles,
  DollarSign,
  Cpu
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, storage } from '@/lib/firebase-client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast"
import { analyzeCreditReport, AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AnalysisDashboard } from '@/components/AnalysisDashboard';
import { CreditSummaryView } from '@/components/CreditSummaryView';
import { RiskAssessmentView } from '@/components/RiskAssessmentView';
import { AiRatingView } from '@/components/AiRatingView';
import { FinancialsView } from '@/components/FinancialsView';
import { saveReportSummaryAction } from '@/app/actions';
import { addTrainingCandidate } from '@/lib/training-store';
import { getAiRating } from '@/ai/flows/ai-rating';
import { getRiskAssessment, RiskAssessmentOutput } from '@/ai/flows/risk-assessment';
import { Skeleton } from '@/components/ui/skeleton';


const initialAnalysis: AnalyzeCreditReportOutput = {
  cibilScore: 0,
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
  },
  usage: {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  }
};


const SummaryBox = ({ title, value, isLoading = false, valueClassName = '', icon: Icon }: { title: string; value: string | number; isLoading?: boolean; valueClassName?: string, icon?: React.ElementType }) => (
  <Card className="text-center p-3 bg-muted/30">
    <CardDescription className="text-xs text-muted-foreground flex items-center justify-center gap-1">
      {Icon && <Icon className="h-3 w-3" />}
      {title}
    </CardDescription>
    {isLoading ? <Skeleton className="h-7 w-20 mx-auto mt-1" /> : <CardTitle className={cn("text-lg font-bold", valueClassName)}>{value}</CardTitle>}
  </Card>
);

export default function CreditPage() {
  const [creditFile, setCreditFile] = useState<File | null>(null);
  const [creditFileName, setCreditFileName] = useState('');
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalyzeCreditReportOutput | null>(null);
  const [riskAssessmentResult, setRiskAssessmentResult] = useState<RiskAssessmentOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [isTextExtracted, setIsTextExtracted] = useState(false);
  
  const { toast } = useToast()
  const creditFileInputRef = useRef<HTMLInputElement>(null);
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  
  useEffect(() => {
    GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${version}/legacy/build/pdf.worker.min.mjs`;
  }, []);

  // Effect to restore state from sessionStorage on page load
  useEffect(() => {
    if (user && sessionStorage.getItem('pendingAnalysisFile')) {
      const pendingFile = JSON.parse(sessionStorage.getItem('pendingAnalysisFile')!);
      const pendingRawText = sessionStorage.getItem('pendingAnalysisRawText')!;
      
      const byteCharacters = atob(pendingFile.data.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: pendingFile.type });
      const restoredFile = new File([blob], pendingFile.name, { type: pendingFile.type });

      setCreditFile(restoredFile);
      setCreditFileName(restoredFile.name);
      setRawText(pendingRawText);
      setIsTextExtracted(true);
      
      sessionStorage.removeItem('pendingAnalysisFile');
      sessionStorage.removeItem('pendingAnalysisRawText');

      // Automatically trigger analysis
      handleAnalyzeCreditReport(restoredFile, pendingRawText);
    }
  }, [user]);

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
    setRiskAssessmentResult(null);
    setIsAnalyzing(false);
    setAnalysisStatus('');
    setActiveView(null);
    setIsTextExtracted(false);
    setAnalysisError(null);
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
          const cleanedText = textContent
            .replace(/\s+/g, ' ')
            .replace(/(\r\n|\n|\r)/gm, " ")
            .trim();
          setRawText(cleanedText);
          setIsTextExtracted(true);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error("PDF Processing Error: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process the PDF file.",
      })
    } finally {
        setIsProcessing(false);
    }
  };
  
 const handleAnalyzeCreditReport = async (fileToAnalyze?: File, textToAnalyze?: string) => {
    const currentFile = fileToAnalyze || creditFile;
    const currentText = textToAnalyze || rawText;

    if (!currentText || !currentFile) {
        toast({ variant: 'destructive', title: 'Error', description: 'No report text to analyze.' });
        return;
    }

    if (loading) return; // Wait until auth state is confirmed

    if (!user) {
      toast({ title: 'Please Sign In', description: 'You need to be logged in to analyze a report. Redirecting you to login...' });
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = {
          name: currentFile.name,
          type: currentFile.type,
          data: e.target?.result
        };
        sessionStorage.setItem('pendingAnalysisFile', JSON.stringify(fileData));
        sessionStorage.setItem('pendingAnalysisRawText', currentText);
        router.push('/login?redirect=/credit');
      };
      reader.readAsDataURL(currentFile);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
        setAnalysisStatus("Analyzing credit report...");
        const creditAnalysisOutput = await analyzeCreditReport({ creditReportText: currentText });
        if (!creditAnalysisOutput) throw new Error("AI returned an empty response for credit analysis.");
        setAnalysisResult(creditAnalysisOutput);

        setAnalysisStatus("Performing risk assessment...");
        const riskAssessmentOutput = await getRiskAssessment({ analysisResult: creditAnalysisOutput });
        if (!riskAssessmentOutput) throw new Error("AI returned an empty response for risk assessment.");
        setRiskAssessmentResult(riskAssessmentOutput);
        
        setAnalysisStatus("Generating AI rating...");
        const aiRatingOutput = await getAiRating({ analysisResult: creditAnalysisOutput, riskAssessment: riskAssessmentOutput.assessmentWithoutGuarantor });
        if (!aiRatingOutput) throw new Error("AI returned an empty response for AI rating.");

        setAnalysisStatus("Uploading PDF securely...");
        const storageRef = ref(storage, `credit_reports/${user.uid}/${Date.now()}_${currentFile.name}`);
        const uploadResult = await uploadBytes(storageRef, currentFile);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        setAnalysisStatus("Saving report to dashboard...");
        const saveResult = await saveReportSummaryAction(creditAnalysisOutput, user.uid, downloadURL);
        
        toast({ 
            title: "Analysis Complete & Saved!", 
            description: "Your AI-powered insights are ready. The report summary has been saved to the dashboard.",
            action: (
                <Button asChild variant="secondary" size="sm">
                    <Link href={`/credit/${saveResult.id}`}>View Report</Link>
                </Button>
            )
        });

        // Add the result to the training candidate pool
        addTrainingCandidate(aiRatingOutput);

    } catch (error: any) {
        console.error("CLIENT: Analysis or Save Error: ", error);
        const errorMessage = error.message || "An unknown error occurred.";
        let errorTitle = "An Error Occurred";
        let userFriendlyMessage = "Something went wrong. Please try again. Check browser and server logs for details.";

        if (errorMessage.includes('429')) {
            errorTitle = "Rate Limit Reached";
            userFriendlyMessage = "You've made too many requests in a short time. Please wait a moment before trying again.";
        } else if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
            errorTitle = "AI Service Busy";
            userFriendlyMessage = "The AI service is currently experiencing high traffic. Please try again in a moment.";
        } else if (errorMessage.includes('API key not valid') || errorMessage.includes('GEMINI_API_KEY')) {
            errorTitle = "Invalid or Missing API Key";
            userFriendlyMessage = "The AI service API key is not configured correctly. Please add it to your .env file.";
        } else if (errorMessage.includes('Failed to save report')) {
             errorTitle = "Could not save report";
             userFriendlyMessage = "The analysis was successful, but the report could not be saved to the database. Please check server logs.";
        } else if (errorMessage.toLowerCase().includes('storage') && errorMessage.toLowerCase().includes('permission')) {
            errorTitle = "Storage Permission Error";
            userFriendlyMessage = "Could not upload PDF. Please check your Firebase Storage security rules to ensure you have write permissions.";
        }

        setAnalysisError(userFriendlyMessage);
         toast({
            variant: "destructive",
            title: errorTitle,
            description: userFriendlyMessage,
        });
    } finally {
        setIsAnalyzing(false);
        setAnalysisStatus('');
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

  const { customerDetails, reportSummary, cibilScore } = analysisResult || initialAnalysis;
  const isAnalysisComplete = !!analysisResult;
  const isReadyForAnalysis = isTextExtracted && !isAnalyzing && !isAnalysisComplete;
  const showSkeletons = isAnalyzing && !isAnalysisComplete;


  const calculateCost = () => {
      const creditUsage = analysisResult?.usage;
      const riskUsage = riskAssessmentResult?.usage;

      const totalInputTokens = (creditUsage?.inputTokens || 0) + (riskUsage?.inputTokens || 0);
      const totalOutputTokens = (creditUsage?.outputTokens || 0) + (riskUsage?.outputTokens || 0);

      if (totalInputTokens === 0 && totalOutputTokens === 0) return { totalTokens: 0, cost: 0 };

      // Pricing for Gemini 1.5 Flash: $0.00013125 per 1K input tokens, $0.00039375 per 1K output tokens
      const inputCost = (totalInputTokens / 1000) * 0.00013125;
      const outputCost = (totalOutputTokens / 1000) * 0.00039375;
      
      return { totalTokens: totalInputTokens + totalOutputTokens, cost: inputCost + outputCost };
  }
  
  if (activeView && analysisResult) {
      return (
          <main className="container mx-auto p-4 md:p-8 space-y-6">
              {renderActiveView()}
          </main>
      );
  }

  return (
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
                    <Button onClick={() => handleAnalyzeCreditReport()} size="lg" disabled={loading}>
                        <Sparkles className="mr-2 h-5 w-5"/>
                        Generate Report and Save
                    </Button>
                </div>
            )}
            
            {isAnalyzing && !isAnalysisComplete && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {analysisStatus || 'AI is analyzing your report...'}
                </div>
            )}

            {isAnalysisComplete && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-sm text-green-800">
                    <ClipboardCheck className="h-5 w-5"/>
                    <div>
                        <h4 className="font-semibold">Analysis Complete!</h4>
                        <p className="text-xs">Your AI-powered insights are ready. The report summary has been saved to the dashboard.</p>
                    </div>
                </div>
            )}
        </CardContent>
        </Card>
        
        {analysisError && (
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Analysis Failed</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{analysisError}</p>
                    <Button onClick={resetState} className="mt-4">Try Again</Button>
                </CardContent>
            </Card>
        )}

        <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><User className="text-primary"/>Credit Score & Consumer Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center justify-center p-4">
                <p className="text-sm text-muted-foreground">Official CIBIL Score</p>
                {showSkeletons ? (
                    <Skeleton className="h-[72px] w-40 my-2" />
                ) : (
                    <h2 className="text-6xl font-bold text-primary my-2">{cibilScore > 0 ? cibilScore : 'N/A'}</h2>
                )}
                {cibilScore > 0 && !showSkeletons && <Progress value={cibilScore} maxValue={900} />}
                {showSkeletons && <Skeleton className="h-4 w-full" />}
            </div>
            <div>
                <h3 className="font-semibold mb-3">AI-Extracted Consumer Information</h3>
                {showSkeletons ? (
                    <div className="space-y-3">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-5 w-4/5" />
                        <Skeleton className="h-5 w-full" />
                    </div>
                ) : (
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Name</span> <strong>{customerDetails.name}</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Date of Birth</span> <strong>{customerDetails.dateOfBirth}</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Gender</span> <strong>{customerDetails.gender}</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">PAN</span> <strong>{customerDetails.pan}</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Mobile Number</span> <strong>{customerDetails.mobileNumber}</strong></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Address</span> <strong className="text-right">{customerDetails.address}</strong></div>
                    </div>
                )}
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
                        <SummaryBox title="Total Accounts" value={reportSummary.accountSummary.total} isLoading={showSkeletons} />
                        <SummaryBox title="Active Accounts" value={reportSummary.accountSummary.active} isLoading={showSkeletons} />
                        <SummaryBox title="High Credit/Sanc. Amt" value={reportSummary.accountSummary.highCredit} isLoading={showSkeletons} />
                        <SummaryBox title="Current Balance" value={reportSummary.accountSummary.currentBalance} isLoading={showSkeletons} valueClassName={reportSummary.accountSummary.currentBalance !== 'N/A' && reportSummary.accountSummary.currentBalance !== '₹0' ? "text-destructive" : ""} />
                        <SummaryBox title="Overdue Amount" value={reportSummary.accountSummary.overdue} isLoading={showSkeletons} valueClassName={reportSummary.accountSummary.overdue !== 'N/A' && reportSummary.accountSummary.overdue !== '₹0' ? "text-destructive" : ""} />
                        <SummaryBox title="Written-Off" value={reportSummary.accountSummary.writtenOff} isLoading={showSkeletons} />
                        <SummaryBox title="Settled" value={reportSummary.accountSummary.settled} isLoading={showSkeletons} />
                    </div>
                </div>
                    <div>
                    <h3 className="font-semibold mb-3">Enquiry Summary</h3>
                    <div className="grid grid-cols-2 gap-3">
                            <SummaryBox title="Total Enquiries" value={reportSummary.enquirySummary.total} isLoading={showSkeletons} />
                            <SummaryBox title="Last 30 Days" value={reportSummary.enquirySummary.past30Days} isLoading={showSkeletons} />
                            <SummaryBox title="Last 12 Months" value={reportSummary.enquirySummary.past12Months} isLoading={showSkeletons} />
                            <SummaryBox title="Last 24 Months" value={reportSummary.enquirySummary.past24Months} isLoading={showSkeletons} />
                            <SummaryBox title="Most Recent Enquiry" value={reportSummary.enquirySummary.recentDate} isLoading={showSkeletons} />
                    </div>
                </div>
            </CardContent>
        </Card>

        <AnalysisDashboard 
            analysisResult={analysisResult} 
            onSelectView={setActiveView}
        />

        {isAnalysisComplete && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><DollarSign className="text-primary" />Analysis Cost</CardTitle>
                    <CardDescription>Estimated cost for the AI analysis (Credit Analysis + Risk Assessment). For educational purposes only.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <SummaryBox title="Total Tokens Used" value={calculateCost().totalTokens.toLocaleString()} icon={Cpu} />
                        <SummaryBox title="Estimated Cost" value={`$${calculateCost().cost.toFixed(6)}`} icon={DollarSign} />
                    </div>
                </CardContent>
            </Card>
        )}
        
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
            <AccordionTrigger>
                <div className="flex items-center gap-2 font-semibold">
                    <BarChart className="text-primary"/>Raw Report Text
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
  );
}
