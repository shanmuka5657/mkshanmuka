
'use client';

import { useState, useRef } from "react";
import { ArrowLeft, Loader2, UploadCloud, FileText, Trash2, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { analyzeBankStatement, BankStatementAnalysisOutput } from "@/ai/flows/bank-statement-analysis";
import { analyzeSalarySlips, SalarySlipAnalysisOutput } from "@/ai/flows/salary-slip-analysis";
import * as pdfjsLib from 'pdfjs-dist';
import { Input } from "./ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Badge } from "./ui/badge";

// PDFJS worker setup
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface FinancialsViewProps {
  onBack: () => void;
}

const SummaryItem = ({ label, value }: { label: string; value: string | undefined }) => (
    <div className="flex justify-between items-center py-1.5 border-b">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-right">{value || 'N/A'}</span>
    </div>
);

export function FinancialsView({ onBack }: FinancialsViewProps) {
  const [bankStatement, setBankStatement] = useState<File | null>(null);
  const [salarySlips, setSalarySlips] = useState<File[]>([]);
  const [bankStatementAnalysis, setBankStatementAnalysis] = useState<BankStatementAnalysisOutput | null>(null);
  const [salarySlipAnalysis, setSalarySlipAnalysis] = useState<SalarySlipAnalysisOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const bankInputRef = useRef<HTMLInputElement>(null);
  const salaryInputRef = useRef<HTMLInputElement>(null);

  const handleBankStatementChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setBankStatement(file);
  };

  const handleSalarySlipsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) setSalarySlips(Array.from(files));
  };
  
  const handleAnalyze = async () => {
    if (!bankStatement && salarySlips.length === 0) {
      toast({ variant: 'destructive', title: 'No Files', description: 'Please upload a bank statement or salary slips.' });
      return;
    }

    setIsAnalyzing(true);
    setBankStatementAnalysis(null);
    setSalarySlipAnalysis(null);

    try {
      const analyses = [];

      if (bankStatement) {
        analyses.push(
          (async () => {
            const reader = new FileReader();
            const textContent = await new Promise<string>((resolve, reject) => {
                reader.onload = async (e) => {
                    const buffer = new Uint8Array(e.target?.result as ArrayBuffer);
                    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
                    let text = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        text += content.items.map(item => 'str' in item ? item.str : '').join(' ');
                    }
                    resolve(text);
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(bankStatement);
            });
            const { output } = await analyzeBankStatement({ statementText: textContent });
            setBankStatementAnalysis(output);
            toast({title: "Bank Statement Analyzed"});
          })()
        );
      }

      if (salarySlips.length > 0) {
        analyses.push(
          (async () => {
            const slipInputs = await Promise.all(salarySlips.map(file => 
              new Promise<{fileName: string, dataUri: string}>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve({ fileName: file.name, dataUri: e.target?.result as string });
                reader.onerror = reject;
                reader.readAsDataURL(file);
              })
            ));
            const { output } = await analyzeSalarySlips({ salarySlips: slipInputs });
            setSalarySlipAnalysis(output);
            toast({title: "Salary Slips Analyzed"});
          })()
        );
      }

      await Promise.all(analyses);
      toast({title: "Financial Analysis Complete", description: "Results are displayed below."});

    } catch (error: any) {
      console.error("Error during financial analysis:", error);
      toast({ variant: 'destructive', title: 'Analysis Failed', description: error.message || 'An unknown error occurred.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetFiles = () => {
    setBankStatement(null);
    setSalarySlips([]);
    if (bankInputRef.current) bankInputRef.current.value = '';
    if (salaryInputRef.current) salaryInputRef.current.value = '';
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main View
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Financial Document Analysis</CardTitle>
          <CardDescription>Upload a bank statement and/or recent salary slips to analyze spending patterns, verify income, and check for fraud.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border-2 border-dashed rounded-lg text-center">
                    <h3 className="font-semibold mb-2">Bank Statement (PDF)</h3>
                    <Button onClick={() => bankInputRef.current?.click()} variant="outline" className="w-full" disabled={isAnalyzing}><UploadCloud className="mr-2"/>Choose PDF</Button>
                    <Input ref={bankInputRef} type="file" accept=".pdf" onChange={handleBankStatementChange} className="hidden" />
                    {bankStatement && <p className="text-xs text-muted-foreground mt-2 truncate">{bankStatement.name}</p>}
                </div>
                <div className="p-4 border-2 border-dashed rounded-lg text-center">
                    <h3 className="font-semibold mb-2">Salary Slips (Multi-PDF/Image)</h3>
                    <Button onClick={() => salaryInputRef.current?.click()} variant="outline" className="w-full" disabled={isAnalyzing}><UploadCloud className="mr-2"/>Choose Files</Button>
                    <Input ref={salaryInputRef} type="file" accept="application/pdf,image/*" onChange={handleSalarySlipsChange} className="hidden" multiple />
                    {salarySlips.length > 0 && <p className="text-xs text-muted-foreground mt-2">{salarySlips.length} slip(s) selected</p>}
                </div>
            </div>
        </CardContent>
        <CardFooter className="gap-2">
            <Button onClick={handleAnalyze} disabled={isAnalyzing || (!bankStatement && salarySlips.length === 0)}>
              {isAnalyzing ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
              {isAnalyzing ? 'Analyzing...' : 'Analyze Financials'}
            </Button>
            <Button variant="ghost" onClick={resetFiles} disabled={isAnalyzing}><Trash2 className="mr-2" /> Reset</Button>
        </CardFooter>
      </Card>
      
      {isAnalyzing && !bankStatementAnalysis && !salarySlipAnalysis && (
        <Card className="text-center p-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-xl font-semibold">AI is analyzing your documents...</h3>
            <p className="text-muted-foreground">This may take a few moments depending on the file sizes.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {bankStatementAnalysis && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText />Bank Statement Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" defaultValue={['summary', 'health']}>
                        <AccordionItem value="summary">
                            <AccordionTrigger>Account Summary</AccordionTrigger>
                            <AccordionContent>
                                <SummaryItem label="Account Holder" value={bankStatementAnalysis.summary.accountHolder} />
                                <SummaryItem label="Account Number" value={bankStatementAnalysis.summary.accountNumber} />
                                <SummaryItem label="Bank Name" value={bankStatementAnalysis.summary.bankName} />
                                <SummaryItem label="Statement Period" value={bankStatementAnalysis.summary.statementPeriod} />
                                <SummaryItem label="Opening Balance" value={bankStatementAnalysis.summary.openingBalance} />
                                <SummaryItem label="Closing Balance" value={bankStatementAnalysis.summary.closingBalance} />
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="overview">
                            <AccordionTrigger>Financial Overview</AccordionTrigger>
                            <AccordionContent>
                                <SummaryItem label="Total Deposits" value={bankStatementAnalysis.overview.totalDeposits} />
                                <SummaryItem label="Total Withdrawals" value={bankStatementAnalysis.overview.totalWithdrawals} />
                                <SummaryItem label="Average Balance" value={bankStatementAnalysis.overview.averageBalance} />
                                <SummaryItem label="Est. Monthly Income" value={bankStatementAnalysis.overview.estimatedMonthlyIncome} />
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="health">
                            <AccordionTrigger>Financial Health</AccordionTrigger>
                            <AccordionContent className="space-y-4">
                                <p className="text-sm bg-muted p-3 rounded-md">{bankStatementAnalysis.health.summary}</p>
                                <div>
                                    <h4 className="font-semibold mb-2">Strengths</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {bankStatementAnalysis.health.strengths.map((s,i) => <Badge key={i} className="bg-green-100 text-green-800">{s}</Badge>)}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Risks</h4>
                                     <div className="flex flex-wrap gap-2">
                                        {bankStatementAnalysis.health.risks.map((r,i) => <Badge key={i} variant="destructive">{r}</Badge>)}
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        )}
        {salarySlipAnalysis && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText />Salary Slip Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" defaultValue={['fraud']}>
                        <AccordionItem value="slips">
                            <AccordionTrigger>Extracted Slip Details</AccordionTrigger>
                            <AccordionContent className="space-y-4">
                                {salarySlipAnalysis.extractedSlips.map((slip, i) => (
                                    <div key={i} className="p-3 bg-muted rounded-md">
                                        <h4 className="font-semibold border-b pb-1 mb-2">{slip.fileName} ({slip.payMonth})</h4>
                                        <SummaryItem label="Net Salary" value={slip.netSalary} />
                                        <SummaryItem label="Gross Salary" value={slip.grossSalary} />
                                        <SummaryItem label="Incentives" value={slip.incentives} />
                                    </div>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="fraud">
                            <AccordionTrigger>Fraud & Tampering Report</AccordionTrigger>
                            <AccordionContent className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                    <div className="font-semibold">Authenticity Score</div>
                                    <div className="text-2xl font-bold text-blue-600">{salarySlipAnalysis.fraudReport.authenticityConfidence}/100</div>
                                </div>
                                <p className="text-sm bg-muted p-3 rounded-md">{salarySlipAnalysis.fraudReport.overallAssessment}</p>
                                <ul className="text-xs space-y-2">
                                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" /><div><strong>Consistency:</strong> {salarySlipAnalysis.fraudReport.consistencyCheck}</div></li>
                                    <li className="flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" /><div><strong>Pattern Analysis:</strong> {salarySlipAnalysis.fraudReport.patternAnalysis}</div></li>
                                    <li className="flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" /><div><strong>Formatting:</strong> {salarySlipAnalysis.fraudReport.formattingAnomalies}</div></li>
                                    <li className="flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5 text-red-500 flex-shrink-0" /><div><strong>Tampering:</strong> {salarySlipAnalysis.fraudReport.tamperingIndicators}</div></li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
