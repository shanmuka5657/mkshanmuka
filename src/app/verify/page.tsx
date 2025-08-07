
'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  Trash2,
  Fingerprint,
  Calendar,
  Wrench,
  ScanText,
  Palette,
  Eye,
  Flag,
  ShieldCheck,
  ShieldAlert,
  ShieldClose,
  FileQuestion,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast"
import { verifyPdf, VerifyPdfOutput } from '@/ai/flows/verify-pdf';
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
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';


if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export default function VerifyPdfPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('No file chosen');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [analysisResult, setAnalysisResult] = useState<VerifyPdfOutput | null>(null);
  
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      resetState();
      setPdfFile(file);
      setFileName(file.name);
    }
  };
  
  const resetState = () => {
    setPdfFile(null);
    setFileName('No file chosen');
    setProgress(0);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!pdfFile) {
      toast({
        variant: 'destructive',
        title: 'No File Selected',
        description: 'Please choose a PDF file to analyze.',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setProgress(10);

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
          const dataUri = e.target?.result as string;
          // Use a Buffer-like approach to get PDF data
          const pdfData = new Uint8Array(atob(dataUri.split(',')[1]).split("").map(c => c.charCodeAt(0)));

          setProgress(30);
          const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
          const metadata = (await pdf.getMetadata()).info as any;
          setProgress(50);
          
          const { output } = await verifyPdf({
              pdfDataUri: dataUri,
              metadata: {
                  CreationDate: metadata.CreationDate,
                  ModDate: metadata.ModDate,
                  Producer: metadata.Producer,
              }
          });
          
          setProgress(90);
          setAnalysisResult(output);
          setProgress(100);

          toast({
            title: "Analysis Complete",
            description: "The forensic analysis of your document is ready.",
          });
      };
      
      reader.readAsDataURL(pdfFile);

    } catch (error: any) {
      console.error('Error analyzing PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: error.message || 'An unknown error occurred during analysis.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const getRiskBadgeVariant = (risk: string = 'Low'): "default" | "secondary" | "destructive" => {
    const r = risk.toLowerCase();
    if (r === 'high') return 'destructive';
    if (r === 'medium') return 'secondary';
    return 'default';
  };
  
  const getVerdictStyles = (verdict: string = '') => {
    const v = verdict.toLowerCase();
    if (v === 'authentic') {
      return { icon: <ShieldCheck className="h-10 w-10 text-green-500" />, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-300 dark:border-green-800' };
    }
    if (v === 'suspicious') {
      return { icon: <ShieldAlert className="h-10 w-10 text-yellow-500" />, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/10', border: 'border-yellow-300 dark:border-yellow-800' };
    }
    if (v === 'likely altered') {
      return { icon: <ShieldClose className="h-10 w-10 text-red-500" />, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-300 dark:border-red-800' };
    }
    return { icon: <FileQuestion className="h-10 w-10" />, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' };
  };

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center">
          <div className="mr-4 flex items-center">
            <Logo />
          </div>
          <nav className="flex items-center space-x-4 lg:space-x-6 text-sm font-medium">
            <Link href="/credit" className="transition-colors hover:text-foreground/80 text-muted-foreground">
              Credit Analysis
            </Link>
            <Link href="/verify" className="transition-colors hover:text-foreground/80 text-foreground">
              VerityPDF
            </Link>
            <Link
                href="/cross-verify"
                className="transition-colors hover:text-foreground/80 text-muted-foreground"
              >
                Cross-Verification
              </Link>
            <Link href="/trainer" className="transition-colors hover:text-foreground/80 text-muted-foreground">
              AI Model Trainer
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">VerityPDF Forensic Analysis</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Upload any PDF to uncover signs of tampering. Our AI performs a deep forensic analysis of metadata, fonts, and visual elements.</p>
        </div>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <UploadCloud className="mr-3 h-6 w-6 text-primary" />Upload Document for Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing}>
                <UploadCloud className="mr-2" />
                Choose PDF File
              </Button>
              <Input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" disabled={isAnalyzing} />
              <span className="text-muted-foreground flex-1 min-w-0 truncate">{fileName}</span>
              {pdfFile && (
                <Button variant="ghost" size="icon" onClick={resetState} disabled={isAnalyzing}>
                  <Trash2 className="h-5 w-5" />
                  <span className="sr-only">Remove file</span>
                </Button>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleAnalyze} disabled={isAnalyzing || !pdfFile}>
              {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
              {isAnalyzing ? `Analyzing...` : 'Run Forensic Analysis'}
            </Button>
          </CardFooter>
        </Card>

        {isAnalyzing && !analysisResult && (
          <Card className="text-center p-8 my-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-xl font-semibold">Performing Forensic Analysis...</h3>
            <p className="text-muted-foreground">The AI is inspecting every detail of your document.</p>
            <Progress value={progress} className="w-full max-w-md mx-auto mt-4" />
          </Card>
        )}

        {analysisResult && (
          <div className="space-y-8">
            <Card className={cn("border-2", getVerdictStyles(analysisResult.finalVerdict.verdict).border)}>
                <CardHeader className={cn("p-6", getVerdictStyles(analysisResult.finalVerdict.verdict).bg)}>
                     <div className="flex items-center gap-4">
                        {getVerdictStyles(analysisResult.finalVerdict.verdict).icon}
                        <div>
                            <CardDescription>Final Verdict</CardDescription>
                            <CardTitle className={cn("text-3xl", getVerdictStyles(analysisResult.finalVerdict.verdict).color)}>
                                {analysisResult.finalVerdict.verdict}
                            </CardTitle>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 text-center p-6 bg-muted rounded-lg flex flex-col justify-center">
                        <div className="text-muted-foreground">Authenticity Confidence</div>
                        <div className={cn("text-7xl font-bold", getVerdictStyles(analysisResult.finalVerdict.verdict).color)}>
                            {analysisResult.confidenceScore.score}
                        </div>
                        <div className="text-sm text-muted-foreground">Score / 100</div>
                    </div>
                    <div className="md:col-span-2 space-y-4 my-auto">
                        <div>
                            <h4 className="font-semibold text-lg">Score Explanation</h4>
                            <p className="text-sm text-muted-foreground">{analysisResult.confidenceScore.explanation}</p>
                        </div>
                         <div>
                            <h4 className="font-semibold text-lg">Recommendation</h4>
                            <p className="text-sm text-muted-foreground">{analysisResult.finalVerdict.recommendation}</p>
                        </div>
                    </div>
                </CardContent>
                 <CardFooter>
                    <p className="text-xs text-muted-foreground">Document Type Inferred as: <strong>{analysisResult.documentType}</strong></p>
                </CardFooter>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl gap-2"><FileText className="text-primary"/>Metadata Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="font-semibold flex items-center gap-1"><Wrench size={14}/> Producer</span>
                            <span className="truncate">{analysisResult.metadataAnalysis.producer}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="font-semibold flex items-center gap-1"><Calendar size={14}/> Creation Date</span>
                            <span>{analysisResult.metadataAnalysis.creationDate}</span>
                        </div>
                         <div className="flex justify-between text-sm">
                            <span className="font-semibold flex items-center gap-1"><Calendar size={14}/> Mod Date</span>
                            <span>{analysisResult.metadataAnalysis.modDate}</span>
                        </div>
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Summary</AlertTitle>
                            <AlertDescription>{analysisResult.metadataAnalysis.summary}</AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl gap-2"><ScanText className="text-primary"/>Content Analysis</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="p-3 bg-muted rounded-md">
                            <h4 className="font-semibold flex items-center gap-1.5"><ScanText size={16}/> Text Layer</h4>
                            <p className="text-sm text-muted-foreground">{analysisResult.contentAnalysis.textLayer}</p>
                        </div>
                         <div className="p-3 bg-muted rounded-md">
                            <h4 className="font-semibold flex items-center gap-1.5"><Palette size={16}/> Font & Spacing Consistency</h4>
                            <p className="text-sm text-muted-foreground">{analysisResult.contentAnalysis.fontConsistency}</p>
                        </div>
                         <div className="p-3 bg-muted rounded-md">
                            <h4 className="font-semibold flex items-center gap-1.5"><Eye size={16}/> Visual Elements</h4>
                            <p className="text-sm text-muted-foreground">{analysisResult.contentAnalysis.visualElements}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-xl gap-2"><Flag className="text-primary"/>Suspicion Flags</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Issue Identified</TableHead>
                                <TableHead>Value Found</TableHead>
                                <TableHead>Risk Level</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analysisResult.suspicionFlags.map((flag, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{flag.issue}</TableCell>
                                    <TableCell className="max-w-xs truncate">{flag.value}</TableCell>
                                    <TableCell>
                                        <Badge variant={getRiskBadgeVariant(flag.risk)}>{flag.risk}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                             {analysisResult.suspicionFlags.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground">No significant suspicion flags were identified.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Disclaimer</AlertTitle>
                <AlertDescription>{analysisResult.disclaimer}</AlertDescription>
            </Alert>
          </div>
        )}
      </main>
      <footer className="text-center py-6 text-sm text-muted-foreground">
        <div>© {new Date().getFullYear()} MkCreditWise.com. Built with Firebase and Google AI.</div>
      </footer>
    </div>
  );
}

    