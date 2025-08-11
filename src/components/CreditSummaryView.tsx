
import { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { ArrowLeft, BarChart, FileText, User } from "lucide-react";
import { Button } from "./ui/button";

interface CreditSummaryViewProps {
    analysisResult: AnalyzeCreditReportOutput;
    onBack: () => void;
}

const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('closed')) return <Badge variant="secondary">Closed</Badge>;
    if (s.includes('written-off')) return <Badge variant="destructive">Written-Off</Badge>;
    if (s.includes('settled')) return <Badge className="bg-yellow-500 text-white">Settled</Badge>;
    if (s.includes('open') || s.includes('active')) return <Badge className="bg-green-500 text-white">Active</Badge>;
    return <Badge variant="outline">{status}</Badge>;
}

const SummaryCard = ({ title, value }: { title: string, value: string | number }) => (
    <div className="p-3 rounded-lg bg-muted/40 text-center">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="font-bold text-lg">{value}</p>
    </div>
)

export function CreditSummaryView({ analysisResult, onBack }: CreditSummaryViewProps) {
    const { reportSummary, allAccounts } = analysisResult;
    const { accountSummary, enquirySummary, dpdSummary } = reportSummary;
    
    const totalDpd = dpdSummary.late30 + dpdSummary.late60 + dpdSummary.late90 + dpdSummary.late90Plus + dpdSummary.default;
    
    return (
        <div className="space-y-6">
             <Button variant="outline" onClick={onBack} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main View
            </Button>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart className="text-primary"/>Detailed Credit Summary</CardTitle>
                    <CardDescription>A comprehensive breakdown of your credit report's key metrics.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2"><FileText size={18}/>Account Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           <SummaryCard title="Total Accounts" value={accountSummary.total} />
                           <SummaryCard title="Active" value={accountSummary.active} />
                           <SummaryCard title="Closed" value={accountSummary.closed} />
                           <SummaryCard title="Written-Off" value={accountSummary.writtenOff} />
                           <SummaryCard title="Current Balance" value={accountSummary.currentBalance} />
                           <SummaryCard title="High Credit" value={accountSummary.highCredit} />
                           <SummaryCard title="Overdue" value={accountSummary.overdue} />
                           <SummaryCard title="Credit Utilization" value={accountSummary.creditUtilization} />
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2"><User size={18}/>Enquiry & Payment Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           <SummaryCard title="Total Enquiries" value={enquirySummary.total} />
                           <SummaryCard title="Enquiries (Last 12m)" value={enquirySummary.past12Months} />
                           <SummaryCard title="On-Time Payments" value={dpdSummary.onTime.toLocaleString()} />
                           <SummaryCard title="Late/Default Payments" value={totalDpd.toLocaleString()} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>All Accounts</CardTitle>
                    <CardDescription>Detailed list of all accounts found in your credit report.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Account Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Sanctioned</TableHead>
                                <TableHead>Outstanding</TableHead>
                                <TableHead>Overdue</TableHead>
                                <TableHead>EMI</TableHead>
                                <TableHead>Date Opened</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allAccounts.map((account, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{account.type}</TableCell>
                                    <TableCell>{getStatusBadge(account.status)}</TableCell>
                                    <TableCell>{account.sanctioned}</TableCell>
                                    <TableCell>{account.outstanding}</TableCell>
                                    <TableCell>{account.overdue}</TableCell>
                                    <TableCell>{account.emi}</TableCell>
                                    <TableCell>{account.opened}</TableCell>
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
