
'use client';

import React from 'react';
import type { BankStatementAnalysisOutput } from '@/ai/flows/bank-statement-analysis';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Landmark, DollarSign, Cpu } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface BankStatementViewProps {
  analysisResult: BankStatementAnalysisOutput;
  onBack: () => void;
}

const InfoCard = ({ title, value, icon }: { title: string; value: string; icon?: React.ElementType }) => {
    const Icon = icon;
    return (
        <Card className="flex-1 min-w-[150px]">
            <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-xs">
                    {Icon && <Icon className="h-3 w-3" />}
                    {title}
                </CardDescription>
                <CardTitle className="text-xl">{value}</CardTitle>
            </CardHeader>
        </Card>
    );
};

const SummaryBox = ({ title, value, isLoading = false, valueClassName = '', icon: Icon }: { title: string; value: string | number; isLoading?: boolean; valueClassName?: string, icon?: React.ElementType }) => (
  <Card className="text-center p-3 bg-muted/30">
    <CardDescription className="text-xs text-muted-foreground flex items-center justify-center gap-1">
      {Icon && <Icon className="h-3 w-3" />}
      {title}
    </CardDescription>
    <CardTitle className={cn("text-lg font-bold", valueClassName)}>{value}</CardTitle>
  </Card>
);


export function BankStatementView({ analysisResult, onBack }: BankStatementViewProps) {
  const { summary, overview, detailedOverview, health, transactions, usage } = analysisResult;
  
  const calculateCost = () => {
      const totalInputTokens = usage?.inputTokens || 0;
      const totalOutputTokens = usage?.outputTokens || 0;

      if (totalInputTokens === 0 && totalOutputTokens === 0) return { totalTokens: 0, cost: 0 };

      // Pricing for Gemini 1.5 Flash: $0.00013125 per 1K input tokens, $0.00039375 per 1K output tokens
      const inputCost = (totalInputTokens / 1000) * 0.00013125;
      const outputCost = (totalOutputTokens / 1000) * 0.00039375;
      
      return { totalTokens: totalInputTokens + totalOutputTokens, cost: inputCost + outputCost };
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Upload
      </Button>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Landmark/> Account Summary</CardTitle>
            <CardDescription>High-level details extracted from the bank statement.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><strong className="block text-muted-foreground">Account Holder</strong> <span className="break-words">{summary.accountHolder}</span></div>
                <div><strong className="block text-muted-foreground">Account Number</strong> <span className="break-words">{summary.accountNumber}</span></div>
                <div><strong className="block text-muted-foreground">Bank Name</strong> <span className="break-words">{summary.bankName}</span></div>
                <div><strong className="block text-muted-foreground">Statement Period</strong> <span className="break-words">{summary.statementPeriod}</span></div>
                <div><strong className="block text-muted-foreground">Mobile Number</strong> <span className="break-words">{summary.mobileNumber}</span></div>
                <div className="col-span-2 md:col-span-3"><strong className="block text-muted-foreground">Address</strong> <span className="break-words">{summary.address}</span></div>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
                <InfoCard title="Opening Balance" value={summary.openingBalance} />
                <InfoCard title="Closing Balance" value={summary.closingBalance} />
                <InfoCard title="Total Deposits" value={overview.totalDeposits} icon={TrendingUp}/>
                <InfoCard title="Total Withdrawals" value={overview.totalWithdrawals} icon={TrendingDown}/>
                <InfoCard title="Average Balance" value={overview.averageBalance} />
                <InfoCard title="Est. Monthly Income" value={overview.estimatedMonthlyIncome} />
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Financial Health Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">{health.summary}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle className="text-green-500"/> Strengths</h4>
                        <ul className="list-disc list-inside space-y-1">
                            {health.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2"><AlertCircle className="text-yellow-500"/> Risks / Areas for Improvement</h4>
                        <ul className="list-disc list-inside space-y-1">
                            {health.risks.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
            <CardTitle>Detailed Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
            <InfoCard title="Salary Credits" value={detailedOverview.salaryCredits} />
            <InfoCard title="Incentive Credits" value={detailedOverview.incentiveCredits} />
            <InfoCard title="Mandate Debits (EMIs/Bills)" value={detailedOverview.mandateDebits} />
            <InfoCard title="Cheque Inward" value={detailedOverview.chequeInward} />
            <InfoCard title="Cheque Outward" value={detailedOverview.chequeOutward} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Significant Transactions</CardTitle>
            <CardDescription>A list of the 10-15 most recent or significant transactions identified by the AI.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="overflow-x-auto">
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
                    {transactions.map((tx, index) => (
                    <TableRow key={index}>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell className="max-w-xs truncate">{tx.description}</TableCell>
                        <TableCell><Badge variant="outline">{tx.category}</Badge></TableCell>
                        <TableCell className="text-right font-medium">
                            <span className={tx.type === 'credit' ? 'text-green-500' : 'text-red-500'}>
                                {tx.type === 'credit' ? '+' : '-'} {tx.amount}
                            </span>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>

        {usage && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><DollarSign className="text-primary" />Analysis Cost</CardTitle>
                    <CardDescription>Estimated cost for the AI analysis. For educational purposes only.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <SummaryBox title="Total Tokens Used" value={calculateCost().totalTokens.toLocaleString()} icon={Cpu} />
                        <SummaryBox title="Estimated Cost" value={`$${calculateCost().cost.toFixed(6)}`} icon={DollarSign} />
                    </div>
                </CardContent>
            </Card>
        )}

    </div>
  );
}
