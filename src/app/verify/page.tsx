
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  Moon,
  Sun,
  Loader2,
  AlertCircle,
  Sparkles,
  ClipboardCheck,
  ShieldCheck,
  XCircle,
  FileUp,
  FileJson,
  Eye,
  Printer,
  Share,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast"
import { verifyPdf, VerifyPdfInput, VerifyPdfOutput } from '@/ai/flows/verify-pdf';
import { cn } from '@/lib/utils';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import Link from 'next/link';
import type { FlowUsage } from 'genkit/flow';
import { Progress } from '@/components/ui/progress';
import { Logo } from '@/components/ui/logo';

const InfoItem = ({ label, value, valueClass }: { label: string | React.ReactNode; value: string | React.ReactNode; valueClass?: string }) => (
     <div className="grid grid-cols-2 gap-4 py-3 border-b items-center">
        <div className="font-semibold text-sm text-muted-foreground flex items-center">{label}</div>
        <div className={cn("text-sm text-right", valueClass)}>{value}</div>
    </div>
);

const SummaryItem = ({ label, value, valueClassName }: { label: string; value: string | number; valueClassName?: string }) => (
    <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg bg-muted/50">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn("text-xl font-bold", valueClassName)}>{value}</div>
    </div>
  );


export default function VerifyPdfPage() {
  const [theme, setTheme] = useState('light');
  const [files, setFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<VerifyPdfOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isModelOverloaded, setIsModelOverloaded] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New state for token tracking and cost
  const [tokenUsage, setTokenUsage] = useState({ inputTokens: 0, outputTokens: 0 });
  const [estimatedCost, setEstimatedCost] = useState(0);

  // Pricing for gemini-1.5-flash model per 1M tokens
  const INPUT_PRICE_PER_MILLION_TOKENS = 0.35; 
  const OUTPUT_PRICE_PER_MILLION_TOKENS = 1.05; // Adjusted for Flash 1.5 with new pricing structure

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'light';
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  // Effect to recalculate cost whenever token usage changes
  useEffect(() => {
    const inputCost = (tokenUsage.inputTokens / 1_000_000) * INPUT_PRICE_PER_MILLION_TOKENS;
    const outputCost = (tokenUsage.outputTokens / 1_000_000) * OUTPUT_PRICE_PER_MILLION_TOKENS;
    setEstimatedCost(inputCost + outputCost);
  }, [tokenUsage]);
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    setAnalysisResult(null);
    setFiles(prev => [...prev, ...Array.from(selectedFiles)]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetState = () => {
    setFiles([]);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setIsModelOverloaded(false);
    setTokenUsage({ inputTokens: 0, outputTokens: 0 });
    setEstimatedCost(0);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };
  
  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Files Selected',
        description: 'Please upload at least one document to analyze.',
      });
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setIsModelOverloaded(false);
    setTokenUsage({ inputTokens: 0, outputTokens: 0 });

    try {
      const filesWithData = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          dataUri: await fileToDataUri(file),
        }))
      );

      const input: VerifyPdfInput = { documents: filesWithData };
      const result = await verifyPdf(input);

      if (result && result.output) {
        setAnalysisResult(result.output);
        setTokenUsage(prev => ({
          inputTokens: prev.inputTokens + (result.usage.inputTokens || 0),
          outputTokens: prev.outputTokens + (result.usage.outputTokens || 0)
        }));
        toast({
          title: 'PDF Analysis Complete',
          description: "The AI has performed a forensic analysis of your document(s).",
        });
      } else {
        throw new Error("Analysis did not return the expected output.");
      }

    } catch (error: any) {
      console.error('Error analyzing documents:', error);
      const errorMessage = error.message || '';
      if (errorMessage.includes('429') || errorMessage.includes('503') || errorMessage.includes('overloaded')) {
        setIsModelOverloaded(true);
      } else {
        toast({
          variant: "destructive",
          title: "An Error Occurred",
          description: errorMessage || "An unknown error occurred. Please try again.",
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getAuthenticityColor = (score: number) => {
    if (score > 90) return 'text-green-500';
    if (score > 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRecommendationColor = (recommendation: string) => {
    if (!recommendation) return 'bg-muted';
    const rec = recommendation.toLowerCase();
    if (rec.includes('appears authentic')) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-500/50';
    if (rec.includes('manual review')) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-500/50';
    if (rec.includes('high risk') || rec.includes('likely fraudulent')) return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-500/50';
    return 'bg-muted';
  };
  

  return (
    <div className={cn("min-h-screen bg-background font-body text-foreground", theme)}>
       <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm print:hidden">
         <div className="container flex h-16 items-center">
            <div className="mr-4 flex items-center">
              <Logo />
            </div>
            <nav className="flex items-center space-x-4 lg:space-x-6 text-sm font-medium">
              <Link
                href="/credit"
                className="transition-colors hover:text-foreground/80 text-muted-foreground"
              >
                Credit Analysis
              </Link>
              <Link
                href="/verify"
                className="transition-colors hover:text-foreground/80 text-foreground"
              >
                Verify PDF
              </Link>
              <Link
                href="/trainer"
                className="transition-colors hover:text-foreground/80 text-muted-foreground"
              >
                AI Model Trainer
              </Link>
            </nav>
            <div className="flex flex-1 items-center justify-end space-x-2">
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="text-center mb-12 print:hidden">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">AI Document Verification</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Upload any document (e.g., salary slips, bank statements, invoices) for a forensic AI analysis to detect signs of fraud and tampering.</p>
        </div>

        <Card className="max-w-4xl mx-auto mb-8 print:hidden">
            <CardHeader>
                <CardTitle className="flex items-center text-xl">
                    <UploadCloud className="mr-3 h-6 w-6 text-primary" />
                    Upload Documents
                </CardTitle>
                <CardDescription>You can upload multiple files (PDFs or images) to be analyzed together.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center gap-4">
                    <Button size="lg" onClick={() => fileInputRef.current?.click()}>
                        <UploadCloud className="mr-2" />
                        Choose Files
                    </Button>
                    <Input ref={fileInputRef} type="file" accept=".pdf,image/*" onChange={handleFileChange} className="hidden" multiple />

                    {files.length > 0 && (
                        <div className="w-full mt-4 p-4 border rounded-lg bg-muted/50">
                          <p className="text-sm font-medium mb-2">Selected files:</p>
                          <div className="flex flex-wrap gap-2">
                            {files.map((file, i) => (
                              <div key={i} className="flex items-center gap-2 bg-background border p-1 px-2 rounded-md text-sm">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span>{file.name}</span>
                                <button onClick={() => removeFile(i)} className="rounded-full hover:bg-destructive/10 p-0.5">
                                    <XCircle className="h-4 w-4 text-destructive"/>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                    )}

                    {files.length > 0 && (
                        <div className="flex items-center gap-4 mt-4">
                            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                                {isAnalyzing ? <Loader2 className="mr-2 animate-spin" /> : <ShieldCheck className="mr-2" />}
                                Analyze {files.length} Document(s)
                            </Button>
                             <Button variant="ghost" onClick={resetState}>
                                <Trash2 className="mr-2"/>
                                Clear All
                            </Button>
                        </div>
                    )}
                </div>

                {isModelOverloaded && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>API Rate Limit Exceeded</AlertTitle>
                        <AlertDescription>
                          You have exceeded the request limit for the free tier. Please check your plan or try again later.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>

        {isAnalyzing && (
            <div className="text-center py-10">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <h3 className="text-xl font-semibold mt-4">AI is running forensic analysis...</h3>
                <p className="text-muted-foreground">This may take a moment, especially for multiple documents.</p>
                <Progress value={33} className="w-full max-w-sm mx-auto mt-4 animate-pulse" />
            </div>
        )}
        
        {analysisResult && (
        <div className="print-this">
            <Card className="max-w-4xl mx-auto a4-paper" id="report">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl flex items-center gap-3">
                                <ClipboardCheck className="text-primary h-7 w-7"/>Forensic Analysis Report
                            </CardTitle>
                            <CardDescription>AI-generated analysis of document authenticity.</CardDescription>
                        </div>
                        <div className="flex gap-2 print:hidden">
                            <Button variant="outline" size="icon"><Share className="h-4 w-4"/></Button>
                            <Button variant="outline" size="icon" onClick={handlePrint}><Printer className="h-4 w-4"/></Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert className={cn('border-2 p-4', getRecommendationColor(analysisResult.fraudReport.overallAssessment))}>
                        <div className="flex justify-between items-center">
                            <div>
                                <AlertTitle className="text-lg font-bold">Overall Recommendation</AlertTitle>
                                <AlertDescription className="text-base">{analysisResult.fraudReport.overallAssessment}</AlertDescription>
                            </div>
                            <div className="text-center">
                                <div className={cn("text-5xl font-bold", getAuthenticityColor(analysisResult.fraudReport.authenticityConfidence))}>
                                    {analysisResult.fraudReport.authenticityConfidence}
                                </div>
                                <div className="text-sm font-medium text-muted-foreground">Authenticity Score</div>
                            </div>
                        </div>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2"><FileUp className="h-5 w-5"/>Document Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {analysisResult.extractedDetails.map((doc, i) => (
                                    <div key={i} className="mb-4 last:mb-0">
                                        <InfoItem label="File Name" value={doc.fileName} />
                                        <InfoItem label="Detected Type" value={doc.documentType} />
                                        <InfoItem label="Key Info" value={doc.keyInfo} />
                                        <InfoItem label="Primary Amount" value={doc.primaryAmount} />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2"><FileJson className="h-5 w-5"/>Consistency & Pattern Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <InfoItem label="Cross-Document Consistency" value={analysisResult.fraudReport.consistencyCheck} />
                                <InfoItem label="Salary/Value Pattern" value={analysisResult.fraudReport.patternAnalysis} />
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><Eye className="h-5 w-5"/>Formatting & Tampering Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                           <InfoItem label="Formatting Anomalies" value={analysisResult.fraudReport.formattingAnomalies} />
                           <InfoItem label="Tampering Indicators" value={analysisResult.fraudReport.tamperingIndicators} />
                        </CardContent>
                    </Card>
                </CardContent>
                 <CardFooter className="flex-col items-start gap-4">
                    <Card className="bg-muted/50 w-full">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center"><Sparkles className="mr-2 text-primary h-4 w-4"/>Analysis Cost</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 gap-4">
                            <SummaryItem label="Input Tokens" value={tokenUsage.inputTokens.toLocaleString()} valueClassName="text-foreground text-base" />
                            <SummaryItem label="Output Tokens" value={tokenUsage.outputTokens.toLocaleString()} valueClassName="text-foreground text-base" />
                            <SummaryItem label="Estimated Cost (USD)" value={`$${estimatedCost.toFixed(5)}`} valueClassName="text-green-600 text-base" />
                        </CardContent>
                    </Card>
                    <p className="text-xs text-muted-foreground pt-2">Disclaimer: This AI analysis is for informational purposes only and does not constitute a definitive judgment of fraud. Manual verification is always recommended for critical applications.</p>
                </CardFooter>
            </Card>
        </div>
        )}
      </main>
      <footer className="text-center py-6 text-sm text-muted-foreground print:hidden">
         <div>© {new Date().getFullYear()} CreditWise AI. Built with Firebase and Google AI.</div>
      </footer>
      <style jsx global>{`
        @media print {
            body * {
                visibility: hidden;
            }
            .print-this, .print-this * {
                visibility: visible;
            }
            .print-this {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
            }
            .a4-paper {
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                color: #000 !important;
                background: #fff !important;
                box-shadow: none;
                border: none;
            }
        }
        .print-this {
            display: none;
        }
        @media print {
            .print-this {
                display: block;
            }
        }
      `}</style>
    </div>
  );
}
