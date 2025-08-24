
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { getReportById, CreditReportSummary } from '@/lib/firestore-service';
import { CreditSummaryView } from '@/components/CreditSummaryView';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { Button } from '@/components/ui/button';
import { RiskAssessmentView } from '@/components/RiskAssessmentView';
import { CreditAnalysisLanding } from '@/components/CreditAnalysisLanding';
import { AiRatingView } from '@/components/AiRatingView';
import { FinancialsView } from '@/components/FinancialsView';
import { updateReportAction } from '@/app/actions';
import { getRiskAssessment, RiskAssessmentOutput } from '@/ai/flows/risk-assessment';

export default function ReportDetailPage({ params }: { params: { reportId: string } }) {
  const [report, setReport] = useState<CreditReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<string | null>(null);

  // This is the single source of truth for the analysis data
  const [editableAnalysisResult, setEditableAnalysisResult] = useState<AnalyzeCreditReportOutput | null>(null);
  const [riskAssessmentResult, setRiskAssessmentResult] = useState<RiskAssessmentOutput | null>(null);
  const [isAssessingRisk, setIsAssessingRisk] = useState(true);


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
  
  // This effect will re-run the risk assessment whenever the editable analysis result changes.
  useEffect(() => {
    if (editableAnalysisResult) {
      const runRiskAssessment = async () => {
        setIsAssessingRisk(true);
        try {
          const riskResult = await getRiskAssessment({ analysisResult: editableAnalysisResult });
          setRiskAssessmentResult(riskResult);
        } catch (error) {
          console.error("Failed to re-run risk assessment:", error);
          toast({
            variant: "destructive",
            title: "Risk Assessment Failed",
            description: "Could not update the AI risk score after your changes.",
          });
          setRiskAssessmentResult(null);
        } finally {
          setIsAssessingRisk(false);
        }
      };
      runRiskAssessment();
    }
  }, [editableAnalysisResult, toast]);

  
  const handleBack = () => {
    setActiveView(null);
    // Remove the view query param from URL
    router.replace(`/credit/${params.reportId}`, undefined);
  };
  
  const handleAnalysisChange = useCallback((updatedAnalysis: AnalyzeCreditReportOutput) => {
    setEditableAnalysisResult(updatedAnalysis);
    setHasChanges(true);
  }, []);
  
  const handleSaveChanges = async () => {
    if (!editableAnalysisResult) {
      toast({ variant: "destructive", title: "Error", description: "No analysis data to save." });
      return;
    }
    setIsSaving(true);
    try {
      await updateReportAction(params.reportId, editableAnalysisResult);
      toast({
        title: "Changes Saved",
        description: "Your edits have been saved and the risk score has been updated.",
      });
      setHasChanges(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Save Changes",
        description: error.message || "Could not save the updated report.",
      });
    } finally {
      setIsSaving(false);
    }
  };


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

  if (!report || !editableAnalysisResult) {
    return (
        <main className="flex flex-col justify-center items-center h-[calc(100vh-10rem)] text-center">
            <h2 className="text-2xl font-semibold mb-2">Report Not Found</h2>
            <p className="text-muted-foreground mb-4">The report data is incomplete or could not be loaded.</p>
            <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </main>
    );
  }
  
  const handleSelectView = (view: string) => {
    setActiveView(view);
    router.replace(`/credit/${params.reportId}?view=${view}`, undefined);
  };

  switch (activeView) {
    case 'summary':
      return (
        <main className="container mx-auto p-4 md:p-8 space-y-6">
          <CreditSummaryView
            analysisResult={editableAnalysisResult}
            onBack={handleBack}
            onAnalysisChange={handleAnalysisChange}
          />
        </main>
      );
    case 'risk':
      return (
        <main className="container mx-auto p-4 md:p-8 space-y-6">
          <RiskAssessmentView 
            analysisResult={editableAnalysisResult} 
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
                riskAssessmentResult={riskAssessmentResult}
                isLoading={isAssessingRisk}
                onSelectView={handleSelectView}
                headerAction={
                    hasChanges && (
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    )
                }
            />
        </main>
       )
  }
}
