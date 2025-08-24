'use server';

/**
 * @fileOverview An AI agent that calculates loan eligibility based on a maximum allowable FOIR of 50%.
 *
 * - getLoanEligibility - A function that returns a detailed loan eligibility calculation.
 * - LoanEligibilityInput - The input type for the getLoanEligibility function.
 * - LoanEligibilityOutput - The return type for the getLoanEligibility function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LoanEligibilityInputSchema = z.object({
  monthlyIncome: z.number().describe("The user's estimated monthly income in INR."),
  totalMonthlyEMI: z.number().describe("The user's total existing monthly EMI payments in INR from all sources."),
  monthlyFixedObligations: z.number().describe("The user's monthly fixed obligations in INR (e.g., rent)."),
  interestRate: z.number().describe('The desired annual interest rate for the new loan as a percentage (e.g., 12.5 for 12.5%).'),
  tenureMonths: z.number().describe('The desired loan tenure in months (e.g., 48).'),
});
export type LoanEligibilityInput = z.infer<typeof LoanEligibilityInputSchema>;

const CalculationDetailsSchema = z.object({
    maxAllowableObligation: z.number().describe('The calculated maximum allowable obligation based on 50% FOIR.'),
    totalExistingObligations: z.number().describe('The sum of existing EMIs and fixed obligations.'),
    repaymentCapacity: z.number().describe('The calculated available amount for a new EMI.'),
    monthlyInterestRate: z.number().describe('The calculated monthly interest rate.'),
});

const LoanEligibilityOutputSchema = z.object({
  eligibleLoanAmount: z.number().describe('The final, calculated loan amount in INR.'),
  repaymentCapacity: z.number().describe('The monthly amount the applicant can afford for a new EMI.'),
  postLoanFoir: z.number().describe('The calculated FOIR after taking on the new loan.'),
  summary: z.string().describe('A comprehensive, user-friendly summary explaining the result and its implications, including a comment on the final post-loan FOIR.'),
  calculationDetails: CalculationDetailsSchema.describe("A step-by-step breakdown of the loan eligibility calculation."),
});
export type LoanEligibilityOutput = z.infer<typeof LoanEligibilityOutputSchema>;


export async function getLoanEligibility(
  input: LoanEligibilityInput
): Promise<LoanEligibilityOutput> {
  return loanEligibilityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'loanEligibilityPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: LoanEligibilityInputSchema },
  output: { schema: LoanEligibilityOutputSchema },
  prompt: `You are a precise financial calculator. Your task is to perform a single, conservative personal loan eligibility calculation based on the user's financial parameters and a strict maximum allowable FOIR of 50%.

**User's Financial Parameters:**
- **Monthly Income:** ₹{{monthlyIncome}}
- **Total Existing Monthly EMI:** ₹{{totalMonthlyEMI}}
- **Monthly Fixed Obligations (e.g., Rent):** ₹{{monthlyFixedObligations}}
- **Annual Interest Rate:** {{interestRate}}%
- **Loan Tenure:** {{tenureMonths}} months

**Your Task (Perform these steps PRECISELY):**

1.  **Calculate Maximum Allowable Obligation (based on 50% FOIR):**
    *   This is the total amount for all obligations (existing EMI + new EMI + fixed obligations) and it CANNOT exceed 50% of the monthly income.
    *   Formula: (Monthly Income * 50) / 100
2.  **Calculate Total Existing Obligations:**
    *   Formula: Total Existing Monthly EMI + Monthly Fixed Obligations
3.  **Calculate Repayment Capacity (Available for New EMI):**
    *   Formula: Maximum Allowable Obligation - Total Existing Obligations
    *   If this is negative, set it to 0.
4.  **Calculate Monthly Interest Rate:**
    *   Formula: (Annual Interest Rate / 12) / 100
5.  **Calculate Eligible Loan Amount:**
    *   Use the standard loan principal formula with this new FOIR-based 'Repayment Capacity' as the EMI.
    *   Formula: P = EMI * [ (1 - (1 + r)^-n) / r ] (where r is monthly interest rate, n is tenure)
6.  **Calculate Post-Loan FOIR:**
    *   Formula: ((Total Existing EMI + Repayment Capacity + Monthly Fixed Obligations) / Monthly Income) * 100
    *   This should be 50% or lower if a loan is possible.
7.  **Write Summary:** Provide a summary explaining this conservative result. Mention this is a realistic amount that lenders might approve and state the final post-loan FOIR (e.g., "Based on a maximum 50% FOIR, you are eligible for a loan amount of approximately ₹X,XXX,XXX. This would result in a post-loan FOIR of Y.YY%, which is within the acceptable lending limits for most financial institutions.").
8.  **Store Results:** Populate ALL fields for the output object, including the detailed 'calculationDetails'.

Generate the final, structured output.
`,
});

const loanEligibilityFlow = ai.defineFlow(
  {
    name: 'loanEligibilityFlow',
    inputSchema: LoanEligibilityInputSchema,
    outputSchema: LoanEligibilityOutputSchema,
  },
  async (input: LoanEligibilityInput) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to calculate loan eligibility.");
    }
    return output;
  }
);
