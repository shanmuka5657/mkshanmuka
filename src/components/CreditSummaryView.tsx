
"use client"

import { useMemo } from "react"
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from "recharts"

import { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { ArrowLeft, Clock, FileText, PieChart as PieChartIcon, BarChart2, CalendarDays, Edit } from "lucide-react"
import { Button } from "./ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

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
  const { reportSummary, allAccounts, emiDetails } = analysisResult
  const { accountSummary, enquirySummary, dpdSummary } = reportSummary

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
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock />DPD Analysis</CardTitle>
            <CardDescription>Your payment history at a glance. DPD (Days Past Due) shows how timely your payments have been.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <DpdCard title="ON TIME" value={dpdSummary.onTime} colorClass="bg-green-100 text-green-800" />
              <DpdCard title="1-30 DAYS" value={dpdSummary.late30} colorClass="bg-yellow-100 text-yellow-800" />
              <DpdCard title="31-60 DAYS" value={dpdSummary.late60} colorClass="bg-yellow-100 text-yellow-800" />
              <DpdCard title="61-90 DAYS" value={dpdSummary.late90} colorClass="bg-red-100 text-red-800" />
              <DpdCard title="90+ DAYS" value={dpdSummary.late90Plus} colorClass="bg-red-100 text-red-800" />
              <DpdCard title="DEFAULT" value={dpdSummary.default} colorClass="bg-black text-white" />
          </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Edit />Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sanctioned</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Overdue</TableHead>
                  <TableHead>EMI</TableHead>
                  <TableHead className="min-w-[200px]">Repayment History</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allAccounts.map((account, index) => (
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
                        <Badge variant="outline" className="font-mono text-xs whitespace-pre-wrap">
                            {account.paymentHistory}
                        </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {allAccounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">No account information found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

    