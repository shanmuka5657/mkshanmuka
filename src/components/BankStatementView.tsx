
'use client';

import React from 'react';
import type { BankStatementAnalysisOutput } from '@/ai/flows/bank-statement-analysis';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Landmark } from 'lucide-react';
import { Badge } from './ui/badge';

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


export function BankStatementView({ analysisResult, onBack }: BankStatementViewProps) {
  const { summary, overview, detailedOverview, health, transactions } = analysisResult;

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
                <div><strong className="block text-muted-foreground">Account Holder</strong> {summary.accountHolder}</div>
                <div><strong className="block text-muted-foreground">Account Number</strong> {summary.accountNumber}</div>
                <div><strong className="block text-muted-foreground">Bank Name</strong> {summary.bankName}</div>
                <div><strong className="block text-muted-foreground">Statement Period</strong> {summary.statementPeriod}</div>
                <div><strong className="block text-muted-foreground">Mobile Number</strong> {summary.mobileNumber}</div>
                <div className="col-span-2 md:col-span-3"><strong className="block text-muted-foreground">Address</strong> {summary.address}</div>
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

    </div>
  );
}
