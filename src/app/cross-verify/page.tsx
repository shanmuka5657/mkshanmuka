
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  UploadCloud,
  FileText,
  Loader2,
  Trash2,
  AlertCircle,
  Library,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FileCheck2,
  FileClock,
  Files,
  Sparkles,
  ChevronDown,
  Printer,
  Download,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast"
import { cn } from '@/lib/utils';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { analyzeCreditReport, AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { analyzeBankStatement, BankStatementAnalysisOutput } from '@/ai/flows/bank-statement-analysis';
import { analyzeSalarySlips, SalarySlipAnalysisOutput } from '@/ai/flows/salary-slip-analysis';
import { crossVerifyDocuments, CrossVerificationInput, CrossVerificationOutput } from '@/ai/flows/cross-verification';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// PDFJS worker setup
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;
}

type FileState = {
  file: File | null;
  text: string;
  dataUri: string;
  analysis?: any;
  status: 'pending' | 'processing' | 'done' | 'error';
};

const initialFileState: FileState = { file: null, text: '', dataUri: '', status: 'pending' };

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'Match': return <CheckCircle2 className="text-green-500" />;
        case 'Mismatch': return <XCircle className="text-red-500" />;
        case 'Partial Match': return <AlertCircle className="text-yellow-500" />;
        case 'Consistent': return <CheckCircle2 className="text-green-500" />;
        case 'Inconsistent': return <XCircle className="text-red-500" />;
        default: return <FileClock className="text-gray-500" />;
    }
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Match': return 'border-green-500 bg-green-50 dark:bg-green-900/10';
        case 'Mismatch': return 'border-red-500 bg-red-50 dark:bg-red-900/10';
        case 'Partial Match': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
        case 'Consistent': return 'border-green-500 bg-green-50 dark:bg-green-900/10';
        case 'Inconsistent': return 'border-red-500 bg-red-50 dark:bg-red-900/10';
        default: return 'border-gray-300 bg-gray-50 dark:bg-muted/20';
    }
}

