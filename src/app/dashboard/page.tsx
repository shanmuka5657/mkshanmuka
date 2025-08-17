
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText } from 'lucide-react';
import { getAllReports, CreditReportSummary } from '@/lib/firestore-service';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
    const [reports, setReports] = useState<CreditReportSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const fetchedReports = await getAllReports();
                // Sort by creation date, newest first
                fetchedReports.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
                setReports(fetchedReports);
            } catch (error) {
                console.error("Failed to fetch reports:", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Could not fetch saved reports from the database.",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchReports();
    }, [toast]);
    
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
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4"/>
                <h3 className="text-lg font-semibold">No Reports Found</h3>
                <p>Go to the "Credit" page to analyze your first CIBIL report. It will appear here once saved.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>PAN</TableHead>
                    <TableHead>CIBIL Score</TableHead>
                    <TableHead>Total EMI</TableHead>
                    <TableHead>Active Loans</TableHead>
                    <TableHead>Date Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.name}</TableCell>
                      <TableCell>{report.pan}</TableCell>
                      <TableCell>
                        <Badge variant={!report.cibilScore || report.cibilScore < 650 ? "destructive" : "success"}>
                          {report.cibilScore || 'N/A'}
                        </Badge>
                      </TableCell>
                       <TableCell>₹{report.totalEmi.toLocaleString('en-IN')}</TableCell>
                      <TableCell>{report.activeLoanCount}</TableCell>
                      <TableCell>{report.createdAt.toDate().toLocaleDateString()}</TableCell>
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
