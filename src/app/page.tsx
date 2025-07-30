
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useToast } from "@/hooks/use-toast"
import { analyzeCreditReport } from '@/ai/flows/credit-report-analysis';
import { getCreditImprovementSuggestions } from '@/ai/flows/credit-improvement-suggestions';
import { getDebtManagementAdvice } from '@/ai/flows/debt-management-advice';
import { getAiRating, AiRatingOutput } from '@/ai/flows/ai-rating';
import { getLoanEligibility, LoanEligibilityOutput } from '@/ai/flows/loan-eligibility';
import { getRiskAssessment, RiskAssessmentOutput } from '@/ai/flows/risk-assessment';
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


type CreditSummary = {
  totalAccounts: number;
  totalCreditLimit: number;
  totalOutstanding: number;
  totalDebt: number;
  creditUtilization: number;
  debtToLimitRatio: number;
  activeAccounts: number;
  closedAccounts: number;
  writtenOff: number;
  settled: number;
  doubtful: number;
  totalMonthlyEMI: number;
  maxSingleEMI: number;
  creditCardPayments: number;
};
type DpdSummary = {
  onTime: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90plus: number;
  default: number;
};
type AccountDpdStatus = {
  accountType: string;
  status: string;
  highestDpd: number;
  paymentHistory: string;
};
type LoanAccount = {
  type: string;
  ownership: string;
  status: string;
  sanctioned: string;
  balance: string;
  overdue: string;
  emi: string;
  opened: string;
  closed: string;
  paymentHistory: string;
  settlementStatus?: string;
};
type Inquiry = { date: string; lender: string; purpose: string };
type RiskAssessment = RiskAssessmentOutput;
type DebtPaydown = {
  type: string;
  balance: number;
  emi: number;
  monthsRemaining: number;
  payoffDate: string;
};
type FlaggedAccount = LoanAccount & { issue: string };

type ActiveView = 
  | 'aiMeter' 
  | 'aiAnalysis' 
  | 'creditSummary' 
  | 'loanEligibility' 
  | 'inquiryAnalysis' 
  | 'dpdAnalysis'
  | 'incomeEstimator'
  | 'creditImprovement'
  | 'visualizations'
  | 'riskAssessment'
  | null;


const initialCreditSummary: CreditSummary = {
  totalAccounts: 0,
  totalCreditLimit: 0,
  totalOutstanding: 0,
  totalDebt: 0,
  creditUtilization: 0,
  debtToLimitRatio: 0,
  activeAccounts: 0,
  closedAccounts: 0,
  writtenOff: 0,
  settled: 0,
  doubtful: 0,
  totalMonthlyEMI: 0,
  maxSingleEMI: 0,
  creditCardPayments: 0,
};

const initialDpdSummary: DpdSummary = {
  onTime: 0,
  days1_30: 0,
  days31_60: 0,
  days61_90: 0,
  days90plus: 0,
  default: 0,
};

