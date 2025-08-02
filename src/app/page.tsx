
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
  FileSymlink,
  LineChart,
  CalendarDays,
  ShieldAlert,
  Flag,
  Search,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Banknote,
  Printer,
  LogIn,
  AreaChart,
  Gavel,
  BadgeCent,
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  Coins,
  LayoutGrid,
  Pencil,
  PlayCircle,
  Landmark,
  ArrowLeft,
  ChevronsUpDown,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useToast } from "@/hooks/use-toast"
import { analyzeCreditReport, AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { getAiRating, AiRatingOutput } from '@/ai/flows/ai-rating';
import { getLoanEligibility, LoanEligibilityOutput } from '@/ai/flows/loan-eligibility';
import { getFinancialRiskAssessment, FinancialRiskOutput } from '@/ai/flows/financial-risk-assessment';
import { getCreditUnderwriting, CreditUnderwritingOutput, CreditUnderwritingInput } from '@/ai/flows/credit-underwriting';
import { calculateTotalEmi, CalculateTotalEmiOutput } from '@/ai/flows/calculate-total-emi';
import { analyzeBankStatement, BankStatementAnalysisOutput } from '@/ai/flows/bank-statement-analysis';
import { ShanAIChat } from '@/components/CreditChat';
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
  TableCaption,
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
};


type ActiveView = 
  | 'aiMeter' 
  | 'aiAnalysis' 
  | 'loanEligibility' 
  | 'incomeEstimator'
  | 'creditUnderwriting'
  | 'financialRisk'
  | 'creditSummary'
  | null;

type AnalysisMode = null | 'credit' | 'bank';

type ActiveLoanDetail = CalculateTotalEmiOutput['activeLoans'][0] & {
    id: string; // Add a unique ID for React keys
    considerForObligation: 'Yes' | 'No';
    comment: string;
};

