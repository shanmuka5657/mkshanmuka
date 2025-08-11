
'use client';

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Award, ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { getAiRating, AiRatingInput, AiRatingOutput } from "@/ai/flows/ai-rating";
import { getRiskAssessment } from "@/ai/flows/risk-assessment";
import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import { cn } from "@/lib/utils";
import { AnalysisCard } from "./AnalysisCard";
import { Progress } from "./ui/progress";

interface AiRatingViewProps {
  analysisResult: AnalyzeCreditReportOutput;
  onBack: () => void;
}

const getRatingStyles = (rating: string) => {
    const r = rating.toLowerCase();
    if (r === 'excellent') {
        return { text: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/10' };
    }
    if (r === 'good') {
        return { text: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' };
    }
    if (r === 'fair') {
        return { text: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/10' };
    }
    if (r === 'poor') {
        return { text: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10' };
    }
    return { text: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/10' };
};


export function AiRatingView({ analysisResult, onBack }: AiRatingViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [aiRating, setAiRating] = useState<AiRatingOutput | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const runAnalysis = async () => {
      setIsLoading(true);
      try {
        // First, we need the risk assessment to feed into the rating
        const { output: riskAssessment } = await getRiskAssessment({ analysisResult });
        if (!riskAssessment) throw new Error("Could not get risk assessment for rating.");
        
        const input: AiRatingInput = { analysisResult, riskAssessment };
        const { output } = await getAiRating(input);
        setAiRating(output);

      } catch (error: any) {
        console.error("Error getting AI rating:", error);
        toast({
          variant: "destructive",
          title: "Failed to get AI Credit Meter",
          description: error.message || "An unknown error occurred.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    runAnalysis();
  }, [analysisResult, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Generating your AI Credit Score...</p>
      </div>
    );
  }

  if (!aiRating) {
    return (
      <div className="text-center">
        <p className="mb-4">Could not load the AI Credit Meter.</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="mr-2" /> Back
        </Button>
      </div>
    );
  }
  
  const ratingStyles = getRatingStyles(aiRating.rating);

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack} className="no-print">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main View
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Award /> AI Credit Meter</CardTitle>
          <CardDescription>A holistic, AI-powered assessment of your credit health, providing a score similar to a traditional credit score but based on a deeper analysis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
             <Card className="p-6 flex flex-col items-center justify-center text-center">
                <CardDescription className="mb-2">AI Generated Score</CardDescription>
                <div className={cn("text-7xl font-bold", ratingStyles.text)}>{aiRating.aiScore}</div>
                <Progress value={((aiRating.aiScore - 300)/600) * 100} className="w-full max-w-xs mt-2" />
                <p className="text-muted-foreground text-sm mt-1">out of 900</p>
            </Card>
            <div className={cn("p-6 rounded-lg text-center", ratingStyles.bg)}>
                 <h3 className="text-lg font-semibold text-muted-foreground">Overall Rating</h3>
                 <p className={cn("text-4xl font-bold my-2", ratingStyles.text)}>{aiRating.rating}</p>
                 <p className="text-sm text-muted-foreground leading-relaxed">{aiRating.summary}</p>
            </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnalysisCard title="Positive Factors">
                    <ul className="space-y-2">
                        {aiRating.positiveFactors.map((factor, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <ThumbsUp className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-muted-foreground">{factor}</span>
                            </li>
                        ))}
                    </ul>
                </AnalysisCard>
                <AnalysisCard title="Areas for Improvement">
                     <ul className="space-y-2">
                        {aiRating.negativeFactors.map((factor, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <ThumbsDown className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-muted-foreground">{factor}</span>
                            </li>
                        ))}
                    </ul>
                </AnalysisCard>
           </div>
           
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                <CardHeader className="flex-row items-center gap-4 space-y-0">
                    <Sparkles className="h-8 w-8 text-blue-500" />
                    <div>
                        <CardTitle className="text-blue-900 dark:text-blue-300">How is this score calculated?</CardTitle>
                        <CardDescription className="text-blue-700 dark:text-blue-400">
                            The AI Score is not a CIBIL score. It's a proprietary rating generated by analyzing your entire report, including payment history, debt types, credit utilization, and the calculated financial risk assessment.
                        </CardDescription>
                    </div>
                </CardHeader>
            </Card>

        </CardContent>
      </Card>
    </div>
  );
}
