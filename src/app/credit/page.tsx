
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist';
import {
  UploadCloud,
  FileText,
  BarChartBig,
  Calculator,
  Sparkles,
  Lightbulb,
  ShieldCheck,
  Trash2,
  Loader2,
  AlertCircle,
  BrainCircuit,
  FileSearch,
  LineChart,
  ShieldAlert,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Banknote,
  Printer,
  LogIn,
  Gavel,
  BadgeCent,
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  LayoutGrid,
  Pencil,
  PlayCircle,
  ArrowLeft,
  ChevronsUpDown,
  User as UserIcon,
  Save,
  Info,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Landmark,
  Receipt,
  ClipboardCheck,
  LogOut,
  Download,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useToast } from "@/hooks/use-toast"
import { analyzeCreditReport, AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { getAiRating, AiRatingOutput } from '@/ai/flows/ai-rating';
import { getLoanEligibility, LoanEligibilityOutput, LoanEligibilityInput } from '@/ai/flows/loan-eligibility';
import { getFinancialRiskAssessment, FinancialRiskOutput } from '@/ai/flows/financial-risk-assessment';
import { getCreditUnderwriting, CreditUnderwritingOutput, CreditUnderwritingInput } from '@/ai/flows/credit-underwriting';
import { getRiskAssessment, RiskAssessmentOutput } from '@/ai/flows/risk-assessment';
import { AiAgentChat } from '@/components/CreditChat';
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
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { saveTrainingCandidate } from '@/lib/training-store';
import { Textarea } from '@/components/ui/textarea';
import type { FlowUsage } from 'genkit/flow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/logo';
import { useRouter } from 'next/navigation';
import { saveCreditAnalysisSummary } from '@/lib/firestore-service';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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
      zeroBalance: 'N/A',
      highCredit: 'N/A',
      currentBalance: 'N/A',
      overdue: 'N/A',
      recentDate: 'N/A',
      oldestDate: 'N/A',
    },
    enquirySummary: {
      total: 'N/A',
      past30Days: 'N/A',
      past12Months: 'N/A',
      past24Months: 'N/A',
      recentDate: 'N/A',
    }
  },
  allAccounts: [],
  emiDetails: {
    totalEmi: 0,
    activeLoans: [],
  }
};


type ActiveLoanDetail = AnalyzeCreditReportOutput['emiDetails']['activeLoans'][0] & {
    id: string; // Add a unique ID for React keys
    considerForObligation: 'Yes' | 'No';
    comment: string;
};


// Pricing for gemini-pro model per 1M tokens
const INPUT_PRICE_PER_MILLION_TOKENS = 3.5; 
const OUTPUT_PRICE_PER_MILLION_TOKENS = 10.5;

const parseCurrency = (currencyString: string): number => {
    if (typeof currencyString !== 'string' || currencyString === '₹NaN') return 0;
    return Number(currencyString.replace(/[^0-9.-]+/g,""));
}

const SummaryBox = ({ title, value, isLoading = false, valueClassName = '' }: { title: string; value: string | number; isLoading?: boolean; valueClassName?: string }) => (
  <Card className="text-center p-3">
    <CardDescription className="text-xs">{title}</CardDescription>
    {isLoading ? <Loader2 className="h-6 w-6 mx-auto animate-spin" /> : <CardTitle className={cn("text-xl", valueClassName)}>{value}</CardTitle>}
  </Card>
);

const DashboardButton = ({ icon: Icon, title, onClick, disabled }: { icon: React.ElementType, title: string, onClick?: () => void, disabled?: boolean }) => (
    <Button variant="outline" className="flex-col h-24 w-full justify-center gap-2" onClick={onClick} disabled={disabled}>
        <Icon className="h-6 w-6 text-primary"/>
        <span className="text-xs text-center">{title}</span>
    </Button>
);


