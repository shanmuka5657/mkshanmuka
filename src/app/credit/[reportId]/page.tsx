
'use client';

import React, { useState, useEffect } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { getReportById, CreditReportSummary } from '@/lib/firestore-service';
import { CreditSummaryView } from '@/components/CreditSummaryView';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';

export default function ReportDetailPage({ params }: { params: { reportId: string } }) {
  const [report, setReport] = useState<CreditReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!params.reportId) return;

    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const fetchedReport = await getReportById(params.reportId);
        if (fetchedReport) {
          setReport(fetchedReport);
        } else {
          notFound();
        }
      } catch (error) {
        console.error("Failed to fetch report:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch the report from the database.",
        });
        // Optionally redirect to dashboard on error
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
      </div>
    );
  }

  if (!report || !report.fullAnalysis) {
    return (
        <div className="flex justify-center items-center h-screen">
            <p>Report data is incomplete or could not be loaded.</p>
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
