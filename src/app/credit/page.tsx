
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  UploadCloud,
  FileText,
  BarChartBig,
  Calculator,
  Sparkles,
  Lightbulb,
  ShieldCheck,
  Trash2,
  Moon,
  Sun,
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
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { saveTrainingCandidate } from '@/lib/training-store';
import { Textarea } from '@/components/ui/textarea';
import type { FlowUsage } from 'genkit/flow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/logo';


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


type ActiveView = 
  | 'aiMeter' 
  | 'aiAnalysis' 
  | 'loanEligibility' 
  | 'obligations'
  | 'creditUnderwriting'
  | 'financialRisk'
  | 'creditSummary'
  | null;

type AnalysisType = 'credit' | 'salary';

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


export default function CreditWiseAIPage() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

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
  const [theme, setTheme] = useState('light');
  
  const [aiRating, setAiRating] = useState<AiRatingOutput | null>(null);
  const [isRating, setIsRating] = useState(false);
  const [loanEligibility, setLoanEligibility] = useState<LoanEligibilityOutput | null>(null);
  const [isCalculatingEligibility, setIsCalculatingEligibility] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>(null);

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

  const { toast } = useToast()
  const creditFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // No-op for login, to make page public
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      const savedTheme = localStorage.getItem('theme') || 'light';
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
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


  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (createError: any) {
          setAuthError(`Sign up failed: ${createError.message}`);
        }
      } else {
        setAuthError(`Sign in failed: ${error.message}`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    resetState();
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };
  
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
    setActiveView(null);
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
          const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
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


  const handleLoanDetailChange = (id: string, field: 'considerForObligation' | 'comment' | 'emi', value: string | number) => {
      setActiveLoanDetails(prevDetails =>
          prevDetails.map(loan =>
              loan.id === id ? { ...loan, [field]: value } : loan
          )
      );
  };

  // Perform calculations on the client-side for accuracy
  const calculatedSummary = useMemo(() => {
    const allAccounts = analysisResult?.allAccounts || [];
    const enquirySummary = analysisResult?.reportSummary.enquirySummary;
    if (allAccounts.length === 0) {
      return {
        totalAccounts: 0,
        totalCreditLimit: 0,
        totalOutstanding: 0,
        activeAccounts: 0,
        closedAccounts: 0,
        writtenOff: 0,
        settled: 0,
        doubtful: 0,
        totalMonthlyEMI: 0,
        maxSingleEMI: 0,
        creditUtilization: "N/A",
        debtToLimitRatio: "N/A",
        dpd: { onTime: 0, late30: 0, late60: 0, late90: 0, late90Plus: 0, default: 0 },
        accountDistribution: [],
        enquiryTrend: [],
      };
    }

    const summary = {
      totalCreditLimit: 0,
      totalOutstanding: 0,
      writtenOff: 0,
      settled: 0,
      doubtful: 0,
      activeAccounts: 0,
      closedAccounts: 0,
      totalMonthlyEMI: 0,
      maxSingleEMI: 0,
      dpd: { onTime: 0, late30: 0, late60: 0, late90: 0, late90Plus: 0, default: 0 },
    };

    let creditCardLimit = 0;
    let creditCardBalance = 0;
    let creditCardPayments = 0;
    const accountDistribution: { [key: string]: number } = {};

    for (const acc of allAccounts) {
      const sanctioned = parseCurrency(acc.sanctioned);
      const outstanding = parseCurrency(acc.outstanding);
      const emi = parseCurrency(acc.emi);
      const status = acc.status.toLowerCase();

      summary.totalCreditLimit += sanctioned;
      summary.totalOutstanding += outstanding;

      const accType = acc.type || 'Other';
      accountDistribution[accType] = (accountDistribution[accType] || 0) + 1;
      
      const isActive = !status.includes('closed') && !status.includes('written-off') && !status.includes('settled') && !status.includes('suit filed');

      if (isActive) {
        summary.activeAccounts++;
        summary.totalMonthlyEMI += emi;
      } else {
        summary.closedAccounts++;
      }
      
      if (emi > summary.maxSingleEMI) {
        summary.maxSingleEMI = emi;
      }

      if (status.includes('written-off')) summary.writtenOff++;
      if (status.includes('settled')) summary.settled++;
      if (status.includes('doubtful')) summary.doubtful++;

      if (acc.type.toLowerCase().includes('credit card')) {
          creditCardLimit += sanctioned;
          creditCardBalance += outstanding;
          creditCardPayments += emi;
      }
      
      // DPD Calculation from payment history string
      if (acc.paymentHistory && acc.paymentHistory !== 'NA') {
        const paymentMonths = acc.paymentHistory.split('|');
        for (const monthStatus of paymentMonths) {
          const status = monthStatus.trim().toUpperCase();
          if (status === 'STD' || status === '000' || status === 'XXX') {
            summary.dpd.onTime++;
          } else if (status === 'SUB') {
            summary.dpd.late90Plus++;
          } else if (status === 'DBT') {
            summary.dpd.default++;
          } else if (status === 'LSS') {
            summary.dpd.default++;
          } else {
            const daysLate = parseInt(status, 10);
            if (!isNaN(daysLate)) {
              if (daysLate > 90) summary.dpd.late90Plus++;
              else if (daysLate >= 61 && daysLate <= 90) summary.dpd.late90++;
              else if (daysLate >= 31 && daysLate <= 60) summary.dpd.late60++;
              else if (daysLate >= 1 && daysLate <= 30) summary.dpd.late30++;
            }
          }
        }
      }
    }
    
    const totalAccounts = allAccounts.length;
    
    let creditUtilization: string;
    if (creditCardLimit === 0) {
        creditUtilization = "N/A";
    } else {
        creditUtilization = `${Math.round((creditCardBalance / creditCardLimit) * 100)}%`;
    }

    let debtToLimitRatio: string;
    if (summary.totalCreditLimit === 0) {
        debtToLimitRatio = "N/A";
    } else {
        debtToLimitRatio = `${Math.round((summary.totalOutstanding / summary.totalCreditLimit) * 100)}%`;
    }
    
    const accountDistributionData = Object.entries(accountDistribution).map(([name, value]) => ({ name, value }));
    const enquiryTrendData = enquirySummary ? [
        { name: 'Last 30 Days', enquiries: parseInt(enquirySummary.past30Days || '0') },
        { name: 'Last 12 Months', enquiries: parseInt(enquirySummary.past12Months || '0') },
        { name: 'Last 24 Months', enquiries: parseInt(enquirySummary.past24Months || '0') },
    ] : [];


    return {
      ...summary,
      totalAccounts,
      creditUtilization,
      debtToLimitRatio,
      creditCardPayments,
      accountDistribution: accountDistributionData,
      enquiryTrend: enquiryTrendData,
    };
  }, [analysisResult]);


  const scoreProgress = creditScore ? (creditScore - 300) / 6 : 0;

  const getRiskColorClass = (level: string = 'Low', type: 'bg' | 'text' | 'border' = 'bg') => {
    const mapping: { [key: string]: { bg: string; text: string; border: string } } = {
        'very low risk': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500' },
        'low': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', border: 'border-green-500' },
        'moderate risk': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', border: 'border-yellow-500' },
        'medium': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', border: 'border-yellow-500' },
        'high': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300', border: 'border-orange-500' },
        'high risk': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300', border: 'border-orange-500' },
        'very high risk': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', border: 'border-red-500' },
    };
    return mapping[level.toLowerCase()]?.[type] || 'bg-muted border-border';
  };
  
  const getRatingColorClass = (rating: string = '') => {
      rating = rating.toLowerCase();
      if (rating.includes('excellent')) return 'text-green-500';
      if (rating.includes('good')) return 'text-emerald-500';
      if (rating.includes('fair')) return 'text-yellow-500';
      if (rating.includes('poor')) return 'text-orange-500';
      if (rating.includes('very poor')) return 'text-red-500';
      return 'text-foreground';
  }

  const getUnderwritingDecisionColor = (decision: string = '') => {
    switch (decision) {
      case 'Approved':
        return 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300';
      case 'Conditionally Approved':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300';
      case 'Requires Manual Review':
        return 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300';
      case 'Declined':
        return 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300';
      default:
        return 'bg-muted border-border';
    }
  };


  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const s = status.toLowerCase();
    if (s.includes('open') || s.includes('active')) return 'default'; // primary color
    if (s.includes('closed')) return 'secondary';
    if (s.includes('written-off') || s.includes('doubtful') || s.includes('loss')) return 'destructive';
    return 'outline';
  };


  const handlePrint = () => {
    window.print();
  }

  const NavButton = ({
    view,
    label,
    icon,
    disabled = false,
    isLoading = false,
    onClick,
    tooltipContent,
  }: {
    view: ActiveView;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
    isLoading?: boolean;
    onClick?: () => void;
    tooltipContent?: React.ReactNode;
  }) => {
      const buttonContent = isLoading ? <Loader2 className="animate-spin" /> : icon;
      
      const button = (
         <Button
            variant={activeView === view ? 'default' : 'outline'}
            onClick={() => {
              if (onClick) onClick();
              setActiveView(activeView === view ? null : view);
            }}
            className="flex flex-col h-24 text-center justify-center items-center gap-2 w-full"
            disabled={disabled || isLoading}
          >
            {buttonContent}
            <span className="text-xs font-normal">{label}</span>
          </Button>
      );
  
      if (disabled && tooltipContent) {
          return (
              <UiTooltip>
                  <TooltipTrigger asChild>
                      <div className="w-full">{button}</div>
                  </TooltipTrigger>
                  <TooltipContent>
                      <p>{tooltipContent}</p>
                  </TooltipContent>
              </UiTooltip>
          );
      }
  
      return button;
  };

  const SummaryItem = ({ label, value, valueClassName, isLoading = false }: { label: string; value: string | number; valueClassName?: string, isLoading?: boolean }) => (
    <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg bg-muted/50">
      <div className="text-sm text-muted-foreground">{label}</div>
      {isLoading ? <Loader2 className="h-5 w-5 mt-1 animate-spin" /> : <div className={cn("text-xl font-bold", valueClassName)}>{value}</div>}
    </div>
  );
  
  const InfoItem = ({ label, value, isLoading = false }: { label: string | React.ReactNode; value: string | number; isLoading?: boolean }) => (
     <div className="grid grid-cols-2 gap-2">
        <div className="font-semibold text-sm text-muted-foreground flex items-center">{label}</div>
        {isLoading ? <Loader2 className="h-4 w-4 mt-1 animate-spin" /> : <div className="font-semibold truncate">{value}</div>}
    </div>
  );

  const DpdSummaryItem = ({ label, value, colorClass }: { label: string; value: number; colorClass: string; }) => (
    <div className={cn("text-center p-3 rounded-lg", colorClass)}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium uppercase">{label}</div>
    </div>
  );
  
  const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  const renderActiveView = () => {
    if (!activeView) return null;

    const views: { [key in NonNullable<ActiveView>]: React.ReactNode } = {
      creditSummary: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl font-bold">
              <LayoutGrid className="mr-3 h-6 w-6 text-primary" />
              AI-Powered Credit Summary
            </CardTitle>
            <CardDescription>
              This is a detailed summary of your credit profile, with calculations performed client-side for accuracy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAnalyzing ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="mr-3 h-8 w-8 animate-spin text-primary" />
                <span className="text-muted-foreground">AI is extracting report data...</span>
              </div>
            ) : analysisResult && analysisResult.allAccounts.length > 0 ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <SummaryItem label="Total Accounts" value={calculatedSummary.totalAccounts} valueClassName="text-foreground" />
                    <SummaryItem label="Total Credit Limit" value={`₹${calculatedSummary.totalCreditLimit.toLocaleString('en-IN')}`} valueClassName="text-foreground" />
                    <SummaryItem label="Total Outstanding" value={`₹${calculatedSummary.totalOutstanding.toLocaleString('en-IN')}`} valueClassName="text-destructive" />
                    <SummaryItem label="Credit Utilization" value={calculatedSummary.creditUtilization} valueClassName="text-foreground" />
                    <SummaryItem label="Debt-to-Limit Ratio" value={calculatedSummary.debtToLimitRatio} valueClassName="text-foreground" />
                    <SummaryItem label="Active Accounts" value={calculatedSummary.activeAccounts} valueClassName="text-green-600" />
                    <SummaryItem label="Closed Accounts" value={calculatedSummary.closedAccounts} valueClassName="text-foreground" />
                    <SummaryItem label="Written Off" value={calculatedSummary.writtenOff} valueClassName="text-destructive" />
                    <SummaryItem label="Settled" value={calculatedSummary.settled} valueClassName="text-orange-500" />
                    <SummaryItem label="Doubtful" value={calculatedSummary.doubtful} valueClassName="text-destructive" />
                    <SummaryItem label="Total Monthly EMI" value={`₹${calculatedSummary.totalMonthlyEMI.toLocaleString('en-IN')}`} valueClassName="text-foreground" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><PieChartIcon className="mr-3 h-5 w-5" />Account Type Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={calculatedSummary.accountDistribution}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              labelLine={false}
                              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                const RADIAN = Math.PI / 180;
                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                return (
                                  <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                    {`${(percent * 100).toFixed(0)}%`}
                                  </text>
                                );
                              }}
                            >
                              {calculatedSummary.accountDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} account(s)`}/>
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                     <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><BarChartIcon className="mr-3 h-5 w-5" />Enquiry Trends</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={calculatedSummary.enquiryTrend}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip formatter={(value) => [`${value} enquiries`, 'Count']}/>
                            <Bar dataKey="enquiries" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {calculatedSummary.dpd && (
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><Clock className="mr-3 h-5 w-5" />DPD Analysis</CardTitle>
                            <CardDescription>Your payment history at a glance.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <DpdSummaryItem label="On Time" value={calculatedSummary.dpd.onTime} colorClass="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" />
                            <DpdSummaryItem label="1-30 Days" value={calculatedSummary.dpd.late30} colorClass="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300" />
                            <DpdSummaryItem label="31-60 Days" value={calculatedSummary.dpd.late60} colorClass="bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300" />
                            <DpdSummaryItem label="61-90 Days" value={calculatedSummary.dpd.late90} colorClass="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" />
                            <DpdSummaryItem label="90+ Days" value={calculatedSummary.dpd.late90Plus} colorClass="bg-red-200 text-red-900 dark:bg-red-800/50 dark:text-red-200" />
                            <DpdSummaryItem label="Default" value={calculatedSummary.dpd.default} colorClass="bg-black text-white dark:bg-red-950 dark:text-red-100" />
                        </CardContent>
                    </Card>
                  )}
                  
                  {analysisResult.allAccounts && analysisResult.allAccounts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Pencil className="mr-3 h-5 w-5" /> Account Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Ownership</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Sanctioned</TableHead>
                              <TableHead>Outstanding</TableHead>
                              <TableHead>Overdue</TableHead>
                              <TableHead>EMI</TableHead>
                              <TableHead>Opened</TableHead>
                              <TableHead>Closed</TableHead>
                              <TableHead>Payment History</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analysisResult.allAccounts.map((account, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-semibold">{account.type}</TableCell>
                                <TableCell>{account.ownership}</TableCell>
                                <TableCell>
                                  <Badge variant={getStatusBadgeVariant(account.status)}>
                                    {account.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{account.sanctioned}</TableCell>
                                <TableCell>{account.outstanding}</TableCell>
                                <TableCell>{account.overdue}</TableCell>
                                <TableCell>{account.emi}</TableCell>
                                <TableCell>{account.opened}</TableCell>
                                <TableCell>{account.closed}</TableCell>
                                <TableCell className="text-xs truncate max-w-xs">{account.paymentHistory}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                </div>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    Click the button above to generate your credit summary.
                </div>
            )}
          </CardContent>
        </Card>
      ),
      aiMeter: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl font-bold"><Bot className="mr-3 h-6 w-6 text-primary" />AI Credit Analysis Meter</CardTitle>
            <CardDescription>This AI acts as a holistic credit advisor. It provides a comprehensive score of your overall credit health by balancing both the positive and negative factors in your report.</CardDescription>
          </CardHeader>
          <CardContent>
            {isRating ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="mr-3 h-8 w-8 animate-spin text-primary" />
                    <span className="text-muted-foreground">AI is generating your credit rating...</span>
                </div>
            ) : aiRating ? (
              <div className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="text-center">
                    <div className={cn("text-7xl font-bold", getRatingColorClass(aiRating.rating))}>
                      {aiRating.aiScore}
                    </div>
                    <div className={cn("text-2xl font-semibold", getRatingColorClass(aiRating.rating))}>
                      {aiRating.rating}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">AI Score / 100</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-muted-foreground">{aiRating.summary}</div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold flex items-center mb-2"><ThumbsUp className="h-5 w-5 mr-2 text-green-500" />Positive Factors</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {aiRating.positiveFactors.map((factor, i) => <li key={i}>{factor}</li>)}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold flex items-center mb-2"><ThumbsDown className="h-5 w-5 mr-2 text-red-500" />Negative Factors</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {aiRating.negativeFactors.map((factor, i) => <li key={i}>{factor}</li>)}
                          </ul>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
                 <div className="text-center py-10 text-muted-foreground">
                    Click the button in the dashboard to generate your AI credit rating.
                </div>
            )}
          </CardContent>
        </Card>
      ),
      loanEligibility: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl font-bold">
              <Banknote className="mr-3 h-6 w-6 text-primary" />
              AI Loan Eligibility
            </CardTitle>
            <CardDescription>
              Estimate your potential loan eligibility and repayment capacity based on your AI rating and financial details.
            </CardDescription>
          </CardHeader>
          <CardContent>
              {isCalculatingEligibility ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="mr-3 h-8 w-8 animate-spin text-primary" />
                    <span className="text-muted-foreground">AI is calculating your loan eligibility...</span>
                </div>
              ) : loanEligibility ? (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold flex items-center gap-2"><Wallet className="h-5 w-5 text-primary"/>Repayment Capacity</h4>
                    <div className="text-sm text-muted-foreground">Remaining amount you can afford for a new EMI per month.</div>
                    <div className="text-3xl font-bold text-primary mt-2">
                        ₹{loanEligibility.repaymentCapacity.toLocaleString('en-IN')}
                    </div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold">Eligible Loan Amount</h4>
                    <div className="text-2xl font-bold text-primary">
                        ₹{loanEligibility.eligibleLoanAmount.toLocaleString('en-IN')}
                    </div>
                    <div className="text-muted-foreground text-sm">
                        at an estimated interest rate of{' '}
                        <strong>{loanEligibility.estimatedInterestRate}</strong>
                    </div>
                    </div>
                    <div className="md:col-span-2">
                    <Alert className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Eligibility Summary</AlertTitle>
                        <AlertDescription>
                        {loanEligibility.eligibilitySummary}
                        </AlertDescription>
                    </Alert>
                    </div>
                    {loanEligibility.suggestionsToIncreaseEligibility.length > 0 && (
                    <div className="md:col-span-2 mt-4">
                      <h4 className="font-semibold text-lg flex items-center mb-2">
                        <Lightbulb className="mr-2 h-5 w-5 text-yellow-400" />
                        How to Increase Your Loan Eligibility
                      </h4>
                      <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                        {loanEligibility.suggestionsToIncreaseEligibility.map((suggestion, i) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                    Click the button in the dashboard to calculate your loan eligibility.
                </div>
              )}
          </CardContent>
        </Card>
      ),
      aiAnalysis: (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center text-xl font-bold"><BrainCircuit className="mr-3 h-6 w-6 text-primary" />AI Risk Assessment</CardTitle>
                <CardDescription>A detailed risk analysis performed by the AI based on your credit report.</CardDescription>
            </CardHeader>
             <CardContent>
                {isAssessingRisk ? (
                   <div className="flex items-center justify-center py-10">
                        <Loader2 className="mr-3 h-8 w-8 animate-spin text-primary" />
                        <span className="text-muted-foreground">AI is assessing your risk profile...</span>
                    </div>
                ): riskAssessment ? (
                  <div className="space-y-6">
                    <div className={cn('p-4 rounded-lg border-l-4 font-semibold text-lg', getRiskColorClass(riskAssessment.level.toLowerCase(), 'bg'), getRiskColorClass(riskAssessment.level.toLowerCase(), 'text'), getRiskColorClass(riskAssessment.level.toLowerCase(), 'border'))}>
                        Overall Risk Level: {riskAssessment.level} (Score: {riskAssessment.score}/100)
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <SummaryItem label="Prob. of Default (PD)" value={`${riskAssessment.probabilityOfDefault}%`} valueClassName="text-destructive" />
                      <SummaryItem label="Loss Given Default (LGD)" value={`${riskAssessment.lossGivenDefault}%`} valueClassName="text-destructive" />
                      <SummaryItem label="Exposure at Default (EAD)" value={`₹${riskAssessment.exposureAtDefault.toLocaleString('en-IN')}`} valueClassName="text-destructive" />
                      <SummaryItem label="Expected Loss (EL)" value={`₹${riskAssessment.expectedLoss.toLocaleString('en-IN')}`} valueClassName="text-destructive font-bold" />
                    </div>

                     <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                        <div>
                            <h5 className="font-bold">Probability of Default Explanation</h5>
                            <div>{riskAssessment.defaultProbabilityExplanation}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Key Risk Factors</h4>
                        <div className="space-y-2">
                           {riskAssessment.factors.map((factor, i) => (
                            <Alert key={i} variant="destructive" className="bg-red-50 dark:bg-red-900/10">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>{factor.factor} <span className="font-normal text-muted-foreground">({factor.severity})</span></AlertTitle>
                              <AlertDescription>{factor.details}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                      <div>
                         <h4 className="font-semibold text-lg mb-2">Suggested Mitigations</h4>
                         <div className="space-y-2">
                          {riskAssessment.mitigations.map((mit, i) => (
                              <div key={i} className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="font-semibold text-sm text-green-800 dark:text-green-300">{mit.factor}</div>
                                <div className="text-sm text-muted-foreground">{mit.action}</div>
                              </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">Click the button in the dashboard to generate your AI risk assessment.</div>
                )}
            </CardContent>
        </Card>
      ),
      creditUnderwriting: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl font-bold"><Gavel className="mr-3 h-6 w-6 text-primary" />AI Credit Underwriting</CardTitle>
            <CardDescription>Get a simulated underwriting decision from our AI. This is the final step.</CardDescription>
          </CardHeader>
          <form onSubmit={handleGetUnderwriting}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <Label htmlFor="employmentType">Employment Type</Label>
                    <Select value={employmentType} onValueChange={setEmploymentType}>
                    <SelectTrigger id="employmentType">
                        <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Salaried">Salaried</SelectItem>
                        <SelectItem value="Self-employed">Self-employed</SelectItem>
                        <SelectItem value="Daily Wage Earner">Daily Wage Earner</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                 <div>
                    <Label htmlFor="loanType">Loan Type</Label>
                    <Select value={loanType} onValueChange={setLoanType}>
                    <SelectTrigger id="loanType">
                        <SelectValue placeholder="Select loan type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Personal Loan">Personal Loan</SelectItem>
                        <SelectItem value="Home Loan">Home Loan</SelectItem>
                        <SelectItem value="Auto Loan">Auto Loan</SelectItem>
                        <SelectItem value="Loan Against Property">Loan Against Property</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="desiredLoanAmount">Desired Loan Amount (₹)</Label>
                    <Input
                    id="desiredLoanAmount"
                    type="number"
                    placeholder="e.g., 500000"
                    value={desiredLoanAmount}
                    onChange={(e) => setDesiredLoanAmount(e.target.value)}
                    required
                    />
                </div>
                <div>
                    <Label htmlFor="desiredTenure">Desired Tenure (Months)</Label>
                    <Input
                    id="desiredTenure"
                    type="number"
                    placeholder="e.g., 60"
                    value={desiredTenure}
                    onChange={(e) => setDesiredTenure(e.target.value)}
                    required
                    />
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Prerequisites</AlertTitle>
                <AlertDescription>
                  Ensure you have already run the "AI Loan Eligibility" and provided your income for an accurate underwriting assessment.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
                <UiTooltip>
                    <TooltipTrigger asChild>
                        <div className="inline-block">
                            <Button type="submit" disabled={isUnderwriting || !aiRating || !estimatedIncome || !loanEligibility || !riskAssessment}>
                                {isUnderwriting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gavel className="mr-2 h-4 w-4" />}
                                Start Final Underwriting
                            </Button>
                        </div>
                    </TooltipTrigger>
                    {(!loanEligibility) && <TooltipContent><p>Please complete AI Loan Eligibility analysis first.</p></TooltipContent>}
                </UiTooltip>
            </CardFooter>
          </form>
          
          {isUnderwriting ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="mr-3 h-8 w-8 animate-spin text-primary" />
                    <span className="text-muted-foreground">AI is running final underwriting...</span>
                </div>
          ) : underwritingResult && (
            <CardContent>
              <div className={cn('p-4 rounded-lg border-l-4 mb-6', getUnderwritingDecisionColor(underwritingResult.underwritingDecision))}>
                <h4 className="font-bold text-lg">Underwriting Decision: {underwritingResult.underwritingDecision}</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <SummaryItem label="Approved Amount" value={`₹${underwritingResult.approvedLoanAmount.toLocaleString('en-IN')}`} />
                  <SummaryItem label="Interest Rate" value={`${underwritingResult.recommendedInterestRate}`} />
                  <SummaryItem label="Tenure (Months)" value={underwritingResult.recommendedTenure} />
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="font-semibold text-lg mb-2">Underwriting Summary</h5>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">{underwritingResult.underwritingSummary}</div>
                </div>
                
                {underwritingResult.conditions.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-lg mb-2">Conditions for Approval</h5>
                    <ul className="list-none space-y-1 text-sm">
                      {underwritingResult.conditions.map((condition, i) => <li key={i}>☐ {condition}</li>)}
                    </ul>
                  </div>
                )}

                <div>
                  <h5 className="font-semibold text-lg mb-2">Required Documents</h5>
                   <ul className="list-none space-y-1 text-sm">
                      {underwritingResult.requiredDocuments.map((doc, i) => <li key={i}>☐ {doc}</li>)}
                    </ul>
                </div>
              </div>

               <div className="mt-8 space-y-6">
                <h4 className="text-xl font-semibold border-b pb-2">Advanced Risk Metrics</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   <div className="flex flex-col items-center text-center p-4 bg-muted rounded-lg">
                     <div className="text-sm text-muted-foreground">Probability of Default (PD)</div>
                     <div className="text-3xl font-bold text-destructive">{underwritingResult.probabilityOfDefault}%</div>
                   </div>
                   <div className="flex flex-col items-center text-center p-4 bg-muted rounded-lg">
                     <div className="text-sm text-muted-foreground">Loss Given Default (LGD)</div>
                     <div className="text-3xl font-bold text-destructive">{underwritingResult.lossGivenDefault}%</div>
                   </div>
                   <div className="flex flex-col items-center text-center p-4 bg-muted rounded-lg">
                     <div className="text-sm text-muted-foreground">Exposure at Default (EAD)</div>
                     <div className="text-3xl font-bold text-destructive">₹{underwritingResult.exposureAtDefault.toLocaleString('en-IN')}</div>
                   </div>
                   <div className="flex flex-col items-center text-center p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                     <div className="text-sm text-red-700 dark:text-red-300">Expected Loss (EL)</div>
                     <div className="text-3xl font-bold text-red-600 dark:text-red-400">₹{underwritingResult.expectedLoss.toLocaleString('en-IN')}</div>
                   </div>
                 </div>
                 <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                    <div>
                        <h5 className="font-bold">Probability of Default (PD) Explanation</h5>
                        <div>{underwritingResult.riskMetricsExplanation.pd}</div>
                    </div>
                    <div>
                        <h5 className="font-bold">Loss Given Default (LGD) Explanation</h5>
                        <div>{underwritingResult.riskMetricsExplanation.lgd}</div>
                    </div>
                    <div>
                        <h5 className="font-bold">Exposure at Default (EAD) Explanation</h5>
                        <div>{underwritingResult.riskMetricsExplanation.ead}</div>
                    </div>
                 </div>
               </div>

                <div className="mt-8">
                    <div className={cn('p-4 rounded-lg border-l-4 font-semibold text-lg', getRiskColorClass(underwritingResult.finalProfileRating.toLowerCase(), 'bg'), getRiskColorClass(underwritingResult.finalProfileRating.toLowerCase(), 'text'), getRiskColorClass(underwritingResult.finalProfileRating.toLowerCase(), 'border'))}>
                        Final Profile Rating: {underwritingResult.finalProfileRating}
                    </div>
                </div>

            </CardContent>
          )}

        </Card>
      ),
      obligations: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl font-bold"><Calculator className="mr-3 h-6 w-6 text-primary" />Financials &amp; Obligations</CardTitle>
            <CardDescription>Provide your financial details to enable more accurate analysis and loan eligibility checks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimatedIncome">Your Estimated Monthly Income (₹)</Label>
                  <Input 
                    id="estimatedIncome" 
                    type="number" 
                    placeholder="e.g., 50000" 
                    value={estimatedIncome} 
                    onChange={(e) => setEstimatedIncome(e.target.value)} 
                  />
                </div>
                <div>
                    <Label htmlFor="other-obligations">Other Monthly Obligations (Rent, etc.)</Label>
                    <Input 
                      id="other-obligations" 
                      type="number" 
                      placeholder="e.g., 15000" 
                      value={otherObligations} 
                      onChange={(e) => setOtherObligations(e.target.value)} 
                    />
                </div>
            </div>

            <div>
              <Label htmlFor="total-emi">Total Monthly Loan EMI</Label>
              <div className="flex items-center gap-2">
                <Input id="total-emi" type="number" placeholder="AI is calculating..." value={totalEmi} onChange={(e) => setTotalEmi(e.target.value)} disabled />
                {isAnalyzing && <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
              <div className="text-xs text-muted-foreground mt-1">This is auto-calculated from your report and your selections below. You can override it.</div>
            </div>
            
            {activeLoanDetails.length > 0 && (
              <div>
                  <h4 className="font-semibold mb-2">Active Loan Details</h4>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Loan Details</TableHead>
                                <TableHead>Amounts</TableHead>
                                <TableHead>Monthly EMI (₹)</TableHead>
                                <TableHead>Include in EMI?</TableHead>
                                <TableHead>Comments</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeLoanDetails.map((loan) => (
                                <TableRow key={loan.id}>
                                    <TableCell>
                                        <div className="font-semibold">{loan.loanType}</div>
                                        <div className="text-xs text-muted-foreground">{loan.ownership}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs">Balance: ₹{loan.currentBalance.toLocaleString('en-IN')}</div>
                                        <div className="text-xs">Sanctioned: ₹{loan.sanctionedAmount.toLocaleString('en-IN')}</div>
                                    </TableCell>
                                    <TableCell>
                                        {loan.emi > 0 ? (
                                            <div className="px-3 py-2 text-sm">{loan.emi.toLocaleString('en-IN')}</div>
                                        ) : (
                                            <Input
                                                type="number"
                                                defaultValue={loan.emi}
                                                onBlur={(e) => handleLoanDetailChange(loan.id, 'emi', parseInt(e.target.value) || 0)}
                                                className="h-8 w-28"
                                                placeholder="Enter EMI"
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={loan.considerForObligation}
                                            onValueChange={(value: 'Yes' | 'No') => handleLoanDetailChange(loan.id, 'considerForObligation', value)}
                                        >
                                            <SelectTrigger className="h-8 w-24">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Yes">Yes</SelectItem>
                                                <SelectItem value="No">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Textarea
                                            placeholder="e.g., Guarantor loan, paid by primary."
                                            value={loan.comment}
                                            onChange={(e) => handleLoanDetailChange(loan.id, 'comment', e.target.value)}
                                            className="h-16 text-xs"
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ),
      financialRisk: (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center text-xl font-bold"><BadgeCent className="mr-3 h-6 w-6 text-primary" />AI Financial Risk Assessment</CardTitle>
                <CardDescription>Get the AI's perspective on your overall financial stability and health.</CardDescription>
            </CardHeader>
            <CardContent>
                {isAssessingFinancialRisk ? (
                   <div className="flex items-center justify-center py-10">
                        <Loader2 className="mr-3 h-8 w-8 animate-spin text-primary" />
                        <span className="text-muted-foreground">AI is assessing financial risk...</span>
                    </div>
                ) : financialRisk && financialRisk.dtiAnalysis ? (
                  <div className="mt-6 space-y-6">
                    <div className={cn('p-4 rounded-lg border-l-4 font-semibold text-lg', getRiskColorClass(financialRisk.financialRiskRating.toLowerCase(), 'bg'), getRiskColorClass(financialRisk.financialRiskRating.toLowerCase(), 'text'), getRiskColorClass(financialRisk.financialRiskRating.toLowerCase(), 'border'))}>
                       Overall Financial Risk: {financialRisk.financialRiskRating}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <h4 className="font-bold">Debt-to-Income (DTI) Analysis ({financialRisk.dtiAnalysis.dtiPercentage}%)</h4>
                            <div dangerouslySetInnerHTML={{ __html: financialRisk.dtiAnalysis.explanation.replace(/\n/g, '<br/>') }}></div>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <h4 className="font-bold">Debt Composition ({financialRisk.debtComposition.unsecuredDebtPercentage}% Unsecured)</h4>
                            <div dangerouslySetInnerHTML={{ __html: financialRisk.debtComposition.explanation.replace(/\n/g, '<br/>') }}></div>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                             <h4 className="font-bold">Credit Utilization ({financialRisk.creditUtilizationAnalysis.overallUtilization}%)</h4>
                            <div dangerouslySetInnerHTML={{ __html: financialRisk.creditUtilizationAnalysis.explanation.replace(/\n/g, '<br/>') }}></div>
                        </div>
                    </div>

                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Overall Financial Outlook</AlertTitle>
                        <AlertDescription>
                          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: financialRisk.overallOutlook.replace(/\n/g, '<br/>') }}></div>
                        </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        Click the button in the dashboard to assess your financial risk.
                    </div>
                )}

            </CardContent>
         </Card>
      ),
    };
    return views[activeView!] as React.ReactNode;
  };
  
  const { customerDetails, reportSummary } = analysisResult || initialAnalysis;

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
                className="transition-colors hover:text-foreground/80 text-foreground"
              >
                Credit Analysis
              </Link>
               <Link
                href="/verify"
                className="transition-colors hover:text-foreground/80 text-muted-foreground"
              >
                VerityPDF
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

      <main className="container mx-auto p-4 md:p-8 print:p-0">
          <TooltipProvider>
            <div className="text-center mb-12 print:hidden">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Advanced AI Credit Score Analyzer</h1>
              <div className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Upload your CIBIL report PDF to unlock instant AI-powered insights, personalized scoring, and actionable advice.</div>
            </div>

            <Card className="mb-8 shadow-lg hover:shadow-xl transition-shadow print:hidden">
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
                <Card className="text-center p-8 my-8 print:hidden">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                    <h3 className="text-xl font-semibold">Processing your report...</h3>
                    <div className="text-muted-foreground">This may take a moment.</div>
                    <Progress value={progress} className="w-full max-w-md mx-auto mt-4" />
                </Card>
            )}

            {underwritingResult && (
              <Card className="mb-8 border-2" style={{ borderColor: 'hsl(var(--primary))' }}>
                  <CardHeader>
                      <CardTitle className="text-2xl flex items-center justify-between">
                          <span>Final Profile Summary</span>
                          <div className={cn('px-4 py-1.5 rounded-full text-base font-semibold flex items-center gap-2 border', getRiskColorClass(underwritingResult.finalProfileRating.toLowerCase(), 'bg'), getRiskColorClass(underwritingResult.finalProfileRating.toLowerCase(), 'text'), getRiskColorClass(underwritingResult.finalProfileRating.toLowerCase(), 'border'))}>
                                {underwritingResult.finalProfileRating === 'Very Low Risk' || underwritingResult.finalProfileRating === 'Low Risk' ? <CheckCircle /> : <ShieldAlert />}
                                {underwritingResult.finalProfileRating}
                          </div>
                      </CardTitle>
                      <CardDescription>This card provides a consolidated view of the entire analysis.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
                          <InfoItem label={<div className="flex items-center gap-1"><UserIcon size={14}/> Name</div>} value={customerDetails.name} isLoading={isAnalyzing}/>
                          <InfoItem label={<div className="flex items-center gap-1"><FileText size={14}/> PAN</div>} value={customerDetails.pan} isLoading={isAnalyzing}/>
                          <div className={cn("col-span-2 font-semibold text-lg p-2 rounded-md text-center", getUnderwritingDecisionColor(underwritingResult.underwritingDecision))}>
                                Decision: {underwritingResult.underwritingDecision}
                          </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          <SummaryItem label="CIBIL Score" value={creditScore || 'N/A'} valueClassName="text-primary" />
                          <SummaryItem label="AI Credit Score" value={aiRating?.aiScore || 'N/A'} valueClassName={getRatingColorClass(aiRating?.rating || '')} />
                          <SummaryItem label="Risk Score" value={riskAssessment?.score || 'N/A'} valueClassName={riskAssessment ? getRiskColorClass(riskAssessment.level.toLowerCase(), 'text') : ''} isLoading={isAssessingRisk} />
                          <SummaryItem label="Approved Amount" value={`₹${underwritingResult.approvedLoanAmount.toLocaleString('en-IN')}`} />
                          <SummaryItem label="Interest Rate" value={`${underwritingResult.recommendedInterestRate}`} />
                          <SummaryItem label="Tenure" value={`${underwritingResult.recommendedTenure} months`} />
                          <SummaryItem label="PD" value={`${underwritingResult.probabilityOfDefault}%`} valueClassName="text-destructive" />
                          <SummaryItem label="LGD" value={`${underwritingResult.lossGivenDefault}%`} valueClassName="text-destructive" />
                          <SummaryItem label="EAD" value={`₹${underwritingResult.exposureAtDefault.toLocaleString('en-IN')}`} valueClassName="text-destructive" />
                          <SummaryItem label="Expected Loss" value={`₹${underwritingResult.expectedLoss.toLocaleString('en-IN')}`} valueClassName="text-destructive" />
                      </div>
                  </CardContent>
              </Card>
            )}
            
            {rawText && !isLoading && (
                <div className="space-y-8">
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center text-2xl font-bold"><FileText className="mr-3 h-6 w-6 text-primary" />Credit Score &amp; Consumer Information</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                          <div className="text-center">
                              <div className="text-muted-foreground">Official CIBIL Score</div>
                              <div className="text-7xl font-bold text-primary">{creditScore || 'N/A'}</div>
                              {creditScore && <Progress value={scoreProgress} className="mt-4" />}
                          </div>
                          <div className="space-y-2">
                              <h4 className="font-semibold mb-4 border-b pb-2 text-lg">AI-Extracted Consumer Information</h4>
                              <InfoItem label="Name" value={customerDetails.name} isLoading={isAnalyzing}/>
                              <InfoItem label="Date of Birth" value={customerDetails.dateOfBirth} isLoading={isAnalyzing}/>
                              <InfoItem label="Gender" value={customerDetails.gender} isLoading={isAnalyzing}/>
                              <InfoItem label="PAN" value={customerDetails.pan} isLoading={isAnalyzing}/>
                              <InfoItem label="Mobile Number" value={customerDetails.mobileNumber} isLoading={isAnalyzing}/>
                              <InfoItem label="Address" value={customerDetails.address} isLoading={isAnalyzing}/>
                          </div>
                      </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center text-2xl font-bold"><BarChartBig className="mr-3 h-6 w-6 text-primary" />Report Summary</CardTitle>
                        <CardDescription>This summary is generated by an AI analyzing your CIBIL report.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold text-lg mb-2 border-b pb-1">Account Summary</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <SummaryItem isLoading={isAnalyzing} label="Total Accounts" value={reportSummary.accountSummary.total} valueClassName="text-foreground" />
                                <SummaryItem isLoading={isAnalyzing} label="Zero-Balance" value={reportSummary.accountSummary.zeroBalance} valueClassName="text-foreground" />
                                <SummaryItem isLoading={isAnalyzing} label="High Credit/Sanc. Amt" value={reportSummary.accountSummary.highCredit} valueClassName="text-foreground" />
                                <SummaryItem isLoading={isAnalyzing} label="Current Balance" value={reportSummary.accountSummary.currentBalance} valueClassName="text-destructive" />
                                <SummaryItem isLoading={isAnalyzing} label="Overdue Amount" value={reportSummary.accountSummary.overdue} valueClassName="text-destructive" />
                                <SummaryItem isLoading={isAnalyzing} label="Most Recent Account" value={reportSummary.accountSummary.recentDate} valueClassName="text-foreground" />
                                <SummaryItem isLoading={isAnalyzing} label="Oldest Account" value={reportSummary.accountSummary.oldestDate} valueClassName="text-foreground" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg mb-2 border-b pb-1">Enquiry Summary</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <SummaryItem isLoading={isAnalyzing} label="Total Enquiries" value={reportSummary.enquirySummary.total} valueClassName="text-foreground" />
                                <SummaryItem isLoading={isAnalyzing} label="Last 30 Days" value={reportSummary.enquirySummary.past30Days} valueClassName="text-foreground" />
                                <SummaryItem isLoading={isAnalyzing} label="Last 12 Months" value={reportSummary.enquirySummary.past12Months} valueClassName="text-foreground" />
                                <SummaryItem isLoading={isAnalyzing} label="Last 24 Months" value={reportSummary.enquirySummary.past24Months} valueClassName="text-foreground" />
                                <SummaryItem isLoading={isAnalyzing} label="Most Recent Enquiry" value={reportSummary.enquirySummary.recentDate} valueClassName="text-foreground" />
                            </div>
                        </div>
                    </CardContent>
                  </Card>


                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold">Analysis Dashboard</CardTitle>
                      <CardDescription>Select a section to view its detailed analysis. Some sections require previous steps to be completed.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                      <NavButton view="creditSummary" label="Credit Summary" icon={<LayoutGrid size={24} />} onClick={handleAnalyzeCreditReport} isLoading={isAnalyzing} disabled={!rawText} tooltipContent="Upload a CIBIL report first." />
                      <NavButton view="aiAnalysis" label="AI Risk Assessment" icon={<BrainCircuit size={24} />} onClick={handleGetRiskAssessment} isLoading={isAssessingRisk} disabled={!analysisResult} tooltipContent="Please run the Credit Summary first." />
                      <NavButton view="aiMeter" label="AI Credit Meter" icon={<Bot size={24} />} onClick={handleGetAiRating} isLoading={isRating} disabled={!riskAssessment} tooltipContent="Please complete the AI Risk Assessment first."/>
                      <NavButton view="obligations" label="Financials" icon={<Calculator size={24} />} disabled={!rawText} tooltipContent="Please upload and parse a CIBIL report first." />
                      <NavButton view="loanEligibility" label="Loan Eligibility" icon={<Banknote size={24} />} onClick={handleGetLoanEligibility} isLoading={isCalculatingEligibility} disabled={!aiRating || !estimatedIncome} tooltipContent="Please complete AI Credit Meter and enter income first."/>
                      <NavButton view="financialRisk" label="Financial Risk" icon={<BadgeCent size={24} />} onClick={handleGetFinancialRisk} isLoading={isAssessingFinancialRisk} disabled={!analysisResult || !estimatedIncome} tooltipContent="Please run Credit Summary and enter your income first."/>
                      <NavButton view="creditUnderwriting" label="Underwriting" icon={<Gavel size={24} />} isLoading={isUnderwriting} disabled={!loanEligibility} tooltipContent="Please complete AI Loan Eligibility analysis first." />
                    </CardContent>
                  </Card>
                  
                  {activeView && (
                    <div className="my-8">
                      {renderActiveView()}
                    </div>
                  )}
                </div>
            )}

            {rawText && (
              <div className="space-y-8 mt-8">
                  <Card className="print:hidden mt-8">
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
                                              <SummaryItem label="Input Tokens" value={tokenUsage.inputTokens.toLocaleString()} valueClassName="text-foreground" />
                                              <SummaryItem label="Output Tokens" value={tokenUsage.outputTokens.toLocaleString()} valueClassName="text-foreground" />
                                              <SummaryItem label="Estimated Cost (USD)" value={`$${estimatedCost.toFixed(5)}`} valueClassName="text-green-600" />
                                          </CardContent>
                                      </Card>
                                  </CardContent>
                              </AccordionContent>
                          </AccordionItem>
                      </Accordion>
                    </Card>

                  <div className="print-this">
                    <div className="p-8 bg-white shadow-lg a4-paper">
                        <h2 className="text-2xl font-bold mb-4 border-b pb-2 text-black">Raw Document Text</h2>
                        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">{rawText}</pre>
                    </div>
                  </div>
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
      <footer className="text-center py-6 text-sm text-muted-foreground print:hidden">
         <div>© {new Date().getFullYear()} MkCreditWise.com. Built with Firebase and Google AI.</div>
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
