
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Loader2, LayoutDashboard, FileText, PlusCircle, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { getReportsForUser, CreditReportSummary } from '@/lib/firestore-service';


export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<CreditReportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchReports(currentUser.uid);
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchReports = async (uid: string) => {
    setIsLoading(true);
    try {
      const userReports = await getReportsForUser(uid);
      setReports(userReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      // Optionally show a toast message here
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskBadge = (score: number | null) => {
    if (score === null) return <Badge variant="secondary">N/A</Badge>;
    if (score >= 750) return <Badge className="bg-green-500 hover:bg-green-600 text-white">Excellent</Badge>;
    if (score >= 700) return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Good</Badge>;
    if (score >= 650) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background font-body text-foreground">
       <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm no-print">
        <div className="container flex h-16 items-center justify-between">
            <div className="mr-4 flex items-center">
              <Logo />
            </div>
        </div>
      </header>
       <main className="container mx-auto p-4 md:p-8">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="flex items-center text-2xl">
                                <LayoutDashboard className="mr-3 h-6 w-6 text-primary" />
                                My Reports
                            </CardTitle>
                            <CardDescription>
                                A history of all your analyzed credit reports.
                            </CardDescription>
                        </div>
                        <Button asChild className="mt-4 sm:mt-0">
                            <Link href="/credit">
                                <PlusCircle className="mr-2 h-5 w-5" />
                                Analyze New Report
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {reports.length > 0 ? (
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>CIBIL Score</TableHead>
                            <TableHead>Total EMI</TableHead>
                            <TableHead>Active Loans</TableHead>
                            <TableHead>Analysis Date</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {reports.map((report) => (
                            <TableRow key={report.id}>
                            <TableCell className="font-medium">{report.name}</TableCell>
                            <TableCell>{getRiskBadge(report.cibilScore)}</TableCell>
                            <TableCell>₹{report.totalEmi.toLocaleString('en-IN')}</TableCell>
                            <TableCell>{report.activeLoanCount}</TableCell>
                            <TableCell>{new Date(report.createdAt.seconds * 1000).toLocaleDateString()}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    ) : (
                         <Alert className="text-center py-10">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>No Reports Found</AlertTitle>
                            <AlertDescription>
                                You haven't analyzed any credit reports yet.
                                <br />
                                <Button asChild variant="link" className="mt-2">
                                    <Link href="/credit">Click here to get started.</Link>
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
       </main>
    </div>
  );
}
