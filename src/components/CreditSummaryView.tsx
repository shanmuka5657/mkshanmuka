
"use client";

import React, { useState, useMemo, useTransition, useEffect, useCallback, useRef } from 'react';
import type { AnalyzeCreditReportOutput, AccountDetail } from '@/ai/flows/credit-report-analysis';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { ArrowLeft, Download, InfoIcon } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { BehaviorAnalysisCard, BehaviorAnalysisData } from "./BehaviorAnalysisCard";
import { summarizePaymentBehavior, SummarizePaymentBehaviorInput } from "@/ai/flows/summarize-payment-behavior";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Textarea } from './ui/textarea';
import { PrintHeader } from './PrintHeader';

interface EnhancedAccountDetail extends AccountDetail {
  isConsidered: boolean;
  manualEmi?: number;
}

interface BaseAccount {
  emi?: string | number | null;
  // Include other common properties from AccountDetail if needed
}

type ChangeLog = {
    id: string;
    text: string;
}

interface CreditSummaryViewProps {
  analysisResult: AnalyzeCreditReportOutput;
  onBack: () => void;
}

const SummaryCard = ({ title, value, subValue }: { title: string; value: string | number; subValue?: string }) => (
    <div className="bg-background border rounded-lg p-4 flex-1 text-center min-w-[120px]">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
    </div>
);

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case 'active': return 'bg-green-500';
        case 'open': return 'bg-green-500';
        case 'closed': return 'bg-gray-500';
        default: return 'bg-red-500';
    }
};

const DpdCircle = ({ value }: { value: string | number }) => {
    let displayValue: string | number = value;
    if (value === 'STD' || value === '000' || value === '0') displayValue = '0';
    if (value === 'XXX') displayValue = 'X';

    const getDpdColor = (dpdStr: string | number) => {
        if (dpdStr === 'STD' || dpdStr === '0' || dpdStr === '000' || dpdStr === 0) {
            return 'bg-green-500';
        }
        if (dpdStr === 'XXX') return 'bg-gray-400';
        
        const dpd = parseInt(String(dpdStr), 10);
        if (isNaN(dpd)) return 'bg-gray-400';

        if (dpd > 0 && dpd <= 30) return 'bg-yellow-500';
        if (dpd > 30 && dpd <= 60) return 'bg-orange-500';
        if (dpd > 60 && dpd <= 90) return 'bg-red-500';
        if (dpd > 90) return 'bg-red-700';

        return 'bg-green-500'; // Default for 0
    };
    
    return (
        <div title={`DPD: ${value}`} className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-mono", getDpdColor(value))}>
            <span className="scale-75">{String(displayValue)}</span>
        </div>
    )
}

function isEnhancedAccountDetail(acc: BaseAccount | EnhancedAccountDetail): acc is EnhancedAccountDetail {
    return (acc as EnhancedAccountDetail).isConsidered !== undefined;
}

const parseEmiString = (emi: string | number | null | undefined): number => {
    const emiString = String(emi ?? '0');
    const parsedEmi = Number(emiString.replace(/[^0-9.]+/g, ""));
    return isNaN(parsedEmi) ? 0 : parsedEmi;
};

const getEmiValue = (acc: BaseAccount | EnhancedAccountDetail): number => {
    // Prefer manualEmi if it exists and is not undefined/null
    if (isEnhancedAccountDetail(acc) && acc.manualEmi !== undefined && acc.manualEmi !== null) {
        return acc.manualEmi;
    }
    // Otherwise, parse the original emi string
    return parseEmiString(acc.emi);
};


type OwnershipType = 'Individual' | 'Guarantor' | 'Joint';

