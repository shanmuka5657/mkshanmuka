
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist';
import {
  UploadCloud,
  FileText,
  BarChartBig,
  Sparkles,
  Trash2,
  Loader2,
  AlertCircle,
  Pencil,
  Download,
  Grid,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Activity,
  User,
  LogOut,
  Home,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useToast } from "@/hooks/use-toast"
import { analyzeCreditReport, AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
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
import { Badge } from '@/components/ui/badge';
import { saveCreditAnalysisSummary } from '@/lib/firestore-service';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

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
      total: '0',
      active: '0',
      closed: '0',
      settled: '0',
      writtenOff: '0',
      doubtful: '0',
      highCredit: '₹0',
      currentBalance: '₹0',
      overdue: '₹0',
      creditUtilization: '0%',
      debtToLimitRatio: '0%',
    },
    enquirySummary: {
      total: '0',
      past30Days: '0',
      past12Months: '0',
      past24Months: '0',
      recentDate: 'N/A',
    },
     dpdSummary: {
        onTime: 0,
        late30: 0,
        late60: 0,
        late90: 0,
        late90Plus: 0,
        default: 0,
    }
  },
  allAccounts: [],
  emiDetails: {
    totalEmi: 0,
    activeLoans: [],
  }
};

const PIE_CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];


const parseCurrency = (currencyString: string): number => {
    if (typeof currencyString !== 'string' || currencyString === '₹NaN') return 0;
    return Number(currencyString.replace(/[^0-9.-]+/g,""));
}

const SummaryBox = ({ title, value, isLoading = false, valueClassName = '' }: { title: string; value: string | number; isLoading?: boolean; valueClassName?: string }) => (
  <Card className="text-center p-3 bg-muted/30">
    <CardDescription className="text-xs text-muted-foreground">{title}</CardDescription>
    {isLoading ? <Loader2 className="h-6 w-6 mx-auto animate-spin" /> : <CardTitle className={cn("text-lg font-bold", valueClassName)}>{value}</CardTitle>}
  </Card>
);

