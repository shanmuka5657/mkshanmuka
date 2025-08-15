
'use client';

import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils";


interface CreditSummaryViewProps {
  analysisResult: AnalyzeCreditReportOutput;
  onBack: () => void;
}

const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('closed')) return <Badge variant="secondary">Closed</Badge>;
    if (s.includes('active') || s.includes('open')) return <Badge variant="success">Active</Badge>;
    if (s.includes('written-off')) return <Badge variant="destructive">Written-Off</Badge>;
    if (s.includes('settled')) return <Badge variant="outline">Settled</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
};

const DPDStatusIndicator = ({ status }: { status: string }) => {
    const s = status.toUpperCase();

    if (s === 'STD' || s === '000' || s.startsWith('XXX')) {
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (s === 'SUB') {
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    if (s === 'DBT' || s === 'LSS') {
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
    
    // Check for DPD values like '030', '060', '090'
    const days = parseInt(s, 10);
    if (!isNaN(days) && days > 0) {
        return <Clock className="h-4 w-4 text-orange-500" />;
    }

    return <span className="text-xs text-muted-foreground">{s}</span>; // Fallback for other statuses
}

export function CreditSummaryView({ analysisResult, onBack }: CreditSummaryViewProps) {
  const { allAccounts } = analysisResult;

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main View
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Account Summary</CardTitle>
          <CardDescription>
            A comprehensive list of all accounts reported by the credit bureau.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sanctioned</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                  <TableHead className="text-right">EMI</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Payment History (Last 12 Months)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allAccounts.map((account, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{account.type}</TableCell>
                    <TableCell>{getStatusBadge(account.status)}</TableCell>
                    <TableCell className="text-right">{account.sanctioned}</TableCell>
                    <TableCell className={cn("text-right", account.outstanding !== '₹0' && "font-semibold")}>{account.outstanding}</TableCell>
                    <TableCell className={cn("text-right", account.overdue !== '₹0' ? "text-red-500 font-bold" : "")}>{account.overdue}</TableCell>
                    <TableCell className="text-right">{account.emi}</TableCell>
                    <TableCell>{account.opened}</TableCell>
                    <TableCell>
                        <TooltipProvider>
                            <div className="flex space-x-1">
                                {account.monthlyPaymentHistory.slice(0, 12).map((pmt, pmtIdx) => (
                                     <Tooltip key={pmtIdx} delayDuration={100}>
                                        <TooltipTrigger asChild>
                                            <div><DPDStatusIndicator status={pmt.status}/></div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{pmt.month} '{pmt.year}: {pmt.status}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             {allAccounts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    No account details were found in the report.
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
