
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  UploadCloud,
  FileText,
  Trash2,
  Loader2,
  ClipboardCheck,
  Sparkles,
  Landmark,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast"
import { analyzeBankStatement, BankStatementAnalysisOutput } from '@/ai/flows/bank-statement-analysis';
import { BankStatementView } from '@/components/BankStatementView';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// PDFJS worker setup
if (typeof window !== 'undefined') {
    GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
}

export default function BankStatementPage() {
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<BankStatementAnalysisOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        resetState();
        setStatementFile(selectedFile);
        setFileName(selectedFile.name);
        processFile(selectedFile);
    }
  };
  
  const resetState = () => {
    setStatementFile(null);
    setFileName('');
    setRawText('');
    setIsProcessing(false);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setAnalysisError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = async (file: File) => {
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
          const cleanedText = textContent.replace(/\s+/g, ' ').trim();
          setRawText(cleanedText);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("PDF Processing Error: ", error);
      setAnalysisError("Failed to read the PDF file. It might be corrupted or protected.");
      toast({ variant: "destructive", title: "Error", description: "Failed to process the PDF file." });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleAnalyzeStatement = async () => {
    if (!rawText) {
        toast({ variant: 'destructive', title: 'Error', description: 'No statement text to analyze.' });
        return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
        const result = await analyzeBankStatement({ statementText: rawText });
        setAnalysisResult(result);
        toast({ 
            title: "Analysis Complete!", 
            description: "Your bank statement has been analyzed.",
        });

    } catch (error: any) {
        console.error("CLIENT: Analysis Error: ", error);
        setAnalysisError(error.message || "An unknown error occurred during analysis.");
         toast({
            variant: "destructive",
            title: "Analysis Failed",
            description: error.message || "Something went wrong. Please try again.",
        });
    } finally {
        setIsAnalyzing(false);
    }
  };

  if (analysisResult) {
    return (
        <main className="container mx-auto p-4 md:p-8 space-y-6">
            <BankStatementView analysisResult={analysisResult} onBack={resetState} />
        </main>
    )
  }

  return (
    <main className="container mx-auto p-4 md:p-8 space-y-6">
        <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Bank Statement Analysis</h1>
            <p className="mt-2 text-md text-muted-foreground max-w-2xl mx-auto">Upload a bank statement PDF to extract and analyze account details, financial health, and key transactions.</p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center text-lg gap-2">
                    <UploadCloud className="text-primary" />
                    Upload Your Bank Statement (PDF)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing || isAnalyzing}>
                        <UploadCloud className="mr-2" />
                        {statementFile ? 'Choose Another File' : 'Choose PDF File'}
                    </Button>
                    <Input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                    <span className="text-sm text-muted-foreground flex-1 min-w-0 truncate">{fileName}</span>
                    {statementFile && (
                        <Button variant="ghost" size="icon" onClick={resetState} disabled={isProcessing || isAnalyzing}>
                            <Trash2 className="h-5 w-5" />
                        </Button>
                    )}
                </div>

                {(isProcessing || isAnalyzing) && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isProcessing ? 'Processing PDF...' : 'AI is analyzing your statement...'}
                    </div>
                )}
                
                {rawText && !isAnalyzing && !analysisResult &&(
                    <div className="mt-4">
                        <Button onClick={handleAnalyzeStatement} size="lg">
                            <Sparkles className="mr-2 h-5 w-5"/>
                            Analyze Statement
                        </Button>
                    </div>
                )}

                {analysisError && (
                    <Card className="mt-4 border-destructive">
                        <CardHeader>
                            <CardTitle className="text-destructive">Analysis Failed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>{analysisError}</p>
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
                            <pre className="text-xs bg-muted p-4 rounded-lg max-h-96 overflow-auto whitespace-pre-wrap">{rawText || "Upload a statement to see the raw extracted text."}</pre>
                        </CardContent>
                    </Card>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </main>
  );
}