export function CreditSummaryView({ analysisResult, onBack }: CreditSummaryViewProps) {
    const { toast } = useToast();
    const [detailedAccounts, setDetailedAccounts] = useState<EnhancedAccountDetail[]>(
        analysisResult.allAccounts.map(acc => ({...acc, isConsidered: true }))
    );
    const [dpdFilter, setDpdFilter] = useState('12');
    const [isAiSummaryLoading, startAiSummaryTransition] = useTransition();
    const summaryRef = useRef<HTMLDivElement>(null);
    const printHeaderRef = useRef<HTMLDivElement>(null);


    const [behaviorAnalyses, setBehaviorAnalyses] = useState<Record<string, BehaviorAnalysisData | null>>({
        'Individual': null,
        'Guarantor': null,
        'Joint': null,
    });
    const [userChanges, setUserChanges] = useState<ChangeLog[]>([]);
    
    const [commentDialogOpen, setCommentDialogOpen] = useState(false);
    const [activeChange, setActiveChange] = useState<{index: number, updates: Partial<EnhancedAccountDetail>, oldAccount: EnhancedAccountDetail} | null>(null);
    const [comment, setComment] = useState("");

    const activeAccounts = useMemo(() => detailedAccounts.filter(acc => acc.status.toLowerCase() === 'active' || acc.status.toLowerCase() === 'open'), [detailedAccounts]);

    const summaryData = useMemo(() => {
        const consideredAccounts = detailedAccounts.filter(acc => acc.isConsidered);
        const totalSanctionedNum = consideredAccounts.reduce((sum, acc) => sum + Number(String(acc.sanctioned).replace(/[^0-9.-]+/g,"")), 0);
        const totalOutstandingNum = consideredAccounts.reduce((sum, acc) => sum + Number(String(acc.outstanding).replace(/[^0-9.-]+/g,"")), 0);
        
        const totalEmiNum = consideredAccounts.reduce((sum, acc) => {
            const status = acc.status.toLowerCase();
            if ((status === 'active' || status === 'open') && acc.isConsidered) {
                return sum + getEmiValue(acc);
            }
            return sum;
        }, 0);

        const creditUtilization = totalSanctionedNum > 0 ? (totalOutstandingNum / totalSanctionedNum) * 100 : 0;
        
        const statusCounts = consideredAccounts.reduce((counts, acc) => {
            const status = acc.status.toLowerCase();
            if (status.includes('written-off')) counts.writtenOff++;
            else if (status.includes('doubtful')) counts.doubtful++;
            else if (status.includes('settled')) counts.settled++;
            else if (status.includes('closed')) counts.closed++;
            else if (status.includes('active') || status.includes('open')) counts.active++;
            return counts;
        }, { active: 0, closed: 0, writtenOff: 0, doubtful: 0, settled: 0 });

        return {
            totalAccounts: consideredAccounts.length,
            activeAccounts: statusCounts.active,
            closedAccounts: statusCounts.closed,
            totalSanctioned: `₹${totalSanctionedNum.toLocaleString('en-IN')}`,
            totalOutstanding: `₹${totalOutstandingNum.toLocaleString('en-IN')}`,
            creditUtilization: `${creditUtilization.toFixed(2)}%`,
            writtenOff: statusCounts.writtenOff,
            doubtful: statusCounts.doubtful,
            settled: statusCounts.settled,
            totalEmi: `₹${totalEmiNum.toLocaleString('en-IN')}`
        };
    }, [detailedAccounts]);
    
    const dpdAnalysis = useMemo(() => {
        const months = dpdFilter === 'overall' ? Infinity : parseInt(dpdFilter);
        const analysis = { '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, 'ontime': 0, 'total': 0 };
        
        detailedAccounts.forEach(acc => {
            const history = months === Infinity ? acc.monthlyPaymentHistory : acc.monthlyPaymentHistory.slice(0, months);
            history.forEach(pmt => {
                const dpdStr = pmt.status;
                if (dpdStr === 'XXX') return;
                analysis.total++;

                let dpdNum;
                if (dpdStr === 'STD' || dpdStr === '000') {
                    dpdNum = 0;
                } else {
                    dpdNum = parseInt(dpdStr, 10);
                }

                if (isNaN(dpdNum) || dpdNum === 0) {
                    analysis.ontime++;
                } else if (dpdNum >= 1 && dpdNum <= 30) {
                    analysis['1-30']++;
                } else if (dpdNum >= 31 && dpdNum <= 60) {
                    analysis['31-60']++;
                } else if (dpdNum >= 61 && dpdNum <= 90) {
                    analysis['61-90']++;
                } else {
                    analysis['90+']++;
                }
            });
        });
        return analysis;
    }, [detailedAccounts, dpdFilter]);

    const calculateBehaviorAnalysis = useCallback((ownershipType: string): BehaviorAnalysisData | null => {
        const months = dpdFilter === 'overall' ? Infinity : parseInt(dpdFilter);
        const accounts = activeAccounts.filter(acc => acc.ownership === ownershipType);
        if (accounts.length === 0) {
            return { rating: 'No Data', summary: '', paymentTrend: [], totalPayments: 0, onTimePayments: 0, latePayments: 0 };
        }

        const paymentHistoryForAI: SummarizePaymentBehaviorInput['paymentHistory'] = [];
        const trendMap = new Map<string, { month: string, onTime: number, late: number }>();

        let totalPayments = 0;
        let onTimePayments = 0;

        accounts.forEach(acc => {
            const historySlice = months === Infinity ? acc.monthlyPaymentHistory : acc.monthlyPaymentHistory.slice(0, months);
            
            paymentHistoryForAI.push({ accountType: acc.type, history: historySlice.map(p => p.status) });

            historySlice.forEach((pmt, i) => {
                 const month = `${pmt.month} '${pmt.year}`;
                 
                if (pmt.status === 'XXX') return;

                totalPayments++;
                if (!trendMap.has(month)) {
                    trendMap.set(month, { month, onTime: 0, late: 0 });
                }
                const trend = trendMap.get(month)!;
                
                const dpdNum = parseInt(String(pmt.status).replace(/STD|000/g, '0'));
                if (isNaN(dpdNum) || dpdNum === 0) {
                    trend.onTime++;
                    onTimePayments++;
                } else {
                    trend.late++;
                }
            });
        });

        const paymentTrend = Array.from(trendMap.values()).reverse();
        const latePayments = totalPayments - onTimePayments;
        const onTimePercentage = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 100;

        let rating: BehaviorAnalysisData['rating'] = 'No Data';
        if (totalPayments > 0) {
            if (onTimePercentage === 100) rating = 'Excellent';
            else if (onTimePercentage >= 95) rating = 'Good';
            else if (onTimePercentage >= 85) rating = 'Fair';
            else rating = 'Poor';
        }

        return { rating, summary: '', paymentTrend, totalPayments, onTimePayments, latePayments, paymentHistoryForAI };
    }, [activeAccounts, dpdFilter]);

    useEffect(() => {
        const ownershipTypes: string[] = ['Individual', 'Guarantor', 'Joint'];
        
        startAiSummaryTransition(() => {
            ownershipTypes.forEach(async (type) => {
                const baseAnalysis = calculateBehaviorAnalysis(type);

                if (!baseAnalysis || baseAnalysis.rating === 'No Data' || !baseAnalysis.paymentHistoryForAI || baseAnalysis.paymentHistoryForAI.length === 0) {
                    setBehaviorAnalyses(prev => ({...prev, [type]: baseAnalysis}));
                    return;
                }
                
                 try {
                    const result = await summarizePaymentBehavior({
                        rating: baseAnalysis.rating,
                        paymentHistory: baseAnalysis.paymentHistoryForAI,
                    });
                    setBehaviorAnalyses(prev => ({...prev, [type]: {...baseAnalysis, summary: result.summary }}));
                } catch(e) {
                    console.error("Error generating AI summary", e);
                    toast({ title: "AI Summary Failed", description: "Could not generate AI summary for " + type, variant: "destructive"});
                    setBehaviorAnalyses(prev => ({...prev, [type]: {...baseAnalysis, summary: "AI summary could not be generated." }}));
                }
            })
        });

    }, [dpdFilter, activeAccounts, calculateBehaviorAnalysis, toast]);


    const pieChartData = useMemo(() => [
        { name: 'Active', value: summaryData.activeAccounts, fill: 'hsl(var(--chart-1))' },
        { name: 'Closed', value: summaryData.closedAccounts, fill: 'hsl(var(--chart-2))' },
        { name: 'Written Off', value: summaryData.writtenOff, fill: 'hsl(var(--chart-3))' },
        { name: 'Settled', value: summaryData.settled, fill: 'hsl(var(--chart-4))' },
        { name: 'Doubtful', value: summaryData.doubtful, fill: 'hsl(var(--chart-5))' },
    ].filter(d => d.value > 0), [summaryData]);

    const chartConfig = {
        value: { label: "Accounts" },
        Active: { label: "Active", color: "hsl(var(--chart-1))" },
        Closed: { label: "Closed", color: "hsl(var(--chart-2))" },
        "Written Off": { label: "Written Off", color: "hsl(var(--chart-3))" },
        Settled: { label: "Settled", color: "hsl(var(--chart-4))" },
        Doubtful: { label: "Doubtful", color: "hsl(var(--chart-5))" },
    } as const;

    const initiateChange = (index: number, updates: Partial<EnhancedAccountDetail>) => {
        const oldAccount = detailedAccounts[index];
        
        if (updates.status || updates.isConsidered !== undefined || updates.manualEmi !== undefined) {
            setActiveChange({ index, updates, oldAccount });
            setCommentDialogOpen(true);
        }
    };
    
    const applyChange = (index: number, updates: Partial<EnhancedAccountDetail>, oldAccount: EnhancedAccountDetail, commentText: string | null) => {
        const newAccounts = [...detailedAccounts];
        const currentEmi = getEmiValue(oldAccount);
        newAccounts[index] = { ...oldAccount, ...updates };
        setDetailedAccounts(newAccounts);
    
        const changeLogs: string[] = [];
        const accountName = `'${oldAccount.type}'`;
        const logPrefix = `(S.No. ${index + 1}):`;
    
        if (updates.isConsidered !== undefined && updates.isConsidered !== oldAccount.isConsidered) {
            let log = `${logPrefix} ${updates.isConsidered ? 'Included' : 'Excluded'} ${accountName} from calculations.`;
            if (commentText) {
                log += ` Reason: ${commentText}`;
            }
            changeLogs.push(log);
        }
        if (updates.status && updates.status !== oldAccount.status) {
            let log = `${logPrefix} Changed status of ${accountName} to '${updates.status}'.`;
            if (commentText) {
                log += ` Reason: ${commentText}`;
            }
            changeLogs.push(log);
        }
        if (updates.manualEmi !== undefined && updates.manualEmi !== currentEmi) {
             let log = `${logPrefix} Updated EMI for ${accountName} to ₹${(updates.manualEmi || 0).toLocaleString('en-IN')}.`;
             if (commentText) {
                log += ` Reason: ${commentText}`;
            }
            changeLogs.push(log);
        }
    
        if (changeLogs.length > 0) {
            const newChangeLogs: ChangeLog[] = changeLogs.map(log => ({ id: Date.now().toString() + Math.random(), text: log }));
            setUserChanges(prev => [...prev, ...newChangeLogs]);
        }
    }

    const handleCommentDialogSubmit = () => {
        if (activeChange) {
            applyChange(activeChange.index, activeChange.updates, activeChange.oldAccount, comment);
        }
        setCommentDialogOpen(false);
        setActiveChange(null);
        setComment("");
    }
    
    const handleDownload = async () => {
        const elementToCapture = summaryRef.current;
        const headerElement = printHeaderRef.current;
        if (!elementToCapture || !headerElement) return;
        
        toast({ title: "Preparing Download", description: "Generating PDF, please wait..." });

        // Temporarily make the header visible for capture
        headerElement.style.display = 'block';

        const canvas = await html2canvas(elementToCapture, {
            scale: 2,
            useCORS: true,
            logging: true,
            onclone: (document) => {
                // Ensure the header is visible in the cloned document for rendering
                const clonedHeader = document.querySelector('.print-header-capture');
                if (clonedHeader) {
                    (clonedHeader as HTMLElement).style.display = 'block';
                }
            }
        });

        // Hide the header again
        headerElement.style.display = 'none';

        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, (canvas.height * pdfWidth) / canvas.width);
        
        pdf.save(`CreditSummary_${analysisResult.customerDetails.name.replace(/ /g, '_')}.pdf`);
        
        toast({ title: "Download Ready!", description: "Your PDF has been downloaded." });
    };

    const getDialogDescription = () => {
        if (!activeChange) return "";

        const { updates, oldAccount } = activeChange;
        const accountName = `'${oldAccount.type}'`;

        if (updates.status) {
            return `Please provide a reason for changing the status of ${accountName} to '${updates.status}'.`;
        }
        if (updates.isConsidered !== undefined) {
             return `Please provide a reason for ${updates.isConsidered ? 'including' : 'excluding'} the account ${accountName} in calculations.`;
        }
        if(updates.manualEmi !== undefined) {
            return `Please provide a reason for updating the EMI for ${accountName}.`;
        }
        return "Please provide a reason for this change.";
    }

  return (
    <>
    <div className="flex justify-between items-center mb-4 no-print">
        <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4"/> Back to Main View
        </Button>
        <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" /> Download Summary
        </Button>
    </div>

    <div className="space-y-6 printable-area" ref={summaryRef}>
        <div ref={printHeaderRef} className="print-header-capture" style={{ display: 'none' }}>
            <PrintHeader analysisResult={analysisResult} />
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Credit Summary</CardTitle>
                <CardDescription>A high-level overview of your credit accounts.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-4">
                    <SummaryCard title="Total Accounts" value={summaryData.totalAccounts} />
                    <SummaryCard title="Active Accounts" value={summaryData.activeAccounts} />
                    <SummaryCard title="Closed Accounts" value={summaryData.closedAccounts} />
                    <SummaryCard title="Total Sanctioned" value={summaryData.totalSanctioned} />
                    <SummaryCard title="Total Outstanding" value={summaryData.totalOutstanding} />
                    <SummaryCard title="Credit Utilization" value={summaryData.creditUtilization} />
                    <SummaryCard title="Written Off" value={summaryData.writtenOff} />
                    <SummaryCard title="Doubtful" value={summaryData.doubtful} />
                    <SummaryCard title="Settled" value={summaryData.settled} />
                    <SummaryCard title="Total EMI" value={summaryData.totalEmi} subValue="(Active Accounts)" />
                </div>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>DPD Analysis</CardTitle>
                            <CardDescription>Days Past Due breakdown over the selected period.</CardDescription>
                        </div>
                         <Select value={dpdFilter} onValueChange={setDpdFilter} >
                            <SelectTrigger className="w-[180px] no-print">
                                <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="3">Last 3 Months</SelectItem>
                                <SelectItem value="6">Last 6 Months</SelectItem>
                                <SelectItem value="9">Last 9 Months</SelectItem>
                                <SelectItem value="12">Last 12 Months</SelectItem>
                                <SelectItem value="18">Last 18 Months</SelectItem>
                                <SelectItem value="24">Last 24 Months</SelectItem>
                                <SelectItem value="overall">Overall</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">1-30 DPD</p>
                            <p className="text-2xl font-bold text-yellow-500">{dpdAnalysis['1-30']}</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">31-60 DPD</p>
                            <p className="text-2xl font-bold text-orange-500">{dpdAnalysis['31-60']}</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">61-90 DPD</p>
                            <p className="text-2xl font-bold text-red-500">{dpdAnalysis['61-90']}</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">90+ DPD</p>
                            <p className="text-2xl font-bold text-red-700">{dpdAnalysis['90+']}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Account Status Breakdown</CardTitle>
                    <CardDescription>Distribution of your credit accounts by status.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center">
                    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[200px]">
                        <PieChart>
                            <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                            <Pie data={pieChartData} dataKey="value" nameKey="name" innerRadius={50} paddingAngle={5}>
                                 {pieChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Customer Payment Behavior</CardTitle>
                <CardDescription>AI-powered analysis of payment patterns for active accounts based on ownership type.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Tabs defaultValue="Individual">
                    <TabsList className="grid w-full grid-cols-3 no-print">
                        <TabsTrigger value="Individual">Individual</TabsTrigger>
                        <TabsTrigger value="Guarantor">Guarantor</TabsTrigger>
                        <TabsTrigger value="Joint">Joint</TabsTrigger>
                    </TabsList>
                    <TabsContent value="Individual" className="pt-4">
                        <BehaviorAnalysisCard analysis={behaviorAnalyses.Individual} isLoading={isAiSummaryLoading} />
                    </TabsContent>
                    <TabsContent value="Guarantor" className="pt-4">
                         <BehaviorAnalysisCard analysis={behaviorAnalyses.Guarantor} isLoading={isAiSummaryLoading} />
                    </TabsContent>
                    <TabsContent value="Joint" className="pt-4">
                         <BehaviorAnalysisCard analysis={behaviorAnalyses.Joint} isLoading={isAiSummaryLoading} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Account Summary</CardTitle>
          <CardDescription>A comprehensive list of all accounts reported by the credit bureau.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">S.No.</TableHead>
                  <TableHead>Account Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sanctioned</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                  <TableHead className="text-right">EMI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedAccounts.map((acc, index) => {
                    const isStatusEditable = (acc.status.toLowerCase() === 'active' || acc.status.toLowerCase() === 'open') && Number(String(acc.outstanding).replace(/[^0-9.-]+/g,"")) === 0;
                    const isEmiEditable = (acc.status.toLowerCase() === 'active' || acc.status.toLowerCase() === 'open') && Number(String(acc.outstanding).replace(/[^0-9.-]+/g,"")) > 0 && (Number(String(acc.emi).replace(/[^0-9.-]+/g,"")) || 0) === 0;
                    const accId = `account-${index}`;

                    return (
                        <React.Fragment key={acc.type + index}>
                            <TableRow className={!acc.isConsidered ? 'bg-muted/50' : ''}>
                                <TableCell className="text-center">{index + 1}</TableCell>
                                <TableCell className="font-medium">
                                    <div className="font-semibold">{acc.type}</div>
                                    <div className="text-xs text-muted-foreground mb-2">({acc.ownership})</div>
                                    {acc.ownership !== 'Individual' && (
                                    <div className="flex items-center space-x-2 no-print">
                                        <Switch
                                            id={accId}
                                            checked={acc.isConsidered}
                                            onCheckedChange={(checked) => initiateChange(index, { isConsidered: checked })}
                                            aria-label="Consider account"
                                        />
                                        <Label htmlFor={accId} className="text-xs text-muted-foreground">Consider</Label>
                                    </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        {isStatusEditable ? (
                                            <Select 
                                                value={acc.status} 
                                                onValueChange={(newStatus) => initiateChange(index, { status: newStatus as AccountDetail['status'] })}
                                            >
                                                <SelectTrigger className={cn("w-fit border-none h-auto p-1.5 rounded-md text-xs no-print", getStatusColor(acc.status), getStatusColor(acc.status) === 'bg-green-500' ? 'text-white' : '')}>
                                                    <SelectValue/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Active">Active</SelectItem>
                                                    <SelectItem value="Closed">Closed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Badge variant="outline" className={`border-none text-white w-fit ${getStatusColor(acc.status)}`}>
                                                {acc.status}
                                            </Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            {acc.status.toLowerCase() === 'closed' ? `Closed: ${acc.closed}` : `Opened: ${acc.opened}`}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{acc.sanctioned}</TableCell>
                                <TableCell className="text-right">{acc.outstanding}</TableCell>
                                <TableCell className="text-right text-red-500">{acc.overdue}</TableCell>
                                 <TableCell className="text-right">
                                    {isEmiEditable ? (
                                        <Input
                                            type="number"
                                            className="w-24 h-8 text-right no-print"
                                            defaultValue={getEmiValue(acc)}
                                            onBlur={(e) => {
                                                const newEmi = e.target.valueAsNumber;
                                                if (newEmi !== getEmiValue(acc)) {
                                                    initiateChange(index, { manualEmi: newEmi });
                                                }
                                            }}
                                            placeholder="Enter EMI"
                                        />
                                    ) : (
                                        `₹${getEmiValue(acc).toLocaleString('en-IN')}`
                                    ) }
                                </TableCell>
                            </TableRow>
                            <TableRow className={!acc.isConsidered ? 'bg-muted/50' : ''}>
                                <TableCell colSpan={7} className="p-2">
                                   <div className="flex gap-1 flex-wrap p-2 bg-background/50 rounded-md">
                                        <span className="text-xs font-semibold mr-2 flex items-center">Payment History:</span>
                                        {acc.monthlyPaymentHistory.map((pmt, i) => (
                                        <DpdCircle key={i} value={pmt.status} />
                                        ))}
                                    </div>
                                </TableCell>
                            </TableRow>
                        </React.Fragment>
                    )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
       {userChanges.length > 0 && (
         <Alert>
             <InfoIcon className="h-4 w-4" />
             <AlertTitle>Manual Changes Applied</AlertTitle>
             <AlertDescription>
                <p className="mb-2">The summary and analyses have been updated based on the following manual changes:</p>
                <ul className="list-disc pl-5 space-y-1">
                    {userChanges.map((change) => (
                        <li key={change.id}>{change.text}</li>
                    ))}
                </ul>
             </AlertDescription>
         </Alert>
        )}
    </div>
     <AlertDialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Add Comment</AlertDialogTitle>
                <AlertDialogDescription>
                   {getDialogDescription()}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea 
                placeholder="Type your comment here..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
            />
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setActiveChange(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCommentDialogSubmit}>Submit</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    