
'use client';

import React, { useState, useEffect } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { getReportById, CreditReportSummary } from '@/lib/firestore-service';
import { CreditSummaryView } from '@/components/CreditSummaryView';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { Button } from '@/components/ui/button';

export default function ReportDetailPage({ params }: { params: { reportId: string } }) {
  const [report, setReport] = useState<CreditReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!params.reportId) {
      setIsLoading(false);
      return;
    }

    const fetchReport = async () => {
      try {
        const fetchedReport = await getReportById(params.reportId);
        if (fetchedReport) {
          setReport(fetchedReport);
        } else {
          // This will trigger the not-found UI
          notFound();
        }
      } catch (error) {
        console.error("Failed to fetch report:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch the report from the database.",
        });
        // Redirect to dashboard on error
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [params.reportId, router, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading report...</p>
      </div>
    );
  }

  if (!report || !report.fullAnalysis) {
    return (
        <div className="flex flex-col justify-center items-center h-screen text-center">
            <h2 className="text-2xl font-semibold mb-2">Report Not Found</h2>
            <p className="text-muted-foreground mb-4">The report data is incomplete or could not be loaded.</p>
            <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </div>
    );
  }
  
  return (
    <main className="container mx-auto p-4 md:p-8 space-y-6">
        <CreditSummaryView 
            analysisResult={report.fullAnalysis as AnalyzeCreditReportOutput} 
            onBack={() => router.push('/dashboard')}
        />
    </main>
  );
}
