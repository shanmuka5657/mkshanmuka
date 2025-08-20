
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Eye } from 'lucide-react';
import { getReportsForUser, CreditReportSummary } from '@/lib/firestore-service';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase-client';

export default function DashboardPage() {
    const [reports, setReports] = useState<CreditReportSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [user, userLoading] = useAuthState(auth);

    useEffect(() => {
        if (userLoading) {
            // Still checking for user, do nothing yet
            return;
        }

        if (!user) {
            // If no user, stop loading and we'll show the login prompt
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText /> Saved Credit Report Summaries</CardTitle>
          <CardDescription>
            Here is a list of all the customer credit reports you have analyzed and saved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || userLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !user ? (
             <div className="text-center py-12 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4"/>
                <h3 className="text-lg font-semibold">Login to View Your Dashboard</h3>
                <p className="mb-4 mt-2 max-w-md mx-auto">Please sign in to view your saved reports or analyze a new one.</p>
                <div className="flex gap-4 justify-center">
                    <Button asChild>
                        <Link href="/login">Login</Link>
                    </Button>
                     <Button asChild variant="secondary">
                        <Link href="/login">Analyze Report</Link>
                    </Button>
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
                  {reports.map((report) => (
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
