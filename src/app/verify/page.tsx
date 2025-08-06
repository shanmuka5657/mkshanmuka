
'use client';

import React, { useState, useRef, useCallback } from 'react';
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast"
import { verifyPdf, VerifyPdfInput, VerifyPdfOutput } from '@/ai/flows/verify-pdf';
import { cn } from '@/lib/utils';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from 'next/link';
import type { FlowUsage } from 'genkit/flow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const InfoItem = ({ label, value }: { label: string | React.ReactNode; value: string | number; }) => (
     <div className="grid grid-cols-3 gap-4 py-2 border-b">
        <div className="font-semibold text-sm text-muted-foreground flex items-center col-span-1">{label}</div>
        <div className="font-semibold truncate col-span-2">{value}</div>
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

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'light';
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);
  
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

    try {
      const filesWithData = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          dataUri: await fileToDataUri(file),
        }))
      );

      const input: VerifyPdfInput = { documents: filesWithData };
      const { output } = await verifyPdf(input);

      setAnalysisResult(output);
      toast({
        title: 'PDF Analysis Complete',
        description: "The AI has performed a forensic analysis of your document(s).",
      });

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
  

  return (
    <div className={cn("min-h-screen bg-background font-body text-foreground", theme)}>
       <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
         <div className="container flex h-16 items-center">
            <div className="mr-4 flex items-center">
              <Sparkles className="h-6 w-6 mr-2 text-primary" />
              <span className="font-bold text-lg">CreditWise AI</span>
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
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">AI Document Verification</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Upload any document (e.g., salary slips, bank statements, invoices) for a forensic AI analysis to detect signs of fraud and tampering.</p>
        </div>

        <Card className="max-w-4xl mx-auto mb-8">
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
                        <div className="w-full space-y-2">
                          <p className="text-sm font-medium">Uploaded files:</p>
                          <div className="flex flex-wrap gap-2">
                            {files.map((file, i) => (
                              <Badge key={i} variant="secondary" className="flex items-center gap-2">
                                <span>{file.name}</span>
                                <button onClick={() => removeFile(i)} className="rounded-full hover:bg-muted-foreground/20 p-0.5">
                                    <XCircle className="h-3 w-3"/>
                                </button>
                              </Badge>
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
                        <AlertTitle>AI Model Overloaded</AlertTitle>
                        <AlertDescription>
                        The AI is currently experiencing high demand. Please wait a moment and try your request again.
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
            </div>
        )}
        
        {analysisResult && (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-3"><ClipboardCheck className="text-primary h-6 w-6"/>Forensic & Fraud Report</CardTitle>
                <CardDescription>This report details the AI's findings after analyzing the provided documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 mt-4">
                <Alert className={cn(
                    'border-2',
                    analysisResult.fraudReport.authenticityConfidence > 90 ? 'border-green-500' :
                    analysisResult.fraudReport.authenticityConfidence > 70 ? 'border-yellow-500' : 'border-red-500'
                )}>
                    <AlertTitle className="text-lg font-bold">Overall Assessment</AlertTitle>
                    <AlertDescription className="space-y-2">
                        <Progress value={analysisResult.fraudReport.authenticityConfidence} className="my-2 h-3" />
                        <p className="text-base"><strong className="text-foreground">Authenticity Score: {analysisResult.fraudReport.authenticityConfidence}/100.</strong> {analysisResult.fraudReport.overallAssessment}</p>
                    </AlertDescription>
                </Alert>

                <Accordion type="multiple" className="w-full" defaultValue={['details', 'data']}>
                    <AccordionItem value="details">
                        <AccordionTrigger>
                            <h4 className="font-semibold text-lg flex items-center">Detailed Findings</h4>
                        </AccordionTrigger>
                        <AccordionContent className="p-2 space-y-1">
                            <InfoItem label="Consistency Check" value={analysisResult.fraudReport.consistencyCheck} />
                            <InfoItem label="Pattern Analysis" value={analysisResult.fraudReport.patternAnalysis} />
                            <InfoItem label="Formatting Anomalies" value={analysisResult.fraudReport.formattingAnomalies} />
                            <InfoItem label="Tampering Indicators" value={analysisResult.fraudReport.tamperingIndicators} />
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="data">
                        <AccordionTrigger>
                            <h4 className="font-semibold text-lg flex items-center">Extracted Data</h4>
                        </AccordionTrigger>
                        <AccordionContent>
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>File Name</TableHead>
                                    <TableHead>Document Type</TableHead>
                                    <TableHead>Key Info</TableHead>
                                    <TableHead>Primary Amount</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {analysisResult.extractedDetails.map((slip, i) => (
                                    <TableRow key={i}>
                                    <TableCell className="font-medium">{slip.fileName}</TableCell>
                                    <TableCell>{slip.documentType}</TableCell>
                                    <TableCell>{slip.keyInfo}</TableCell>
                                    <TableCell className="font-semibold">{slip.primaryAmount}</TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
        )}
      </main>
      <footer className="text-center py-6 text-sm text-muted-foreground">
         <div>© {new Date().getFullYear()} CreditWise AI. Built with Firebase and Google AI.</div>
      </footer>
    </div>
  );
}