export default function CreditPage() {
  const [creditFile, setCreditFile] = useState<File | null>(null);
  const [creditFileName, setCreditFileName] = useState('No CIBIL report chosen');
  const [rawText, setRawText] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [creditScore, setCreditScore] = useState<number | null>(null);

  const [analysisResult, setAnalysisResult] = useState<AnalyzeCreditReportOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [totalEmi, setTotalEmi] = useState('');
  const [activeLoanDetails, setActiveLoanDetails] = useState<ActiveLoanDetail[]>([]);
  const [otherObligations, setOtherObligations] = useState('');
  const [estimatedIncome, setEstimatedIncome] = useState<string>('');
  
  const [aiRating, setAiRating] = useState<AiRatingOutput | null>(null);
  const [isRating, setIsRating] = useState(false);
  const [loanEligibility, setLoanEligibility] = useState<LoanEligibilityOutput | null>(null);
  const [isCalculatingEligibility, setIsCalculatingEligibility] = useState(false);

  // New state for Underwriting
  const [underwritingResult, setUnderwritingResult] = useState<CreditUnderwritingOutput | null>(null);
  const [isUnderwriting, setIsUnderwriting] = useState(false);
  const [loanType, setLoanType] = useState('Personal Loan');
  const [employmentType, setEmploymentType] = useState('Salaried');
  const [desiredLoanAmount, setDesiredLoanAmount] = useState('');
  const [desiredTenure, setDesiredTenure] = useState('');

  // New state for Financial Risk
  const [financialRisk, setFinancialRisk] = useState<FinancialRiskOutput | null>(null);
  const [isAssessingFinancialRisk, setIsAssessingFinancialRisk] = useState(false);

  // New state for dedicated risk assessment
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessmentOutput | null>(null);
  const [isAssessingRisk, setIsAssessingRisk] = useState(false);
  
  // New state for token tracking and cost
  const [tokenUsage, setTokenUsage] = useState({ inputTokens: 0, outputTokens: 0 });
  const [estimatedCost, setEstimatedCost] = useState(0);

  // New state for overload error
  const [isModelOverloaded, setIsModelOverloaded] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  const { toast } = useToast()
  const creditFileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  useEffect(() => {
    setIsClient(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user);
      } else {
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    // Set workerSrc for pdfjs-dist
    GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }, []);

    // Effect to recalculate total EMI whenever loan details change
  useEffect(() => {
    const newTotalEmi = activeLoanDetails
      .filter(loan => loan.considerForObligation === 'Yes')
      .reduce((sum, loan) => sum + (loan.emi || 0), 0);
    setTotalEmi(newTotalEmi.toString());
  }, [activeLoanDetails]);

  // Effect to recalculate cost whenever token usage changes
  useEffect(() => {
    const inputCost = (tokenUsage.inputTokens / 1_000_000) * INPUT_PRICE_PER_MILLION_TOKENS;
    const outputCost = (tokenUsage.outputTokens / 1_000_000) * OUTPUT_PRICE_PER_MILLION_TOKENS;
    setEstimatedCost(inputCost + outputCost);
  }, [tokenUsage]);

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
    setCreditFileName('No CIBIL report chosen');
    setRawText('');
    setIsLoading(false);
    setProgress(0);
    setCreditScore(null);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    
    setTotalEmi('');
    setActiveLoanDetails([]);
    setOtherObligations('');
    setEstimatedIncome('');
    setShowRawText(false);
    
    setAiRating(null);
    setIsRating(false);
    setLoanEligibility(null);
    setIsCalculatingEligibility(false);
    setUnderwritingResult(null);
    setIsUnderwriting(false);
    setLoanType('Personal Loan');
    setEmploymentType('Salaried');
    setDesiredLoanAmount('');
    setDesiredTenure('');
    setFinancialRisk(null);
    setIsAssessingFinancialRisk(false);
    setRiskAssessment(null);
    setIsAssessingRisk(false);
    setTokenUsage({ inputTokens: 0, outputTokens: 0 });
    setEstimatedCost(0);
    setIsModelOverloaded(false);

    if (creditFileInputRef.current) {
      creditFileInputRef.current.value = '';
    }
  };

  const updateTokenUsage = useCallback((usage?: FlowUsage) => {
    if (!usage) return;
    setTokenUsage(prev => ({
      inputTokens: prev.inputTokens + (usage.inputTokens || 0),
      outputTokens: prev.outputTokens + (usage.outputTokens || 0)
    }));
  }, []);

  const handleOverloadedError = (error: any) => {
    const errorMessage = error.message || '';
    if (errorMessage.includes('429') || errorMessage.includes('503') || errorMessage.includes('overloaded')) {
      setIsModelOverloaded(true);
      return true; // Indicates the error was handled
    }
    toast({
      variant: "destructive",
      title: "An Error Occurred",
      description: errorMessage || "An unknown error occurred. Please try again.",
    });
    return false; // Indicates the error was not the overload error
  };

  const processFile = async (selectedFile: File) => {
    setIsLoading(true);
    setProgress(10);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) {
          setProgress(30);
          const pdf = await getDocument({ data: buffer }).promise;
          let textContent = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const text = await page.getTextContent();
            textContent += text.items.map(item => 'str' in item ? item.str : '').join(' ');
            setProgress(30 + Math.round((70 * i) / pdf.numPages));
          }
          
          setRawText(textContent);
          const normalizedText = textContent.replace(/\s+/g, ' ').trim();
          const scoreMatch = normalizedText.match(/(?:CIBIL (?:TRANSUNION )?SCORE|CREDITVISION. SCORE)\s*(\d{3})/i);
          setCreditScore(scoreMatch ? parseInt(scoreMatch[1], 10) : null);
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
      setIsLoading(false);
    }
  };
  
  const handleAnalyzeCreditReport = async () => {
    if (analysisResult) return; // Don't re-run if we have results
    
    setIsAnalyzing(true);
    setIsModelOverloaded(false);
    
    try {
        const { output, usage } = await analyzeCreditReport({ creditReportText: rawText });
        setAnalysisResult(output);
        updateTokenUsage(usage);
        
        const enhancedLoanDetails = output.emiDetails.activeLoans.map((loan, index) => ({
            ...loan,
            id: `loan-${index}-${Date.now()}`,
            considerForObligation: 'Yes' as 'Yes' | 'No',
            comment: '',
        }));
        setActiveLoanDetails(enhancedLoanDetails);
        toast({ title: "Credit Summary Complete", description: "Credit report has been analyzed." });

        // Save summary to Firestore after successful analysis
        try {
            await saveCreditAnalysisSummary(output, creditScore);
            toast({
                title: "Report Saved",
                description: "A summary has been saved to the database.",
                variant: 'default',
                className: 'bg-green-100 text-green-800'
            });
        } catch(dbError: any) {
             toast({
                variant: "destructive",
                title: "Database Error",
                description: `Analysis complete, but failed to save summary. ${dbError.message}`
            });
        }

    } catch (error: any) {
        console.error('Error analyzing report:', error);
        handleOverloadedError(error);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleGetRiskAssessment = async () => {
    if (riskAssessment || !analysisResult) {
        toast({ variant: "destructive", title: "Prerequisite Missing", description: "Please generate the Credit Summary first." });
        return;
    }
    
    setIsAssessingRisk(true);
    setIsModelOverloaded(false);
    
    try {
        const { output, usage } = await getRiskAssessment({ analysisResult });
        setRiskAssessment(output);
        updateTokenUsage(usage);
        toast({ title: 'AI Risk Assessment Complete', description: 'The AI has performed a detailed risk analysis.' });
    } catch (error: any) {
        console.error('Error during risk assessment:', error);
        handleOverloadedError(error);
    } finally {
        setIsAssessingRisk(false);
    }
  }


  const handleGetAiRating = async () => {
    if (!analysisResult || !riskAssessment) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please complete the Credit Summary and AI Risk Assessment first.",
      });
      return;
    }
    setIsRating(true);
    setAiRating(null);
    setIsModelOverloaded(false);
    
    try {
      const { output, usage } = await getAiRating({
        analysisResult: analysisResult,
        riskAssessment: riskAssessment,
      });
      if (!output) {
        throw new Error("AI failed to provide a rating.");
      }
      setAiRating(output);
      updateTokenUsage(usage);
       toast({
        title: "AI Rating Complete",
        description: "Your comprehensive AI credit rating is ready.",
      })
    } catch (error: any)
{
      console.error('Error getting AI rating:', error);
      handleOverloadedError(error);
    } finally {
      setIsRating(false);
    }
  }

  const handleGetLoanEligibility = async () => {
    if (!aiRating || !estimatedIncome || !analysisResult) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description:
          'Please get your AI Rating and enter your income first.',
      });
      return;
    }
    setIsCalculatingEligibility(true);
    setLoanEligibility(null);
    setIsModelOverloaded(false);
    try {
      const input: LoanEligibilityInput = {
        aiScore: aiRating.aiScore,
        rating: aiRating.rating,
        monthlyIncome: parseFloat(estimatedIncome),
        totalMonthlyEMI: parseFloat(totalEmi || '0'),
        analysisResult: analysisResult,
      };
      const { output, usage } = await getLoanEligibility(input);
      setLoanEligibility(output);
      updateTokenUsage(usage);
      toast({
        title: 'Loan Eligibility Calculated',
        description: 'Your estimated loan eligibility is ready.',
      });
    } catch (error: any) {
      console.error('Error calculating loan eligibility:', error);
      handleOverloadedError(error);
    } finally {
      setIsCalculatingEligibility(false);
    }
  };

  const handleGetFinancialRisk = async () => {
    if (!estimatedIncome || !analysisResult) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please complete the Credit Summary and enter your income first."});
      return;
    }
    setIsAssessingFinancialRisk(true);
    setFinancialRisk(null);
    setIsModelOverloaded(false);
    try {
      const { output, usage } = await getFinancialRiskAssessment({
        estimatedIncome: parseFloat(estimatedIncome),
        analysisResult: analysisResult,
      });
      setFinancialRisk(output);
      updateTokenUsage(usage);
      toast({
        title: 'Financial Risk Assessed',
        description: 'Your overall financial stability analysis is ready.',
      });
    } catch (error: any) {
      console.error('Error assessing financial risk:', error);
      handleOverloadedError(error);
    } finally {
      setIsAssessingFinancialRisk(false);
    }
  };

  const handleGetUnderwriting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysisResult || !aiRating || !estimatedIncome || !loanEligibility || !riskAssessment) {
      toast({
        variant: 'destructive',
        title: 'Missing Prerequisites',
        description: 'Please complete all prior analysis steps and fill all loan fields before underwriting.',
      });
      return;
    }
    setIsUnderwriting(true);
    setUnderwritingResult(null);
    setIsModelOverloaded(false);

    const userComments = activeLoanDetails
        .filter(loan => loan.comment.trim() !== '')
        .map(loan => `${loan.loanType}: ${loan.comment}`)
        .join('\n');

    try {
      const input: CreditUnderwritingInput = {
        analysisResult: analysisResult,
        aiRating: aiRating,
        loanEligibility: loanEligibility,
        riskAssessment: riskAssessment,
        estimatedIncome: parseFloat(estimatedIncome),
        employmentType: employmentType as "Salaried" | "Self-employed" | "Daily Wage Earner",
        loanType: loanType as "Personal Loan" | "Home Loan" | "Auto Loan" | "Loan Against Property",
        desiredLoanAmount: parseFloat(desiredLoanAmount),
        desiredTenure: parseInt(desiredTenure, 10),
        userComments: userComments,
      };

      const { output, usage } = await getCreditUnderwriting(input);
      setUnderwritingResult(output);
      updateTokenUsage(usage);


      // Save the complete analysis as a candidate for model training
      saveTrainingCandidate({
          rawCreditReport: rawText,
          aiRating,
          financialRisk,
          creditUnderwriting: output
      });

      toast({
        title: 'Underwriting Complete',
        description: 'The final AI underwriting decision is ready.',
      });
    } catch (error: any) {
      console.error('Error getting underwriting:', error);
      handleOverloadedError(error);
    } finally {
      setIsUnderwriting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  }

  const { customerDetails, reportSummary } = analysisResult || initialAnalysis;
  
  if (!isClient || !firebaseUser) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Checking authentication...</p>
        </div>
    );
  }

  return (
    <div className="bg-background font-body text-foreground">
      <main className="container mx-auto p-4 md:p-8 printable-area">
          <TooltipProvider>
            <div className="text-center mb-12 no-print">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Credit Analysis</h1>
              <div className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Upload your CIBIL report PDF to unlock instant AI-powered insights, personalized scoring, and actionable advice.</div>
            </div>

            <Card className="mb-8 shadow-lg hover:shadow-xl transition-shadow no-print">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <UploadCloud className="mr-3 h-6 w-6 text-primary" />Upload Your CIBIL Report (PDF)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                    <Button onClick={() => creditFileInputRef.current?.click()}>
                        <UploadCloud className="mr-2" />
                        Choose PDF File
                    </Button>
                    <Input ref={creditFileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                    <span className="text-muted-foreground flex-1 min-w-0 truncate">{creditFileName}</span>
                    {creditFile && (
                        <Button variant="ghost" size="icon" onClick={resetState}>
                            <Trash2 className="h-5 w-5" />
                            <span className="sr-only">Remove file</span>
                        </Button>
                    )}
                </div>
                {creditFile && !isLoading && rawText && (
                  <div className="mt-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Ready to Analyze</AlertTitle>
                      <AlertDescription>
                        Your report has been processed. Use the Analysis Dashboard below to start generating AI insights.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
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

            {isLoading && (
                <Card className="text-center p-8 my-8 no-print">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                    <h3 className="text-xl font-semibold">Processing your report...</h3>
                    <div className="text-muted-foreground">This may take a moment.</div>
                    <Progress value={progress} className="w-full max-w-md mx-auto mt-4" />
                </Card>
            )}

            {rawText && !isLoading && (
                <div className="space-y-8">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-xl">
                        <FileText className="mr-3 h-6 w-6 text-primary" />
                        Credit Score & Consumer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="text-center border-r-0 md:border-r pr-0 md:pr-8">
                            <h3 className="text-sm text-muted-foreground">Official CIBIL Score</h3>
                            <div className="text-8xl font-bold text-primary my-4">
                                {creditScore || 'N/A'}
                            </div>
                        </div>
                        <div>
                           <h3 className="text-sm text-muted-foreground mb-4">AI-Extracted Consumer Information</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between py-1 border-b">
                                    <span className="text-muted-foreground">Name</span>
                                    <span className="font-semibold">{isAnalyzing ? <Loader2 className="animate-spin" /> : customerDetails.name}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b">
                                    <span className="text-muted-foreground">Date of Birth</span>
                                    <span className="font-semibold">{isAnalyzing ? <Loader2 className="animate-spin" /> : customerDetails.dateOfBirth}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b">
                                    <span className="text-muted-foreground">Gender</span>
                                    <span className="font-semibold">{isAnalyzing ? <Loader2 className="animate-spin" /> : customerDetails.gender}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b">
                                    <span className="text-muted-foreground">PAN</span>
                                    <span className="font-semibold">{isAnalyzing ? <Loader2 className="animate-spin" /> : customerDetails.pan}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b">
                                    <span className="text-muted-foreground">Mobile Number</span>
                                    <span className="font-semibold">{isAnalyzing ? <Loader2 className="animate-spin" /> : customerDetails.mobileNumber}</span>
                                </div>
                                 <div className="flex justify-between py-1">
                                    <span className="text-muted-foreground">Address</span>
                                    <span className="font-semibold text-right max-w-[60%] truncate">{isAnalyzing ? <Loader2 className="animate-spin" /> : customerDetails.address}</span>
                                </div>
                            </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center text-xl">
                            <BarChartBig className="mr-3 h-6 w-6 text-primary" />
                            Report Summary
                          </CardTitle>
                          <CardDescription>
                            This summary is generated by an AI analyzing your CIBIL report.
                          </CardDescription>
                      </CardHeader>
                      <CardContent>
                          <div className="mb-6">
                            <h3 className="font-semibold mb-3">Account Summary</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                               <SummaryBox title="Total Accounts" value={reportSummary.accountSummary.total} isLoading={isAnalyzing} />
                               <SummaryBox title="Zero-Balance" value={reportSummary.accountSummary.zeroBalance} isLoading={isAnalyzing} />
                               <SummaryBox title="High Credit/Sanc. Amt" value={reportSummary.accountSummary.highCredit} isLoading={isAnalyzing} />
                               <SummaryBox title="Current Balance" value={reportSummary.accountSummary.currentBalance} isLoading={isAnalyzing} valueClassName={parseCurrency(reportSummary.accountSummary.currentBalance) > 0 ? 'text-destructive' : ''} />
                               <SummaryBox title="Overdue Amount" value={reportSummary.accountSummary.overdue} isLoading={isAnalyzing} valueClassName={parseCurrency(reportSummary.accountSummary.overdue) > 0 ? 'text-destructive' : ''} />
                               <SummaryBox title="Most Recent Account" value={reportSummary.accountSummary.recentDate} isLoading={isAnalyzing} />
                               <SummaryBox title="Oldest Account" value={reportSummary.accountSummary.oldestDate} isLoading={isAnalyzing} />
                            </div>
                          </div>
                           <div>
                            <h3 className="font-semibold mb-3">Enquiry Summary</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                               <SummaryBox title="Total Enquiries" value={reportSummary.enquirySummary.total} isLoading={isAnalyzing} />
                               <SummaryBox title="Last 30 Days" value={reportSummary.enquirySummary.past30Days} isLoading={isAnalyzing} />
                               <SummaryBox title="Last 12 Months" value={reportSummary.enquirySummary.past12Months} isLoading={isAnalyzing} />
                               <SummaryBox title="Most Recent Enquiry" value={reportSummary.enquirySummary.recentDate} isLoading={isAnalyzing} />
                            </div>
                          </div>
                      </CardContent>
                  </Card>
                  
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center text-xl">
                            <LayoutGrid className="mr-3 h-6 w-6 text-primary" />
                            Analysis Dashboard
                          </CardTitle>
                          <CardDescription>
                           Select a section to view its detailed analysis. Some sections require previous steps to be completed.
                          </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <DashboardButton icon={FileSearch} title="Credit Summary" onClick={handleAnalyzeCreditReport} disabled={isAnalyzing || !!analysisResult} />
                            <DashboardButton icon={ShieldAlert} title="AI Risk Assessment" onClick={handleGetRiskAssessment} disabled={isAssessingRisk || !analysisResult} />
                            <DashboardButton icon={Bot} title="AI Credit Meter" onClick={handleGetAiRating} disabled={isRating || !riskAssessment} />
                            <DashboardButton icon={Wallet} title="Financials" />
                            <DashboardButton icon={Banknote} title="Loan Eligibility" onClick={handleGetLoanEligibility} disabled={isCalculatingEligibility || !aiRating || !estimatedIncome} />
                            <DashboardButton icon={ShieldCheck} title="Financial Risk" onClick={handleGetFinancialRisk} disabled={isAssessingFinancialRisk || !analysisResult || !estimatedIncome} />
                            <DashboardButton icon={Gavel} title="Underwriting" onClick={(e) => handleGetUnderwriting(e as any)} disabled={isUnderwriting || !loanEligibility} />
                        </div>
                         {isAnalyzing && (
                            <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                                <Loader2 className="mr-3 h-5 w-5 animate-spin text-primary" />
                                <span>AI is generating the detailed credit summary...</span>
                            </div>
                         )}
                      </CardContent>
                  </Card>

                  {analysisResult && (
                    <Tabs defaultValue="all-accounts" className="w-full">
                        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 no-print">
                            <TabsTrigger value="all-accounts">All Accounts</TabsTrigger>
                            <TabsTrigger value="obligations" disabled={!estimatedIncome}>Financials & Obligations</TabsTrigger>
                            <TabsTrigger value="underwriting" disabled={!loanEligibility}>Final Underwriting</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="all-accounts">
                            {analysisResult.allAccounts && analysisResult.allAccounts.length > 0 ? (
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="flex items-center">
                                      <Pencil className="mr-3 h-5 w-5 text-primary" /> Account Details
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Type</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead>Sanctioned</TableHead>
                                          <TableHead>Outstanding</TableHead>
                                          <TableHead>EMI</TableHead>
                                          <TableHead>Opened</TableHead>
                                          <TableHead>Payment History</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {analysisResult.allAccounts.map((account, index) => (
                                          <TableRow key={index}>
                                            <TableCell className="font-semibold">{account.type}</TableCell>
                                            <TableCell>
                                              <Badge variant={cn(account.status.toLowerCase().includes('open') ? 'default' : account.status.toLowerCase().includes('closed') ? 'secondary' : 'destructive') as any}>
                                                {account.status}
                                              </Badge>
                                            </TableCell>
                                            <TableCell>{account.sanctioned}</TableCell>
                                            <TableCell>{account.outstanding}</TableCell>
                                            <TableCell>{account.emi}</TableCell>
                                            <TableCell>{account.opened}</TableCell>
                                            <TableCell className="text-xs truncate max-w-xs">{account.paymentHistory}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </CardContent>
                                </Card>
                            ) : (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>No Accounts Found</AlertTitle>
                                    <AlertDescription>
                                        The AI analysis was successful, but no credit accounts were found in this report.
                                    </AlertDescription>
                                </Alert>
                              )}
                        </TabsContent>
                    </Tabs>
                  )}


                </div>
            )}

            {rawText && (
              <div className="space-y-8 mt-8 no-print">
                  <Card>
                      <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="item-1">
                              <AccordionTrigger className="p-6">
                                <CardTitle className="flex items-center"><FileSearch className="mr-3 h-6 w-6 text-primary" />Raw Report Text & Cost</CardTitle>
                              </AccordionTrigger>
                              <AccordionContent>
                                  <CardContent className="flex flex-col gap-4">
                                      <div className="flex gap-4">
                                          <Button variant="outline" onClick={() => setShowRawText(!showRawText)}>
                                              {showRawText ? 'Hide Raw Text' : 'Show Raw Text'}
                                          </Button>
                                          <Button variant="outline" onClick={handlePrint}>
                                              <Printer className="mr-2"/>
                                              Print Report
                                          </Button>
                                      </div>
                                      {showRawText && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Raw Text</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <pre className="whitespace-pre-wrap text-xs bg-muted p-4 rounded-lg max-h-96 overflow-auto">{rawText}</pre>
                                            </CardContent>
                                        </Card>
                                      )}
                                      <Card className="bg-muted/50">
                                          <CardHeader>
                                              <CardTitle className="text-lg flex items-center"><Wallet className="mr-3 text-primary"/>Analysis Cost</CardTitle>
                                          </CardHeader>
                                          <CardContent className="grid grid-cols-3 gap-4">
                                              <SummaryBox title="Input Tokens" value={tokenUsage.inputTokens.toLocaleString()} valueClassName="text-foreground" />
                                              <SummaryBox title="Output Tokens" value={tokenUsage.outputTokens.toLocaleString()} valueClassName="text-foreground" />
                                              <SummaryBox title="Estimated Cost (USD)" value={`$${estimatedCost.toFixed(5)}`} valueClassName="text-green-600" />
                                          </CardContent>
                                      </Card>
                                  </CardContent>
                              </AccordionContent>
                          </AccordionItem>
                      </Accordion>
                    </Card>
              </div>
            )}
            
            <AiAgentChat 
              cibilReportText={rawText ? rawText : undefined} 
              bankStatementText={undefined}
              onNewChat={() => setTokenUsage({ inputTokens: 0, outputTokens: 0 })}
              onTokensUsed={updateTokenUsage}
            />
          </TooltipProvider>
      </main>
      <footer className="text-center py-6 text-sm text-muted-foreground no-print">
         <div>© {new Date().getFullYear()} MkCreditWise.com. Built with Firebase and Google AI.</div>
      </footer>
    </div>
  );
}