const VerificationField = ({ field, label, forPrint = false }: { field: CrossVerificationOutput['name'], label: string, forPrint?: boolean }) => {

    if (forPrint) {
        return (
            <div className="p-3 border rounded-lg">
                <h4 className="font-bold flex items-center gap-2 text-base">
                    {getStatusIcon(field.status)} {label}
                    <span className={`ml-auto text-sm font-semibold px-2 py-0.5 rounded-full text-white ${
                        field.status === 'Match' ? 'bg-green-500' :
                        field.status === 'Mismatch' ? 'bg-red-500' :
                        field.status === 'Partial Match' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}>
                        {field.status}
                    </span>
                </h4>
                 <p className="text-xs text-gray-600 mt-1 mb-2 pl-1">{field.details}</p>
                <div className="text-sm space-y-1 bg-white p-2 rounded">
                    <div className="flex justify-between"><strong>CIBIL:</strong> <span>{field.cibilValue}</span></div>
                    <div className="flex justify-between"><strong>Bank Stmt:</strong> <span>{field.bankStatementValue}</span></div>
                    <div className="flex justify-between"><strong>Salary Slip:</strong> <span>{field.salarySlipValue}</span></div>
                </div>
            </div>
        );
    }
    
    return (
        <div className={cn("border p-4 rounded-lg", getStatusColor(field.status))}>
            <h4 className="font-semibold flex items-center gap-2">{getStatusIcon(field.status)} {label} <span className="text-sm font-normal text-muted-foreground">({field.status})</span></h4>
            <p className="text-xs text-muted-foreground mt-1 mb-3">{field.details}</p>
            <div className="text-xs space-y-1">
                <div><strong>CIBIL:</strong> {field.cibilValue}</div>
                <div><strong>Bank Stmt:</strong> {field.bankStatementValue}</div>
                <div><strong>Salary Slip:</strong> {field.salarySlipValue}</div>
            </div>
        </div>
    );
};

export default function CrossVerifyPage() {
  const [cibilFile, setCibilFile] = useState<FileState>(initialFileState);
  const [bankStatementFile, setBankStatementFile] = useState<FileState>(initialFileState);
  const [salarySlips, setSalarySlips] = useState<File[]>([]);
  const [salarySlipAnalysis, setSalarySlipAnalysis] = useState<SalarySlipAnalysisOutput | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<CrossVerificationOutput | null>(null);

  const cibilInputRef = useRef<HTMLInputElement>(null);
  const bankInputRef = useRef<HTMLInputElement>(null);
  const salaryInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    fileType: 'cibil' | 'bank' | 'salary'
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
        if (fileType === 'cibil') setCibilFile(initialFileState);
        if (fileType === 'bank') setBankStatementFile(initialFileState);
        if (fileType === 'salary') setSalarySlips([]);
        return;
    }

    if (fileType === 'salary') {
        setSalarySlips(Array.from(files));
    } else {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUri = e.target?.result as string;
            const buffer = new Uint8Array(atob(dataUri.split(',')[1]).split('').map(c => c.charCodeAt(0)));
            const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
            let textContent = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const text = await page.getTextContent();
                textContent += text.items.map(item => 'str' in item ? item.str : '').join(' ');
            }
            const fileState: FileState = { file, text: textContent, dataUri, status: 'pending' };
            if (fileType === 'cibil') setCibilFile(fileState);
            else setBankStatementFile(fileState);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!cibilFile?.file && !bankStatementFile?.file && salarySlips.length === 0) {
      toast({ variant: 'destructive', title: 'No Files Selected', description: 'Please upload at least one document to analyze.' });
      return;
    }
    
    setIsAnalyzing(true);
    setVerificationResult(null);
    let finalCibilAnalysis, finalBankAnalysis, finalSalaryAnalysis;

    try {
      // CIBIL Analysis
      if (cibilFile.file) {
        setCibilFile(prev => ({ ...prev, status: 'processing' }));
        const output = await analyzeCreditReport({ creditReportText: cibilFile.text });
        finalCibilAnalysis = output;
        setCibilFile(prev => ({ ...prev, analysis: output, status: 'done' }));
      }
      
      // Bank Statement Analysis
      if (bankStatementFile.file) {
        setBankStatementFile(prev => ({ ...prev, status: 'processing' }));
        const output = await analyzeBankStatement({ statementText: bankStatementFile.text });
        finalBankAnalysis = output;
        setBankStatementFile(prev => ({ ...prev, analysis: output, status: 'done' }));
      }
      
      // Salary Slip Analysis
      if (salarySlips.length > 0) {
          const slipInputs = await Promise.all(salarySlips.map(file => {
              return new Promise<{fileName: string, dataUri: string}>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = e => resolve({ fileName: file.name, dataUri: e.target?.result as string });
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
              });
          }));
          const output = await analyzeSalarySlips({ salarySlips: slipInputs });
          finalSalaryAnalysis = output;
          setSalarySlipAnalysis(output);
      }

      // Cross-Verification
      toast({ title: "Document Analysis Complete", description: "Now performing cross-verification..." });
      
      const verificationInput: CrossVerificationInput = {
        cibilAnalysis: finalCibilAnalysis,
        bankStatementAnalysis: finalBankAnalysis,
        salarySlipAnalysis: finalSalaryAnalysis,
      };

      const verificationOutput = await crossVerifyDocuments(verificationInput);
      setVerificationResult(verificationOutput);
      
      toast({ title: "Cross-Verification Complete!", description: "The verification report is ready below." });

    } catch (error: any) {
      console.error('Error during analysis:', error);
      toast({ variant: 'destructive', title: 'Analysis Failed', description: error.message || 'An unknown error occurred.' });
      if (cibilFile.status === 'processing') setCibilFile(p => ({ ...p, status: 'error' }));
      if (bankStatementFile.status === 'processing') setBankStatementFile(p => ({ ...p, status: 'error' }));
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const resetAll = () => {
      setCibilFile(initialFileState);
      setBankStatementFile(initialFileState);
      setSalarySlips([]);
      setSalarySlipAnalysis(null);
      setVerificationResult(null);
      setIsAnalyzing(false);
      if (cibilInputRef.current) cibilInputRef.current.value = '';
      if (bankInputRef.current) bankInputRef.current.value = '';
      if (salaryInputRef.current) salaryInputRef.current.value = '';
  };
  
  const handleDownload = () => {
    window.print();
  }

  const hasFiles = cibilFile.file || bankStatementFile.file || salarySlips.length > 0;

  return (
    <div className="bg-background font-body text-foreground">
      <main className="container mx-auto p-4 md:p-8 printable-area">
        <div className="text-center mb-12 no-print">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Document Cross-Verification</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Upload CIBIL, Bank Statement, and Salary Slips to have the AI cross-verify key information and detect discrepancies.</p>
        </div>
        
        <Card className="mb-8 no-print">
            <CardHeader>
                <CardTitle className="flex items-center text-xl"><Files className="mr-3 h-6 w-6 text-primary" />Upload Documents</CardTitle>
                <CardDescription>You can upload any combination of documents for verification.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* CIBIL Uploader */}
                <div className="p-4 border-2 border-dashed rounded-lg text-center">
                    <h3 className="font-semibold mb-2">CIBIL Report</h3>
                    <Button onClick={() => cibilInputRef.current?.click()} variant="outline" className="w-full" disabled={isAnalyzing}><UploadCloud className="mr-2"/>Choose PDF</Button>
                    <Input ref={cibilInputRef} type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'cibil')} className="hidden" />
                    {cibilFile.file && <p className="text-xs text-muted-foreground mt-2 truncate">{cibilFile.file.name}</p>}
                </div>
                {/* Bank Statement Uploader */}
                <div className="p-4 border-2 border-dashed rounded-lg text-center">
                    <h3 className="font-semibold mb-2">Bank Statement</h3>
                    <Button onClick={() => bankInputRef.current?.click()} variant="outline" className="w-full" disabled={isAnalyzing}><UploadCloud className="mr-2"/>Choose PDF</Button>
                    <Input ref={bankInputRef} type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'bank')} className="hidden" />
                    {bankStatementFile.file && <p className="text-xs text-muted-foreground mt-2 truncate">{bankStatementFile.file.name}</p>}
                </div>
                {/* Salary Slip Uploader */}
                <div className="p-4 border-2 border-dashed rounded-lg text-center">
                    <h3 className="font-semibold mb-2">Salary Slips</h3>
                    <Button onClick={() => salaryInputRef.current?.click()} variant="outline" className="w-full" disabled={isAnalyzing}><UploadCloud className="mr-2"/>Choose Files</Button>
                    <Input ref={salaryInputRef} type="file" accept="application/pdf,image/*" onChange={(e) => handleFileChange(e, 'salary')} className="hidden" multiple />
                    {salarySlips.length > 0 && <p className="text-xs text-muted-foreground mt-2">{salarySlips.length} slip(s) selected</p>}
                </div>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row gap-2">
                <Button onClick={handleAnalyze} disabled={isAnalyzing || !hasFiles} size="lg">
                    {isAnalyzing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                    {isAnalyzing ? 'Analyzing...' : 'Run Cross-Verification'}
                </Button>
                 {hasFiles && <Button variant="ghost" onClick={resetAll} disabled={isAnalyzing}><Trash2 className="mr-2 h-4 w-4"/>Reset</Button>}
            </CardFooter>
        </Card>

        {isAnalyzing && (
            <Card className="my-8 no-print">
                <CardHeader>
                    <CardTitle>Analysis in Progress...</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                        <div className="w-8">
                        {cibilFile.status === 'processing' && <Loader2 className="animate-spin text-primary" />}
                        {cibilFile.status === 'done' && <CheckCircle2 className="text-green-500" />}
                        {cibilFile.status === 'error' && <XCircle className="text-red-500" />}
                        </div>
                        <span>CIBIL Report Analysis</span>
                    </div>
                    <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                        <div className="w-8">
                        {bankStatementFile.status === 'processing' && <Loader2 className="animate-spin text-primary" />}
                        {bankStatementFile.status === 'done' && <CheckCircle2 className="text-green-500" />}
                        {bankStatementFile.status === 'error' && <XCircle className="text-red-500" />}
                        </div>
                        <span>Bank Statement Analysis</span>
                    </div>
                    <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                        <div className="w-8">
                        {salarySlips.length > 0 && isAnalyzing && !salarySlipAnalysis && <Loader2 className="animate-spin text-primary" />}
                        {salarySlipAnalysis && <CheckCircle2 className="text-green-500" />}
                        </div>
                        <span>Salary Slip Analysis & Fraud Check</span>
                    </div>
                </CardContent>
            </Card>
        )}
        
        {verificationResult && (
            <div className="space-y-8 mt-8">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl flex items-center gap-3"><FileCheck2 className="text-primary"/>Cross-Verification Report</CardTitle>
                                <CardDescription>Summary of findings from comparing all provided documents.</CardDescription>
                            </div>
                            <div className="flex gap-2 no-print">
                                <Button onClick={handleDownload} variant="outline"><Download className="mr-2 h-4 w-4" />Download Report</Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Alert className="mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Overall Assessment</AlertTitle>
                            <AlertDescription>{verificationResult.overallAssessment}</AlertDescription>
                        </Alert>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <VerificationField field={verificationResult.name} label="Applicant Name" />
                            <VerificationField field={verificationResult.dob} label="Date of Birth" />
                            <VerificationField field={verificationResult.pan} label="PAN Number" />
                            <VerificationField field={verificationResult.mobile} label="Mobile Number" />
                            <VerificationField field={verificationResult.address} label="Address" />
                             <div className={cn("border p-4 rounded-lg", getStatusColor(verificationResult.income.status))}>
                                <h4 className="font-semibold flex items-center gap-2">
                                     {getStatusIcon(verificationResult.income.status)}
                                     Income Verification <span className="text-sm font-normal text-muted-foreground">({verificationResult.income.status})</span>
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 mb-3">{verificationResult.income.details}</p>
                                <div className="text-xs space-y-1">
                                    <div><strong>Bank Stmt Income:</strong> {verificationResult.income.bankStatementIncome}</div>
                                    <div><strong>Salary Slip Income:</strong> {verificationResult.income.salarySlipIncome}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                 {(cibilFile.analysis || bankStatementFile.analysis || salarySlipAnalysis) && (
                    <Card className="no-print">
                        <CardHeader>
                            <CardTitle>Detailed Analysis Results</CardTitle>
                            <CardDescription>Expand the sections below to see the full AI analysis for each uploaded document.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Accordion type="multiple" className="w-full">
                                {cibilFile.analysis && (
                                <AccordionItem value="cibil">
                                    <AccordionTrigger>CIBIL Report Analysis</AccordionTrigger>
                                    <AccordionContent>
                                        <pre className="whitespace-pre-wrap text-xs bg-muted p-4 rounded-lg max-h-96 overflow-auto">
                                            {JSON.stringify(cibilFile.analysis, null, 2)}
                                        </pre>
                                    </AccordionContent>
                                </AccordionItem>
                                )}
                                {bankStatementFile.analysis && (
                                <AccordionItem value="bank">
                                    <AccordionTrigger>Bank Statement Analysis</AccordionTrigger>
                                    <AccordionContent>
                                        <pre className="whitespace-pre-wrap text-xs bg-muted p-4 rounded-lg max-h-96 overflow-auto">
                                            {JSON.stringify(bankStatementFile.analysis, null, 2)}
                                        </pre>
                                    </AccordionContent>
                                </AccordionItem>
                                )}
                                {salarySlipAnalysis && (
                                <AccordionItem value="salary">
                                    <AccordionTrigger>Salary Slips Analysis</AccordionTrigger>
                                    <AccordionContent>
                                        <pre className="whitespace-pre-wrap text-xs bg-muted p-4 rounded-lg max-h-96 overflow-auto">
                                            {JSON.stringify(salarySlipAnalysis, null, 2)}
                                        </pre>
                                    </AccordionContent>
                                </AccordionItem>
                                )}
                             </Accordion>
                        </CardContent>
                    </Card>
                 )}
            </div>
        )}
      </main>
    </div>
  );
}
