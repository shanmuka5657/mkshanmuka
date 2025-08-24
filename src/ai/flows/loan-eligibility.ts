'use server';

/**
 * @fileOverview An AI agent that calculates loan eligibility based on user-defined financial parameters.
 * It now performs a dual calculation: one based on the user's desired DTI and another based on a standard maximum FOIR of 55%.
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
  desiredDtiRatio: z.number().describe('The user-specified desired Debt-to-Income (DTI) ratio as a percentage (e.g., 50 for 50%).'),
  interestRate: z.number().describe('The desired annual interest rate for the new loan as a percentage (e.g., 12.5 for 12.5%).'),
  tenureMonths: z.number().describe('The desired loan tenure in months (e.g., 48).'),
});
export type LoanEligibilityInput = z.infer<typeof LoanEligibilityInputSchema>;

const LoanEligibilityCalculationStepSchema = z.object({
    step: z.string().describe("The name of the calculation step."),
    calculation: z.string().describe("The formula or logic used for the step."),
    value: z.string().describe("The resulting value of the calculation, formatted as a currency or percentage where appropriate."),
});

const EligibilityResultSchema = z.object({
  eligibleLoanAmount: z.number().describe('The final, calculated loan amount in INR.'),
  repaymentCapacity: z.number().describe('The monthly amount the applicant can afford for a new EMI.'),
  postLoanFoir: z.number().describe('The calculated FOIR after taking on the new loan.'),
  summary: z.string().describe('A comprehensive, user-friendly summary explaining the result and its implications, including a comment on the final post-loan FOIR.'),
});

const LoanEligibilityOutputSchema = z.object({
  asPerUserNeeds: EligibilityResultSchema.describe("The loan eligibility calculation based strictly on the user's desired DTI ratio."),
  asPerEligibility: EligibilityResultSchema.describe("The loan eligibility calculation based on a maximum allowable FOIR of 55%."),
  calculationBreakdown: z.array(LoanEligibilityCalculationStepSchema).describe('A step-by-step breakdown of how the "As Per User Needs" loan eligibility was calculated.'),
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
  prompt: `You are a precise financial calculator. Your task is to perform two separate personal loan eligibility calculations based on the user's financial parameters.

**User's Financial Parameters:**
- **Monthly Income:** ₹{{monthlyIncome}}
- **Total Existing Monthly EMI:** ₹{{totalMonthlyEMI}}
- **Monthly Fixed Obligations (e.g., Rent):** ₹{{monthlyFixedObligations}}
- **Desired DTI Ratio:** {{desiredDtiRatio}}%
- **Annual Interest Rate:** {{interestRate}}%
- **Loan Tenure:** {{tenureMonths}} months

**Your Task (Perform these steps PRECISELY):**

**Part 1: Calculation "As Per User Needs"**

1.  **Calculate Maximum Allowable EMI (based on DTI):**
    *   Formula: (Monthly Income * Desired DTI Ratio) / 100
2.  **Calculate Repayment Capacity (Available for New EMI):**
    *   Formula: Maximum Allowable EMI - Total Existing Monthly EMI
    *   If this is negative, set it to 0.
3.  **Calculate Eligible Loan Amount:**
    *   Use the standard loan principal formula with the 'Repayment Capacity' as the EMI.
    *   Formula: P = EMI * [ (1 - (1 + r)^-n) / r ] (where r is monthly interest rate, n is tenure)
4.  **Calculate Post-Loan FOIR:**
    *   Formula: ((Total Existing EMI + Repayment Capacity + Monthly Fixed Obligations) / Monthly Income) * 100
5.  **Write Summary:** Provide a summary explaining the result. CRITICALLY, you must comment on the final 'postLoanFoir' and its implications (e.g., "Based on your desired {{desiredDtiRatio}}% DTI ratio, you could potentially borrow up to ₹X,XXX,XXX. However, this would result in a very high post-loan FOIR of Y.YY%, significantly exceeding typical lending limits. Lenders are very unlikely to approve a loan at this level.").
6.  **Store Results:** Populate all fields for the 'asPerUserNeeds' output object.
7.  **Create Calculation Breakdown Table:** Populate the 'calculationBreakdown' array with a step for each calculation in this section, showing the formula and result.

**Part 2: Calculation "As Per Eligibility" (Based on Max 55% FOIR)**

1.  **Calculate Maximum Allowable Obligation (based on FOIR):**
    *   This is the total amount for all obligations (existing EMI + new EMI + fixed obligations) and it CANNOT exceed 55% of the monthly income.
    *   Formula: (Monthly Income * 55) / 100
2.  **Calculate Repayment Capacity (Available for New EMI):**
    *   Formula: Maximum Allowable Obligation - Total Existing Monthly EMI - Monthly Fixed Obligations
    *   If this is negative, set it to 0.
3.  **Calculate Eligible Loan Amount:**
    *   Use the standard loan principal formula with this new FOIR-based 'Repayment Capacity' as the EMI.
4.  **Calculate Post-Loan FOIR:**
    *   Formula: ((Total Existing EMI + Repayment Capacity + Monthly Fixed Obligations) / Monthly Income) * 100
    *   This should be 55% or lower if a loan is possible.
5.  **Write Summary:** Provide a summary explaining this more conservative result. Mention this is a more realistic amount that lenders might approve and state the final post-loan FOIR (e.g., "Based on a maximum 55% FOIR, you are eligible for a loan amount of approximately ₹X,XXX,XXX. This would result in a post-loan FOIR of Y.YY%, which is within the acceptable lending limits for most financial institutions. This is a more conservative estimate reflecting what lenders may approve.").
6.  **Store Results:** Populate all fields for the 'asPerEligibility' output object.

Generate the final, structured output containing both calculations.
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
