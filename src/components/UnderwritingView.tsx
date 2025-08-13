
'use client';

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, UserCheck, FileText, CheckCircle, XCircle, AlertCircle, Clock, Info } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import type { AiRatingOutput } from "@/ai/flows/ai-rating";
import type { LoanEligibilityOutput } from "@/ai/flows/loan-eligibility";
import type { RiskAssessmentOutput } from "@/ai/flows/risk-assessment";
import { getAiRating } from "@/ai/flows/ai-rating";
import { getRiskAssessment } from "@/ai/flows/risk-assessment";
import { getLoanEligibility } from "@/ai/flows/loan-eligibility";
import { getCreditUnderwriting, CreditUnderwritingInput, CreditUnderwritingOutput } from "@/ai/flows/credit-underwriting";

import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

interface UnderwritingViewProps {
  analysisResult: AnalyzeCreditReportOutput;
  onBack: () => void;
}

const getDecisionStyles = (decision: string) => {
    const d = decision.toLowerCase();
    if (d.includes('approved')) return { bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-300", text: "text-green-700", icon: <CheckCircle className="h-10 w-10 text-green-600"/> };
    if (d.includes('declined')) return { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-300", text: "text-red-700", icon: <XCircle className="h-10 w-10 text-red-600"/> };
    if (d.includes('manual')) return { bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-300", text: "text-yellow-700", icon: <Clock className="h-10 w-10 text-yellow-600"/> };
    return { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-700", icon: <AlertCircle className="h-10 w-10 text-gray-600"/> };
}

export function UnderwritingView({ analysisResult, onBack }: UnderwritingViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [underwritingResult, setUnderwritingResult] = useState<CreditUnderwritingOutput | null>(null);
  const [formData, setFormData] = useState({
      estimatedIncome: '',
      employmentType: '',
      loanType: '',
      desiredLoanAmount: '',
      desiredTenure: '',
      userComments: '',
  });

  // Pre-fetched analysis results
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessmentOutput | null>(null);
  const [aiRating, setAiRating] = useState<AiRatingOutput | null>(null);
  const [loanEligibility, setLoanEligibility] = useState<LoanEligibilityOutput | null>(null);

  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const isFormValid = formData.estimatedIncome && formData.employmentType && formData.loanType && formData.desiredLoanAmount && formData.desiredTenure;

  const handleRunAnalysis = async () => {
    if (!isFormValid) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all required fields.' });
        return;
    }
    
    setIsLoading(true);
    setUnderwritingResult(null);

    try {
        let risk = riskAssessment;
        if (!risk) {
            const { output } = await getRiskAssessment({ analysisResult });
            setRiskAssessment(output);
            risk = output;
        }

        let rating = aiRating;
        if (!rating) {
            const { output } = await getAiRating({ analysisResult, riskAssessment: risk!.assessmentWithGuarantor });
            setAiRating(output);
            rating = output;
        }
        
        let eligibility = loanEligibility;
        if (!eligibility) {
             const { output } = await getLoanEligibility({
                aiScore: rating!.riskScore,
                rating: rating!.rating,
                monthlyIncome: Number(formData.estimatedIncome),
                totalMonthlyEMI: analysisResult.emiDetails.totalEmi,
                analysisResult: analysisResult,
            });
            setLoanEligibility(output);
            eligibility = output;
        }
        
        toast({title: "Pre-analysis complete, starting final underwriting..."});
        
        const input: CreditUnderwritingInput = {
            analysisResult,
            aiRating: rating!,
            loanEligibility: eligibility!,
            riskAssessment: risk!,
            estimatedIncome: Number(formData.estimatedIncome),
            employmentType: formData.employmentType as any,
            loanType: formData.loanType as any,
            desiredLoanAmount: Number(formData.desiredLoanAmount),
            desiredTenure: Number(formData.desiredTenure),
            userComments: formData.userComments,
        };

        const { output } = await getCreditUnderwriting(input);
        setUnderwritingResult(output);
        toast({title: "Underwriting Complete", description: "The AI has made a final decision."});

    } catch (error: any) {
      console.error("Error during underwriting:", error);
      toast({
        variant: "destructive",
        title: "Underwriting Failed",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main View
      </Button>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserCheck /> AI Credit Underwriting</CardTitle>
            <CardDescription>Fill in the application details below to get a comprehensive, AI-driven underwriting decision.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1.5">
                <Label htmlFor="estimatedIncome">Estimated Net Monthly Income*</Label>
                <Input id="estimatedIncome" type="number" placeholder="e.g., 50000" value={formData.estimatedIncome} onChange={handleInputChange} />
            </div>
             <div className="space-y-1.5">
                <Label htmlFor="employmentType">Employment Type*</Label>
                 <Select onValueChange={(v) => handleSelectChange('employmentType', v)} value={formData.employmentType}>
                    <SelectTrigger><SelectValue placeholder="Select employment type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Salaried">Salaried</SelectItem>
                        <SelectItem value="Self-employed">Self-employed</SelectItem>
                        <SelectItem value="Daily Wage Earner">Daily Wage Earner</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-1.5">
                <Label htmlFor="loanType">Loan Type*</Label>
                 <Select onValueChange={(v) => handleSelectChange('loanType', v)} value={formData.loanType}>
                    <SelectTrigger><SelectValue placeholder="Select loan type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Personal Loan">Personal Loan</SelectItem>
                        <SelectItem value="Home Loan">Home Loan</SelectItem>
                        <SelectItem value="Auto Loan">Auto Loan</SelectItem>
                        <SelectItem value="Loan Against Property">Loan Against Property</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="desiredLoanAmount">Desired Loan Amount*</Label>
                <Input id="desiredLoanAmount" type="number" placeholder="e.g., 500000" value={formData.desiredLoanAmount} onChange={handleInputChange}/>
            </div>
             <div className="space-y-1.5">
                <Label htmlFor="desiredTenure">Desired Tenure (Months)*</Label>
                <Input id="desiredTenure" type="number" placeholder="e.g., 36" value={formData.desiredTenure} onChange={handleInputChange}/>
            </div>
            <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="userComments">Notes or Comments on Existing Loans (Optional)</Label>
                <Textarea id="userComments" placeholder="e.g., The personal loan from HDFC is a joint loan with my spouse who pays the EMI." value={formData.userComments} onChange={handleInputChange} />
            </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleRunAnalysis} disabled={isLoading || !isFormValid}>
                {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <FileText className="mr-2" />}
                Run Underwriting Analysis
            </Button>
        </CardFooter>
      </Card>

      {isLoading && !underwritingResult && (
        <Card className="text-center p-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-xl font-semibold">AI is performing a full underwriting analysis...</h3>
            <p className="text-muted-foreground">This involves multiple steps and may take a moment.</p>
        </Card>
      )}

      {underwritingResult && (
        <Card>
            <CardHeader>
                <div className={cn("p-4 rounded-lg flex items-center gap-4", getDecisionStyles(underwritingResult.underwritingDecision).bg, getDecisionStyles(underwritingResult.underwritingDecision).border)}>
                    {getDecisionStyles(underwritingResult.underwritingDecision).icon}
                    <div>
                        <CardDescription>Final Underwriting Decision</CardDescription>
                        <CardTitle className={cn("text-3xl", getDecisionStyles(underwritingResult.underwritingDecision).text)}>{underwritingResult.underwritingDecision}</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-muted rounded-lg"><CardDescription>Approved Loan Amount</CardDescription><p className="text-2xl font-bold">₹{underwritingResult.approvedLoanAmount.toLocaleString('en-IN')}</p></div>
                    <div className="p-3 bg-muted rounded-lg"><CardDescription>Recommended Rate</CardDescription><p className="text-2xl font-bold">{underwritingResult.recommendedInterestRate}</p></div>
                    <div className="p-3 bg-muted rounded-lg"><CardDescription>Recommended Tenure</CardDescription><p className="text-2xl font-bold">{underwritingResult.recommendedTenure} mo.</p></div>
                </div>
                <Alert>
                    <AlertTitle className="font-semibold">Underwriting Summary</AlertTitle>
                    <AlertDescription>{underwritingResult.underwritingSummary}</AlertDescription>
                </Alert>
                 <div>
                    <h3 className="font-semibold mb-2">Conditions for Approval</h3>
                    {underwritingResult.conditions.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            {underwritingResult.conditions.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    ) : <p className="text-sm text-muted-foreground">No special conditions required.</p>}
                </div>
                 <div>
                    <h3 className="font-semibold mb-2">Required Documents</h3>
                     <div className="flex flex-wrap gap-2">
                        {underwritingResult.requiredDocuments.map((item, i) => <Badge key={i} variant="secondary">{item}</Badge>)}
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Alert variant="destructive" className="w-full">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Final Risk Rating: {underwritingResult.finalProfileRating}</AlertTitle>
                </Alert>
            </CardFooter>
        </Card>
      )}

    </div>
  );
}
