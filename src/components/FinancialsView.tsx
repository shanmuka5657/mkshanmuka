'use client';

import { useState } from "react";
import { ArrowLeft, Loader2, Landmark, Calculator, Sparkles, ChevronDown, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis";
import { getFinancialRiskAssessment, FinancialRiskOutput } from "@/ai/flows/financial-risk-assessment";
import { getLoanEligibility, LoanEligibilityOutput } from "@/ai/flows/loan-eligibility";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

interface FinancialsViewProps {
  analysisResult: AnalyzeCreditReportOutput;
  onBack: () => void;
}

export function FinancialsView({ analysisResult, onBack }: FinancialsViewProps) {
  const [estimatedIncome, setEstimatedIncome] = useState('');
  const [fixedObligations, setFixedObligations] = useState('');
  const [desiredDti, setDesiredDti] = useState('60');
  const [interestRate, setInterestRate] = useState('23');
  const [tenure, setTenure] = useState('60');

  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [isLoadingEligibility, setIsLoadingEligibility] = useState(false);
  
  const [financialRisk, setFinancialRisk] = useState<FinancialRiskOutput | null>(null);
  const [loanEligibility, setLoanEligibility] = useState<LoanEligibilityOutput | null>(null);

  const { toast } = useToast();

  const handleRunFinancialAnalysis = async () => {
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

    setIsLoadingRisk(true);
    setFinancialRisk(null);
    setLoanEligibility(null); // Reset eligibility when re-running risk
    
    try {
        const financialRiskOutput = await getFinancialRiskAssessment({ 
            analysisResult, 
            estimatedIncome: income,
            monthlyFixedObligations: obligations,
        });
        setFinancialRisk(financialRiskOutput);
        
        toast({ title: 'Financial Analysis Complete', description: 'The financial risk assessment is ready.' });

    } catch (error: any) {
      
      toast({
        variant: "destructive",
        title: "Financial Analysis Failed",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
        setIsLoadingRisk(false);
    }
  };

  const handleRunLoanEligibility = async () => {
    const income = Number(estimatedIncome);
    const obligations = Number(fixedObligations);

    if (!income || income <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Income', description: 'Please enter a monthly income first.' });
      return;
    }
     if (isNaN(obligations) || obligations < 0) {
      toast({ variant: 'destructive', title: 'Invalid Obligations', description: 'Please enter valid fixed obligations.' });
      return;
    }
    
    setIsLoadingEligibility(true);
    setLoanEligibility(null);

    try {
        const result = await getLoanEligibility({
            monthlyIncome: income,
            totalMonthlyEMI: analysisResult.emiDetails.totalEmi,
            monthlyFixedObligations: obligations,
            desiredDtiRatio: Number(desiredDti),
            interestRate: Number(interestRate),
            tenureMonths: Number(tenure),
        });
        setLoanEligibility(result);
        toast({ title: 'Loan Eligibility Calculated', description: 'Results are displayed below.' });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Eligibility Calculation Failed",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
        setIsLoadingEligibility(false);
    }
  }

  const isRunRiskDisabled = isLoadingRisk || !estimatedIncome;

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main View
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Landmark />Financial Risk Assessment</CardTitle>
          <CardDescription>Enter income and fixed obligations to generate a detailed financial risk profile based on your customized report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                    <Label htmlFor="income">Estimated Monthly Income (INR)</Label>
                    <Input id="income" type="number" placeholder="e.g., 75000" value={estimatedIncome} onChange={e => setEstimatedIncome(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="obligations">Monthly Fixed Obligations (e.g., Rent)</Label>
                    <Input id="obligations" type="number" placeholder="e.g., 20000" value={fixedObligations} onChange={e => setFixedObligations(e.target.value)} />
                </div>
                <Button onClick={handleRunFinancialAnalysis} disabled={isRunRiskDisabled}>
                    {isLoadingRisk ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                    {isLoadingRisk ? 'Analyzing...' : 'Run Financial Analysis'}
                </Button>
            </div>
        </CardContent>
      </Card>

      {isLoadingRisk && (
        <Card>
            <CardContent className="pt-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-muted-foreground">AI is running a deep financial analysis...</p>
            </CardContent>
        </Card>
      )}

      {financialRisk && (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Financial Risk Assessment Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert className={cn(financialRisk.financialRiskRating === 'Low' && 'border-green-500', financialRisk.financialRiskRating === 'Medium' && 'border-yellow-500', financialRisk.financialRiskRating === 'High' && 'border-orange-500', financialRisk.financialRiskRating === 'Very High' && 'border-red-500')}>
                        <CardTitle>Overall Financial Risk: {financialRisk.financialRiskRating}</CardTitle>
                        <AlertDescription className="mt-2">{financialRisk.overallOutlook}</AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="p-4 bg-muted/50">
                            <CardDescription>DTI Ratio</CardDescription>
                            <p className="text-2xl font-bold">{financialRisk.dtiAnalysis.dtiPercentage.toFixed(2)}%</p>
                            <p className="text-xs text-muted-foreground mt-1">{financialRisk.dtiAnalysis.explanation}</p>
                        </Card>
                        <Card className="p-4 bg-muted/50">
                            <CardDescription>FOIR</CardDescription>
                            <p className="text-2xl font-bold">{financialRisk.foirAnalysis.foirPercentage.toFixed(2)}%</p>
                            <p className="text-xs text-muted-foreground mt-1">{financialRisk.foirAnalysis.explanation}</p>
                        </Card>
                        <Card className="p-4 bg-muted/50">
                            <CardDescription>Unsecured Debt Percentage</CardDescription>
                            <p className="text-2xl font-bold">{financialRisk.debtComposition.unsecuredDebtPercentage.toFixed(2)}%</p>
                            <p className="text-xs text-muted-foreground mt-1">{financialRisk.debtComposition.explanation}</p>
                        </Card>
                        <Card className="p-4 bg-muted/50">
                            <CardDescription>Credit Utilization</CardDescription>
                            <p className="text-2xl font-bold">{financialRisk.creditUtilizationAnalysis.overallUtilization}%</p>
                            <p className="text-xs text-muted-foreground mt-1">{financialRisk.creditUtilizationAnalysis.explanation}</p>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calculator />Loan Eligibility Calculator</CardTitle>
                    <CardDescription>Adjust the parameters below to calculate potential loan eligibility.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="dti">Desired DTI Ratio (%)</Label>
                            <Input id="dti" type="number" placeholder="50" value={desiredDti} onChange={e => setDesiredDti(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="interest">Interest Rate (%)</Label>
                            <Input id="interest" type="number" placeholder="12.5" value={interestRate} onChange={e => setInterestRate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tenure">Tenure (Months)</Label>
                            <Input id="tenure" type="number" placeholder="48" value={tenure} onChange={e => setTenure(e.target.value)} />
                        </div>
                        <Button onClick={handleRunLoanEligibility} disabled={isLoadingEligibility}>
                            {isLoadingEligibility ? <Loader2 className="mr-2 animate-spin" /> : <Calculator className="mr-2" />}
                            Calculate Eligibility
                        </Button>
                    </div>
                </CardContent>
                {isLoadingEligibility && (
                    <CardContent className="pt-6 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-muted-foreground">AI is calculating loan eligibility scenarios...</p>
                    </CardContent>
                )}
                {loanEligibility && (
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* As Per User Needs Column */}
                            <Card className="p-4 border-primary/50">
                                <CardHeader className="p-2">
                                    <CardTitle>As Per User Needs</CardTitle>
                                    <CardDescription>Based on your desired DTI of {desiredDti}%.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-2 space-y-2">
                                    <p className="text-3xl font-bold text-primary">₹{loanEligibility.asPerUserNeeds.eligibleLoanAmount.toLocaleString('en-IN')}</p>
                                    <Alert>
                                        <CardTitle className="text-sm">Summary</CardTitle>
                                        <AlertDescription className="text-xs">
                                            {loanEligibility.asPerUserNeeds.summary}
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                            {/* As Per Eligibility Column */}
                            <Card className="p-4 border-2 border-green-500">
                                <CardHeader className="p-2">
                                    <CardTitle>As Per Eligibility</CardTitle>
                                    <CardDescription>Based on a maximum 55% FOIR.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-2 space-y-2">
                                    <p className="text-3xl font-bold text-green-500">₹{loanEligibility.asPerEligibility.eligibleLoanAmount.toLocaleString('en-IN')}</p>
                                    <div className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-900/10 rounded-md">
                                        <ShieldCheck className="h-5 w-5 text-green-600"/>
                                        <div>
                                            <span className="font-semibold text-green-800 dark:text-green-300">Post-Loan FOIR:</span>
                                            <span className="ml-1 font-bold text-green-600">{loanEligibility.asPerEligibility.postLoanFoir.toFixed(2)}%</span>
                                        </div>
                                    </div>
                                    <Alert>
                                        <CardTitle className="text-sm">Summary</CardTitle>
                                        <AlertDescription className="text-xs">
                                            {loanEligibility.asPerEligibility.summary}
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                        </div>
                        <Accordion type="single" collapsible className="w-full mt-4">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-2 font-semibold">
                                        Show Calculation Details
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Step</TableHead>
                                                <TableHead>Calculation</TableHead>
                                                <TableHead className="text-right">Value</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loanEligibility.calculationBreakdown.map((row) => (
                                                <TableRow key={row.step}>
                                                    <TableCell className="font-medium">{row.step}</TableCell>
                                                    <TableCell className="text-muted-foreground text-xs">{row.calculation}</TableCell>
                                                    <TableCell className="text-right font-semibold">{row.value}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                )}
            </Card>
        </div>
      )}
    </div>
  );
}