const initialRiskAssessment: RiskAssessment = {
  score: 0,
  level: 'Low',
  factors: [],
  mitigations: [],
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
  const [aiAnalysis, setAiAnalysis] = useState('');
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
  const [creditSummary, setCreditSummary] = useState<CreditSummary>(initialCreditSummary);
  const [dpdSummary, setDpdSummary] = useState<DpdSummary>(initialDpdSummary);
  const [accountDpdStatus, setAccountDpdStatus] = useState<AccountDpdStatus[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [isAssessingRisk, setIsAssessingRisk] = useState(false);
  const [potentialIssues, setPotentialIssues] = useState<string[]>([]);
  const [debtPaydownTimeline, setDebtPaydownTimeline] = useState<DebtPaydown[]>([]);
  const [flaggedAccounts, setFlaggedAccounts] = useState<FlaggedAccount[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [aiRating, setAiRating] = useState<AiRatingOutput | null>(null);
  const [isRating, setIsRating] = useState(false);
  const [loanEligibility, setLoanEligibility] = useState<LoanEligibilityOutput | null>(null);
  const [isCalculatingEligibility, setIsCalculatingEligibility] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>(null);


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
    setAiAnalysis('');
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
    setCreditSummary(initialCreditSummary);
    setDpdSummary(initialDpdSummary);
    setAccountDpdStatus([]);
    setRiskAssessment(null);
    setIsAssessingRisk(false);
    setPotentialIssues([]);
    setDebtPaydownTimeline([]);
    setFlaggedAccounts([]);
    setInquiries([]);
    setAiRating(null);
    setIsRating(false);
    setLoanEligibility(null);
    setIsCalculatingEligibility(false);
    setActiveView(null);
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

      let summary: CreditSummary = { ...initialCreditSummary };
      const summarySection = normalizedText.match(/SUMMARY:(.*?)ACCOUNT\(S\):/s);
      if (summarySection) {
          const summaryText = summarySection[1];
          const totalAcMatch = summaryText.match(/TOTAL:\s*([\d,]+)/i);
          if (totalAcMatch) summary.totalAccounts = parseInt(totalAcMatch[1].replace(/,/g, ''), 10);
          
          const highCreditMatch = summaryText.match(/HIGH CR\/SANC\. AMT:\s*([\d,]+)/i);
          if (highCreditMatch) summary.totalCreditLimit = parseInt(highCreditMatch[1].replace(/,/g, ''), 10);
          
          const currentBalanceMatch = normalizedText.match(/(?:CURRENT BALANCE|CURRENT|BALANCES):\s*([\d,]+)/i);
          if (currentBalanceMatch) summary.totalOutstanding = parseInt(currentBalanceMatch[1].replace(/,/g, ''), 10);
          
          const zeroBalanceMatch = summaryText.match(/ZERO-BALANCE:\s*([\d,]+)/i);
          if (zeroBalanceMatch) summary.closedAccounts = parseInt(zeroBalanceMatch[1].replace(/,/g, ''), 10);

          summary.activeAccounts = summary.totalAccounts - summary.closedAccounts;
          summary.totalDebt = summary.totalOutstanding;
          summary.creditUtilization = summary.totalCreditLimit > 0 ? Math.round((summary.totalOutstanding / summary.totalCreditLimit) * 100) : 0;
          summary.debtToLimitRatio = summary.creditUtilization;
      }
      
      const accountSections = normalizedText.split(/ACCOUNT\s+DATES\s+AMOUNTS\s+STATUS/i).slice(1);
      const loans: LoanAccount[] = [];
      const currentFlaggedAccounts: FlaggedAccount[] = [];
      const currentDpdStatus: AccountDpdStatus[] = [];
      const tempDpdSummary: DpdSummary = { ...initialDpdSummary };

      let totalEMI = 0;
      let maxEMI = 0;
      let ccPayments = 0;
      
      summary.writtenOff = 0;
      summary.settled = 0;
      summary.doubtful = 0;
      
      accountSections.forEach(section => {
          const typeMatch = section.match(/TYPE:\s*([A-Za-z\s-]+?)(?=OWNERSHIP|COLLATERAL|OPENED)/i);
          const accountType = typeMatch ? typeMatch[1].trim() : "N/A";
          
          let accountStatusText = (section.match(/STATUS(.*?)(?:MEMBER NAME|ACCOUNT NUMBER|TYPE|OWNERSHIP)/i)?.[0] || section).toLowerCase();
          
          let accountStatus = "active"; // default
          if (accountStatusText.includes("written off")) accountStatus = "written off";
          else if (accountStatusText.includes("settled")) accountStatus = "settled";
          else if (accountStatusText.includes("closed")) accountStatus = "closed";
          else if (accountStatusText.includes("sub-standard") || accountStatusText.includes("sub ")) accountStatus = "sub-standard";
          else if (accountStatusText.includes("doubtful") || accountStatusText.includes("dbt")) accountStatus = "doubtful";
          
          const sanctionedMatch = section.match(/(?:SANCTIONED|CREDIT LIMIT|HIGH CREDIT):\s*([\d,]+)/i);
          const balanceMatch = section.match(/(?:CURRENT BALANCE|BALANCE):\s*([\d,]+)/i);
          const overdueMatch = section.match(/OVERDUE:\s*([\d,]+)/i);
          const emiMatch = section.match(/EMI:\s*([\d,]+)/i);
          const openedMatch = section.match(/OPENED:\s*(\d{2}-\d{2}-\d{4})/i);
          const closedMatch = section.match(/CLOSED:\s*(\d{2}-\d{2}-\d{4})/i);
          const paymentHistoryMatch = section.match(/DAYS PAST DUE\/ASSET CLASSIFICATION \(UP TO 36 MONTHS; LEFT TO RIGHT\)([\s\S]+?)(?=ACCOUNT DATES AMOUNTS STATUS|INFORMATION UNDER DISPUTE|END OF REPORT|$)/i);
          
          const paymentHistory = paymentHistoryMatch ? paymentHistoryMatch[1].trim().replace(/\s+/g, ' ') : 'N/A';

          const loan: LoanAccount = {
              type: accountType,
              ownership: section.match(/OWNERSHIP:\s*(.+?)(?=OPENED|REPORTED|COLLATERAL)/i)?.[1].trim() || 'N/A',
              status: accountStatus,
              sanctioned: sanctionedMatch ? sanctionedMatch[1].replace(/,/g, '') : '0',
              balance: balanceMatch ? balanceMatch[1].replace(/,/g, '') : '0',
              overdue: overdueMatch ? overdueMatch[1].replace(/,/g, '') : '0',
              emi: emiMatch ? emiMatch[1].replace(/,/g, '') : '0',
              opened: openedMatch ? openedMatch[1] : 'N/A',
              closed: closedMatch ? closedMatch[1] : 'N/A',
              paymentHistory: paymentHistory,
          };
          
          if(loan.type === "N/A" && loan.sanctioned === '0' && loan.balance === '0') return;

          loans.push(loan);

          let isFlagged = false;
          let issue = '';

          if (accountStatus.includes('written off')) { summary.writtenOff += 1; issue = 'Written Off'; isFlagged = true; }
          if (accountStatus.includes('settled')) { summary.settled += 1; issue = 'Settled'; isFlagged = true; }
          if (accountStatus.includes('doubtful') || paymentHistory.includes('DBT')) { summary.doubtful += 1; issue = 'Doubtful'; isFlagged = true; }
          if (accountStatus.includes('sub-standard') || paymentHistory.includes('SUB')) { issue = 'Sub-standard Account'; isFlagged = true; }
          
          const overdueAmount = parseInt(loan.overdue, 10);
          if (!isNaN(overdueAmount) && overdueAmount > 0) {
              issue = `Overdue amount of ₹${overdueAmount.toLocaleString()}`;
              isFlagged = true;
          }
          
          if (isFlagged) {
              currentFlaggedAccounts.push({ ...loan, issue });
          }

          const emi = parseInt(loan.emi, 10) || 0;
          if (!loan.status.includes('closed') && !loan.status.includes('written off') && !loan.status.includes('settled')) {
            if (accountType.toLowerCase().includes('credit card')) {
                const outstanding = parseInt(loan.balance, 10) || 0;
                if(outstanding > 0) {
                  ccPayments += Math.max(outstanding * 0.05, 500); 
                }
            } else {
              totalEMI += emi;
              if (emi > maxEMI) maxEMI = emi;
            }
          }
          
          let highestDpd = 0;
          if (paymentHistory !== 'N/A') {
              const dpdValues = paymentHistory.match(/(\d{3})|STD|SUB|DBT|XXX/g) || [];
              dpdValues.forEach(dpdStr => {
                  if (dpdStr === 'STD' || dpdStr === '000' || dpdStr === 'XXX') {
                      tempDpdSummary.onTime++;
                  } else if (dpdStr === 'SUB' || dpdStr === 'DBT') {
                      tempDpdSummary.default++;
                      highestDpd = Math.max(highestDpd, 999);
                  } else {
                      const dpd = parseInt(dpdStr, 10);
                      if (!isNaN(dpd)) {
                          highestDpd = Math.max(highestDpd, dpd);
                          if (dpd >= 1 && dpd <= 30) tempDpdSummary.days1_30++;
                          else if (dpd >= 31 && dpd <= 60) tempDpdSummary.days31_60++;
                          else if (dpd >= 61 && dpd <= 90) tempDpdSummary.days61_90++;
                          else if (dpd > 90) tempDpdSummary.days90plus++;
                      }
                  }
              });
          }
          currentDpdStatus.push({ accountType, status: accountStatus, highestDpd, paymentHistory });
      });

      summary.totalMonthlyEMI = totalEMI;
      summary.maxSingleEMI = maxEMI;
      summary.creditCardPayments = Math.round(ccPayments);
      
      setCreditSummary(summary);
      setFlaggedAccounts(currentFlaggedAccounts);
      setAccountDpdStatus(currentDpdStatus);
      setDpdSummary(tempDpdSummary);
      setTotalEmi(String(totalEMI + ccPayments));

      const inquirySectionMatch = normalizedText.match(/ENQUIRIES:(.*?)END OF REPORT/i);
      const inquiryText = inquirySectionMatch ? inquirySectionMatch[1] : '';
      
      const currentInquiries: Inquiry[] = [];
      const inquiryRegex = /(\d{2}-\d{2}-\d{4})\s+([A-Z\s.,()-]+?)\s+(Consumer Loan|Personal Loan|Credit Card|Auto Loan|Business Loan|Housing Loan|Other|Two-wheeler Loan|Loan Against Property|LOAN AGAINST SHARES\/ SECURITIES|BUSINESS LOAN - GENERAL)/gi;

      let match;
      while ((match = inquiryRegex.exec(inquiryText)) !== null) {
          currentInquiries.push({
              date: match[1].trim(),
              lender: match[2].trim().replace(/\s\s+/g, ' '),
              purpose: match[3].trim()
          });
      }
      
      setInquiries(currentInquiries);
  };


  const handleAnalyze = async () => {
    if (!rawText) return;
    setIsAnalyzing(true);
    setAiAnalysis('');
    try {
      const result = await analyzeCreditReport({ creditReportText: rawText });
      setAiAnalysis(result.analysis);
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
        totalMonthlyEMI: creditSummary.totalMonthlyEMI,
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
  
  const loanTypeData = [
    { name: 'Personal', value: rawText.match(/PERSONAL LOAN/gi)?.length || 0 },
    { name: 'Credit Card', value: rawText.match(/CREDIT CARD/gi)?.length || 0 },
    { name: 'Auto', value: rawText.match(/AUTO LOAN/gi)?.length || 0 },
    { name: 'Home', value: rawText.match(/HOME LOAN/gi)?.length || 0 },
  ].filter(d => d.value > 0);
  
  const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  const scoreProgress = creditScore ? (creditScore - 300) / 6 : 0;

  const SummaryItem = ({ label, value }: { label: string; value: string | number }) => (
    <div className="bg-muted/50 rounded-lg p-4 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-primary">{value}</p>
    </div>
  );
  
  const DpdSummaryBox = ({
    label,
    count,
    colorClass,
    subtext,
  }: {
    label: string;
    count: number;
    colorClass: string;
    subtext: string;
  }) => (
    <div className={cn('rounded-lg p-4 text-center text-white', colorClass)}>
      <p className="font-semibold">{label}</p>
      <p className="text-sm">{subtext}</p>
      <p className="text-3xl font-bold">{count}</p>
    </div>
  );

  const getRiskColorClass = (level: 'Low' | 'Medium' | 'High') => {
    switch (level) {
      case 'Low': return 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300';
      case 'Medium': return 'bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300';
      case 'High': return 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300';
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


  const getInquiryCounts = useCallback(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));
    const oneYearAgo = new Date(new Date().setFullYear(now.getFullYear() - 1));
    const twoYearsAgo = new Date(new Date().setFullYear(now.getFullYear() - 2));

    const counts = {
      thirtyDays: 0,
      oneYear: 0,
      twoYears: 0,
    };

    inquiries.forEach(inq => {
      try {
        const inqDate = new Date(inq.date.split('-').reverse().join('-'));
        if (isNaN(inqDate.getTime())) return;
        
        if (inqDate > thirtyDaysAgo) counts.thirtyDays++;
        if (inqDate > oneYearAgo) counts.oneYear++;
        if (inqDate > twoYearsAgo) counts.twoYears++;
      } catch (e) {
        console.warn(`Could not parse date: ${inq.date}`)
      }
    });

    return counts;
  }, [inquiries]);

  const inquiryCounts = getInquiryCounts();

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

  return (
    <div className={cn("min-h-screen bg-background font-body text-foreground", theme)}>
       <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm print:hidden">
        <div className="container flex h-16 items-center">
            <div className="mr-4 flex items-center">
              <Sparkles className="h-6 w-6 mr-2 text-primary" />
              <span className="font-bold text-lg">CreditWise AI</span>
            </div>
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
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      <NavButton view="aiMeter" label="AI Credit Analysis Meter" icon={<Bot size={24} />} />
                      <NavButton view="aiAnalysis" label="AI Credit Report Analysis" icon={<BrainCircuit size={24} />} />
                      <NavButton view="creditSummary" label="Credit Summary" icon={<FileSymlink size={24} />} />
                      <NavButton view="loanEligibility" label="AI Loan Eligibility" icon={<Banknote size={24} />} />
                      <NavButton view="inquiryAnalysis" label="Credit Enquiry Analysis" icon={<Search size={24} />} />
                      <NavButton view="dpdAnalysis" label="DPD Analysis" icon={<LineChart size={24} />} />
                      <NavButton view="incomeEstimator" label="Income Estimator & Debt Management" icon={<Calculator size={24} />} />
                      <NavButton view="creditImprovement" label="AI Credit Improvement" icon={<Lightbulb size={24} />} />
                      <NavButton view="visualizations" label="Credit Visualisation" icon={<AreaChart size={24} />} />
                      <NavButton view="riskAssessment" label="AI Risk Assessment" icon={<ShieldAlert size={24} />} />
                    </CardContent>
                  </Card>
                  
                  {activeView === 'aiMeter' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><Bot className="mr-3 h-6 w-6 text-primary" />AI Credit Analysis Meter</CardTitle>
                        <CardDescription>A holistic rating based on a comprehensive AI analysis of your report.</CardDescription>
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
                          Estimate your potential loan eligibility based on your AI
                          rating and financial details.
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
                          <div className="mt-6 p-4 bg-muted rounded-lg">
                            <h4 className="font-semibold">
                              Estimated Loan Eligibility:
                            </h4>
                            <p className="text-2xl font-bold text-primary">
                              ₹
                              {loanEligibility.eligibleLoanAmount.toLocaleString(
                                'en-IN'
                              )}
                            </p>
                            <p className="text-muted-foreground">
                              at an estimated interest rate of{' '}
                              <strong>
                                {loanEligibility.estimatedInterestRate}% p.a.
                              </strong>
                            </p>
                            <Alert className="mt-4">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Eligibility Summary</AlertTitle>
                              <AlertDescription>
                                {loanEligibility.eligibilitySummary}
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {activeView === 'creditSummary' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><FileSymlink className="mr-3 h-6 w-6 text-primary" />Credit Summary</CardTitle>
                        <CardDescription>A detailed overview of your credit accounts and metrics.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <SummaryItem label="Total Accounts" value={creditSummary.totalAccounts} />
                        <SummaryItem label="Total Credit Limit" value={`₹${creditSummary.totalCreditLimit.toLocaleString('en-IN')}`} />
                        <SummaryItem label="Total Outstanding" value={`₹${creditSummary.totalOutstanding.toLocaleString('en-IN')}`} />
                        <SummaryItem label="Total Debt" value={`₹${creditSummary.totalDebt.toLocaleString('en-IN')}`} />
                        <SummaryItem label="Credit Utilization" value={`${creditSummary.creditUtilization}%`} />
                        <SummaryItem label="Debt-to-Limit Ratio" value={`${creditSummary.debtToLimitRatio}%`} />
                        <SummaryItem label="Active Accounts" value={creditSummary.activeAccounts} />
                        <SummaryItem label="Closed Accounts" value={creditSummary.closedAccounts} />
                        <SummaryItem label="Written Off" value={creditSummary.writtenOff} />
                        <SummaryItem label="Settled" value={creditSummary.settled} />
                        <SummaryItem label="Doubtful" value={creditSummary.doubtful} />
                        <SummaryItem label="Total Monthly EMI" value={`₹${creditSummary.totalMonthlyEMI.toLocaleString('en-IN')}`} />
                        <SummaryItem label="Max Single EMI" value={`₹${creditSummary.maxSingleEMI.toLocaleString('en-IN')}`} />
                        <SummaryItem label="Credit Card Payments" value={`₹${creditSummary.creditCardPayments.toLocaleString('en-IN')}`} />
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
                                {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Analyze with AI
                            </Button>
                            {aiAnalysis && (
                                <Card className="mt-6 bg-muted/50">
                                    <CardHeader>
                                        <CardTitle className="flex items-center text-primary"><Sparkles className="mr-2 h-6 w-6"/>AI Analysis</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="prose dark:prose-invert max-w-none prose-p:text-foreground/80 prose-headings:text-foreground prose-strong:text-foreground">{aiAnalysis}</div>
                                    </CardContent>
                                </Card>
                            )}
                        </CardContent>
                    </Card>
                  )}

                  {activeView === 'inquiryAnalysis' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><Search className="mr-3 h-6 w-6 text-primary" />Credit Inquiries Analysis</CardTitle>
                        <CardDescription>An overview of recent credit inquiries on your report.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SummaryItem label="Total Inquiries" value={inquiries.length} />
                        <SummaryItem label="Past 30 Days" value={inquiryCounts.thirtyDays} />
                        <SummaryItem label="Past 12 Months" value={inquiryCounts.oneYear} />
                        <SummaryItem label="Past 24 Months" value={inquiryCounts.twoYears} />
                      </CardContent>
                    </Card>
                  )}

                  {activeView === 'dpdAnalysis' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><LineChart className="mr-3 h-6 w-6 text-primary" />DPD (Days Past Due) Analysis</CardTitle>
                        <CardDescription>Days Past Due (DPD) indicate how late payments were made on your accounts. Lower DPD is better for your credit score.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                          <DpdSummaryBox label="On Time" subtext="(000)" count={dpdSummary.onTime} colorClass="bg-green-500" />
                          <DpdSummaryBox label="1-30 Days" subtext="Late" count={dpdSummary.days1_30} colorClass="bg-yellow-400" />
                          <DpdSummaryBox label="31-60 Days" subtext="Late" count={dpdSummary.days31_60} colorClass="bg-yellow-500" />
                          <DpdSummaryBox label="61-90 Days" subtext="Late" count={dpdSummary.days61_90} colorClass="bg-orange-500" />
                          <DpdSummaryBox label="90+ Days" subtext="Late" count={dpdSummary.days90plus} colorClass="bg-red-500" />
                          <DpdSummaryBox label="Default" subtext="(SUB/DBT)" count={dpdSummary.default} colorClass="bg-red-700" />
                        </div>
                        <h4 className="text-lg font-semibold mt-6 mb-4">Account DPD Status</h4>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Account Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Highest DPD</TableHead>
                                <TableHead>Payment History</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {accountDpdStatus.map((account, index) => (
                                <TableRow key={index}>
                                  <TableCell>{account.accountType}</TableCell>
                                  <TableCell className="capitalize">{account.status}</TableCell>
                                  <TableCell>
                                    <span className={cn(
                                      'px-2 py-1 rounded-full text-xs font-semibold text-white',
                                      account.highestDpd === 0 && 'bg-green-500',
                                      account.highestDpd > 0 && account.highestDpd <= 30 && 'bg-yellow-400',
                                      account.highestDpd > 30 && account.highestDpd <= 60 && 'bg-yellow-500',
                                      account.highestDpd > 60 && account.highestDpd <= 90 && 'bg-orange-500',
                                      account.highestDpd > 90 && 'bg-red-500',
                                    )}>
                                      {account.highestDpd}
                                    </span>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs truncate max-w-xs">{account.paymentHistory}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {activeView === 'riskAssessment' && (
                    <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center"><ShieldAlert className="mr-3 h-6 w-6 text-primary" />AI Risk Assessment</CardTitle>
                      </CardHeader>
                      <CardContent>
                          {isAssessingRisk ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>AI is assessing your credit risk...</span>
                            </div>
                          ) : riskAssessment ? (
                            <>
                              <div className={cn('p-4 rounded-lg border-l-4 mb-6', getRiskColorClass(riskAssessment.level))}>
                                  <h4 className="font-bold text-lg">{riskAssessment.level} Risk</h4>
                                  <p className="text-sm">Your AI-assessed credit risk score is <strong>{riskAssessment.score}/100</strong>. A higher score indicates lower risk.</p>
                              </div>
                              {riskAssessment.factors.length > 0 && (
                                  <div className="mb-6">
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
                            </>
                          ) : (
                            <p className="text-muted-foreground">No risk assessment available. The assessment will be generated automatically when you upload a report.</p>
                          )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {potentialIssues.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><AlertCircle className="mr-3 h-6 w-6 text-yellow-500" />Potential Issues</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {potentialIssues.map((issue, i) => (
                            <Alert key={i} variant="destructive" className="bg-yellow-50 border-yellow-400 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-600 dark:text-yellow-300 [&>svg]:text-yellow-500">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>{issue}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {flaggedAccounts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><Flag className="mr-3 h-6 w-6 text-red-500" />Flagged Accounts</CardTitle>
                        <CardDescription>These accounts have potential issues that may negatively impact your score.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Issue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {flaggedAccounts.map((account, i) => (
                              <TableRow key={i} className="bg-red-50/50 dark:bg-red-900/20">
                                <TableCell>{account.type}</TableCell>
                                <TableCell className="capitalize">{account.status}</TableCell>
                                <TableCell>{account.issue}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {debtPaydownTimeline.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><CalendarDays className="mr-3 h-6 w-6 text-primary" />Debt Paydown Timeline</CardTitle>
                        <CardDescription>Based on current EMIs and outstanding balances. Does not include interest calculations.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Loan Type</TableHead>
                              <TableHead>Outstanding</TableHead>
                              <TableHead>EMI</TableHead>
                              <TableHead>Months Remaining</TableHead>
                              <TableHead>Est. Payoff Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {debtPaydownTimeline.map((item, i) => (
                              <TableRow key={i}>
                                <TableCell>{item.type}</TableCell>
                                <TableCell>₹{item.balance.toLocaleString('en-IN')}</TableCell>
                                <TableCell>₹{item.emi.toLocaleString('en-IN')}</TableCell>
                                <TableCell>{item.monthsRemaining}</TableCell>
                                <TableCell>{item.payoffDate}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
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
                            <label className="text-sm font-medium">Total Monthly EMI</label>
                            <Input type="text" placeholder="e.g. 25000" value={totalEmi} onChange={(e) => setTotalEmi(e.target.value)} />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Other Monthly Obligations (Rent, etc.)</label>
                            <Input type="text" placeholder="e.g. 15000" value={otherObligations} onChange={(e) => setOtherObligations(e.target.value)} />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Target Debt-to-Income (DTI) Ratio</label>
                            <Select value={dtiRatio} onValueChange={setDtiRatio}>
                              <SelectTrigger>
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

                  {activeView === 'visualizations' && (
                    <div className="lg:col-span-3">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center"><BarChartBig className="mr-3 h-6 w-6 text-primary" />Credit Visualizations</CardTitle>
                          <CardDescription>Visual breakdown of your credit report.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <h4 className="font-semibold text-center mb-2">Loan Type Distribution</h4>
                            {loanTypeData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                    <Pie data={loanTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                        {loanTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (<p className="text-center text-muted-foreground">No loan data to display.</p>)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-center mb-2">Outstanding Loan Amounts</h4>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={[{name: 'Outstanding', value: creditSummary.totalOutstanding}, {name: 'Limit', value: creditSummary.totalCreditLimit}]}>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="hsl(var(--primary))" />
                                </BarChart>
                            </ResponsiveContainer>
                          </div>
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

    
