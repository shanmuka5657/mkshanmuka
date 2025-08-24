'use server';

/**
 * @fileOverview An AI agent that calculates loan eligibility based on user-defined financial parameters, now including FOIR calculation.
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

const LoanEligibilityOutputSchema = z.object({
  eligibleLoanAmount: z
    .number()
    .describe('The final, calculated personal loan amount the user could be eligible for in INR, based on the provided inputs.'),
  repaymentCapacity: z
    .number()
    .describe(
      'The remaining monthly amount the applicant can afford for a new EMI based on their desired DTI.'
    ),
  calculationBreakdown: z
    .array(LoanEligibilityCalculationStepSchema)
    .describe(
      'A step-by-step breakdown of how the loan eligibility was calculated.'
    ),
  summary: z
    .string()
    .describe('A comprehensive, user-friendly summary explaining the overall result. It must analyze the repayment capacity and the post-loan FOIR, explaining their real-world implications on financial health and future borrowing capacity.')
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
  prompt: `You are a precise financial calculator. Your task is to calculate a user's personal loan eligibility and post-loan FOIR based on the exact parameters they provide. You must perform the calculations step-by-step and present them in a structured table format.

**User's Financial Parameters:**
- **Monthly Income:** ₹{{monthlyIncome}}
- **Total Existing Monthly EMI:** ₹{{totalMonthlyEMI}}
- **Monthly Fixed Obligations (e.g., Rent):** ₹{{monthlyFixedObligations}}
- **Desired DTI Ratio:** {{desiredDtiRatio}}%
- **Annual Interest Rate:** {{interestRate}}%
- **Loan Tenure:** {{tenureMonths}} months

**Your Calculation Task (Follow these steps PRECISELY):**

1.  **Calculate Maximum Allowable EMI:**
    *   **Formula:** (Monthly Income * Desired DTI Ratio) / 100
    *   This is the total EMI the user can have across all loans.

2.  **Calculate Repayment Capacity (Available for New EMI):**
    *   **Formula:** Maximum Allowable EMI - Total Existing Monthly EMI
    *   This is the amount available for the new loan's EMI. If this is negative, set it to 0. Store this value in the 'repaymentCapacity' output field.

3.  **Calculate Eligible Loan Amount:**
    *   Use the standard loan principal formula based on the calculated 'Repayment Capacity' as the EMI.
    *   **Formula:** P = EMI * [ (1 - (1 + r)^-n) / r ]
        *   P = Principal Loan Amount (the value you need to find)
        *   EMI = Repayment Capacity
        *   r = Monthly Interest Rate (Annual Interest Rate / 12 / 100)
        *   n = Loan Tenure in months
    *   If Repayment Capacity is 0, the eligible loan amount is also 0. Store this final amount in the 'eligibleLoanAmount' field.

4.  **Calculate Post-Loan FOIR:**
    *   **Formula:** ((Total Existing EMI + Repayment Capacity + Monthly Fixed Obligations) / Monthly Income) * 100
    *   This shows the user's financial obligation ratio *after* taking the new loan.

5.  **Create Calculation Breakdown Table:**
    *   Populate the 'calculationBreakdown' array with an object for each of the following steps:
        *   "Monthly Income"
        *   "Existing Obligations (EMI)"
        *   "Max EMI at {{desiredDtiRatio}}% DTI"
        *   "Available for New EMI (Repayment Capacity)"
        *   "Desired Interest Rate & Tenure"
        *   "Calculated Eligible Loan Amount"
        *   "Post-Loan FOIR"
    *   For each step, provide the formula/logic in the 'calculation' field and the formatted result in the 'value' field.

6.  **Write a Comprehensive Summary:**
    *   In the 'summary' field, provide a detailed, user-friendly explanation of the result. For example: "Based on your desired DTI of {{desiredDtiRatio}}%, you have a remaining repayment capacity of [Repayment Capacity amount], making you eligible for a loan of approximately [Eligible Loan Amount]. After accounting for this new EMI, your Fixed Obligation to Income Ratio (FOIR) would be [Post-Loan FOIR]%. A FOIR above 55% can make it challenging to manage expenses and secure future loans, so please consider this before proceeding."
    *   The summary MUST be comprehensive and explain the implications of the final FOIR.

Generate the final, structured output based on these precise calculations.
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
