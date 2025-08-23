
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Eye, Home, Fingerprint, FileCheck2, MessageCircle, BrainCircuit, Landmark, Calendar as CalendarIcon, X, PlusCircle, Search } from 'lucide-react';
import { getReportsForUser, CreditReportSummary } from '@/lib/firestore-service';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase-client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/credit', label: 'Credit', icon: FileText },
  { href: '/bank-statement', label: 'Bank Stmt', icon: Landmark },
  { href: '/verify', label: 'Verify', icon: Fingerprint },
  { href: '/cross-verify', label: 'Cross-Verify', icon: FileCheck2 },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/trainer', label: 'Trainer', icon: BrainCircuit },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
const months = [
    { value: '0', label: 'January' }, { value: '1', label: 'February' },
    { value: '2', label: 'March' }, { value: '3', label: 'April' },
    { value: '4', label: 'May' }, { value: '5', label: 'June' },
    { value: '6', label: 'July' }, { value: '7', label: 'August' },
    { value: '8', label: 'September' }, { value: '9', label: 'October' },
    { value: '10', label: 'November' }, { value: '11', label: 'December' }
];

export default function DashboardPage() {
    const [reports, setReports] = useState<CreditReportSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [user, userLoading] = useAuthState(auth);
    const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
    const [selectedYear, setSelectedYear] = useState<string | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (userLoading) {
            return;
        }

        if (!user) {
            setIsLoading(false);
            return;
        }

        const fetchReports = async () => {
            setIsLoading(true);
            try {
                const fetchedReports = await getReportsForUser(user.uid);
                setReports(fetchedReports);
            } catch (error) {
                console.error("Failed to fetch reports:", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Could not fetch your saved reports.",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchReports();
    }, [user, userLoading, toast]);
    
    const filteredReports = useMemo(() => {
        let filtered = reports;

        if (selectedYear) {
            filtered = filtered.filter(report => {
                if (!report.createdAt) return false;
                return report.createdAt.toDate().getFullYear().toString() === selectedYear;
            });
        }
        
        if (selectedMonth) {
             filtered = filtered.filter(report => {
                if (!report.createdAt) return false;
                return report.createdAt.toDate().getMonth().toString() === selectedMonth;
            });
        }
        
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(report => 
                report.name.toLowerCase().includes(lowercasedQuery) ||
                report.pan.toLowerCase().includes(lowercasedQuery) ||
                report.mobileNumber.toLowerCase().includes(lowercasedQuery)
            );
        }

        return filtered;
    }, [reports, selectedMonth, selectedYear, searchQuery]);
    
    const clearFilters = () => {
        setSelectedMonth(undefined);
        setSelectedYear(undefined);
        setSearchQuery('');
    }

  return (
    <main className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          Welcome to CreditWise AI
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Your personal dashboard to manage key financial data and access powerful analysis tools.
        </p>
      </div>

       <Card>
        <CardHeader className="flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><FileText /> Saved Credit Report Summaries</CardTitle>
            <CardDescription>
              Here is a list of all the customer credit reports you have analyzed and saved.
            </CardDescription>
          </div>
           <div className="flex flex-col md:flex-row items-center gap-2">
            <div className="relative w-full md:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search name, PAN..."
                    className="pl-8 sm:w-auto"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
             <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Filter by Month" />
                </SelectTrigger>
                <SelectContent>
                    {months.map(month => (
                        <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
             <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full md:w-[120px]">
                    <SelectValue placeholder="Filter by Year" />
                </SelectTrigger>
                <SelectContent>
                     {years.map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {(selectedMonth || selectedYear || searchQuery) && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                    <X className="h-4 w-4" />
                </Button>
            )}
            <Button asChild className="w-full md:w-auto">
                <Link href="/credit">
                    <PlusCircle />
                    Analyze New Report
                </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || userLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !user ? (
             <div className="relative text-center py-12 text-muted-foreground overflow-hidden">
                <div className="relative z-10">
                    <p className="mb-4 mt-2 max-w-md mx-auto">Please sign in to view your saved reports or analyze a new one.</p>
                    <div className="flex gap-4 justify-center">
                        <Button asChild>
                            <Link href="/login">Login</Link>
                        </Button>
                         <Button asChild variant="secondary">
                            <Link href="/credit">Analyze Report</Link>
                        </Button>
                    </div>
                </div>
                 <div className="absolute inset-0 flex justify-center items-center blur-sm opacity-20 scale-125">
                    <div className={`grid h-full w-full max-w-lg grid-cols-7 mx-auto font-medium`}>
                        {navItems.map((item) => (
                        <div
                            key={item.href}
                            className={'inline-flex flex-col items-center justify-center px-5 text-muted-foreground'}
                        >
                            <item.icon className="w-6 h-6 mb-1" />
                            <span className="text-sm">{item.label}</span>
                        </div>
                        ))}
                    </div>
                 </div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4"/>
                <h3 className="text-lg font-semibold">Analyze Your First Report</h3>
                <p className="mb-4 mt-2 max-w-md mx-auto">Get started by uploading and analyzing your first customer CIBIL report to see the AI in action.</p>
                <Button asChild>
                    <Link href="/credit">Analyze Report</Link>
                </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>PAN</TableHead>
                    <TableHead>Mobile Number</TableHead>
                    <TableHead>CIBIL Score</TableHead>
                    <TableHead>Total EMI</TableHead>
                    <TableHead>Active Loans</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.length > 0 ? filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.name}</TableCell>
                      <TableCell>{report.pan}</TableCell>
                      <TableCell>{report.mobileNumber}</TableCell>
                      <TableCell>
                        <Badge variant={!report.cibilScore || report.cibilScore < 650 ? "destructive" : "success"}>
                          {report.cibilScore || 'N/A'}
                        </Badge>
                      </TableCell>
                       <TableCell>₹{report.totalEmi.toLocaleString('en-IN')}</TableCell>
                      <TableCell>{report.activeLoanCount}</TableCell>
                      <TableCell>{report.createdAt.toDate().toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/credit/${report.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> View Report
                            </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                No reports found matching your criteria.
                            </TableCell>
                        </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
