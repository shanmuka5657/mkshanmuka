
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
  TrendingUp,
  BrainCircuit,
  FileSearch,
  Book,
  FileSymlink,
  LineChart,
  CalendarDays,
  ShieldAlert,
  Flag,
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

type QuestionnaireAnswers = { [key: string]: string };
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
type RiskAssessment = {
  score: number;
  level: 'Low' | 'Medium' | 'High';
  factors: { factor: string; severity: string; details: string }[];
  mitigations: { factor: string; action: string }[];
};
type DebtPaydown = {
  type: string;
  balance: number;
  emi: number;
  monthsRemaining: number;
  payoffDate: string;
};
type FlaggedAccount = LoanAccount & { issue: string };

const questionnaireItems = [
    { id: 'paymentHistory', label: 'Payment History (Highest DPD in last 12 months)', options: ["No DPD in last 12 months", "1–2 DPD <30 days", "Frequent 30 DPD (3–4 times)", "1 DPD = 60 days", "2+ DPDs 60+ or 1 DPD 90+", "180+/999 DPD or default once", "Multiple 999 / Write-off"] },
    { id: 'creditUtilization', label: 'Credit Utilization (%)', options: ["<10%", "10–30%", "30–50%", "50–75%", "75–100%", ">100% or over-limit"] },
    { id: 'creditAge', label: 'Credit Age (Oldest Account)', options: [">7 years", "5–7 years", "3–5 years", "1–3 years", "<1 year", "All <6 months"] },
    { id: 'creditMix', label: 'Credit Mix', options: ["Secured + Unsecured", "Only one type but diverse", "Only 1 type", "Only 1 type, short history"] },
    { id: 'inquiries', label: 'Inquiries (Last 12 months)', options: ["0–1", "2–3", "4–5", "6+"] },
    { id: 'dpdRecent', label: 'DPD Last 3 Months', options: ["All 000", "1 DPD = 30", "1 DPD = 60+", "Any 90/999"] },
    { id: 'writtenOff', label: 'Written-off/Settled Accounts', options: ["None ever", "Settled 2+ years ago", "Settled in last 1–2 years", "Active write-off"] },
    { id: 'activeAccounts', label: 'Active Accounts', options: ["3–5", "6–8", "1–2", "0 or >8", "All closed"] },
    { id: 'overdue', label: 'Overdue Amount', options: ["₹0", "₹1–1000", "₹1001–5000", ">₹5000"] },
    { id: 'recentOpenings', label: 'Recent Account Openings (Last 6 months)', options: ["0–1", "2", "3–4", "5+"] },
    { id: 'loanPurpose', label: 'Loan Purpose', options: ["Home/Education/Business", "Auto/Gold", "Personal/BNPL"] },
    { id: 'utilTrend', label: 'Utilization Trend (3 months)', options: ["Decreasing", "Stable", "Increasing", "Sudden spike"] },
    { id: 'institution', label: 'Institution Quality', options: ["PSU/Private Bank", "Tier-1 NBFC", "Small NBFC", "Unknown"] },
    { id: 'emiRatio', label: 'EMI-to-Income Ratio', options: ["<30%", "30–40%", "40–50%", ">50%"] },
];

