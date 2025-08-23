
'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  UploadCloud,
  FileText,
  Trash2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, storage } from '@/lib/firebase-client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast"
import { analyzeCreditReport, AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CreditSummaryView } from '@/components/CreditSummaryView';
import { RiskAssessmentView } from '@/components/RiskAssessmentView';
import { AiRatingView } from '@/components/AiRatingView';
import { FinancialsView } from '@/components/FinancialsView';
import { saveReportSummaryAction } from '@/app/actions';
import { getRiskAssessment, RiskAssessmentOutput } from '@/ai/flows/risk-assessment';
import { CreditAnalysisLanding } from '@/components/CreditAnalysisLanding';


if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
}

export const getApprovalChanceFromRisk = (riskScore: number): { chance: string; color: string; value: number } => {
    if (riskScore <= 15) return { chance: 'Very High', color: 'text-green-500', value: 90 };
    if (riskScore <= 30) return { chance: 'High', color: 'text-blue-500', value: 75 };
    if (riskScore <= 45) return { chance: 'Good', color: 'text-yellow-500', value: 60 };
    if (riskScore <= 60) return { chance: 'Fair', color: 'text-orange-500', value: 40 };
    return { chance: 'Low', color: 'text-red-500', value: 20 };
};

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
        
        // Enhance with 'isConsidered' flag before setting state
        const enhancedAccounts = creditAnalysisOutput.allAccounts.map(acc => ({ ...acc, isConsidered: true }));
        const enhancedAnalysisResult = { ...creditAnalysisOutput, allAccounts: enhancedAccounts };
        setAnalysisResult(enhancedAnalysisResult);


        setAnalysisStatus("Performing risk assessment...");
        const riskAssessmentOutput = await getRiskAssessment({ analysisResult: creditAnalysisOutput });
        if (!riskAssessmentOutput) throw new Error("AI returned an empty response for risk assessment.");
        setRiskAssessmentResult(riskAssessmentOutput);
        
        setAnalysisStatus("Uploading PDF securely...");
        const storageRef = ref(storage, `credit_reports/${user.uid}/${Date.now()}_${currentFile.name}`);
        const uploadResult = await uploadBytes(storageRef, currentFile);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        setAnalysisStatus("Saving report to dashboard...");
        await saveReportSummaryAction(creditAnalysisOutput, user.uid, downloadURL);
        
        toast({ 
            title: "Analysis Complete & Saved!", 
            description: "Your AI-powered insights are ready. The report summary has been saved to the dashboard.",
        });

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
  
  const handleBack = () => setActiveView(null);

  if (activeView && analysisResult) {
      switch (activeView) {
        case 'summary':
          return <main className="container mx-auto p-4 md:p-8 space-y-6"><CreditSummaryView analysisResult={analysisResult} onBack={handleBack} /></main>;
        case 'risk':
          return <main className="container mx-auto p-4 md:p-8 space-y-6"><RiskAssessmentView analysisResult={analysisResult} onBack={handleBack} /></main>;
        case 'rating':
          return <main className="container mx-auto p-4 md:p-8 space-y-6"><AiRatingView analysisResult={analysisResult} onBack={handleBack} /></main>;
        case 'financials':
          return <main className="container mx-auto p-4 md:p-8 space-y-6"><FinancialsView analysisResult={analysisResult} onBack={handleBack} /></main>;
        default:
          setActiveView(null); // Fallback to reset view if invalid
          return null;
    }
  }

  if (analysisResult) {
    return (
        <main className="container mx-auto p-4 md:p-8 space-y-6">
            <CreditAnalysisLanding
                analysisResult={analysisResult}
                riskAssessmentResult={riskAssessmentResult}
                isLoading={isAnalyzing}
                onSelectView={setActiveView}
            />
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
                
                {isTextExtracted && !isAnalyzing && (
                    <div className="mt-4">
                        <Button onClick={() => handleAnalyzeCreditReport()} size="lg" disabled={loading}>
                            <Sparkles className="mr-2 h-5 w-5"/>
                            Generate Report and Save
                        </Button>
                    </div>
                )}
                
                {isAnalyzing && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {analysisStatus || 'AI is analyzing your report...'}
                    </div>
                )}

                 {analysisError && (
                    <Card className="mt-4 border-destructive">
                        <CardHeader>
                            <CardTitle className="text-destructive">Analysis Failed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>{analysisError}</p>
                            <Button onClick={resetState} className="mt-4">Try Again</Button>
                        </CardContent>
                    </Card>
                )}

            </CardContent>
        </Card>
        
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
                <AccordionTrigger>
                    <div className="flex items-center gap-2 font-semibold">
                        <FileText className="text-primary"/>Raw Extracted Text
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
