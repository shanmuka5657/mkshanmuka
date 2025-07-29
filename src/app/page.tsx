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

type QuestionnaireAnswers = { [key: string]: string };

const questionnaireItems = [
    { id: 'paymentHistory', label: 'Payment History (Highest DPD in last 12 months)', options: ["No DPD in last 12 months", "1–2 DPD <30 days", "Frequent 30 DPD (3–4 times)", "1 DPD = 60 days", "2+ DPDs 60+ or 1 DPD 90+", "180+/999 DPD or default once", "Multiple 999 / Write-off"] },
    { id: 'creditUtilization', label: 'Credit Utilization (%)', options: ["<10%", "10–30%", "30–50%", "50–75%", "75–100%", ">100% or over-limit"] },
    { id: 'creditAge', label: 'Credit Age (Oldest Account)', options: [">7 years", "5–7 years", "3–5 years", "<1 year", "All <6 months"] },
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
  
  const parseCibilData = (text: string) => {
    const scoreMatch = text.match(/(?:CIBIL SCORE|CREDIT SCORE)\s*:?\s*(\d{3})/i);
    if (scoreMatch) {
      setCreditScore(parseInt(scoreMatch[1], 10));
    }
    const nameMatch = text.match(/(?:Name)\s*:\s*(.*?)(?:Date of Birth)/i);
    const dobMatch = text.match(/(?:Date of Birth)\s*:\s*(\d{2}-\d{2}-\d{4})/i);
    const panMatch = text.match(/(?:PAN)\s*:\s*([A-Z]{5}[0-9]{4}[A-Z]{1})/i);
    
    let info: Record<string, string> = {};
    if(nameMatch) info['Name'] = nameMatch[1].trim();
    if(dobMatch) info['Date of Birth'] = dobMatch[1];
    if(panMatch) info['PAN'] = panMatch[1];
    setConsumerInfo(info);
    
    const emiMatch = text.match(/TOTAL MONTHLY PAYMENT AMOUNT\s*:\s*Rs\. ([\d,]+)/i);
    if(emiMatch) {
        setTotalEmi(emiMatch[1].replace(/,/g, ''));
    }
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
                      <CardTitle className="flex items-center"><FileText className="mr-3 h-6 w-6 text-primary" />Credit Score &amp; Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="text-center">
                          <p className="text-muted-foreground">Official CIBIL Score</p>
                          <div className="text-7xl font-bold text-primary">{creditScore || 'N/A'}</div>
                          {creditScore && <Progress value={scoreProgress} className="mt-4" />}
                      </div>
                      <div>
                          <h4 className="font-semibold mb-2">Consumer Information</h4>
                          <ul className="space-y-1 text-sm list-disc list-inside">
                              {Object.entries(consumerInfo).map(([key, value]) => (
                                  <li key={key}><span className="font-semibold">{key}:</span> {value}</li>
                              ))}
                          </ul>
                      </div>
                  </CardContent>
              </Card>

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
