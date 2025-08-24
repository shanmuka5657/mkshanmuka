'use client';

import { useState } from "react";
import { ArrowLeft, Loader2, Landmark, Calculator, Sparkles, ShieldCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import { getLoanEligibility, LoanEligibilityOutput } from "@/ai/flows/loan-eligibility";
import { getPostLoanAnalysis, PostLoanAnalysisOutput } from "@/ai/flows/post-loan-analysis";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

interface FinancialsViewProps {
  analysisResult: AnalyzeCreditReportOutput;
  onBack: () => void;
}

export function FinancialsView({ analysisResult, onBack }: FinancialsViewProps) {
  const [estimatedIncome, setEstimatedIncome] = useState('');
  const [fixedObligations, setFixedObligations] = useState('');
  const [interestRate, setInterestRate] = useState('23');
  const [tenure, setTenure] = useState('60');

  const [isLoading, setIsLoading] = useState(false);
  
  const [loanEligibility, setLoanEligibility] = useState<LoanEligibilityOutput | null>(null);
  const [postLoanRisk, setPostLoanRisk] = useState<PostLoanAnalysisOutput | null>(null);

  const { toast } = useToast();

  const handleRunAnalysis = async () => {
    const income = Number(estimatedIncome);
    const obligations = Number(fixedObligations);

    if (!income || income <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Income', description: 'Please enter a valid monthly income.' });
      return;
    }
    if (isNaN(obligations) || obligations < 0) {
      toast({ variant: 'destructive', title: 'Invalid Obligations', description: 'Please enter a valid amount for fixed obligations.' });
      return;
    }

    setIsLoading(true);
    setLoanEligibility(null);
    setPostLoanRisk(null);
    
    try {
      // Step 1: Calculate Loan Eligibility
      toast({ title: 'Step 1: Calculating Loan Eligibility...' });
      const eligibilityResult = await getLoanEligibility({
          monthlyIncome: income,
          totalMonthlyEMI: analysisResult.emiDetails.totalEmi,
          monthlyFixedObligations: obligations,
          interestRate: Number(interestRate),
          tenureMonths: Number(tenure),
      });
      setLoanEligibility(eligibilityResult);

      // Step 2: Run Post-Loan Financial Risk Assessment
      toast({ title: 'Step 2: Assessing Post-Loan Financial Risk...' });
      
      const newEmi = eligibilityResult.repaymentCapacity;
      const postLoanTotalEmi = analysisResult.emiDetails.totalEmi + newEmi;

      const riskResult = await getPostLoanAnalysis({
          analysisResult, 
          estimatedIncome: income,
          monthlyFixedObligations: obligations,
          postLoanTotalEmi: postLoanTotalEmi,
      });
      setPostLoanRisk(riskResult);

      toast({ title: 'Analysis Complete!', description: 'Results are displayed below.' });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
        setIsLoading(false);
    }
  };

  const isRunDisabled = isLoading || !estimatedIncome;

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main View
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calculator />Loan Eligibility & Risk Calculator</CardTitle>
          <CardDescription>Enter financial details to calculate loan eligibility and see the immediate impact on your financial risk profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                    <Label htmlFor="income">Estimated Monthly Income (INR)</Label>
                    <Input id="income" type="number" placeholder="e.g., 75000" value={estimatedIncome} onChange={e => setEstimatedIncome(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="obligations">Monthly Fixed Obligations (e.g., Rent)</Label>
                    <Input id="obligations" type="number" placeholder="e.g., 20000" value={fixedObligations} onChange={e => setFixedObligations(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="interest">Interest Rate (%)</Label>
                    <Input id="interest" type="number" placeholder="23" value={interestRate} onChange={e => setInterestRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tenure">Tenure (Months)</Label>
                    <Input id="tenure" type="number" placeholder="60" value={tenure} onChange={e => setTenure(e.target.value)} />
                </div>
                 <div className="col-span-1 md:col-span-2 lg:col-span-3">
                     <Button onClick={handleRunAnalysis} disabled={isRunDisabled} className="w-full md:w-auto">
                        {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                        {isLoading ? 'Analyzing...' : 'Calculate & Assess Risk'}
                    </Button>
                </div>
            </div>
        </CardContent>
      </Card>


      {isLoading && (
        <Card>
            <CardContent className="pt-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-muted-foreground">Running integrated financial analysis...</p>
            </CardContent>
        </Card>
      )}

      {loanEligibility && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calculator />Loan Eligibility Result</CardTitle>
                <CardDescription>Based on a maximum 50% Fixed Obligation to Income Ratio (FOIR).</CardDescription>
            </CardHeader>
             <CardContent>
                <Card className="p-4 border-2 border-green-500 max-w-md mx-auto">
                    <CardHeader className="p-2 text-center">
                        <CardTitle>Eligible Loan Amount</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-2 text-center">
                        <p className="text-4xl font-bold text-green-500">₹{loanEligibility.eligibleLoanAmount.toLocaleString('en-IN')}</p>
                        <div className="flex items-center justify-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-900/10 rounded-md">
                            <ShieldCheck className="h-5 w-5 text-green-600"/>
                            <div>
                                <span className="font-semibold text-green-800 dark:text-green-300">Post-Loan FOIR:</span>
                                <span className="ml-1 font-bold text-green-600">{loanEligibility.postLoanFoir.toFixed(2)}%</span>
                            </div>
                        </div>
                        <Alert className="text-left">
                            <Calculator className="h-4 w-4" />
                            <AlertTitle className="text-sm">Summary</AlertTitle>
                            <AlertDescription className="text-xs">
                                {loanEligibility.summary}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
                 <Accordion type="single" collapsible className="w-full max-w-md mx-auto mt-4">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>Show Calculation Details</AccordionTrigger>
                        <AccordionContent>
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Maximum Allowable Obligation (50% of Income)</TableCell>
                                        <TableCell className="text-right font-medium">₹{loanEligibility.calculationDetails.maxAllowableObligation.toLocaleString('en-IN')}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Total Existing Obligations (EMI + Rent)</TableCell>
                                        <TableCell className="text-right font-medium">₹{loanEligibility.calculationDetails.totalExistingObligations.toLocaleString('en-IN')}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-semibold">Repayment Capacity (New EMI)</TableCell>
                                        <TableCell className="text-right font-bold text-green-500">₹{loanEligibility.calculationDetails.repaymentCapacity.toLocaleString('en-IN')}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
      )}

      {postLoanRisk && (
        <Card>
            <CardHeader>
                <CardTitle>Post-Loan Financial Risk Assessment Results</CardTitle>
                <CardDescription>This is your projected financial health *after* taking the recommended loan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert className={cn(postLoanRisk.financialRiskRating === 'Low' && 'border-green-500', postLoanRisk.financialRiskRating === 'Medium' && 'border-yellow-500', postLoanRisk.financialRiskRating === 'High' && 'border-orange-500', postLoanRisk.financialRiskRating === 'Very High' && 'border-red-500')}>
                    <AlertTitle>Overall Financial Risk: {postLoanRisk.financialRiskRating}</AlertTitle>
                    <AlertDescription className="mt-2">{postLoanRisk.overallOutlook}</AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4 bg-muted/50">
                        <CardDescription>Post-Loan DTI Ratio</CardDescription>
                        <p className="text-2xl font-bold">{postLoanRisk.dtiAnalysis.dtiPercentage.toFixed(2)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">{postLoanRisk.dtiAnalysis.explanation}</p>
                    </Card>
                    <Card className="p-4 bg-muted/50">
                        <CardDescription>Post-Loan FOIR</CardDescription>
                        <p className="text-2xl font-bold">{postLoanRisk.foirAnalysis.foirPercentage.toFixed(2)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">{postLoanRisk.foirAnalysis.explanation}</p>
                    </Card>
                    <Card className="p-4 bg-muted/50">
                        <CardDescription>Unsecured Debt Percentage</CardDescription>
                        <p className="text-2xl font-bold">{postLoanRisk.debtComposition.unsecuredDebtPercentage.toFixed(2)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">{postLoanRisk.debtComposition.explanation}</p>
                    </Card>
                    <Card className="p-4 bg-muted/50">
                        <CardDescription>Credit Utilization</CardDescription>
                        <p className="text-2xl font-bold">{postLoanRisk.creditUtilizationAnalysis.overallUtilization}%</p>
                        <p className="text-xs text-muted-foreground mt-1">{postLoanRisk.creditUtilizationAnalysis.explanation}</p>
                    </Card>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
