
'use client';

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Award, ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getAiRating, AiRatingOutput } from "@/ai/flows/ai-rating";
import { getRiskAssessment, RiskAssessmentOutput } from "@/ai/flows/risk-assessment";
import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface AiRatingViewProps {
  analysisResult: AnalyzeCreditReportOutput;
  onBack: () => void;
}

const getRatingStyles = (rating: string) => {
    const r = rating.toLowerCase();
    if (r === 'excellent') return { text: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/10' };
    if (r === 'good') return { text: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' };
    if (r === 'fair') return { text: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/10' };
    if (r === 'poor') return { text: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10' };
    return { text: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/10' };
};

const RatingCard = ({ rating, riskAssessment }: { rating: AiRatingOutput | null, riskAssessment: RiskAssessmentOutput | null }) => {
    if (!rating || !riskAssessment) return null;

    const ratingStyles = getRatingStyles(rating.rating);

    return (
        <div className="space-y-4">
             <CardHeader className="p-0 text-center">
                <CardTitle>AI Generated Rating</CardTitle>
            </CardHeader>
            <Card className="p-4 flex flex-col items-center justify-center text-center">
                <CardDescription className="mb-2">AI Generated Risk Score</CardDescription>
                <div className={cn("text-7xl font-bold", ratingStyles.text)}>{rating.riskScore}</div>
                <Progress value={rating.riskScore} className="w-full max-w-xs mt-2" />
                <p className="text-muted-foreground text-sm mt-1">out of 100 (higher is riskier)</p>
            </Card>
            <div className={cn("p-4 rounded-lg text-center", ratingStyles.bg)}>
                 <h3 className="text-lg font-semibold text-muted-foreground">Overall Rating</h3>
                 <p className={cn("text-3xl font-bold my-1", ratingStyles.text)}>{rating.rating}</p>
                 <p className="text-sm text-muted-foreground leading-relaxed">{rating.summary}</p>
            </div>
             <div className="space-y-2">
                <h4 className="font-semibold">Positive Factors</h4>
                <ul className="space-y-1">
                    {rating.positiveFactors.map((factor, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <ThumbsUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{factor}</span>
                        </li>
                    ))}
                </ul>
            </div>
             <div className="space-y-2">
                <h4 className="font-semibold">Areas for Improvement</h4>
                <ul className="space-y-1">
                    {rating.negativeFactors.map((factor, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <ThumbsDown className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                             <span>{factor}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

export function AiRatingView({ analysisResult, onBack }: AiRatingViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState<AiRatingOutput | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessmentOutput | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const runAnalysis = async () => {
      setIsLoading(true);
      try {
        const riskResult = await getRiskAssessment({ analysisResult });
        if (!riskResult) throw new Error("Could not get risk assessment for rating.");
        setRiskAssessment(riskResult);
        
        const ratingResult = await getAiRating({ analysisResult, riskAssessment: riskResult });
        setRating(ratingResult);

      } catch (error: any) {
        
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
        <p className="text-muted-foreground">Generating your AI Risk Rating...</p>
      </div>
    );
  }

  if (!rating || !riskAssessment) {
    return (
      <div className="text-center">
        <p className="mb-4">Could not load the AI Credit Meter.</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="mr-2" /> Back
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack} className="no-print">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main View
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Award /> AI Credit Meter</CardTitle>
          <CardDescription>A holistic, AI-powered assessment of your credit health based on the customized report data.</CardDescription>
        </CardHeader>
        <CardContent className="max-w-md mx-auto">
            <RatingCard rating={rating} riskAssessment={riskAssessment} />
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <CardHeader className="flex-row items-center gap-4 space-y-0">
              <Sparkles className="h-8 w-8 text-blue-500" />
              <div>
                  <CardTitle className="text-blue-900 dark:text-blue-300">How is this score calculated?</CardTitle>
                  <CardDescription className="text-blue-700 dark:text-blue-400">
                      The AI Score is a proprietary rating generated by analyzing your entire report, including payment history, debt types, credit utilization, and the calculated financial risk assessment.
                  </CardDescription>
              </div>
          </CardHeader>
            <CardContent>
              <div className="text-sm text-blue-800 dark:text-blue-300 prose prose-sm dark:prose-invert max-w-none">
                  <p>{rating.scoreExplanation}</p>
              </div>
          </CardContent>
      </Card>
    </div>
  );
}
