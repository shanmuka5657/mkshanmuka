
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { getReportById, CreditReportSummary } from '@/lib/firestore-service';
import { CreditSummaryView } from '@/components/CreditSummaryView';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { Button } from '@/components/ui/button';
import { RiskAssessmentView } from '@/components/RiskAssessmentView';
import { CreditAnalysisLanding } from '@/components/CreditAnalysisLanding';
import { AiRatingView } from '@/components/AiRatingView';
import { FinancialsView } from '@/components/FinancialsView';
import { updateReportAction } from '@/app/actions';

export default function ReportDetailPage({ params }: { params: { reportId: string } }) {
  const [report, setReport] = useState<CreditReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<string | null>(null);

  // This is the single source of truth for the analysis data
  const [editableAnalysisResult, setEditableAnalysisResult] = useState<AnalyzeCreditReportOutput | null>(null);
  // Store the original, unmodified analysis for comparison
  const [originalAnalysisResult, setOriginalAnalysisResult] = useState<AnalyzeCreditReportOutput | null>(null);

  useEffect(() => {
    const initialView = searchParams.get('view');
    if (initialView) {
      setActiveView(initialView);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!params.reportId) {
      setIsLoading(false);
      return;
    }

    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const fetchedReport = await getReportById(params.reportId);
        if (fetchedReport && fetchedReport.fullAnalysis) {
          const fullAnalysis = fetchedReport.fullAnalysis as AnalyzeCreditReportOutput;
          setReport(fetchedReport);
          // Initialize editable state with the fetched data
          setEditableAnalysisResult(fullAnalysis);
          // Keep a clean copy of the original data
          setOriginalAnalysisResult(JSON.parse(JSON.stringify(fullAnalysis))); // Deep copy
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
  
  const handleBack = () => {
    setActiveView(null);
    // Remove the view query param from URL
    router.replace(`/credit/${params.reportId}`, undefined);
  };
  
  const handleSaveAndNavigate = useCallback(async (updatedAnalysis: AnalyzeCreditReportOutput, targetView: string) => {
    try {
        await updateReportAction(params.reportId, updatedAnalysis);
        toast({
            title: "Changes Saved",
            description: "Your edits have been saved to the database.",
        });
        // CRITICAL: Update the state with the successfully saved data before navigating
        setEditableAnalysisResult(updatedAnalysis);
        setActiveView(targetView);
        router.replace(`/credit/${params.reportId}?view=${targetView}`, undefined);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Failed to Save Changes",
            description: error.message || "Could not save the updated report.",
        });
    }
  }, [params.reportId, router, toast]);

  const handleAssessRisk = useCallback((updatedAnalysis: AnalyzeCreditReportOutput) => {
    // This function now saves the data and then navigates to the risk view.
    setEditableAnalysisResult(updatedAnalysis); // Update state immediately for navigation
    handleSaveAndNavigate(updatedAnalysis, 'risk');
  }, [handleSaveAndNavigate]);


  if (isLoading) {
    return (
      <main className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <div className="flex items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4">Loading report...</p>
        </div>
      </main>
    );
  }

  if (!report || !editableAnalysisResult || !originalAnalysisResult) {
    return (
        <main className="flex flex-col justify-center items-center h-[calc(100vh-10rem)] text-center">
            <h2 className="text-2xl font-semibold mb-2">Report Not Found</h2>
            <p className="text-muted-foreground mb-4">The report data is incomplete or could not be loaded.</p>
            <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </main>
    );
  }

  switch (activeView) {
    case 'summary':
      return (
        <main className="container mx-auto p-4 md:p-8 space-y-6">
          <CreditSummaryView
            analysisResult={editableAnalysisResult}
            reportId={params.reportId}
            onBack={handleBack}
            onAssessRisk={handleAssessRisk}
          />
        </main>
      );
    case 'risk':
      return (
        <main className="container mx-auto p-4 md:p-8 space-y-6">
          <RiskAssessmentView 
            originalAnalysisResult={originalAnalysisResult}
            customizedAnalysisResult={editableAnalysisResult} 
            onBack={handleBack} />
        </main>
      );
    case 'rating':
        return (
          <main className="container mx-auto p-4 md:p-8 space-y-6">
            <AiRatingView 
              analysisResult={editableAnalysisResult} 
              onBack={handleBack} />
          </main>
        );
    case 'financials':
        return (
          <main className="container mx-auto p-4 md:p-8 space-y-6">
            <FinancialsView 
              analysisResult={editableAnalysisResult} 
              onBack={handleBack} />
          </main>
        );
    default:
       return (
        <main className="container mx-auto p-4 md:p-8 space-y-6">
            <CreditAnalysisLanding 
                analysisResult={editableAnalysisResult} 
                onSelectView={setActiveView}
            />
        </main>
       )
  }
}
