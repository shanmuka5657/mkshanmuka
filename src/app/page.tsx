

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useToast } from "@/hooks/use-toast"
import { analyzeCreditReport, AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { getCreditImprovementSuggestions } from '@/ai/flows/credit-improvement-suggestions';
import { getDebtManagementAdvice } from '@/ai/flows/debt-management-advice';
import { getAiRating, AiRatingOutput } from '@/ai/flows/ai-rating';
import { getLoanEligibility, LoanEligibilityOutput } from '@/ai/flows/loan-eligibility';
import { getRiskAssessment, RiskAssessmentOutput } from '@/ai/flows/risk-assessment';
import { getCreditUnderwriting, CreditUnderwritingOutput } from '@/ai/flows/credit-underwriting';
import { getFinancialRiskAssessment, FinancialRiskOutput } from '@/ai/flows/financial-risk-assessment';
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


type AccountSummary = {
  total: string;
  zeroBalance: string;
  highCredit: string;
  currentBalance: string;
  overdue: string;
  recentDate: string;
  oldestDate: string;
};

type EnquirySummary = {
  total: string;
  past30Days: string;
  past12Months: string;
  past24Months: string;
  recentDate: string;
};

type ActiveView = 
  | 'aiMeter' 
  | 'aiAnalysis' 
  | 'loanEligibility' 
  | 'incomeEstimator'
  | 'creditImprovement'
  | 'riskAssessment'
  | 'creditUnderwriting'
  | 'financialRisk'
  | null;


const initialAccountSummary: AccountSummary = {
  total: 'N/A',
  zeroBalance: 'N/A',
  highCredit: 'N/A',
  currentBalance: 'N/A',
  overdue: 'N/A',
  recentDate: 'N/A',
  oldestDate: 'N/A',
};

const initialEnquirySummary: EnquirySummary = {
  total: 'N/A',
  past30Days: 'N/A',
  past12Months: 'N/A',
  past24Months: 'N/A',
  recentDate: 'N/A',
};

const initialRiskAssessment: RiskAssessmentOutput = {
  score: 0,
  level: 'Low',
  factors: [],
  mitigations: [],
  probabilityOfDefault: 0,
  defaultProbabilityExplanation: '',
  exposureAtDefault: 0,
  lossGivenDefault: 0,
  expectedLoss: 0,
};

const initialAiAnalysis: AnalyzeCreditReportOutput = {
  strengths: '',
  weaknesses: '',
  activeAccounts: '',
  closedAccounts: '',
  dpdAnalysis: '',
  emiAnalysis: '',
  creditUtilization: '',
  creditHistoryLength: '',
  creditMix: '',
};

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
  const [consumerInfo, setConsumerInfo] = useState<Record<string, string>>({});
  const [aiAnalysis, setAiAnalysis] = useState<AnalyzeCreditReportOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [totalEmi, setTotalEmi] = useState('');
  const [otherObligations, setOtherObligations] = useState('');
  const [dtiRatio, setDtiRatio] = useState('40');
  const [customDti, setCustomDti] = useState('');
  const [estimatedIncome, setEstimatedIncome] = useState<number | null>(null);
  const [aiDebtAdvice, setAiDebtAdvice] = useState('');
  const [isAdvising, setIsAdvising] = useState(false);
  const [theme, setTheme] = useState('light');
  const [accountSummary, setAccountSummary] = useState<AccountSummary>(initialAccountSummary);
  const [enquirySummary, setEnquirySummary] = useState<EnquirySummary>(initialEnquirySummary);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessmentOutput | null>(null);
  const [isAssessingRisk, setIsAssessingRisk] = useState(false);
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
  const [desiredInterestRate, setDesiredInterestRate] = useState('');

  // New state for Financial Risk
  const [financialRisk, setFinancialRisk] = useState<FinancialRiskOutput | null>(null);
  const [isAssessingFinancialRisk, setIsAssessingFinancialRisk] = useState(false);


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
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please upload a PDF file smaller than 5MB.",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
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
    setConsumerInfo({});
    setAiAnalysis(null);
    setIsAnalyzing(false);
    setAiSuggestions('');
    setIsSuggesting(false);
    setTotalEmi('');
    setOtherObligations('');
    setDtiRatio('40');
    setCustomDti('');
    setEstimatedIncome(null);
    setAiDebtAdvice('');
    setIsAdvising(false);
    setShowRawText(false);
    setAccountSummary(initialAccountSummary);
    setEnquirySummary(initialEnquirySummary);
    setRiskAssessment(null);
    setIsAssessingRisk(false);
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
    setDesiredInterestRate('');
    setFinancialRisk(null);
    setIsAssessingFinancialRisk(false);


    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
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
          parseCibilData(textContent);
          handleGetRiskAssessment(textContent); // Trigger AI risk assessment
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
  
  const handleGetRiskAssessment = async (text: string) => {
    if (!text) return;
    setIsAssessingRisk(true);
    setRiskAssessment(null);
    try {
      const result = await getRiskAssessment({ creditReportText: text });
      setRiskAssessment(result);
    } catch (error: any) {
      console.error('Error getting AI risk assessment:', error);
       toast({
        variant: "destructive",
        title: "AI Risk Assessment Failed",
        description: error.message?.includes('503') ? "The AI model is currently overloaded. Please try again in a moment." : (error.message || "Could not get AI risk assessment. Please try again."),
      })
    } finally {
      setIsAssessingRisk(false);
    }
  };


  const parseCibilData = (text: string) => {
    const normalizedText = text.replace(/\s+/g, ' ').trim();

    // --- Basic Info Parsing ---
    const scoreMatch = normalizedText.match(/(?:CIBIL (?:TRANSUNION )?SCORE|CREDITVISION. SCORE)\s*(\d{3})/i);
    setCreditScore(scoreMatch ? parseInt(scoreMatch[1], 10) : null);

    let info: Record<string, string> = {};
    const nameMatch = normalizedText.match(/NAME:\s*([\w\s]+?)\s*(?:DATE OF BIRTH|DOB)/i);
    if (nameMatch) info['Name'] = nameMatch[1].trim();

    const dobMatch = normalizedText.match(/(?:DATE OF BIRTH|DOB):\s*(\d{2}-\d{2}-\d{4})/i);
    if (dobMatch) info['Date of Birth'] = dobMatch[1];
    
    const panMatch = normalizedText.match(/(?:INCOME TAX ID NUMBER \(PAN\)|PAN)\s*([A-Z]{5}[0-9]{4}[A-Z]{1})/i);
    if (panMatch) info['PAN'] = panMatch[1];
    
    const genderMatch = normalizedText.match(/GENDER:\s*(Male|Female|MALE|FEMALE)/i);
    if (genderMatch) info['Gender'] = genderMatch[1].charAt(0).toUpperCase() + genderMatch[1].slice(1).toLowerCase();

    const addressMatch = normalizedText.match(/ADDRESS\s*:(.*?)(?:CATEGORY|PERMANENT ADDRESS|IDENTIFICATION|CONTACT)/i);
    if (addressMatch) info['Address'] = addressMatch[1].replace(/\s+/g, ' ').trim();
    
    setConsumerInfo(info);

    // --- Screenshot-based Summary Parsing ---
    const summarySectionMatch = normalizedText.match(/SUMMARY(.*?)(?=ACCOUNT INFORMATION|ACCOUNT DETAILS|ENQUIRY INFORMATION|$)/is);
    const summarySection = summarySectionMatch ? summarySectionMatch[1] : '';

    const getSummaryValue = (label: RegExp, section: string, isCurrency = false): string => {
        const match = section.match(label);
        if (!match || !match[1]) return 'N/A';
        const value = match[1].replace(/,/g, '').trim();
        if (value === '') return 'N/A';
        try {
            return isCurrency ? `₹${parseInt(value, 10).toLocaleString('en-IN')}` : value;
        } catch (e) {
            return value; // Return as is if parsing fails
        }
    };
    
    const newAccountSummary: AccountSummary = {
        total: getSummaryValue(/Total\s*:\s*(\d+)/i, summarySection),
        zeroBalance: getSummaryValue(/Zero-Balance\s*:\s*(\d+)/i, summarySection),
        highCredit: getSummaryValue(/High Credit\/Sanc\. Amt\s*:\s*([\d,]+)/i, summarySection, true),
        currentBalance: getSummaryValue(/Current\s*:\s*([\d,]+)/i, summarySection, true),
        overdue: getSummaryValue(/Overdue\s*:\s*([\d,]+)/i, summarySection, true),
        recentDate: getSummaryValue(/Recent\s*:\s*(\d{2}-\d{2}-\d{4})/i, summarySection),
        oldestDate: getSummaryValue(/Oldest\s*:\s*(\d{2}-\d{2}-\d{4})/i, summarySection),
    };
    setAccountSummary(newAccountSummary);


    const enquirySectionMatch = normalizedText.match(/ENQUIRY INFORMATION(.*?)(?=END OF REPORT|$)/is);
    const enquirySection = enquirySectionMatch ? enquirySectionMatch[1] : '';

    const newEnquirySummary: EnquirySummary = {
        total: getSummaryValue(/Total\s*:\s*(\d+)/i, enquirySection),
        past30Days: getSummaryValue(/Past 30 days\s*:\s*(\d+)/i, enquirySection),
        past12Months: getSummaryValue(/Past 12 months\s*:\s*(\d+)/i, enquirySection),
        past24Months: getSummaryValue(/Past 24 months\s*:\s*(\d+)/i, enquirySection),
        recentDate: getSummaryValue(/Recent\s*:\s*(\d{2}-\d{2}-\d{4})/i, enquirySection),
    };
    setEnquirySummary(newEnquirySummary);
  };


  const handleAnalyze = async () => {
    if (!rawText) return;
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const result = await analyzeCreditReport({ creditReportText: rawText });
      setAiAnalysis(result);
      toast({
        title: "AI Analysis Complete",
        description: "Your credit report has been analyzed.",
      })
    } catch (error: any) {
      console.error('Error analyzing report:', error);
       toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message?.includes('503') ? "The AI model is currently overloaded. Please try again in a moment." : (error.message || "Could not get AI analysis. Please try again."),
      })
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleGetAiRating = async () => {
    if (!rawText || !riskAssessment) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please ensure the report is parsed and the initial risk assessment is complete.",
      });
      return;
    }
    setIsRating(true);
    setAiRating(null);
    try {
      const result = await getAiRating({
        creditReportText: rawText,
        riskAssessment: riskAssessment,
      });
      setAiRating(result);
       toast({
        title: "AI Rating Complete",
        description: "Your comprehensive AI credit rating is ready.",
      })
    } catch (error: any) {
      console.error('Error getting AI rating:', error);
       toast({
        variant: "destructive",
        title: "AI Rating Failed",
        description: error.message?.includes('503') ? "The AI model is currently overloaded. Please try again in a moment." : (error.message || "Could not get AI rating. Please try again."),
      })
    } finally {
      setIsRating(false);
    }
  }


  const handleGetSuggestions = async () => {
    if (!rawText) {
      toast({
        variant: "destructive",
        title: "No Report Found",
        description: "Please upload a credit report first.",
      })
      return;
    }
    setIsSuggesting(true);
    setAiSuggestions('');
    try {
      const result = await getCreditImprovementSuggestions({ creditReportText: rawText });
      setAiSuggestions(result.suggestions);
    } catch (error: any) {
      console.error('Error getting suggestions:', error);
       toast({
        variant: "destructive",
        title: "Failed to get suggestions",
        description: error.message?.includes('503') ? "The AI model is currently overloaded. Please try again in a moment." : (error.message || "Could not get AI suggestions. Please try again."),
      })
    } finally {
      setIsSuggesting(false);
    }
  };
  
  const handleCalculateIncome = () => {
      if (!totalEmi && !otherObligations) {
          toast({ variant: "destructive", title: "Missing fields", description: "Please fill Total EMI and/or Other Obligations."})
          return;
      }
      const finalDti = dtiRatio === 'custom' ? parseFloat(customDti) || 40 : parseFloat(dtiRatio);
      const totalObligations = parseFloat(totalEmi || '0') + parseFloat(otherObligations || '0');
      const income = (totalObligations / (finalDti / 100));
      setEstimatedIncome(income);
  };

  const handleGetDebtAdvice = async () => {
    if (estimatedIncome === null) {
        toast({ variant: "destructive", title: "Calculate Income First", description: "Please estimate your income before getting advice."})
        return;
    }
    setIsAdvising(true);
    setAiDebtAdvice('');
    try {
        const finalDti = dtiRatio === 'custom' ? parseFloat(customDti) || 40 : parseFloat(dtiRatio);
        const result = await getDebtManagementAdvice({
            totalEmi: parseFloat(totalEmi || '0'),
            otherObligations: parseFloat(otherObligations || '0'),
            dtiRatio: finalDti,
            creditReportText: rawText
        });
        setAiDebtAdvice(result.advice);
    } catch (error: any) {
       console.error('Error getting debt advice:', error);
       toast({ variant: "destructive", title: "Failed to get advice", description: error.message?.includes('503') ? "The AI model is currently overloaded. Please try again in a moment." : (error.message || "Could not get AI debt advice. Please try again.")})
    } finally {
        setIsAdvising(false);
    }
  };
  
  const handleGetLoanEligibility = async () => {
    if (!aiRating || estimatedIncome === null) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description:
          'Please get your AI Rating and estimate your income first.',
      });
      return;
    }
    setIsCalculatingEligibility(true);
    setLoanEligibility(null);
    try {
      const result = await getLoanEligibility({
        aiScore: aiRating.aiScore,
        rating: aiRating.rating,
        monthlyIncome: estimatedIncome,
        totalMonthlyEMI: parseFloat(totalEmi),
        creditReportText: rawText,
      });
      setLoanEligibility(result);
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
          error.message?.includes('503') ? "The AI model is currently overloaded. Please try again in a moment." : (error.message || 'Could not calculate your loan eligibility. Please try again.'),
      });
    } finally {
      setIsCalculatingEligibility(false);
    }
  };
  
  const handleGetUnderwriting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiRating || estimatedIncome === null) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please get your AI Rating and estimate your income first.',
      });
      return;
    }
    if (!desiredLoanAmount || !desiredTenure || !desiredInterestRate) {
      toast({
        variant: 'destructive',
        title: 'Missing Loan Details',
        description: 'Please enter all the required loan details.',
      });
      return;
    }

    setIsUnderwriting(true);
    setUnderwritingResult(null);
    try {
      const result = await getCreditUnderwriting({
        creditReportText: rawText,
        aiRating: aiRating,
        estimatedIncome: estimatedIncome,
        employmentType: employmentType as any,
        loanType: loanType as any,
        desiredLoanAmount: parseFloat(desiredLoanAmount),
        desiredTenure: parseInt(desiredTenure),
        desiredInterestRate: parseFloat(desiredInterestRate),
      });
      setUnderwritingResult(result);
      toast({
        title: 'AI Underwriting Complete',
        description: 'Your simulated underwriting assessment is ready.',
      });

      // Automatically save the full analysis as a training candidate
      saveTrainingCandidate({
          rawCreditReport: rawText,
          aiRating: aiRating,
          financialRisk: financialRisk,
          creditUnderwriting: result
      });
      toast({
        title: "Training Example Saved",
        description: "This analysis has been saved as a candidate for AI training. You can review it on the 'AI Model Trainer' page."
      });

    } catch (error: any) {
      console.error('Error getting underwriting:', error);
      toast({
        variant: 'destructive',
        title: 'Underwriting Failed',
        description: error.message?.includes('503') ? "The AI model is currently overloaded. Please try again in a moment." : (error.message || 'Could not get underwriting details. Please try again.'),
      });
    } finally {
      setIsUnderwriting(false);
    }
  };

  const handleGetFinancialRisk = async () => {
    if (!rawText || estimatedIncome === null) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please upload a report and estimate your income first.',
      });
      return;
    }

    setIsAssessingFinancialRisk(true);
    setFinancialRisk(null);
    try {
      const result = await getFinancialRiskAssessment({
        creditReportText: rawText,
        estimatedIncome: estimatedIncome,
      });
      setFinancialRisk(result);
      toast({
        title: 'Financial Risk Assessment Complete',
        description: 'Your financial risk analysis is ready.',
      });
    } catch (error: any) {
      console.error('Error getting financial risk:', error);
      toast({
        variant: 'destructive',
        title: 'Financial Risk Assessment Failed',
        description: error.message?.includes('503') ? "The AI model is currently overloaded. Please try again in a moment." : (error.message || 'Could not get financial risk details. Please try again.'),
      });
    } finally {
      setIsAssessingFinancialRisk(false);
    }
  };

  const scoreProgress = creditScore ? (creditScore - 300) / 6 : 0;

  const getRiskColorClass = (level: string = 'Low') => {
    switch (level) {
      case 'Low': return 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300';
      case 'Medium': return 'bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300';
      case 'High': return 'bg-orange-100 border-orange-500 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300';
      case 'Very High': return 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300';
      default: return 'bg-muted border-border';
    }
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
  }: {
    view: ActiveView;
    label: string;
    icon: React.ReactNode;
  }) => (
    <Button
      variant={activeView === view ? 'default' : 'outline'}
      onClick={() => setActiveView(activeView === view ? null : view)}
      className="flex flex-col h-24 text-center justify-center items-center gap-2"
    >
      {icon}
      <span className="text-xs font-normal">{label}</span>
    </Button>
  );

  const SummaryItem = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex flex-col items-center justify-center text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-base font-medium text-foreground">{value}</p>
    </div>
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
        ) : (
          <>
            <div className="text-center mb-12 print:hidden">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Advanced AI Credit Score Analyzer</h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Upload your CIBIL report PDF to unlock instant AI-powered insights, personalized scoring, and actionable advice.</p>
            </div>

            <Card className="mb-8 shadow-lg hover:shadow-xl transition-shadow print:hidden">
                <CardHeader>
                    <CardTitle className="flex items-center text-xl"><UploadCloud className="mr-3 h-6 w-6 text-primary" />Upload Your CIBIL Report (PDF)</CardTitle>
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
                            <Button variant="ghost" size="icon" onClick={resetState}>
                                <Trash2 className="h-5 w-5" />
                                <span className="sr-only">Remove file</span>
                            </Button>
                        )}
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">Note: This tool analyzes your report locally in your browser. Your data is not uploaded to any server.</p>
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
                              <h4 className="font-semibold mb-4">Consumer Information</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <div>
                                  <p className="font-semibold">Name:</p>
                                  <p className="truncate">{consumerInfo['Name'] || 'N/A'}</p>
                                  <p className="font-semibold mt-2">Date of Birth:</p>
                                  <p>{consumerInfo['Date of Birth'] || 'N/A'}</p>
                                  <p className="font-semibold mt-2">Gender:</p>
                                  <p>{consumerInfo['Gender'] || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="font-semibold">PAN:</p>
                                  <p>{consumerInfo['PAN'] || 'N/A'}</p>
                                  <p className="font-semibold mt-2">Address:</p>
                                  <p className="line-clamp-3">{consumerInfo['Address'] || 'N/A'}</p>
                                </div>
                              </div>
                          </div>
                      </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Analysis Dashboard</CardTitle>
                      <CardDescription>Select a section to view its detailed analysis.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      <NavButton view="aiMeter" label="AI Credit Analysis Meter" icon={<Bot size={24} />} />
                      <NavButton view="aiAnalysis" label="AI Credit Report Analysis" icon={<BrainCircuit size={24} />} />
                      <NavButton view="loanEligibility" label="AI Loan Eligibility" icon={<Banknote size={24} />} />
                      <NavButton view="incomeEstimator" label="Income Estimator & Debt Management" icon={<Calculator size={24} />} />
                      <NavButton view="creditImprovement" label="AI Credit Improvement" icon={<Lightbulb size={24} />} />
                      <NavButton view="riskAssessment" label="AI Risk Assessment" icon={<ShieldAlert size={24} />} />
                      <NavButton view="financialRisk" label="AI Financial Risk" icon={<BadgeCent size={24} />} />
                      <NavButton view="creditUnderwriting" label="AI Credit Underwriting" icon={<Gavel size={24} />} />
                    </CardContent>
                  </Card>
                  
                  {activeView === 'aiMeter' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><Bot className="mr-3 h-6 w-6 text-primary" />AI Credit Analysis Meter</CardTitle>
                        <CardDescription>This AI acts as a holistic credit advisor. It provides a comprehensive score of your overall credit health by balancing both the positive and negative factors in your report.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button onClick={handleGetAiRating} disabled={isRating || !riskAssessment}>
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
                  )}
                  
                  {activeView === 'loanEligibility' && (
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
                                    disabled={isCalculatingEligibility || !aiRating || estimatedIncome === null}
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
                            {(!aiRating || estimatedIncome === null) && (
                              <TooltipContent>
                                <p>Please get your AI Rating and estimate your income first.</p>
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
                                    <strong>{loanEligibility.estimatedInterestRate}% p.a.</strong>
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
                  )}
                  
                  {activeView === 'aiAnalysis' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><BrainCircuit className="mr-3 h-6 w-6 text-primary" />AI Credit Report Analysis</CardTitle>
                            <CardDescription>An AI-generated breakdown of your credit strengths and weaknesses.</CardDescription>
                        </CardHeader>
                         <CardContent>
                          <Button onClick={handleAnalyze} disabled={isAnalyzing || !rawText}>
                            {isAnalyzing ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="mr-2 h-4 w-4" />
                            )}
                            Analyze with AI
                          </Button>
                          {aiAnalysis && (
                            <Card className="mt-6 bg-muted/50">
                              <CardContent className="pt-6 space-y-6">
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <h3>Strengths in CIBIL</h3>
                                    <p>{aiAnalysis.strengths}</p>
                                    <hr />
                                    <h3>Weaknesses in CIBIL</h3>
                                    <p>{aiAnalysis.weaknesses}</p>
                                    <hr />
                                    <h3>Active Accounts Analysis</h3>
                                    <p>{aiAnalysis.activeAccounts}</p>
                                    <hr />
                                    <h3>Closed Accounts Analysis</h3>
                                    <p>{aiAnalysis.closedAccounts}</p>
                                    <hr />
                                    <h3>DPD (Days Past Due) Analysis</h3>
                                    <p>{aiAnalysis.dpdAnalysis}</p>
                                    <hr />
                                    <h3>EMI Paying for Loan Analysis</h3>
                                    <p>{aiAnalysis.emiAnalysis}</p>
                                    <hr />
                                    <h3>Credit Utilization</h3>
                                    <p>{aiAnalysis.creditUtilization}</p>
                                    <hr />
                                    <h3>Credit History Length</h3>
                                    <p>{aiAnalysis.creditHistoryLength}</p>
                                    <hr />
                                    <h3>Credit Mix</h3>
                                    <p>{aiAnalysis.creditMix}</p>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </CardContent>
                    </Card>
                  )}

                  {activeView === 'creditUnderwriting' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><Gavel className="mr-3 h-6 w-6 text-primary" />AI Credit Underwriting</CardTitle>
                        <CardDescription>Get a simulated underwriting decision from our AI. Please provide your loan requirements below.</CardDescription>
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
                            <div>
                                <Label htmlFor="desiredInterestRate">Desired Interest Rate (%)</Label>
                                <Input
                                id="desiredInterestRate"
                                type="number"
                                step="0.1"
                                placeholder="e.g., 12.5"
                                value={desiredInterestRate}
                                onChange={(e) => setDesiredInterestRate(e.target.value)}
                                required
                                />
                            </div>
                          </div>
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Prerequisites</AlertTitle>
                            <AlertDescription>
                              Ensure you have already generated your AI Rating and estimated your income for the most accurate underwriting assessment.
                            </AlertDescription>
                          </Alert>
                        </CardContent>
                        <CardFooter>
                           <Button type="submit" disabled={isUnderwriting || !aiRating || estimatedIncome === null}>
                            {isUnderwriting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gavel className="mr-2 h-4 w-4" />}
                            Start AI Underwriting
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

                        </CardContent>
                      )}

                    </Card>
                  )}

                  {activeView === 'riskAssessment' && (
                    <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center"><ShieldAlert className="mr-3 h-6 w-6 text-primary" />AI Risk Assessment</CardTitle>
                          <CardDescription>This AI acts as a conservative risk analyst. Its primary job is to identify potential negative factors that could pose a risk to a lender. A higher score means lower risk.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          {isAssessingRisk ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>AI is assessing your credit risk...</span>
                            </div>
                          ) : riskAssessment ? (
                            <div className="space-y-6">
                              <div className={cn('p-4 rounded-lg border-l-4', getRiskColorClass(riskAssessment.level))}>
                                  <h4 className="font-bold text-lg">{riskAssessment.level} Risk</h4>
                                  <p className="text-sm">Your AI-assessed credit risk score is <strong>{riskAssessment.score}/100</strong>. A higher score indicates lower risk.</p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h5 className="font-semibold mb-2">Probability of Default (PD)</h5>
                                  <div className="flex items-center gap-4">
                                    <div className="text-4xl font-bold text-destructive">{riskAssessment.probabilityOfDefault}%</div>
                                    <p className="text-sm text-muted-foreground">{riskAssessment.defaultProbabilityExplanation}</p>
                                  </div>
                                </div>
                                <div>
                                  <h5 className="font-semibold mb-2">Expected Loss (EL)</h5>
                                  <div className="text-4xl font-bold text-destructive">₹{riskAssessment.expectedLoss.toLocaleString('en-IN')}</div>
                                  <p className="text-sm text-muted-foreground">
                                    Based on EAD of ₹{riskAssessment.exposureAtDefault.toLocaleString('en-IN')} and LGD of {riskAssessment.lossGivenDefault}%.
                                  </p>
                                </div>
                              </div>


                              {riskAssessment.factors.length > 0 && (
                                  <div>
                                      <h5 className="font-semibold mb-2">Key Risk Factors:</h5>
                                      <ul className="list-disc list-inside space-y-1 text-sm">
                                          {riskAssessment.factors.map((factor, i) => <li key={i}><strong>{factor.factor} ({factor.severity} risk):</strong> {factor.details}</li>)}
                                      </ul>
                                  </div>
                              )}
                              {riskAssessment.mitigations.length > 0 && (
                                  <div>
                                      <h5 className="font-semibold mb-2">Risk Mitigation Strategies:</h5>
                                      <ul className="list-disc list-inside space-y-1 text-sm">
                                          {riskAssessment.mitigations.map((m, i) => <li key={i}><strong>{m.factor}:</strong> {m.action}</li>)}
                                      </ul>
                                  </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">No risk assessment available. The assessment will be generated automatically when you upload a report.</p>
                          )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {activeView === 'financialRisk' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <BadgeCent className="mr-3 h-6 w-6 text-primary" />
                          AI Financial Risk Assessment
                        </CardTitle>
                        <CardDescription>
                          Get an AI-based analysis of your overall financial stability. This requires your income to be estimated first.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <TooltipProvider>
                          <UiTooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-block">
                                <Button
                                  onClick={handleGetFinancialRisk}
                                  disabled={isAssessingFinancialRisk || estimatedIncome === null}
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
                            {estimatedIncome === null && (
                              <TooltipContent>
                                <p>Please use the 'Income Estimator' to estimate your income first.</p>
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
                  )}

                  {activeView === 'creditImprovement' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><ShieldCheck className="mr-3 h-6 w-6 text-primary" />AI Credit Improvement Suggestions</CardTitle>
                        <CardDescription>Get personalized credit improvement advice based on your full report.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button onClick={handleGetSuggestions} disabled={isSuggesting || !rawText}>
                          {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                          Get AI Credit Improvement Suggestions
                        </Button>
                        {aiSuggestions && (
                          <Card className="mt-6 bg-muted/50">
                              <CardHeader>
                                  <CardTitle className="flex items-center text-primary"><Sparkles className="mr-2 h-6 w-6"/>Your Personalized Suggestions</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="prose dark:prose-invert max-w-none prose-p:text-foreground/80 prose-headings:text-foreground prose-strong:text-foreground">{aiSuggestions}</div>
                              </CardContent>
                          </Card>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {activeView === 'incomeEstimator' && (
                    <div className="lg:col-span-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center"><Calculator className="mr-3 h-6 w-6 text-primary" />AI Income Estimator &amp; Debt Management</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor="total-emi">Total Monthly EMI</Label>
                            <Input id="total-emi" type="text" placeholder="Auto-calculated or enter manually" value={totalEmi} onChange={(e) => setTotalEmi(e.target.value)} />
                            <p className="text-xs text-muted-foreground mt-1">This is auto-calculated from your report. You can override it if needed.</p>
                          </div>
                          <div>
                            <Label htmlFor="other-obligations">Other Monthly Obligations (Rent, etc.)</Label>
                            <Input id="other-obligations" type="text" placeholder="e.g. 15000" value={otherObligations} onChange={(e) => setOtherObligations(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="dti-ratio">Target Debt-to-Income (DTI) Ratio</Label>
                            <Select value={dtiRatio} onValueChange={setDtiRatio}>
                              <SelectTrigger id="dti-ratio">
                                <SelectValue placeholder="Select DTI Ratio" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30">30% (Ideal)</SelectItem>
                                <SelectItem value="40">40% (Manageable)</SelectItem>
                                <SelectItem value="50">50% (High)</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                            {dtiRatio === 'custom' && (
                              <Input type="text" placeholder="Enter custom DTI %" value={customDti} onChange={(e) => setCustomDti(e.target.value)} className="mt-2" />
                            )}
                          </div>
                          <Button onClick={handleCalculateIncome}>Estimate My Income</Button>
                          {estimatedIncome !== null && (
                            <Alert>
                              <BrainCircuit className="h-4 w-4"/>
                              <AlertTitle>Estimated Monthly Income</AlertTitle>
                              <AlertDescription>
                                Your estimated income is <strong className="text-primary">₹{Math.round(estimatedIncome).toLocaleString('en-IN')}</strong> per month.
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {estimatedIncome !== null && (
                            <Button onClick={handleGetDebtAdvice} disabled={isAdvising}>
                                {isAdvising ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                                Get AI Debt Management Advice
                            </Button>
                          )}
                          {aiDebtAdvice && (
                            <Card className="mt-6 bg-muted/50">
                                <CardHeader>
                                    <CardTitle className="flex items-center text-primary"><Sparkles className="mr-2 h-6 w-6"/>Your Debt Management Plan</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="prose dark:prose-invert max-w-none prose-p:text-foreground/80 prose-headings:text-foreground prose-strong:text-foreground">{aiDebtAdvice}</div>
                                </CardContent>
                            </Card>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  
                  <Card className="print:hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center"><FileSearch className="mr-3 h-6 w-6 text-primary" />Raw Report Text</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => setShowRawText(!showRawText)}>
                                {showRawText ? 'Hide Raw Text' : 'Show Raw Text'}
                            </Button>
                            <Button variant="outline" onClick={handlePrint}>
                                <Printer className="mr-2"/>
                                Print Report
                            </Button>
                        </div>
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
                        <h2 className="text-2xl font-bold mb-4 border-b pb-2 text-black">Raw Credit Report Text</h2>
                        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">{rawText}</pre>
                    </div>
                  </div>
                </div>
            )}
            
            <ShanAIChat cibilReportText={rawText} />

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

    