export default function CreditPage() {
  const [creditFile, setCreditFile] = useState<File | null>(null);
  const [creditFileName, setCreditFileName] = useState('No CIBIL report chosen');
  const [rawText, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [analysisResult, setAnalysisResult] = useState<AnalyzeCreditReportOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [accountTypeData, setAccountTypeData] = useState<any[]>([]);
  const [enquiryTrendData, setEnquiryTrendData] = useState<any[]>([]);
  
  const [isClient, setIsClient] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

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
    GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }, []);

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
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setAccountTypeData([]);
    setEnquiryTrendData([]);

    if (creditFileInputRef.current) {
      creditFileInputRef.current.value = '';
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
          const pdf = await getDocument({ data: buffer }).promise;
          let textContent = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const text = await page.getTextContent();
            textContent += text.items.map(item => 'str' in item ? item.str : '').join(' ');
            setProgress(30 + Math.round((70 * i) / pdf.numPages));
          }
          setRawText(textContent);
          handleAnalyzeCreditReport(textContent);
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
      setIsLoading(false);
    }
  };
  
  const handleAnalyzeCreditReport = async (text: string) => {
    setIsAnalyzing(true);
    try {
        const { output, usage } = await analyzeCreditReport({ creditReportText: text });
        setAnalysisResult(output);
        
        // Process data for charts
        const accountTypes = output.allAccounts.reduce((acc, account) => {
            const type = account.type || 'Unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        setAccountTypeData(Object.entries(accountTypes).map(([name, value]) => ({ name, value })));

        setEnquiryTrendData([
            { name: 'Last 30 Days', enquiries: parseInt(output.reportSummary.enquirySummary.past30Days) },
            { name: 'Last 12 Months', enquiries: parseInt(output.reportSummary.enquirySummary.past12Months) },
            { name: 'Last 24 Months', enquiries: parseInt(output.reportSummary.enquirySummary.past24Months) },
        ]);
        
        toast({ title: "Credit Report Analysis Complete", description: "Your AI-powered summary is ready." });

        const scoreMatch = text.match(/(?:CIBIL (?:TRANSUNION )?SCORE|CREDITVISION. SCORE)\s*(\d{3})/i);
        const cibilScore = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

        await saveCreditAnalysisSummary(output, cibilScore);
        toast({
            title: "Report Saved to Database",
            description: `A summary of this analysis has been saved.`,
            variant: 'default',
            className: 'bg-green-100 text-green-800'
        });

    } catch (error: any) {
        console.error('Error analyzing report:', error);
         toast({
            variant: "destructive",
            title: "An Error Occurred",
            description: error.message || "An unknown error occurred. Please try again.",
        });
    } finally {
        setIsAnalyzing(false);
        setIsLoading(false);
    }
  };

  const handleDownload = () => {
    window.print();
  }

  const { reportSummary } = analysisResult || initialAnalysis;
  
  if (!isClient || !firebaseUser) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading...</p>
        </div>
    );
  }

  return (
    <div className="bg-background font-body text-foreground">
      <main className="container mx-auto p-4 md:p-8 printable-area">
          <div className="text-center mb-8 no-print">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Credit Analysis</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Upload your CIBIL report to generate an instant AI-powered summary.</p>
          </div>

          <Card className="mb-8 shadow-lg no-print">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <UploadCloud className="mr-3 h-6 w-6 text-primary" />
                Upload CIBIL Report (PDF)
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
            </CardContent>
          </Card>

          {(isLoading || isAnalyzing) && (
              <Card className="text-center p-8 my-8 no-print">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                  <h3 className="text-xl font-semibold">AI is analyzing your report...</h3>
                  <div className="text-muted-foreground">This may take a moment.</div>
                  {isLoading && !isAnalyzing && <Progress value={progress} className="w-full max-w-md mx-auto mt-4" />}
              </Card>
          )}

          {analysisResult && !isAnalyzing && (
            <div className="space-y-8">
              <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center text-xl">
                                <Grid className="mr-3 h-6 w-6 text-primary" />
                                AI-Powered Credit Summary
                            </CardTitle>
                            <CardDescription>
                                This is a detailed summary of your credit profile, with calculations performed client-side for accuracy.
                            </CardDescription>
                        </div>
                         <Button variant="outline" onClick={handleDownload} className="no-print ml-auto">
                            <Download className="mr-2 h-4 w-4" />
                            Download Report
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        <SummaryBox title="Total Accounts" value={reportSummary.accountSummary.total} />
                        <SummaryBox title="Total Credit Limit" value={reportSummary.accountSummary.highCredit} />
                        <SummaryBox title="Total Outstanding" value={reportSummary.accountSummary.currentBalance} valueClassName="text-destructive" />
                        <SummaryBox title="Credit Utilization" value={reportSummary.accountSummary.creditUtilization} />
                        <SummaryBox title="Debt-to-Limit Ratio" value={reportSummary.accountSummary.debtToLimitRatio} />
                        <SummaryBox title="Active Accounts" value={reportSummary.accountSummary.active} valueClassName="text-green-600" />
                        <SummaryBox title="Closed Accounts" value={reportSummary.accountSummary.closed} />
                        <SummaryBox title="Written Off" value={reportSummary.accountSummary.writtenOff} valueClassName={parseInt(reportSummary.accountSummary.writtenOff) > 0 ? 'text-destructive' : ''} />
                        <SummaryBox title="Settled" value={reportSummary.accountSummary.settled} />
                        <SummaryBox title="Doubtful" value={reportSummary.accountSummary.doubtful} />
                        <SummaryBox title="Total Monthly EMI" value={`₹${analysisResult.emiDetails.totalEmi.toLocaleString('en-IN')}`} />
                    </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl">
                            <PieChartIcon className="mr-3 h-6 w-6 text-primary" />
                            Account Type Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={accountTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {accountTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl">
                            <BarChartIcon className="mr-3 h-6 w-6 text-primary" />
                            Enquiry Trends
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={enquiryTrendData}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip />
                                <Bar dataKey="enquiries" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                        <Clock className="mr-3 h-6 w-6 text-primary" />
                        DPD Analysis
                    </CardTitle>
                    <CardDescription>Your payment history at a glance.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="p-4 rounded-lg bg-green-100 text-green-800 text-center"><div className="font-bold text-2xl">{reportSummary.dpdSummary.onTime}</div><div className="text-sm">ON TIME</div></div>
                    <div className="p-4 rounded-lg bg-yellow-100 text-yellow-800 text-center"><div className="font-bold text-2xl">{reportSummary.dpdSummary.late30}</div><div className="text-sm">1-30 DAYS</div></div>
                    <div className="p-4 rounded-lg bg-orange-100 text-orange-800 text-center"><div className="font-bold text-2xl">{reportSummary.dpdSummary.late60}</div><div className="text-sm">31-60 DAYS</div></div>
                    <div className="p-4 rounded-lg bg-red-100 text-red-800 text-center"><div className="font-bold text-2xl">{reportSummary.dpdSummary.late90}</div><div className="text-sm">61-90 DAYS</div></div>
                    <div className="p-4 rounded-lg bg-red-200 text-red-900 text-center"><div className="font-bold text-2xl">{reportSummary.dpdSummary.late90Plus}</div><div className="text-sm">90+ DAYS</div></div>
                    <div className="p-4 rounded-lg bg-black text-white text-center"><div className="font-bold text-2xl">{reportSummary.dpdSummary.default}</div><div className="text-sm">DEFAULT</div></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Pencil className="mr-3 h-5 w-5 text-primary" /> Account Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="overflow-x-auto">
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
                            <TableHead>Payment History</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {analysisResult.allAccounts.map((account, index) => (
                            <TableRow key={index}>
                            <TableCell className="font-semibold">{account.type}</TableCell>
                             <TableCell>{account.ownership}</TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <Badge variant={cn(account.status.toLowerCase().includes('open') ? 'default' : account.status.toLowerCase().includes('closed') ? 'secondary' : 'destructive') as any}>
                                        {account.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground mt-1">
                                        {account.status.toLowerCase().includes('closed') ? `Closed: ${account.closed}` : `Opened: ${account.opened}`}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>{account.sanctioned}</TableCell>
                            <TableCell>{account.outstanding}</TableCell>
                            <TableCell>{account.overdue}</TableCell>
                            <TableCell>{account.emi}</TableCell>
                            <TableCell className="max-w-xs truncate font-mono text-xs">{account.paymentHistory}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                   </div>
                </CardContent>
              </Card>
            </div>
          )}
      </main>
    </div>
  );
}
