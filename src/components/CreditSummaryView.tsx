
"use client"

import { useMemo, useState } from "react"
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from "recharts"

import { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { ArrowLeft, Clock, FileText, PieChart as PieChartIcon, BarChart2, Edit } from "lucide-react"
import { Button } from "./ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Tooltip as UiTooltip, TooltipContent as UiTooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { subMonths, isAfter, parse } from 'date-fns';

interface CreditSummaryViewProps {
  analysisResult: AnalyzeCreditReportOutput
  onBack: () => void
}

const getStatusBadge = (status: string, openedDate: string, closedDate: string) => {
  const s = status.toLowerCase()
  if (s.includes("closed") || s.includes("written-off") || s.includes("settled")) {
      const variant = s.includes("written-off") ? "destructive" : s.includes("settled") ? "secondary" : "default"
      const date = closedDate !== 'NA' ? ` on ${closedDate}` : ''
      return <Badge variant={variant as any}>{status}{date}</Badge>
  }
  if (s.includes("open") || s.includes("active")) {
      const date = openedDate !== 'NA' ? ` on ${openedDate}` : ''
       return <Badge className="bg-green-500 text-white hover:bg-green-600">{status}{date}</Badge>
  }
  return <Badge variant="outline">{status}</Badge>
}

const getDpdBadgeVariant = (status: string) => {
    if (!status) return 'default';
    const s = status.toUpperCase();
    if (s === 'STD' || s === '000' || s === 'XXX') return 'success';
    if (s === 'SUB' || s === 'DBT' || s === 'LSS') return 'destructive';
    const days = parseInt(s, 10);
    if (isNaN(days)) return 'secondary';
    if (days > 0) return 'warning';
    return 'default';
};

const DpdBadge = ({ month, year, status }: { month: string, year: string, status: string }) => {
    const variant = getDpdBadgeVariant(status);
    let colorClasses = "bg-gray-200 text-gray-800"; // default
    if (variant === 'success') colorClasses = "bg-green-100 text-green-800";
    if (variant === 'warning') colorClasses = "bg-yellow-100 text-yellow-800";
    if (variant === 'destructive') colorClasses = "bg-red-100 text-red-800 dark:text-red-200";

    return (
        <UiTooltip>
            <TooltipTrigger>
                 <Badge className={`border-transparent ${colorClasses}`}>{status}</Badge>
            </TooltipTrigger>
            <UiTooltipContent>
                <p>{month} 20{year}</p>
            </UiTooltipContent>
        </UiTooltip>
    );
};

const SummaryCard = ({ title, value, valueClassName = "" }: { title: string; value: string | number; valueClassName?: string }) => (
  <div className="p-3 rounded-lg bg-muted/40 text-center border">
    <p className="text-xs text-muted-foreground">{title}</p>
    <p className={`font-bold text-lg ${valueClassName}`}>{value}</p>
  </div>
)

const DpdCard = ({ title, value, colorClass }: { title: string, value: string | number, colorClass: string }) => (
    <div className={`p-4 rounded-lg text-center ${colorClass}`}>
        <p className="font-bold text-2xl">{value}</p>
        <p className="text-xs font-medium">{title}</p>
    </div>
)

export function CreditSummaryView({ analysisResult, onBack }: CreditSummaryViewProps) {
  const [dpdTimeRange, setDpdTimeRange] = useState<string>("all");
  const { reportSummary, allAccounts, emiDetails } = analysisResult
  const { accountSummary, enquirySummary } = reportSummary

  const dpdSummary = useMemo(() => {
    const dpd = { onTime: 0, late30: 0, late60: 0, late90: 0, late90Plus: 0, default: 0 };
    if (!allAccounts) return dpd;

    const now = new Date();
    const monthsToSubtract = dpdTimeRange === "all" ? null : parseInt(dpdTimeRange, 10);
    const cutoffDate = monthsToSubtract ? subMonths(now, monthsToSubtract) : null;
    
    for (const acc of allAccounts) {
        if (acc.monthlyPaymentHistory) {
            for (const month of acc.monthlyPaymentHistory) {
                // Check if the payment history entry is within the selected time range
                const paymentDate = parse(`${month.month}-${month.year}`, 'MMM-yy', new Date());
                if (cutoffDate && !isAfter(paymentDate, cutoffDate)) {
                    continue; // Skip if it's outside the time range
                }

                const s = month.status.trim().toUpperCase();
                if (s === 'STD' || s === '000' || s === 'XXX') {
                    dpd.onTime++;
                } else if (s === 'SUB' || s === 'DBT' || s === 'LSS') {
                    dpd.default++;
                } else {
                    const daysLate = parseInt(s, 10);
                    if (!isNaN(daysLate)) {
                        if (daysLate >= 1 && daysLate <= 30) dpd.late30++;
                        else if (daysLate >= 31 && daysLate <= 60) dpd.late60++;
                        else if (daysLate >= 61 && daysLate <= 90) dpd.late90++;
                        else if (daysLate > 90) dpd.late90Plus++;
                    }
                }
            }
        }
    }
    return dpd;
  }, [allAccounts, dpdTimeRange]);

  const accountTypeData = useMemo(() => {
    const types = allAccounts.reduce((acc, account) => {
      const type = account.type || "Unknown"
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(types).map(([name, value]) => ({ name, value }))
  }, [allAccounts])

  const enquiryData = useMemo(() => [
    { name: "Last 30 Days", enquiries: parseInt(enquirySummary.past30Days, 10) || 0 },
    { name: "Last 12 Months", enquiries: parseInt(enquirySummary.past12Months, 10) || 0 },
    { name: "Last 24 Months", enquiries: parseInt(enquirySummary.past24Months, 10) || 0 },
  ], [enquirySummary])

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack} className="mb-4 no-print">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main View
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText />AI-Powered Credit Summary</CardTitle>
          <CardDescription>This is a detailed summary of your credit profile, with calculations performed client-side for accuracy.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <SummaryCard title="Total Accounts" value={accountSummary.total} />
            <SummaryCard title="Total Credit Limit" value={accountSummary.highCredit} />
            <SummaryCard title="Total Outstanding" value={accountSummary.currentBalance} valueClassName={accountSummary.currentBalance !== "₹0" ? "text-red-500" : ""} />
            <SummaryCard title="Credit Utilization" value={accountSummary.creditUtilization} />
            <SummaryCard title="Debt-to-Limit Ratio" value={accountSummary.debtToLimitRatio} />
            <SummaryCard title="Active Accounts" value={accountSummary.active} />
            <SummaryCard title="Closed Accounts" value={accountSummary.closed} />
            <SummaryCard title="Written Off" value={accountSummary.writtenOff} valueClassName={accountSummary.writtenOff !== "0" ? "text-red-500" : ""} />
            <SummaryCard title="Settled" value={accountSummary.settled} />
            <SummaryCard title="Doubtful" value={accountSummary.doubtful} />
            <SummaryCard title="Total Monthly EMI" value={`₹${emiDetails.totalEmi.toLocaleString('en-IN')}`} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><PieChartIcon />Account Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="mx-auto aspect-square max-h-[250px]">
                    <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie data={accountTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                             {accountTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                         <Legend />
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart2 />Enquiry Trends</CardTitle>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={{ enquiries: { label: "Enquiries", color: "hsl(var(--chart-1))" } }} className="h-[250px] w-full">
                    <BarChart accessibilityLayer data={enquiryData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                         <YAxis allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="enquiries" fill="var(--color-enquiries)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>

      <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Clock />DPD Analysis</CardTitle>
              <CardDescription>Your payment history at a glance. DPD (Days Past Due) shows how timely your payments have been.</CardDescription>
            </div>
            <div className="w-48">
              <Select onValueChange={setDpdTimeRange} defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Overall</SelectItem>
                  <SelectItem value="6">Last 6 Months</SelectItem>
                  <SelectItem value="9">Last 9 Months</SelectItem>
                  <SelectItem value="12">Last 12 Months</SelectItem>
                  <SelectItem value="18">Last 18 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <DpdCard title="ON TIME" value={dpdSummary.onTime} colorClass="bg-green-100 text-green-800" />
              <DpdCard title="1-30 DAYS" value={dpdSummary.late30} colorClass="bg-yellow-100 text-yellow-800" />
              <DpdCard title="31-60 DAYS" value={dpdSummary.late60} colorClass="bg-yellow-100 text-yellow-800" />
              <DpdCard title="61-90 DAYS" value={dpdSummary.late90} colorClass="bg-red-100 text-red-800" />
              <DpdCard title="90+ DAYS" value={dpdSummary.late90Plus} colorClass="bg-red-100 text-red-800" />
              <DpdCard title="DEFAULT" value={dpdSummary.default} colorClass="black text-white" />
          </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Edit />Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
             <TooltipProvider>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sanctioned</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Overdue</TableHead>
                    <TableHead>EMI</TableHead>
                    <TableHead className="min-w-[300px]">Monthly Payment History</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {allAccounts.map((account, index) => {
                      
                      const monthsToShow = dpdTimeRange === "all" ? account.monthlyPaymentHistory.length : parseInt(dpdTimeRange, 10);
                      
                      return (
                      <TableRow key={index}>
                          <TableCell>
                          <div className="font-medium">{account.type}</div>
                          <div className="text-xs text-muted-foreground">{account.ownership}</div>
                          </TableCell>
                          <TableCell>{getStatusBadge(account.status, account.opened, account.closed)}</TableCell>
                          <TableCell>{account.sanctioned}</TableCell>
                          <TableCell>{account.outstanding}</TableCell>
                          <TableCell>{account.overdue}</TableCell>
                          <TableCell>{account.emi}</TableCell>
                          <TableCell>
                              <div className="flex flex-wrap gap-1">
                                  {account.monthlyPaymentHistory.slice(0, monthsToShow).map((item, idx) => (
                                      <DpdBadge key={idx} {...item} />
                                  ))}
                                  {account.monthlyPaymentHistory.length === 0 && <Badge variant="outline">N/A</Badge>}
                              </div>
                          </TableCell>
                      </TableRow>
                    )})}
                    {allAccounts.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center">No account information found.</TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

    