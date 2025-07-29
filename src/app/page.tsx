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
  Download,
  Trash2,
  Moon,
  Sun,
  Loader2,
  AlertCircle
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

export default function CreditWiseAIPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('No file chosen');
  const [rawText, setRawText] = useState('');
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
  const [estimatedIncome, setEstimatedIncome] = useState<number | null>(null);
  const [aiDebtAdvice, setAiDebtAdvice] = useState('');
  const [isAdvising, setIsAdvising] = useState(false);
  const [theme, setTheme] = useState('light');

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
    setEstimatedIncome(null);
    setAiDebtAdvice('');
    setIsAdvising(false);
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
            setProgress(30 + (70 * i / pdf.numPages));
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
    // Credit Score
    const scoreMatch = text.match(/(?:CIBIL SCORE|CREDIT SCORE)\s*:?\s*(\d{3})/i);
    if (scoreMatch) {
      setCreditScore(parseInt(scoreMatch[1], 10));
    }

    // Consumer Info
    const nameMatch = text.match(/(?:Name)\s*:\s*(.*?)(?:Date of Birth)/i);
    const dobMatch = text.match(/(?:Date of Birth)\s*:\s*(\d{2}-\d{2}-\d{4})/i);
    const panMatch = text.match(/(?:PAN)\s*:\s*([A-Z]{5}[0-9]{4}[A-Z]{1})/i);
    
    let info: Record<string, string> = {};
    if(nameMatch) info['Name'] = nameMatch[1].trim();
    if(dobMatch) info['Date of Birth'] = dobMatch[1];
    if(panMatch) info['PAN'] = panMatch[1];
    setConsumerInfo(info);
    
    // Auto-fill total EMI
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
      } as any; // Cast to any to match GenAI flow input
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
      if (!totalEmi || !otherObligations) {
          toast({ variant: "destructive", title: "Missing fields", description: "Please fill Total EMI and Other Obligations."})
          return;
      }
      const totalObligations = parseFloat(totalEmi) + parseFloat(otherObligations);
      const income = (totalObligations / (parseFloat(dtiRatio) / 100));
      setEstimatedIncome(income);
  };

  const handleGetDebtAdvice = async () => {
    if (!estimatedIncome) {
        toast({ variant: "destructive", title: "Calculate Income First", description: "Please estimate your income before getting advice."})
        return;
    }
    setIsAdvising(true);
    setAiDebtAdvice('');
    try {
        const result = await getDebtManagementAdvice({
            totalEmi: parseFloat(totalEmi),
            otherObligations: parseFloat(otherObligations),
            dtiRatio: parseFloat(dtiRatio),
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
  
  const handleQuestionnaireChange = (id: string, value: string) => {
    setQuestionnaireAnswers(prev => ({ ...prev, [id]: value }));
  };

  const loanTypeData = [
    { name: 'Personal', value: rawText.match(/PERSONAL LOAN/gi)?.length || 2 },
    { name: 'Credit Card', value: rawText.match(/CREDIT CARD/gi)?.length || 3 },
    { name: 'Auto', value: rawText.match(/AUTO LOAN/gi)?.length || 1 },
    { name: 'Home', value: rawText.match(/HOME LOAN/gi)?.length || 1 },
  ].filter(d => d.value > 0);
  
  const PIE_COLORS = ['#3F51B5', '#8BC34A', '#FFC107', '#03A9F4'];

  const scoreProgress = creditScore ? (creditScore - 300) / 6 : 0;

  return (
    <div className={cn("min-h-screen bg-background font-body", theme)}>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
            <div className="mr-4 flex items-center">
              <Sparkles className="h-6 w-6 mr-2 text-primary" />
              <span className="font-bold">CreditWise AI</span>
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
        <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Advanced AI Credit Score Analyzer</h1>
            <p className="mt-2 text-lg text-muted-foreground">Upload your CIBIL report to get instant AI-powered insights.</p>
        </div>

        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="flex items-center"><UploadCloud className="mr-2 h-5 w-5" />Upload Your CIBIL Report (PDF)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-4">
                    <Button onClick={() => fileInputRef.current?.click()}>
                        Choose PDF File
                    </Button>
                    <Input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                    <span className="text-muted-foreground">{fileName}</span>
                    {file && (
                        <Button variant="ghost" size="icon" onClick={resetState}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                 <p className="mt-3 text-sm text-muted-foreground">Note: This tool analyzes your report locally in your browser. Your data is not uploaded to any server.</p>
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
                      <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5" />Credit Score &amp; Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="text-center">
                          <div className="text-7xl font-bold text-primary">{creditScore || 'N/A'}</div>
                          <p className="text-muted-foreground mt-2">A score above 750 is considered excellent</p>
                          {creditScore && <Progress value={scoreProgress} className="mt-4" />}
                      </div>
                      <div>
                          <h4 className="font-semibold mb-2">Consumer Information</h4>
                          <ul className="space-y-1 text-sm">
                              {Object.entries(consumerInfo).map(([key, value]) => (
                                  <li key={key}><strong>{key}:</strong> {value}</li>
                              ))}
                          </ul>
                      </div>
                  </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><ShieldCheck className="mr-2 h-5 w-5" />AI-Based Credit Health Scoring</CardTitle>
                  <CardDescription>Complete this questionnaire for a comprehensive credit health assessment.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {questionnaireItems.map((item, index) => (
                      <div key={item.id} className="space-y-2">
                        <label className="text-sm font-medium">{index + 1}. {item.label}</label>
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
                  <Button onClick={handleGetSuggestions} disabled={isSuggesting} className="mt-6">
                    {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    Get AI Credit Improvement Suggestions
                  </Button>
                </CardContent>
              </Card>
              
              {aiSuggestions && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-primary"><Sparkles className="mr-2 h-5 w-5"/>AI-Powered Credit Improvement Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none">{aiSuggestions}</div>
                  </CardContent>
                </Card>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center"><BarChartBig className="mr-2 h-5 w-5" />Credit Visualizations</CardTitle>
                      <CardDescription>Visual breakdown of your credit report.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="font-semibold text-center mb-2">Loan Type Distribution</h4>
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
                        <CardTitle className="flex items-center"><Calculator className="mr-2 h-5 w-5" />AI Income Estimation</CardTitle>
                        <CardDescription>Estimate your monthly income based on credit obligations.</CardDescription>
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
                          <Select value={dtiRatio} onValueChange={setDtiRatio}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30">30% (Conservative)</SelectItem>
                              <SelectItem value="40">40% (Standard)</SelectItem>
                              <SelectItem value="50">50% (Aggressive)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleCalculateIncome}>Estimate Income</Button>
                        {estimatedIncome !== null && (
                          <div className="mt-4 p-4 bg-muted rounded-lg">
                            <h4 className="font-semibold">Estimated Monthly Income:</h4>
                            <p className="text-2xl font-bold text-primary">₹{Math.round(estimatedIncome).toLocaleString('en-IN')}</p>
                            <Button onClick={handleGetDebtAdvice} disabled={isAdvising} className="mt-4 w-full">
                                {isAdvising ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
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
                    <CardTitle className="flex items-center text-primary"><Sparkles className="mr-2 h-5 w-5"/>AI-Powered Debt Management Advice</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none">{aiDebtAdvice}</div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><Sparkles className="mr-2 h-5 w-5" />Full AI Credit Report Analysis</CardTitle>
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
                          <div className="prose dark:prose-invert max-w-none">{aiAnalysis}</div>
                      </div>
                  )}
                </CardContent>
              </Card>
            </div>
        )}
      </main>
    </div>
  );
}
