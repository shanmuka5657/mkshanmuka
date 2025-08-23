
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/credit', label: 'Credit', icon: FileText },
  { href: '/bank-statement', label: 'Bank Stmt', icon: Landmark },
  { href: '/verify', label: 'Verify', icon: Fingerprint },
  { href: '/cross-verify', label: 'Cross-Verify', icon: FileCheck2 },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/trainer', label: 'Trainer', icon: BrainCircuit },
];

export default function DashboardPage() {
    const [reports, setReports] = useState<CreditReportSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [user, userLoading] = useAuthState(auth);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);

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

        if (selectedDate) {
            filtered = filtered.filter(report => {
                if (!report.createdAt) return false;
                return report.createdAt.toDate().toDateString() === selectedDate.toDateString();
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
    }, [reports, selectedDate, searchQuery]);
    
    const clearFilters = () => {
        setSelectedDate(undefined);
        setSearchQuery('');
        setIsSearchVisible(false);
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
      
      {user && (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Reports Analyzed
                    </CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{reports.length}</div>}
                    <p className="text-xs text-muted-foreground">
                        CIBIL reports processed
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        AI Risk Assessments
                    </CardTitle>
                    <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{reports.length}</div>}
                    <p className="text-xs text-muted-foreground">
                        Risk profiles generated
                    </p>
                </CardContent>
            </Card>
        </div>
      )}

       <Card>
        <CardHeader className="flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><FileText /> Credit Reports</CardTitle>
            <CardDescription>
              A list of all customer credit reports you have analyzed and saved.
            </CardDescription>
          </div>
           <div className="flex items-center gap-2 mt-4 md:mt-0">
            {isSearchVisible && (
                 <Input
                    type="search"
                    placeholder="Search name, PAN..."
                    className="h-9 w-full md:w-48"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                />
            )}
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setIsSearchVisible(!isSearchVisible)}>
                <Search className="h-4 w-4" />
            </Button>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9">
                        <CalendarIcon className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>

            {(selectedDate || searchQuery) && (
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={clearFilters}>
                    <X className="h-4 w-4" />
                </Button>
            )}
            <Button asChild size="sm">
                <Link href="/credit">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Analyze
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
                            <Link href={`/credit/${report.id}?view=risk`}>
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
