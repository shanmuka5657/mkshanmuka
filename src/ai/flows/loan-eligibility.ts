
'use server';

/**
 * @fileOverview An AI agent that estimates loan eligibility based on credit rating and financial details.
 *
 * - getLoanEligibility - A function that returns an estimated loan amount and terms.
 * - LoanEligibilityInput - The input type for the getLoanEligibility function.
 * - LoanEligibilityOutput - The return type for the getLoanEligibility function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LoanEligibilityInputSchema = z.object({
  aiScore: z
    .number()
    .describe('The AI-generated credit score, ranging from 0 to 100.'),
  rating: z.string().describe('The overall credit rating (e.g., Excellent, Good, Fair, Poor).'),
  monthlyIncome: z.number().describe('The estimated monthly income of the user in INR.'),
  totalMonthlyEMI: z.number().describe('The user\'s total existing monthly EMI payments in INR.'),
});
export type LoanEligibilityInput = z.infer<typeof LoanEligibilityInputSchema>;

const LoanEligibilityOutputSchema = z.object({
  eligibleLoanAmount: z
    .number()
    .describe(
      'The estimated personal loan amount the user could be eligible for in INR.'
    ),
  estimatedInterestRate: z
    .string()
    .describe(
      'The estimated annual interest rate for the personal loan (e.g., "11.5%-13%").'
    ),
  eligibilitySummary: z
    .string()
    .describe(
      'A brief, one-paragraph summary explaining the basis for the loan eligibility estimation and any key considerations for the user.'
    ),
});
export type LoanEligibilityOutput = z.infer<typeof LoanEligibilityOutputSchema>;

export async function getLoanEligibility(
  input: LoanEligibilityInput
): Promise<LoanEligibilityOutput> {
  return loanEligibilityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'loanEligibilityPrompt',
  input: { schema: LoanEligibilityInputSchema },
  output: { schema: LoanEligibilityOutputSchema },
  prompt: `You are an expert loan officer at a digital bank in India. Your task is to estimate a user's eligibility for a personal loan based on the provided data.

The user's financial profile is as follows:
- **AI Credit Score:** {{aiScore}}/100
- **Credit Rating:** {{rating}}
- **Estimated Monthly Income:** ₹{{monthlyIncome}}
- **Total Existing Monthly EMI:** ₹{{totalMonthlyEMI}}

**Your Task:**
1.  **Calculate Loan Eligibility:** Based on the user's profile, determine a realistic personal loan amount they could qualify for. A standard rule is that total EMIs (including the new loan) should not exceed 50-60% of the monthly income. Assume a standard personal loan tenure of 36 to 60 months.
2.  **Estimate Interest Rate:** Provide a realistic interest rate range (e.g., "12.5%-14%"). Users with higher scores and ratings should get lower rates.
    - Excellent (85-100): 10.5% - 12.5%
    - Good (70-84): 12.5% - 15%
    - Fair (55-69): 15% - 20%
    - Poor (<55): Likely ineligible, but if eligible, >20%.
3.  **Write Summary:** Provide a concise summary explaining your estimation. Mention how their credit rating and income impact the result. If their existing EMIs are high, mention that as a limiting factor.

Generate the final output based on this analysis.
`,
});

const loanEligibilityFlow = ai.defineFlow(
  {
    name: 'loanEligibilityFlow',
    inputSchema: LoanEligibilityInputSchema,
    outputSchema: LoanEligibilityOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