// Pricing for gemini-pro model per 1M tokens
const INPUT_PRICE_PER_MILLION_TOKENS = 0.5; 
const OUTPUT_PRICE_PER_MILLION_TOKENS = 1.5; 

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

  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('No file chosen');
  const [rawText, setRawText] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [creditScore, setCreditScore] = useState<number | null>(null);

  const [analysisResult, setAnalysisResult] = useState<AnalyzeCreditReportOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // New state for Bank Analysis
  const [bankAnalysisResult, setBankAnalysisResult] = useState<BankStatementAnalysisOutput | null>(null);
  const [isAnalyzingBank, setIsAnalyzingBank] = useState(false);

  const [totalEmi, setTotalEmi] = useState('');
  const [activeLoanDetails, setActiveLoanDetails] = useState<ActiveLoanDetail[]>([]);
  const [isCalculatingEmi, setIsCalculatingEmi] = useState(false);
  const [otherObligations, setOtherObligations] = useState('');
  const [estimatedIncome, setEstimatedIncome] = useState<string>('');
  const [theme, setTheme] = useState('light');
  
  const [aiRating, setAiRating] = useState<AiRatingOutput | null>(null);
  const [isRating, setIsRating] = useState(false);
  const [loanEligibility, setLoanEligibility] = useState<LoanEligibilityOutput | null>(null);
  const [isCalculatingEligibility, setIsCalculatingEligibility] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>(null);

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

  // New state for token tracking and cost
  const [tokenUsage, setTokenUsage] = useState({ inputTokens: 0, outputTokens: 0 });
  const [estimatedCost, setEstimatedCost] = useState(0);


  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
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
      if (error.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (createError: any) {
          setAuthError(createError.message);
        }
      } else {
        setAuthError(error.message);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setAnalysisMode(null);
    resetState();
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      resetState();
      setFile(selectedFile);
      setFileName(selectedFile.name);
      processFile(selectedFile);
    }
  };
  
  const resetState = () => {
    setFile(null);
    setFileName('No file chosen');
    setRawText('');
    setIsLoading(false);
    setProgress(0);
    setCreditScore(null);
    
    setAnalysisResult(null);
    setIsAnalyzing(false);
    
    setBankAnalysisResult(null);
    setIsAnalyzingBank(false);

    setTotalEmi('');
    setActiveLoanDetails([]);
    setIsCalculatingEmi(false);
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
    setTokenUsage({ inputTokens: 0, outputTokens: 0 });
    setEstimatedCost(0);

    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const updateTokenUsage = useCallback((usage?: FlowUsage) => {
    if (!usage) return;
    setTokenUsage(prev => ({
      inputTokens: prev.inputTokens + (usage.inputTokens || 0),
      outputTokens: prev.outputTokens + (usage.outputTokens || 0)
    }));
  }, []);


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
          
          if (analysisMode === 'credit') {
            const normalizedText = textContent.replace(/\s+/g, ' ').trim();
            const scoreMatch = normalizedText.match(/(?:CIBIL (?:TRANSUNION )?SCORE|CREDITVISION. SCORE)\s*(\d{3})/i);
            setCreditScore(scoreMatch ? parseInt(scoreMatch[1], 10) : null);
          }
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
  
  const handleStartFullAnalysis = () => {
    handleAnalyze(rawText);
    handleCalculateTotalEmi(rawText);
  };
  
  const handleStartBankAnalysis = () => {
    handleAnalyzeBankStatement(rawText);
  };


  const handleAnalyze = async (text: string) => {
    if (!text) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const { output, usage } = await analyzeCreditReport({ creditReportText: text });
      setAnalysisResult(output);
      updateTokenUsage(usage);
      toast({
        title: "AI Analysis Complete",
        description: "Your credit report has been analyzed.",
      })
    } catch (error: any) {
      console.error('Error analyzing report:', error);
       toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message?.includes('429') ? "You've exceeded the daily limit for the AI. Please try again tomorrow." : (error.message || "Could not get AI analysis. Please try again."),
      })
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleAnalyzeBankStatement = async (text: string) => {
    if (!text) return;
    setIsAnalyzingBank(true);
    setBankAnalysisResult(null);
    try {
      const { output, usage } = await analyzeBankStatement({ statementText: text });
      setBankAnalysisResult(output);
      updateTokenUsage(usage);
      toast({
        title: "Bank Statement Analysis Complete",
        description: "Your bank statement has been analyzed.",
      })
    } catch (error: any) {
      console.error('Error analyzing bank statement:', error);
       toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message?.includes('429') ? "You've exceeded the daily limit for the AI. Please try again tomorrow." : (error.message || "Could not get AI analysis. Please try again."),
      })
    } finally {
      setIsAnalyzingBank(false);
    }
  };


  const handleCalculateTotalEmi = async (text: string) => {
    if (!text) return;
    setIsCalculatingEmi(true);
    setActiveLoanDetails([]);
    try {
      const { output, usage } = await calculateTotalEmi({ creditReportText: text });
      updateTokenUsage(usage);
      
      const enhancedLoanDetails = output.activeLoans.map((loan, index) => ({
        ...loan,
        id: `loan-${index}-${Date.now()}`, // Simple unique ID
        considerForObligation: 'Yes' as 'Yes' | 'No',
        comment: '',
      }));
      
      setActiveLoanDetails(enhancedLoanDetails);
      // The total EMI will be calculated by the useEffect hook
    } catch (error: any) {
      console.error('Error calculating total EMI:', error);
      toast({
        variant: "destructive",
        title: "AI EMI Calculation Failed",
        description: error.message?.includes('429') ? "You've exceeded the daily limit for the AI. Please try again tomorrow." : (error.message || "Could not calculate total EMI. Please try again."),
      })
    } finally {
      setIsCalculatingEmi(false);
    }
  };
  
  const handleGetAiRating = async () => {
    if (!rawText || !analysisResult) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please ensure the report is parsed and the initial risk assessment is complete.",
      });
      return;
    }
    setIsRating(true);
    setAiRating(null);
    
    // We create a temporary risk assessment object here for the ai-rating flow.
    // In a future step, we might want a dedicated risk model.
    const riskAssessmentForRating = {
        score: 75, // Placeholder, as this should come from a dedicated risk model
        level: "Medium",
        factors: [],
        mitigations: [],
        probabilityOfDefault: 0,
        defaultProbabilityExplanation: '',
        exposureAtDefault: 0,
        lossGivenDefault: 0,
        expectedLoss: 0,
    };


    try {
      const { output, usage } = await getAiRating({
        creditReportText: rawText,
        riskAssessment: riskAssessmentForRating,
      });
      setAiRating(output);
      updateTokenUsage(usage);
       toast({
        title: "AI Rating Complete",
        description: "Your comprehensive AI credit rating is ready.",
      })
    } catch (error: any) {
      console.error('Error getting AI rating:', error);
       toast({
        variant: "destructive",
        title: "AI Rating Failed",
        description: error.message?.includes('429') ? "You've exceeded the daily limit for the AI. Please try again tomorrow." : (error.message || "Could not get AI rating. Please try again."),
      })
    } finally {
      setIsRating(false);
    }
  }

  const handleGetLoanEligibility = async () => {
    if (!aiRating || !estimatedIncome) {
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
    try {
      const { output, usage } = await getLoanEligibility({
        aiScore: aiRating.aiScore,
        rating: aiRating.rating,
        monthlyIncome: parseFloat(estimatedIncome),
        totalMonthlyEMI: parseFloat(totalEmi || '0'),
        creditReportText: rawText,
      });
      setLoanEligibility(output);
      updateTokenUsage(usage);
      toast({
        title: 'Loan Eligibility Calculated',
        description: 'Your estimated loan eligibility is ready.',
      });
    } catch (error: any) {
      console.error('Error calculating loan eligibility:', error);
      toast({
        variant: 'destructive',
        title: 'Eligibility Calculation Failed',
        description:
          error.message?.includes('429')
            ? "You've exceeded the daily limit for the AI. Please try again tomorrow."
            : error.message || 'Could not calculate loan eligibility. Please try again.',
      });
    } finally {
      setIsCalculatingEligibility(false);
    }
  };

  const handleGetFinancialRisk = async () => {
    if (!estimatedIncome) {
      toast({ variant: "destructive", title: "Enter Income First", description: "Please enter your income before getting advice."});
      return;
    }
    setIsAssessingFinancialRisk(true);
    setFinancialRisk(null);
    try {
      const { output, usage } = await getFinancialRiskAssessment({
        estimatedIncome: parseFloat(estimatedIncome),
        creditReportText: rawText,
      });
      setFinancialRisk(output);
      updateTokenUsage(usage);
      toast({
        title: 'Financial Risk Assessed',
        description: 'Your overall financial stability analysis is ready.',
      });
    } catch (error: any) {
      console.error('Error assessing financial risk:', error);
      toast({
        variant: 'destructive',
        title: 'Financial Risk Assessment Failed',
        description:
          error.message?.includes('429')
            ? "You've exceeded the daily limit for the AI. Please try again tomorrow."
            : error.message || 'Could not assess financial risk. Please try again.',
      });
    } finally {
      setIsAssessingFinancialRisk(false);
    }
  };
  

  const handleGetUnderwriting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiRating || !estimatedIncome || !loanEligibility || !desiredLoanAmount || !desiredTenure) {
      toast({
        variant: 'destructive',
        title: 'Missing Prerequisites',
        description: 'Please complete AI Rating, Income Estimation, Loan Eligibility, and fill all loan fields before underwriting.',
      });
      return;
    }
    setIsUnderwriting(true);
    setUnderwritingResult(null);

    const userComments = activeLoanDetails
        .filter(loan => loan.comment.trim() !== '')
        .map(loan => `${loan.loanType}: ${loan.comment}`)
        .join('\n');

    try {
      const input: CreditUnderwritingInput = {
        creditReportText: rawText,
        aiRating: aiRating,
        loanEligibility: loanEligibility,
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
      toast({
        variant: 'destructive',
        title: 'Underwriting Failed',
        description:
          error.message?.includes('429')
            ? "You've exceeded the daily limit for the AI. Please try again tomorrow."
            : error.message || 'Could not get underwriting analysis. Please try again.',
      });
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
      };
    }

    const summary = {
      totalCreditLimit: 0,
      totalOutstanding: 0,
      writtenOff: 0,
      settled: 0,
      doubtful: 0,
      closedAccounts: 0,
      totalMonthlyEMI: 0,
      maxSingleEMI: 0,
      dpd: { onTime: 0, late30: 0, late60: 0, late90: 0, late90Plus: 0, default: 0 },
    };

    let creditCardLimit = 0;
    let creditCardBalance = 0;
    let creditCardPayments = 0;

    for (const acc of allAccounts) {
      const sanctioned = parseCurrency(acc.sanctioned);
      const outstanding = parseCurrency(acc.outstanding);
      const emi = parseCurrency(acc.emi);
      const status = acc.status.toLowerCase();

      summary.totalCreditLimit += sanctioned;
      summary.totalOutstanding += outstanding;
      
      const isActive = !status.includes('closed') && !status.includes('written-off') && !status.includes('settled');

      if (isActive) {
        summary.totalMonthlyEMI += emi;
      }
      
      if (emi > summary.maxSingleEMI) {
        summary.maxSingleEMI = emi;
      }

      if (status.includes('written-off')) summary.writtenOff++;
      if (status.includes('settled')) summary.settled++;
      if (status.includes('doubtful')) summary.doubtful++;
      if (status.includes('closed')) summary.closedAccounts++;

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
              if (daysLate >= 1 && daysLate <= 30) summary.dpd.late30++;
              else if (daysLate >= 31 && daysLate <= 60) summary.dpd.late60++;
              else if (daysLate >= 61 && daysLate <= 90) summary.dpd.late90++;
              else if (daysLate > 90) summary.dpd.late90Plus++;
            }
          }
        }
      }
    }
    
    const totalAccounts = allAccounts.length;
    const activeAccounts = totalAccounts - summary.closedAccounts - summary.writtenOff - summary.settled;
    
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

    return {
      ...summary,
      totalAccounts,
      activeAccounts,
      creditUtilization,
      debtToLimitRatio,
      creditCardPayments,
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

  const handlePrint = () => {
    window.print();
  }

  const NavButton = ({
    view,
    label,
    icon,
    disabled = false,
    onClick,
  }: {
    view: ActiveView;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <Button
      variant={activeView === view ? 'default' : 'outline'}
      onClick={() => {
        if (onClick) onClick();
        setActiveView(activeView === view ? null : view);
      }}
      className="flex flex-col h-24 text-center justify-center items-center gap-2"
      disabled={disabled}
    >
      {icon}
      <span className="text-xs font-normal">{label}</span>
    </Button>
  );

  const SummaryItem = ({ label, value, valueClassName, isLoading = false }: { label: string; value: string | number; valueClassName?: string, isLoading?: boolean }) => (
    <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg bg-muted/50">
      <p className="text-sm text-muted-foreground">{label}</p>
      {isLoading ? <Loader2 className="h-5 w-5 mt-1 animate-spin" /> : <p className={cn("text-xl font-bold text-primary", valueClassName)}>{value}</p>}
    </div>
  );
  
  const InfoItem = ({ label, value, isLoading = false }: { label: string; value: string | number; isLoading?: boolean }) => (
     <div>
        <p className="font-semibold text-sm text-muted-foreground">{label}:</p>
        {isLoading ? <Loader2 className="h-4 w-4 mt-1 animate-spin" /> : <p className="font-semibold truncate">{value}</p>}
    </div>
  );

  const DpdSummaryItem = ({ label, value, colorClass }: { label: string; value: number; colorClass: string; }) => (
    <div className={cn("text-center p-3 rounded-lg", colorClass)}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium uppercase">{label}</p>
    </div>
  );

  const renderActiveView = () => {
    if (!activeView) return null;

    const views: { [key in NonNullable<ActiveView>]: React.ReactNode } = {
       creditSummary: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
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
            ) : analysisResult && analysisResult.allAccounts.length > 0 && (
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
                                <TableCell>{account.status}</TableCell>
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
            )}
          </CardContent>
        </Card>
      ),
      aiMeter: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Bot className="mr-3 h-6 w-6 text-primary" />AI Credit Analysis Meter</CardTitle>
            <CardDescription>This AI acts as a holistic credit advisor. It provides a comprehensive score of your overall credit health by balancing both the positive and negative factors in your report.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGetAiRating} disabled={isRating || !analysisResult}>
              {isRating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Get AI Rating
            </Button>
            
            {aiRating && (
              <div className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="text-center">
                    <div className={cn("text-7xl font-bold", getRatingColorClass(aiRating.rating))}>
                      {aiRating.aiScore}
                    </div>
                    <div className={cn("text-2xl font-semibold", getRatingColorClass(aiRating.rating))}>
                      {aiRating.rating}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">AI Score / 100</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">{aiRating.summary}</p>
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
            )}
          </CardContent>
        </Card>
      ),
      loanEligibility: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Banknote className="mr-3 h-6 w-6 text-primary" />
              AI Loan Eligibility
            </CardTitle>
            <CardDescription>
              Estimate your potential loan eligibility and repayment capacity based on your AI rating and financial details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <UiTooltip>
                <TooltipTrigger asChild>
                  <div className="inline-block">
                      <Button
                        onClick={handleGetLoanEligibility}
                        disabled={isCalculatingEligibility || !aiRating || !estimatedIncome}
                      >
                        {isCalculatingEligibility ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Calculate Loan Eligibility
                      </Button>
                  </div>
                </TooltipTrigger>
                {(!aiRating || !estimatedIncome) && (
                  <TooltipContent>
                    <p>Please get your AI Rating and enter your income first.</p>
                  </TooltipContent>
                )}
              </UiTooltip>
            </TooltipProvider>

            {loanEligibility && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold flex items-center gap-2"><Wallet className="h-5 w-5 text-primary"/>Repayment Capacity</h4>
                    <p className="text-sm text-muted-foreground">Remaining amount you can afford for a new EMI per month.</p>
                    <p className="text-3xl font-bold text-primary mt-2">
                        ₹{loanEligibility.repaymentCapacity.toLocaleString('en-IN')}
                    </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold">Eligible Loan Amount</h4>
                    <p className="text-2xl font-bold text-primary">
                        ₹{loanEligibility.eligibleLoanAmount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-muted-foreground text-sm">
                        at an estimated interest rate of{' '}
                        <strong>{loanEligibility.estimatedInterestRate}</strong>
                    </p>
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
            )}
          </CardContent>
        </Card>
      ),
      aiAnalysis: (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><BrainCircuit className="mr-3 h-6 w-6 text-primary" />AI Credit Report Analysis</CardTitle>
                <CardDescription>An AI-generated breakdown of your credit strengths and weaknesses.</CardDescription>
            </CardHeader>
             <CardContent>
                <p>This feature is currently under development. The full analysis will be re-integrated in a future step.</p>
            </CardContent>
        </Card>
      ),
      creditUnderwriting: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Gavel className="mr-3 h-6 w-6 text-primary" />AI Credit Underwriting</CardTitle>
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
               <Button type="submit" disabled={isUnderwriting || !aiRating || !estimatedIncome || !loanEligibility}>
                {isUnderwriting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gavel className="mr-2 h-4 w-4" />}
                Start Final Underwriting
              </Button>
            </CardFooter>
          </form>
          
          {underwritingResult && (
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
                  <p className="text-sm text-foreground/80 whitespace-pre-line">{underwritingResult.underwritingSummary}</p>
                </div>
                
                {underwritingResult.conditions.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-lg mb-2">Conditions for Approval</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {underwritingResult.conditions.map((condition, i) => <li key={i}>{condition}</li>)}
                    </ul>
                  </div>
                )}

                <div>
                  <h5 className="font-semibold text-lg mb-2">Required Documents</h5>
                   <ul className="list-disc list-inside space-y-1 text-sm">
                      {underwritingResult.requiredDocuments.map((doc, i) => <li key={i}>{doc}</li>)}
                    </ul>
                </div>
              </div>

               <div className="mt-8 space-y-6">
                <h4 className="text-xl font-semibold border-b pb-2">Advanced Risk Metrics</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   <div className="flex flex-col items-center text-center p-4 bg-muted rounded-lg">
                     <p className="text-sm text-muted-foreground">Probability of Default (PD)</p>
                     <p className="text-3xl font-bold text-destructive">{underwritingResult.probabilityOfDefault}%</p>
                   </div>
                   <div className="flex flex-col items-center text-center p-4 bg-muted rounded-lg">
                     <p className="text-sm text-muted-foreground">Loss Given Default (LGD)</p>
                     <p className="text-3xl font-bold text-destructive">{underwritingResult.lossGivenDefault}%</p>
                   </div>
                   <div className="flex flex-col items-center text-center p-4 bg-muted rounded-lg">
                     <p className="text-sm text-muted-foreground">Exposure at Default (EAD)</p>
                     <p className="text-3xl font-bold text-destructive">₹{underwritingResult.exposureAtDefault.toLocaleString('en-IN')}</p>
                   </div>
                   <div className="flex flex-col items-center text-center p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                     <p className="text-sm text-red-700 dark:text-red-300">Expected Loss (EL)</p>
                     <p className="text-3xl font-bold text-red-600 dark:text-red-400">₹{underwritingResult.expectedLoss.toLocaleString('en-IN')}</p>
                   </div>
                 </div>
                 <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                    <div>
                        <h5>Probability of Default (PD) Explanation</h5>
                        <p>{underwritingResult.riskMetricsExplanation.pd}</p>
                    </div>
                    <div>
                        <h5>Loss Given Default (LGD) Explanation</h5>
                        <p>{underwritingResult.riskMetricsExplanation.lgd}</p>
                    </div>
                    <div>
                        <h5>Exposure at Default (EAD) Explanation</h5>
                        <p>{underwritingResult.riskMetricsExplanation.ead}</p>
                    </div>
                 </div>
               </div>

                <div className="mt-8">
                    <div className={cn('p-4 rounded-lg border-l-4 font-semibold text-lg', getRiskColorClass(underwritingResult.finalProfileRating))}>
                        Final Profile Rating: {underwritingResult.finalProfileRating}
                    </div>
                </div>

            </CardContent>
          )}

        </Card>
      ),
      financialRisk: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BadgeCent className="mr-3 h-6 w-6 text-primary" />
              AI Financial Risk Assessment
            </CardTitle>
            <CardDescription>
              Get an AI-based analysis of your overall financial stability. This requires your income to be entered first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <UiTooltip>
                <TooltipTrigger asChild>
                  <div className="inline-block">
                    <Button
                      onClick={handleGetFinancialRisk}
                      disabled={isAssessingFinancialRisk || !estimatedIncome}
                    >
                      {isAssessingFinancialRisk ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Assess Financial Risk
                    </Button>
                  </div>
                </TooltipTrigger>
                {!estimatedIncome && (
                  <TooltipContent>
                    <p>Please use the 'Financials & Obligations' section to enter your income first.</p>
                  </TooltipContent>
                )}
              </UiTooltip>
            </TooltipProvider>

            {financialRisk && (
              <div className="mt-6 space-y-6">
                <div className={cn('p-4 rounded-lg border-l-4', getRiskColorClass(financialRisk.financialRiskRating))}>
                  <h4 className="font-bold text-lg">Financial Risk Rating: {financialRisk.financialRiskRating}</h4>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="p-4 rounded-lg bg-muted/50">
                        <h5 className="font-semibold mt-0">Debt-to-Income (DTI) Analysis</h5>
                        <p className="whitespace-pre-line">{financialRisk.dtiAnalysis.explanation}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                        <h5 className="font-semibold mt-0">Debt Composition Analysis</h5>
                        <p className="whitespace-pre-line">{financialRisk.debtComposition.explanation}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                        <h5 className="font-semibold mt-0">Credit Utilization Analysis</h5>
                        <p className="whitespace-pre-line">{financialRisk.creditUtilizationAnalysis.explanation}</p>
                    </div>
                     <div className="p-4 rounded-lg bg-muted/50">
                        <h5 className="font-semibold mt-0">Overall Financial Outlook</h5>
                        <p className="whitespace-pre-line">{financialRisk.overallOutlook}</p>
                    </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ),
      incomeEstimator: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Calculator className="mr-3 h-6 w-6 text-primary" />Financials &amp; Obligations</CardTitle>
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
                {isCalculatingEmi && <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">This is auto-calculated from your report and your selections below. You can override it.</p>
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
                                        <p className="font-semibold">{loan.loanType}</p>
                                        <p className="text-xs text-muted-foreground">{loan.ownership}</p>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-xs">Balance: ₹{loan.currentBalance.toLocaleString('en-IN')}</p>
                                        <p className="text-xs">Sanctioned: ₹{loan.sanctionedAmount.toLocaleString('en-IN')}</p>
                                    </TableCell>
                                    <TableCell>
                                        {loan.emi > 0 ? (
                                            <p className="px-3 py-2 text-sm">{loan.emi.toLocaleString('en-IN')}</p>
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
    };
    return views[activeView!];
  };
  
  const { customerDetails, reportSummary } = analysisResult || initialAnalysis;

  const renderCreditAnalysis = () => (
    <>
        <div className="text-center mb-12 print:hidden">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Advanced AI Credit Score Analyzer</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Upload your CIBIL report PDF to unlock instant AI-powered insights, personalized scoring, and actionable advice.</p>
        </div>

        <Card className="mb-8 shadow-lg hover:shadow-xl transition-shadow print:hidden">
            <CardHeader>
                <CardTitle className="flex items-center text-xl justify-between">
                    <div className="flex items-center">
                        <UploadCloud className="mr-3 h-6 w-6 text-primary" />Upload Your CIBIL Report (PDF)
                    </div>
                     <Button variant="outline" onClick={() => setAnalysisMode(null)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Selection
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                    <Button onClick={() => fileInputRef.current?.click()}>
                        <UploadCloud className="mr-2" />
                        Choose PDF File
                    </Button>
                    <Input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                    <span className="text-muted-foreground flex-1 min-w-0 truncate">{fileName}</span>
                    {file && (
                        <Button variant="ghost" size="icon" onClick={() => { resetState(); setAnalysisMode('credit'); }}>
                            <Trash2 className="h-5 w-5" />
                            <span className="sr-only">Remove file</span>
                        </Button>
                    )}
                </div>
                {file && !isLoading && !analysisResult && (
                  <div className="mt-4">
                    <Alert>
                       <AlertCircle className="h-4 w-4" />
                       <AlertTitle>Ready to Analyze</AlertTitle>
                       <AlertDescription>
                        Your report has been processed. Click the button below to run the full AI analysis. This may use a significant portion of your free daily quota.
                       </AlertDescription>
                    </Alert>
                    <Button onClick={handleStartFullAnalysis} disabled={isAnalyzing || isCalculatingEmi} className="mt-4">
                      {(isAnalyzing || isCalculatingEmi) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                      Start Full AI Analysis
                    </Button>
                  </div>
                )}
            </CardContent>
        </Card>
        
        {isLoading && (
            <Card className="text-center p-8 my-8 print:hidden">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                <h3 className="text-xl font-semibold">Processing your CIBIL report...</h3>
                <p className="text-muted-foreground">This may take a moment.</p>
                <Progress value={progress} className="w-full max-w-md mx-auto mt-4" />
            </Card>
        )}

        {underwritingResult && (
          <Card className="mb-8 border-2" style={{ borderColor: 'hsl(var(--primary))' }}>
              <CardHeader>
                  <CardTitle className="text-2xl flex items-center justify-between">
                      <span>Final Profile Summary</span>
                       <div className={cn('px-4 py-1.5 rounded-full text-base font-semibold flex items-center gap-2 border', getRiskColorClass(underwritingResult.finalProfileRating, 'bg'), getRiskColorClass(underwritingResult.finalProfileRating, 'text'), getRiskColorClass(underwritingResult.finalProfileRating, 'border'))}>
                            {underwritingResult.finalProfileRating === 'Very Low Risk' || underwritingResult.finalProfileRating === 'Low Risk' ? <CheckCircle /> : <ShieldAlert />}
                            {underwritingResult.finalProfileRating}
                       </div>
                  </CardTitle>
                  <CardDescription>This card provides a consolidated view of the entire analysis.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-b pb-4 mb-4">
                      <InfoItem label="Name" value={customerDetails.name} isLoading={isAnalyzing}/>
                      <InfoItem label="PAN" value={customerDetails.pan} isLoading={isAnalyzing}/>
                       <div className={cn("font-semibold text-lg p-2 rounded-md text-center", getUnderwritingDecisionColor(underwritingResult.underwritingDecision))}>
                            Decision: {underwritingResult.underwritingDecision}
                       </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      <SummaryItem label="CIBIL Score" value={creditScore || 'N/A'} valueClassName="text-primary" />
                      <SummaryItem label="AI Credit Score" value={aiRating?.aiScore || 'N/A'} valueClassName={getRatingColorClass(aiRating?.rating || '')} />
                      <SummaryItem label="Risk Score" value={'N/A'} valueClassName={'text-foreground'} />
                      <SummaryItem label="Approved Amount" value={`₹${underwritingResult.approvedLoanAmount.toLocaleString('en-IN')}`} />
                      <SummaryItem label="Interest Rate" value={`${underwritingResult.recommendedInterestRate}`} />
                      <SummaryItem label="Tenure" value={`${underwritingResult.recommendedTenure} months`} />
                      <SummaryItem label="PD" value={`${underwritingResult.probabilityOfDefault}%`} valueClassName="text-destructive" />
                      <SummaryItem label="LGD" value={`${underwritingResult.lossGivenDefault}%`} valueClassName="text-destructive" />
                      <SummaryItem label="EAD" value={`₹${underwritingResult.exposureAtDefault.toLocaleString('en-IN')}`} valueClassName="text-destructive" />
                       <SummaryItem label="Expected Loss" value={`₹${underwritingResult.expectedLoss.toLocaleString('en-IN')}`} valueClassName="text-destructive" />
                  </div>
              </CardContent>
              <CardFooter>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>AI Underwriting Summary</AlertTitle>
                    <AlertDescription>{underwritingResult.underwritingSummary}</AlertDescription>
                  </Alert>
              </CardFooter>
          </Card>
        )}
        
        {rawText && !isLoading && (
            <div className="space-y-8">
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center"><FileText className="mr-3 h-6 w-6 text-primary" />Credit Score &amp; Consumer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      <div className="text-center">
                          <p className="text-muted-foreground">Official CIBIL Score</p>
                          <div className="text-7xl font-bold text-primary">{creditScore || 'N/A'}</div>
                          {creditScore && <Progress value={scoreProgress} className="mt-4" />}
                      </div>
                      <div>
                          <h4 className="font-semibold mb-4">AI-Extracted Consumer Information</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <div>
                                <InfoItem label="Name" value={customerDetails.name} isLoading={isAnalyzing}/>
                                <div className="mt-2">
                                    <InfoItem label="Date of Birth" value={customerDetails.dateOfBirth} isLoading={isAnalyzing}/>
                                </div>
                                <div className="mt-2">
                                    <InfoItem label="Gender" value={customerDetails.gender} isLoading={isAnalyzing}/>
                                </div>
                            </div>
                            <div>
                                <InfoItem label="PAN" value={customerDetails.pan} isLoading={isAnalyzing}/>
                                <div className="mt-2">
                                    <InfoItem label="Mobile Number" value={customerDetails.mobileNumber} isLoading={isAnalyzing}/>
                                </div>
                                <div className="mt-2">
                                    <InfoItem label="Address" value={customerDetails.address} isLoading={isAnalyzing}/>
                                </div>
                            </div>
                          </div>
                      </div>
                  </CardContent>
              </Card>

               <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><BarChartBig className="mr-3 h-6 w-6 text-primary" />Report Summary</CardTitle>
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
                  <CardTitle>Analysis Dashboard</CardTitle>
                  <CardDescription>Select a section to view its detailed analysis. Some sections require previous steps to be completed.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <NavButton view="creditSummary" label="Credit Summary" icon={<LayoutGrid size={24} />} disabled={!analysisResult} />
                  <NavButton view="aiAnalysis" label="AI Report Analysis" icon={<BrainCircuit size={24} />} disabled={!analysisResult} />
                  <NavButton view="aiMeter" label="AI Credit Meter" icon={<Bot size={24} />} disabled={!analysisResult}/>
                  <NavButton view="incomeEstimator" label="Financials & Obligations" icon={<Calculator size={24} />} disabled={!analysisResult}/>
                  <NavButton view="loanEligibility" label="AI Loan Eligibility" icon={<Banknote size={24} />} disabled={!aiRating || !estimatedIncome} />
                  <NavButton view="financialRisk" label="AI Financial Risk" icon={<BadgeCent size={24} />} disabled={!estimatedIncome}/>
                  <NavButton view="creditUnderwriting" label="AI Credit Underwriting" icon={<Gavel size={24} />} disabled={!loanEligibility} />
                </CardContent>
              </Card>
              
              {activeView && (
                <div className="my-8">
                  {renderActiveView()}
                </div>
              )}
            </div>
        )}
    </>
  );

  const renderBankAnalysis = () => (
    <>
      <div className="text-center mb-12 print:hidden">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">AI Bank Statement Analyzer</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Upload your bank statement PDF to get an instant, AI-powered financial health check-up.</p>
      </div>
      <Card className="mb-8 shadow-lg hover:shadow-xl transition-shadow print:hidden">
        <CardHeader>
            <CardTitle className="flex items-center text-xl justify-between">
                <div className="flex items-center">
                    <UploadCloud className="mr-3 h-6 w-6 text-primary" />Upload Your Bank Statement (PDF)
                </div>
                <Button variant="outline" onClick={() => setAnalysisMode(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Selection
                </Button>
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex flex-wrap items-center gap-4">
                <Button onClick={() => fileInputRef.current?.click()}>
                    <UploadCloud className="mr-2" />
                    Choose PDF File
                </Button>
                <Input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                <span className="text-muted-foreground flex-1 min-w-0 truncate">{fileName}</span>
                 {file && (
                    <Button variant="ghost" size="icon" onClick={() => { resetState(); setAnalysisMode('bank'); }}>
                        <Trash2 className="h-5 w-5" />
                        <span className="sr-only">Remove file</span>
                    </Button>
                )}
            </div>
             {file && !isLoading && !bankAnalysisResult && (
                <div className="mt-4">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Ready to Analyze</AlertTitle>
                        <AlertDescription>
                        Your bank statement has been processed. Click the button below to run the AI analysis.
                        </AlertDescription>
                    </Alert>
                    <Button onClick={handleStartBankAnalysis} disabled={isAnalyzingBank} className="mt-4">
                        {isAnalyzingBank ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                        Start Bank Statement Analysis
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>
      
        {isLoading && (
            <Card className="text-center p-8 my-8 print:hidden">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                <h3 className="text-xl font-semibold">Processing your bank statement...</h3>
                <p className="text-muted-foreground">This may take a moment.</p>
                <Progress value={progress} className="w-full max-w-md mx-auto mt-4" />
            </Card>
        )}
      
       {isAnalyzingBank ? (
         <div className="flex items-center justify-center py-10">
            <Loader2 className="mr-3 h-8 w-8 animate-spin text-primary" />
            <span className="text-muted-foreground">AI is analyzing your statement... This can take up to a minute.</span>
          </div>
       ) : bankAnalysisResult && (
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><FileText className="mr-3 h-6 w-6 text-primary" />Account Summary</CardTitle>
                        <CardDescription>Key details extracted from the statement.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       <InfoItem label="Account Holder" value={bankAnalysisResult.summary.accountHolder} />
                       <InfoItem label="Bank Name" value={bankAnalysisResult.summary.bankName} />
                       <InfoItem label="Account Number" value={bankAnalysisResult.summary.accountNumber} />
                       <InfoItem label="Mobile Number" value={bankAnalysisResult.summary.mobileNumber} />
                       <InfoItem label="Address" value={bankAnalysisResult.summary.address} />
                       <InfoItem label="Statement Period" value={bankAnalysisResult.summary.statementPeriod} />
                       <InfoItem label="Opening Balance" value={bankAnalysisResult.summary.openingBalance} />
                       <InfoItem label="Closing Balance" value={bankAnalysisResult.summary.closingBalance} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><BarChartBig className="mr-3 h-6 w-6 text-primary" />Financial Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryItem label="Total Deposits" value={bankAnalysisResult.overview.totalDeposits} valueClassName="text-green-600" />
                        <SummaryItem label="Total Withdrawals" value={bankAnalysisResult.overview.totalWithdrawals} valueClassName="text-destructive" />
                        <SummaryItem label="Average Balance" value={bankAnalysisResult.overview.averageBalance} valueClassName="text-foreground" />
                        <SummaryItem label="Estimated Monthly Income" value={bankAnalysisResult.overview.estimatedMonthlyIncome} valueClassName="text-primary" />
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><ChevronsUpDown className="mr-3 h-6 w-6 text-primary" />Detailed Financial Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <SummaryItem label="Salary Credits" value={bankAnalysisResult.detailedOverview.salaryCredits} valueClassName="text-green-600" />
                        <SummaryItem label="Incentive Credits" value={bankAnalysisResult.detailedOverview.incentiveCredits} valueClassName="text-green-600" />
                        <SummaryItem label="Mandate Debits" value={bankAnalysisResult.detailedOverview.mandateDebits} valueClassName="text-destructive" />
                        <SummaryItem label="Cheque Inward" value={bankAnalysisResult.detailedOverview.chequeInward} valueClassName="text-green-600" />
                        <SummaryItem label="Cheque Outward" value={bankAnalysisResult.detailedOverview.chequeOutward} valueClassName="text-destructive" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><BrainCircuit className="mr-3 h-6 w-6 text-primary" />AI Financial Health Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                        <p>{bankAnalysisResult.health.summary}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <div>
                                <h4 className="font-semibold text-green-600">Strengths</h4>
                                <ul className="list-disc pl-5">
                                    {bankAnalysisResult.health.strengths.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-destructive">Risks</h4>
                                 <ul className="list-disc pl-5">
                                    {bankAnalysisResult.health.risks.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Pencil className="mr-3 h-5 w-5" /> Recent Transactions
                    </CardTitle>
                    <CardDescription>A list of notable recent transactions identified by the AI.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bankAnalysisResult.transactions.map((txn, index) => (
                          <TableRow key={index}>
                            <TableCell>{txn.date}</TableCell>
                            <TableCell className="font-medium">{txn.description}</TableCell>
                            <TableCell>{txn.category}</TableCell>
                            <TableCell className={cn("text-right font-semibold", txn.type === 'credit' ? 'text-green-600' : 'text-destructive')}>
                                {txn.type === 'credit' ? '+' : '-'} {txn.amount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
            </div>
        )}
    </>
  );

  return (
    <div className={cn("min-h-screen bg-background font-body text-foreground", theme)}>
       <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm print:hidden">
        <div className="container flex h-16 items-center">
            <div className="mr-4 flex items-center">
              <Sparkles className="h-6 w-6 mr-2 text-primary" />
              <span className="font-bold text-lg">CreditWise AI</span>
            </div>
            <nav className="flex items-center space-x-4 lg:space-x-6 text-sm font-medium">
              <Link
                href="/"
                className="transition-colors hover:text-foreground/80 text-foreground"
              >
                Analyzer
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
                {user && (
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                )}
            </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 print:p-0">
        {!user ? (
           <Card className="max-w-md mx-auto mt-16">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn/>
                Welcome to CreditWise AI
              </CardTitle>
              <CardDescription>
                Sign in or create an account to analyze your credit report.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full"
                />
                {authError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Authentication Failed</AlertTitle>
                    <AlertDescription>{authError}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" disabled={isSigningIn} className="w-full">
                  {isSigningIn ? <Loader2 className="animate-spin" /> : 'Sign In / Sign Up'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : !analysisMode ? (
            <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Choose an Analyzer</h1>
                <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">Select the type of document you would like to analyze with our AI.</p>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <Card 
                        className="p-8 text-center cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                        onClick={() => { resetState(); setAnalysisMode('credit'); }}
                    >
                        <FileText className="h-16 w-16 mx-auto text-primary mb-4" />
                        <h2 className="text-2xl font-bold">Credit Report Analysis</h2>
                        <p className="text-muted-foreground mt-2">Upload a CIBIL report for in-depth credit health analysis, scoring, and loan underwriting.</p>
                    </Card>
                     <Card 
                        className="p-8 text-center cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                        onClick={() => { resetState(); setAnalysisMode('bank'); }}
                    >
                        <Landmark className="h-16 w-16 mx-auto text-primary mb-4" />
                        <h2 className="text-2xl font-bold">Bank Statement Analysis</h2>
                        <p className="text-muted-foreground mt-2">Upload a bank statement to analyze income, expenses, and overall financial health.</p>
                    </Card>
                </div>
            </div>
        ) : (
          <>
            {analysisMode === 'credit' && renderCreditAnalysis()}
            {analysisMode === 'bank' && renderBankAnalysis()}

            {(rawText || (analysisMode === 'bank' && bankAnalysisResult)) && (
              <div className="space-y-8 mt-8">
                 <Card className="print:hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center"><FileSearch className="mr-3 h-6 w-6 text-primary" />Raw Report Text & Cost</CardTitle>
                    </CardHeader>
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
                        {tokenUsage.inputTokens > 0 && (
                            <Card className="bg-muted/50">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center"><Coins className="mr-3 text-primary"/>Analysis Cost</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-3 gap-4">
                                    <SummaryItem label="Input Tokens" value={tokenUsage.inputTokens.toLocaleString()} valueClassName="text-foreground" />
                                    <SummaryItem label="Output Tokens" value={tokenUsage.outputTokens.toLocaleString()} valueClassName="text-foreground" />
                                    <SummaryItem label="Estimated Cost (USD)" value={`$${estimatedCost.toFixed(5)}`} valueClassName="text-green-600" />
                                </CardContent>
                            </Card>
                        )}
                    </CardContent>
                  </Card>

                  {showRawText && (
                    <Card className="print:hidden">
                        <CardHeader>
                            <CardTitle>Raw Text</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="whitespace-pre-wrap text-xs bg-muted p-4 rounded-lg max-h-96 overflow-auto">{rawText}</pre>
                        </CardContent>
                    </Card>
                  )}

                  <div className="print-this">
                    <div className="p-8 bg-white shadow-lg a4-paper">
                        <h2 className="text-2xl font-bold mb-4 border-b pb-2 text-black">Raw Document Text</h2>
                        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">{rawText}</pre>
                    </div>
                  </div>
              </div>
            )}
            
            <ShanAIChat 
              cibilReportText={analysisMode === 'credit' ? rawText : undefined} 
              bankStatementText={analysisMode === 'bank' ? rawText : undefined}
              onNewChat={() => setTokenUsage({ inputTokens: 0, outputTokens: 0 })}
              onTokensUsed={updateTokenUsage}
            />
          </>
        )}
      </main>
      <footer className="text-center py-6 text-sm text-muted-foreground print:hidden">
         <p>© {new Date().getFullYear()} CreditWise AI. Built with Firebase and Google AI.</p>
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
