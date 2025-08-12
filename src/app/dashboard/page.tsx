
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2, FileText, PlusCircle } from 'lucide-react';
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
import Link from 'next/link';
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
        router.replace('/');
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
    if (score === null || isNaN(score)) return <Badge variant="secondary">N/A</Badge>;
    if (score >= 750) return <Badge className="bg-green-500 hover:bg-green-600 text-white">Excellent</Badge>;
    if (score >= 700) return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Good</Badge>;
    if (score >= 650) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Fair</Badge>
    return <Badge variant="destructive">Poor</Badge>;
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background font-body text-foreground">
       <main className="container mx-auto p-4 md:p-8">
            <div className="text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Welcome to your Dashboard</h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                    View your past credit report analyses or start a new one.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="flex items-center text-2xl">
                                <FileText className="mr-3 h-6 w-6 text-primary" />
                                My Reports
                            </CardTitle>
                            <CardDescription>
                                A history of all your analyzed credit reports.
                            </CardDescription>
                        </div>
                         {reports.length > 0 && (
                            <Button asChild className="mt-4 sm:mt-0">
                                <Link href="/credit">
                                    <PlusCircle className="mr-2 h-5 w-5" />
                                    Analyze New Report
                                </Link>
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="flex justify-center items-center py-16">
                           <Loader2 className="h-8 w-8 animate-spin text-primary" />
                         </div>
                    ) : reports.length > 0 ? (
                    <div className="overflow-x-auto">
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
                    </div>
                    ) : (
                         <div className="text-center py-16 px-4 border-2 border-dashed rounded-lg">
                            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-xl font-semibold">No Reports Analyzed Yet</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Get started by analyzing your first credit report to see your AI-powered insights.
                            </p>
                            <Button asChild className="mt-6">
                                <Link href="/credit">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Analyze Your First Report
                                </Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
       </main>
    </div>
  );
}