const scoringMaps = {
    paymentHistory: { "No DPD in last 12 months": 30, "1–2 DPD <30 days": 28, "Frequent 30 DPD (3–4 times)": 24, "1 DPD = 60 days": 20, "2+ DPDs 60+ or 1 DPD 90+": 15, "180+/999 DPD or default once": 8, "Multiple 999 / Write-off": 2 },
    creditUtilization: { "<10%": 15, "10–30%": 14, "30–50%": 11, "50–75%": 7, "75–100%": 4, ">100% or over-limit": 1 },
    creditAge: { ">7 years": 7, "5–7 years": 6, "3–5 years": 5, "1–3 years": 3, "<1 year": 1, "All <6 months": 0 },
    creditMix: { "Secured + Unsecured": 5, "Only one type but diverse": 4, "Only 1 type": 2, "Only 1 type, short history": 0 },
    inquiries: { "0–1": 5, "2–3": 4, "4–5": 2, "6+": 0 },
    dpdRecent: { "All 000": 5, "1 DPD = 30": 4, "1 DPD = 60+": 2, "Any 90/999": 0 },
    writtenOff: { "None ever": 7, "Settled 2+ years ago": 5, "Settled in last 1–2 years": 3, "Active write-off": 1 },
    activeAccounts: { "3–5": 4, "6–8": 3, "1–2": 2, "0 or >8": 1, "All closed": 0 },
    overdue: { "₹0": 4, "₹1–1000": 3, "₹1001–5000": 2, ">₹5000": 1 },
    recentOpenings: { "0–1": 4, "2": 3, "3–4": 2, "5+": 0 },
    loanPurpose: { "Home/Education/Business": 3, "Auto/Gold": 2, "Personal/BNPL": 1 },
    utilTrend: { "Decreasing": 3, "Stable": 2, "Increasing": 1, "Sudden spike": 0 },
    institution: { "PSU/Private Bank": 4, "Tier-1 NBFC": 3, "Small NBFC": 2, "Unknown": 1 },
    emiRatio: { "<30%": 4, "30–40%": 3, "40–50%": 2, ">50%": 1 },
};

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
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<QuestionnaireAnswers>({});
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
  const [customScore, setCustomScore] = useState<number | null>(null);
  const [customScoreRating, setCustomScoreRating] = useState<string | null>(null);
  const [creditSummary, setCreditSummary] = useState<CreditSummary>(initialCreditSummary);
  const [dpdSummary, setDpdSummary] = useState<DpdSummary>(initialDpdSummary);
  const [accountDpdStatus, setAccountDpdStatus] = useState<AccountDpdStatus[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment>(initialRiskAssessment);
  const [potentialIssues, setPotentialIssues] = useState<string[]>([]);
  const [debtPaydownTimeline, setDebtPaydownTimeline] = useState<DebtPaydown[]>([]);
  const [flaggedAccounts, setFlaggedAccounts] = useState<FlaggedAccount[]>([]);


  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
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
    setConsumerInfo({});
    setAiAnalysis('');
    setIsAnalyzing(false);
    setQuestionnaireAnswers({});
    setAiSuggestions('');
    setIsSuggesting(false);
    setTotalEmi('');
    setOtherObligations('');
    setDtiRatio('40');
    setCustomDti('');
    setEstimatedIncome(null);
    setAiDebtAdvice('');
    setIsAdvising(false);
    setCustomScore(null);
    setCustomScoreRating(null);
    setShowRawText(false);
    setCreditSummary(initialCreditSummary);
    setDpdSummary(initialDpdSummary);
    setAccountDpdStatus([]);
    setRiskAssessment(initialRiskAssessment);
    setPotentialIssues([]);
    setDebtPaydownTimeline([]);
    setFlaggedAccounts([]);
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
  
    const assessCreditRisk = (loans: LoanAccount[], inquiries: Inquiry[]): RiskAssessment => {
        let riskScore = 100; // Start with perfect score
        const riskFactors: RiskAssessment['factors'] = [];
        const mitigations: RiskAssessment['mitigations'] = [];

        // 1. Payment History Analysis
        let latePaymentsCount = 0;
        let maxDPD = 0;
        loans.forEach(loan => {
            if (loan.paymentHistory) {
                const dpdMatches = loan.paymentHistory.match(/\d+/g) || [];
                dpdMatches.forEach(match => {
                    const dpd = parseInt(match, 10);
                    if (!isNaN(dpd) && dpd > 0) {
                        latePaymentsCount++;
                        if (dpd > maxDPD) maxDPD = dpd;
                    }
                });
            }
        });

        if (maxDPD > 0) {
            let severity = 'Low';
            if (maxDPD >= 90) { severity = 'High'; riskScore -= 30; }
            else if (maxDPD >= 30) { severity = 'Medium'; riskScore -= 20; }
            else { riskScore -= 10; }
            riskFactors.push({ factor: 'Late Payments', severity, details: `Detected ${latePaymentsCount} late payment(s), with a maximum of ${maxDPD} days past due.` });
            mitigations.push({ factor: 'Late Payments', action: 'Ensure all future payments are made on time. Set up automatic payments to avoid missing due dates.' });
        }

        // 2. High Credit Utilization
        const totalLimit = creditSummary.totalCreditLimit;
        const totalOutstanding = creditSummary.totalOutstanding;
        const utilization = totalLimit > 0 ? Math.round((totalOutstanding / totalLimit) * 100) : 0;
        if (utilization > 30) {
            let severity = 'Low';
            if (utilization > 80) { severity = 'High'; riskScore -= 25; }
            else if (utilization > 50) { severity = 'Medium'; riskScore -= 15; }
            else { riskScore -= 5; }
            riskFactors.push({ factor: 'High Credit Utilization', severity, details: `Overall credit utilization is ${utilization}%, which is above the recommended 30%.` });
            mitigations.push({ factor: 'High Credit Utilization', action: 'Pay down balances on revolving credit lines. Aim to keep utilization below 30%.' });
        }
        
        // 3. Negative Accounts (Written Off, Settled, Doubtful)
        const negativeAccounts = creditSummary.writtenOff + creditSummary.settled + creditSummary.doubtful;
        if (negativeAccounts > 0) {
            riskScore -= (creditSummary.writtenOff * 20 + creditSummary.settled * 10 + creditSummary.doubtful * 15);
            riskFactors.push({ factor: 'Negative Accounts', severity: 'High', details: `Found ${creditSummary.writtenOff} written-off, ${creditSummary.settled} settled, and ${creditSummary.doubtful} doubtful accounts.` });
            mitigations.push({ factor: 'Negative Accounts', action: 'Address these accounts by negotiating settlements or payment plans with lenders. This is a top priority.' });
        }

        // 4. Recent Inquiries
        const recentInquiries = inquiries.filter(inq => {
            const inqDate = new Date(inq.date.split('-').reverse().join('-'));
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return inqDate > sixMonthsAgo;
        }).length;

        if (recentInquiries > 3) {
            const severity = recentInquiries > 6 ? 'Medium' : 'Low';
            riskScore -= (severity === 'Medium' ? 15 : 5);
            riskFactors.push({ factor: 'Multiple Recent Inquiries', severity, details: `${recentInquiries} credit inquiries in the last 6 months can indicate credit-seeking behavior.` });
            mitigations.push({ factor: 'Multiple Recent Inquiries', action: 'Space out credit applications. Avoid applying for new credit unless necessary.' });
        }

        riskScore = Math.max(0, Math.min(100, riskScore));
        let level: RiskAssessment['level'] = 'Low';
        if (riskScore < 50) level = 'High';
        else if (riskScore < 75) level = 'Medium';
        
        return { score: riskScore, level, factors: riskFactors, mitigations };
    };


  const parseCibilData = (text: string) => {
      const scoreMatch = text.match(/(?:CIBIL SCORE|CREDIT SCORE)\s*:?\s*(\d{3})/i);
      if (scoreMatch) {
        setCreditScore(parseInt(scoreMatch[1], 10));
      }
      
      const nameMatch = text.match(/(?:Name)\s*:\s*(.*?)(?:Date of Birth)/i);
      const dobMatch = text.match(/(?:Date of Birth)\s*:\s*(\d{2}-\d{2}-\d{4})/i);
      const panMatch = text.match(/(?:PAN)\s*:\s*([A-Z]{5}[0-9]{4}[A-Z]{1})/i);
      const genderMatch = text.match(/Gender\s*:\s*(Male|Female)/i);
      const addressMatch = text.match(/ADDRESS\(ES\):\s*([\s\S]*?)(?:CATEGORY|PERMANENT ADDRESS)/i);


      let info: Record<string, string> = {};
      if (nameMatch) info['Name'] = nameMatch[1].trim();
      if (dobMatch) info['Date of Birth'] = dobMatch[1];
      if (panMatch) info['PAN'] = panMatch[1];
      if (genderMatch) info['Gender'] = genderMatch[1];
      if (addressMatch) info['Address'] = addressMatch[1].replace(/\s+/g, ' ').trim();

      setConsumerInfo(info);
      
      const emiMatch = text.match(/TOTAL MONTHLY PAYMENT AMOUNT\s*:\s*Rs\. ([\d,]+)/i);
      if (emiMatch) {
          setTotalEmi(emiMatch[1].replace(/,/g, ''));
      }

      const accountSections = text.split(/ACCOUNT DETAILS/i)[1]?.split(/ACCOUNT /i) || [];
      const loans: LoanAccount[] = [];
      const currentFlaggedAccounts: FlaggedAccount[] = [];
      
      let summary: CreditSummary = { ...initialCreditSummary };
      summary.totalAccounts = accountSections.length > 1 ? accountSections.length - 1 : 0;

      let totalLimit = 0;
      let totalOutstanding = 0;
      let totalDebt = 0;
      let totalEMI = 0;
      let maxEMI = 0;
      let ccPayments = 0;
      
      const dpdCounts: DpdSummary = { ...initialDpdSummary };
      const accountDpdDetails: AccountDpdStatus[] = [];

      accountSections.slice(1).forEach(section => {
          const typeMatch = section.match(/Account Type\s*:\s*(.+)/i) || section.match(/Type\s*:\s*(.+)/i);
          const accountType = typeMatch ? typeMatch[1].trim() : "N/A";

          const statusMatch = section.match(/Account Status\s*:\s*([A-Za-z\s]+)/i);
          const accountStatus = statusMatch ? statusMatch[1].trim().toLowerCase() : '';
          
          const sanctionedMatch = section.match(/(?:Credit Limit|Sanctioned Amount)\s*:\s*Rs\. ([\d,]+)/i);
          const balanceMatch = section.match(/Current Balance\s*:\s*Rs\. ([\d,]+)/i);
          const overdueMatch = section.match(/Amount Overdue\s*:\s*Rs\. ([\d,]+)/i);
          const emiMatchS = section.match(/EMI Amount\s*:\s*Rs\. ([\d,]+)/i);
          const openedMatch = section.match(/Date Opened\s*:\s*(\d{2}-\d{2}-\d{4})/i);
          const closedMatch = section.match(/Date Closed\s*:\s*(\d{2}-\d{2}-\d{4})/i);
          const paymentHistoryMatch = section.match(/Payment History\s*:([\s\S]+?)(?=Written-off Status|$)/i);

          const loan: LoanAccount = {
              type: accountType,
              ownership: section.match(/Ownership\s*:\s*(.+)/i)?.[1].trim() || 'N/A',
              status: accountStatus,
              sanctioned: sanctionedMatch ? sanctionedMatch[1].replace(/,/g, '') : '0',
              balance: balanceMatch ? balanceMatch[1].replace(/,/g, '') : '0',
              overdue: overdueMatch ? overdueMatch[1].replace(/,/g, '') : '0',
              emi: emiMatchS ? emiMatchS[1].replace(/,/g, '') : '0',
              opened: openedMatch ? openedMatch[1] : 'N/A',
              closed: closedMatch ? closedMatch[1] : 'N/A',
              paymentHistory: paymentHistoryMatch ? paymentHistoryMatch[1].trim().replace(/\s+/g, ' ') : 'N/A',
          };
          loans.push(loan);

          let isFlagged = false;
          let issue = '';

          if (accountStatus.includes('active') || accountStatus.includes('open')) {
              summary.activeAccounts += 1;
          } else if (accountStatus.includes('closed')) {
              summary.closedAccounts += 1;
          }
          if (accountStatus.includes('written off')) { summary.writtenOff += 1; issue = 'Written Off'; isFlagged = true; }
          if (accountStatus.includes('settled')) { summary.settled += 1; issue = 'Settled'; isFlagged = true; }
          if (accountStatus.includes('doubtful')) { summary.doubtful += 1; issue = 'Doubtful'; isFlagged = true; }
          
          const overdueAmount = parseInt(loan.overdue, 10);
          if (overdueAmount > 0) {
              issue = `Overdue amount of ₹${overdueAmount.toLocaleString()}`;
              isFlagged = true;
          }
          
          if (isFlagged) {
              currentFlaggedAccounts.push({ ...loan, issue });
          }


          const limit = parseInt(loan.sanctioned, 10) || 0;
          totalLimit += limit;

          const outstanding = parseInt(loan.balance, 10) || 0;
          totalOutstanding += outstanding;
          totalDebt += outstanding;

          const emi = parseInt(loan.emi, 10) || 0;
          totalEMI += emi;
          if (emi > maxEMI) maxEMI = emi;
          

          if (section.toLowerCase().includes('credit card')) {
              ccPayments += Math.max(outstanding * 0.05, 1000); // 5% or 1000
          }
          
          const paymentHistory = loan.paymentHistory;
          const dpdValues = (paymentHistory.match(/\d+/g) || []).map(Number);
          const highestDpd = dpdValues.length > 0 ? Math.max(...dpdValues) : 0;
          
          if (highestDpd === 0) dpdCounts.onTime += 1;
          else if (highestDpd <= 30) dpdCounts.days1_30 += 1;
          else if (highestDpd <= 60) dpdCounts.days31_60 += 1;
          else if (highestDpd <= 90) dpdCounts.days61_90 += 1;
          else if (highestDpd < 999) dpdCounts.days90plus += 1;
          else if (highestDpd === 999) dpdCounts.default += 1;

          accountDpdDetails.push({
              accountType: accountType,
              status: accountStatus || 'N/A',
              highestDpd,
              paymentHistory,
          });
      });
      
      setFlaggedAccounts(currentFlaggedAccounts);
      setDpdSummary(dpdCounts);
      setAccountDpdStatus(accountDpdDetails);
      
      summary.totalCreditLimit = totalLimit;
      summary.totalOutstanding = totalOutstanding;
      summary.totalDebt = totalDebt;
      summary.creditUtilization = totalLimit > 0 ? Math.round((totalOutstanding / totalLimit) * 100) : 0;
      summary.debtToLimitRatio = totalLimit > 0 ? Math.round((totalDebt / totalLimit) * 100) : 0;
      summary.totalMonthlyEMI = totalEMI;
      summary.maxSingleEMI = maxEMI;
      summary.creditCardPayments = Math.round(ccPayments);
      
      setCreditSummary(summary);
      setTotalEmi(String(totalEMI));

      const inquiries: Inquiry[] = (text.match(/(\d{2}-\d{2}-\d{4})\s+([A-Z\s]+)\s+(.+)/g) || [])
          .map(line => {
              const parts = line.match(/(\d{2}-\d{2}-\d{4})\s+([A-Z\s]+?)\s+(.+)/);
              if (parts) {
                  return { date: parts[1], lender: parts[2].trim(), purpose: parts[3].trim() };
              }
              return null;
          }).filter((inq): inq is Inquiry => inq !== null);

      const risk = assessCreditRisk(loans, inquiries);
      setRiskAssessment(risk);

      const issues = [];
      if (summary.writtenOff > 0) issues.push(`${summary.writtenOff} account(s) are Written Off. This severely impacts your score.`);
      if (summary.settled > 0) issues.push(`${summary.settled} account(s) are Settled. This negatively impacts your score.`);
      if (summary.doubtful > 0) issues.push(`${summary.doubtful} account(s) are Doubtful. This is a very negative mark.`);
      if (summary.creditUtilization > 30) issues.push(`Your credit utilization is high at ${summary.creditUtilization}%. It's recommended to keep it below 30%.`);
      const totalOverdue = loans.reduce((acc, loan) => acc + parseInt(loan.overdue, 10), 0);
      if (totalOverdue > 0) issues.push(`You have a total overdue amount of ₹${totalOverdue.toLocaleString()}.`);

      setPotentialIssues(issues);

      const timeline: DebtPaydown[] = loans
          .filter(loan => parseInt(loan.balance, 10) > 0 && parseInt(loan.emi, 10) > 0)
          .map(loan => {
              const balance = parseInt(loan.balance, 10);
              const emi = parseInt(loan.emi, 10);
              const monthsRemaining = Math.ceil(balance / emi);
              const payoffDate = new Date();
              payoffDate.setMonth(payoffDate.getMonth() + monthsRemaining);
              return {
                  type: loan.type,
                  balance,
                  emi,
                  monthsRemaining,
                  payoffDate: payoffDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }),
              };
          });
      setDebtPaydownTimeline(timeline);
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
    } catch (error) {
      console.error('Error analyzing report:', error);
       toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not get AI analysis. Please try again.",
      })
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (Object.keys(questionnaireAnswers).length !== questionnaireItems.length) {
      toast({
        variant: "destructive",
        title: "Questionnaire Incomplete",
        description: "Please answer all questions before getting suggestions.",
      })
      return;
    }
    setIsSuggesting(true);
    setAiSuggestions('');
    try {
      const input = {
          ...questionnaireAnswers,
          cibilSummary: rawText.substring(0, 4000)
      } as any;
      const result = await getCreditImprovementSuggestions(input);
      setAiSuggestions(result.suggestions);
    } catch (error) {
      console.error('Error getting suggestions:', error);
       toast({
        variant: "destructive",
        title: "Failed to get suggestions",
        description: "Could not get AI suggestions. Please try again.",
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
            creditReportAnalysis: aiAnalysis || rawText.substring(0, 4000)
        });
        setAiDebtAdvice(result.advice);
    } catch (error) {
       console.error('Error getting debt advice:', error);
       toast({ variant: "destructive", title: "Failed to get advice", description: "Could not get AI debt advice. Please try again."})
    } finally {
        setIsAdvising(false);
    }
  };
  
  const calculateCustomScore = useCallback(() => {
    let totalScore = 0;
    const maxScore = Object.values(scoringMaps).reduce((acc, map) => acc + Math.max(...Object.values(map)), 0);

    Object.keys(questionnaireAnswers).forEach(key => {
        const answer = questionnaireAnswers[key];
        const scoreMap = scoringMaps[key as keyof typeof scoringMaps];
        if (scoreMap && answer in scoreMap) {
            totalScore += scoreMap[answer as keyof typeof scoreMap];
        }
    });

    const scaledScore = Math.round((totalScore / maxScore) * 600 + 300);
    setCustomScore(scaledScore);

    if (scaledScore >= 800) setCustomScoreRating("Excellent");
    else if (scaledScore >= 750) setCustomScoreRating("Very Good");
    else if (scaledScore >= 700) setCustomScoreRating("Good");
    else if (scaledScore >= 650) setCustomScoreRating("Fair");
    else if (scaledScore >= 600) setCustomScoreRating("Poor");
    else setCustomScoreRating("Very Poor");
  }, [questionnaireAnswers]);


  const handleQuestionnaireChange = (id: string, value: string) => {
    setQuestionnaireAnswers(prev => ({ ...prev, [id]: value }));
  };

  useEffect(() => {
    if (Object.keys(questionnaireAnswers).length === questionnaireItems.length) {
      calculateCustomScore();
    }
  }, [questionnaireAnswers, calculateCustomScore]);

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

  return (
    <div className={cn("min-h-screen bg-background font-body text-foreground", theme)}>
       <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
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
            </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Advanced AI Credit Score Analyzer</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Upload your CIBIL report PDF to unlock instant AI-powered insights, personalized scoring, and actionable advice.</p>
        </div>

        <Card className="mb-8 shadow-lg hover:shadow-xl transition-shadow">
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
            <Card className="text-center p-8 my-8">
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
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <div>
                              <p className="font-semibold">Name:</p>
                              <p>{consumerInfo['Name'] || 'N/A'}</p>
                              <p className="font-semibold mt-2">Date of Birth:</p>
                              <p>{consumerInfo['Date of Birth'] || 'N/A'}</p>
                              <p className="font-semibold mt-2">Gender:</p>
                              <p>{consumerInfo['Gender'] || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="font-semibold">PAN:</p>
                              <p>{consumerInfo['PAN'] || 'N/A'}</p>
                              <p className="font-semibold mt-2">Address:</p>
                              <p>{consumerInfo['Address'] || 'N/A'}</p>
                            </div>
                          </div>
                      </div>
                  </CardContent>
              </Card>

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
                    <DpdSummaryBox label="Default" subtext="(999)" count={dpdSummary.default} colorClass="bg-red-700" />
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

               <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><ShieldAlert className="mr-3 h-6 w-6 text-primary" />Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={cn('p-4 rounded-lg border-l-4', getRiskColorClass(riskAssessment.level))}>
                        <h4 className="font-bold text-lg">{riskAssessment.level} Risk</h4>
                        <p className="text-sm">Your credit risk is {riskAssessment.level.toLowerCase()} (score {riskAssessment.score}/100). You're likely to qualify for credit with favorable terms. Maintain good habits to keep your score strong.</p>
                    </div>
                    {riskAssessment.factors.length > 0 && (
                        <div className="mt-6">
                            <h5 className="font-semibold mb-2">Key Risk Factors:</h5>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {riskAssessment.factors.map((factor, i) => <li key={i}><strong>{factor.factor} ({factor.severity} risk):</strong> {factor.details}</li>)}
                            </ul>
                        </div>
                    )}
                    {riskAssessment.mitigations.length > 0 && (
                        <div className="mt-6">
                            <h5 className="font-semibold mb-2">Risk Mitigation Strategies:</h5>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {riskAssessment.mitigations.map((m, i) => <li key={i}><strong>{m.factor}:</strong> {m.action}</li>)}
                            </ul>
                        </div>
                    )}
                </CardContent>
              </Card>
              
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


              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><ShieldCheck className="mr-3 h-6 w-6 text-primary" />AI-Based Credit Health Scoring</CardTitle>
                  <CardDescription>Complete this questionnaire for a comprehensive credit health assessment.</CardDescription>
                </CardHeader>
                <CardContent>
                  {customScore && (
                    <Card className="mb-6 bg-accent/10 border-accent/50">
                        <CardHeader>
                            <CardTitle className="flex items-center text-primary"><TrendingUp className="mr-2 h-6 w-6"/> Your Estimated Credit Score</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                             <div className="text-7xl font-bold text-primary">{customScore}</div>
                            <p className="text-xl font-semibold text-muted-foreground mt-2">{customScoreRating}</p>
                            <Progress value={(customScore - 300) / 6} className="mt-4 max-w-sm mx-auto" />
                        </CardContent>
                    </Card>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {questionnaireItems.map((item) => (
                      <div key={item.id} className="space-y-2">
                        <label className="text-sm font-medium">{item.label}</label>
                        <Select onValueChange={(value) => handleQuestionnaireChange(item.id, value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {item.options.map((option) => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleGetSuggestions} disabled={isSuggesting || Object.keys(questionnaireAnswers).length !== questionnaireItems.length} className="mt-6">
                    {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    Get AI Credit Improvement Suggestions
                  </Button>
                </CardContent>
              </Card>
              
              {aiSuggestions && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-primary"><Sparkles className="mr-3 h-6 w-6"/>AI-Powered Credit Improvement Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none prose-p:text-foreground/80 prose-headings:text-foreground prose-strong:text-foreground">{aiSuggestions}</div>
                  </CardContent>
                </Card>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
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
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie data={loanTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                              {loanTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        ) : <p className="text-muted-foreground text-center pt-10">No loan data to display.</p>}
                      </div>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>More Visualizations Coming Soon!</AlertTitle>
                        <AlertDescription>
                          We are working on adding more charts for amount comparisons, DPD history, and inquiry timelines.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </div>
                <div className="lg:col-span-2">
                   <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><Calculator className="mr-3 h-6 w-6 text-primary" />AI Income Estimation</CardTitle>
                        <CardDescription>Estimate monthly income based on credit obligations.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Total Monthly EMI (₹)</label>
                          <Input type="number" value={totalEmi} onChange={(e) => setTotalEmi(e.target.value)} placeholder="Auto-filled or enter manually" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Other Monthly Obligations (₹)</label>
                          <Input type="number" value={otherObligations} onChange={(e) => setOtherObligations(e.target.value)} placeholder="Rent, utilities, etc." />
                        </div>
                         <div>
                          <label className="text-sm font-medium">Target Debt-to-Income Ratio (%)</label>
                          <div className="flex gap-2">
                            <Select value={dtiRatio} onValueChange={(val) => {setDtiRatio(val); if (val !== 'custom') { setCustomDti('') } }}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30">30% (Conservative)</SelectItem>
                                <SelectItem value="40">40% (Standard)</SelectItem>
                                <SelectItem value="50">50% (Aggressive)</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                            {dtiRatio === 'custom' && (
                              <Input type="number" value={customDti} onChange={(e) => setCustomDti(e.target.value)} placeholder="e.g., 35" className="w-24"/>
                            )}
                          </div>
                        </div>
                        <Button onClick={handleCalculateIncome}>Estimate Income</Button>
                        {estimatedIncome !== null && (
                          <div className="mt-4 p-4 bg-muted rounded-lg">
                            <h4 className="font-semibold">Estimated Monthly Income:</h4>
                            <p className="text-2xl font-bold text-primary">₹{Math.round(estimatedIncome).toLocaleString('en-IN')}</p>
                            <Button onClick={handleGetDebtAdvice} disabled={isAdvising} className="mt-4 w-full">
                                {isAdvising ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                                Get AI Debt Management Advice
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                </div>
              </div>
              
              {aiDebtAdvice && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-primary"><Sparkles className="mr-3 h-6 w-6"/>AI-Powered Debt Management Advice</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none prose-p:text-foreground/80 prose-headings:text-foreground prose-strong:text-foreground">{aiDebtAdvice}</div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><BrainCircuit className="mr-3 h-6 w-6 text-primary" />Full AI Credit Report Analysis</CardTitle>
                  <CardDescription>Get a detailed analysis of your credit report with personalized recommendations.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                    {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Analyze with AI
                  </Button>
                  {aiAnalysis && (
                      <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                          <h4 className="font-semibold mb-2">AI Analysis Result:</h4>
                          <div className="prose dark:prose-invert max-w-none prose-p:text-foreground/80 prose-headings:text-foreground prose-strong:text-foreground">{aiAnalysis}</div>
                      </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><FileSearch className="mr-3 h-6 w-6 text-primary" />Raw Report Text</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => setShowRawText(!showRawText)} variant="outline">{showRawText ? 'Hide' : 'Show'} Raw Text</Button>
                    {showRawText && (
                        <div className="mt-4 p-4 border rounded-lg bg-muted/50 max-h-96 overflow-y-auto">
                            <pre className="text-xs whitespace-pre-wrap font-mono">{rawText}</pre>
                        </div>
                    )}
                </CardContent>
              </Card>
            </div>
        )}
      </main>
      <footer className="container py-8 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CreditWise AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
