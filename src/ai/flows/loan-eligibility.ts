
'use server';

/**
 * @fileOverview An AI agent that estimates loan eligibility based on a comprehensive analysis of a credit report and financial details.
 *
 * - getLoanEligibility - A function that returns an estimated loan amount and terms.
 * - LoanEligibilityInput - The input type for the getLoanEligibility function.
 * - LoanEligibilityOutput - The return type for the getLoanEligibility function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { AnalyzeCreditReportOutput } from './credit-report-analysis';

const LoanEligibilityInputSchema = z.object({
  aiScore: z
    .number()
    .describe('The AI-generated credit risk score, ranging from 0 to 100 (100 is highest risk).'),
  rating: z.string().describe('The overall credit rating (e.g., Excellent, Good, Fair, Poor).'),
  monthlyIncome: z.number().describe('The estimated monthly income of the user in INR.'),
  totalMonthlyEMI: z.number().describe('The user\'s total existing monthly EMI payments in INR.'),
  analysisResult: z.any().describe('The full, structured analysis from the initial credit report parsing flow.'),
});
export type LoanEligibilityInput = {
    aiScore: number;
    rating: string;
    monthlyIncome: number;
    totalMonthlyEMI: number;
    analysisResult: AnalyzeCreditReportOutput;
};

const LoanEligibilityOutputSchema = z.object({
  eligibleLoanAmount: z
    .number()
    .describe(
      'The exact personal loan amount the user could be eligible for in INR, based on a holistic analysis.'
    ),
  estimatedInterestRate: z
    .string()
    .describe(
      'The estimated annual interest rate for the personal loan (e.g., "11.5%-13%").'
    ),
  repaymentCapacity: z
    .number()
    .describe(
      'The exact remaining monthly amount the applicant can comfortably afford for a new EMI.'
    ),
  eligibilitySummary: z
    .string()
    .describe(
      'A detailed, multi-sentence summary explaining exactly how the eligible loan amount was calculated. It must reference specific factors from the structured data (payment history, credit utilization, existing loans) and explain how they influenced the final amount.'
    ),
  suggestionsToIncreaseEligibility: z
    .array(z.string())
    .describe('A list of specific, actionable suggestions for how the user can increase their loan eligibility.'),
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
  prompt: `You are an expert loan officer at a digital bank in India. Your task is to perform a holistic and realistic estimation of a user's eligibility for a personal loan and provide actionable, non-generic advice. Use the provided structured data, not raw text.

**User's Financial Profile:**
- **AI Credit Risk Score:** {{aiScore}}/100 (Higher is riskier)
- **Credit Rating:** {{rating}}
- **Estimated Monthly Income:** ₹{{monthlyIncome}}
- **Total Existing Monthly EMI:** ₹{{totalMonthlyEMI}}

**Full Structured Credit Data for Analysis:**
\`\`\`json
{{{json analysisResult}}}
\`\`\`

**Your Task (Follow these steps precisely):**

1.  **Determine a Safe DTI Ratio:** Based on the user's AI score and risk factors evident in the structured data, determine a safe Debt-to-Income (DTI) ratio.
    - **Excellent (Risk Score 0-15):** 55%
    - **Good (Risk Score 16-30):** 50%
    - **Fair (Risk Score 31-45):** 45%
    - **Poor (Risk Score >45):** 35%
    - **ADJUSTMENT:** If the data shows significant negative marks (e.g., a written-off account, more than two 30+ DPD in the last year), reduce the determined DTI by 5%.

2.  **Calculate Repayment Capacity:** Use a strict formula.
    *   **Repayment Capacity** = (Monthly Income * Your Determined Safe DTI %) - Total Existing Monthly EMI.
    *   If the result is negative, set Repayment Capacity to 0. Store this exact amount.

3.  **Calculate Eligible Loan Amount:** Based on the calculated 'repaymentCapacity', determine a realistic personal loan amount. Assume a standard personal loan tenure of 48 months. Use the 'repaymentCapacity' as the EMI to calculate the principal amount. If Repayment Capacity is 0, the loan amount must also be 0.

4.  **Estimate Interest Rate:** Provide a realistic interest rate range based on their AI score and overall risk profile.
    - Excellent (Risk Score 0-15): 10.5% - 12.5%
    - Good (Risk Score 16-30): 12.5% - 15.0%
    - Fair (Risk Score 31-45): 15.0% - 20.0%
    - Poor (Risk Score >45): Likely ineligible, but if eligible, >20.0%.

5.  **Write a Detailed, Justified Summary:** Your summary must clearly explain *why* you arrived at your calculated 'eligibleLoanAmount'. For example: "Based on your consistent on-time payments and a determined safe DTI of 55%, we calculated you can manage an additional EMI of ₹{{repaymentCapacity}}. This makes you eligible for a loan of approximately ₹{{eligibleLoanAmount}}." OR "Although your income is high, your data shows a high credit utilization of 90% and a recent late payment. This reduced your safe DTI to 40% and limits your repayment capacity to ₹{{repaymentCapacity}}, resulting in a lower eligible amount of ₹{{eligibleLoanAmount}}."

6.  **Generate Actionable, Non-Generic Suggestions:** Based on your deep analysis of the structured data, provide specific suggestions.
    *   **Guarantor Loans:** If you find loans where ownership is 'Guarantor' and the loan is in good standing, suggest: "You are a guarantor for a loan. If the primary borrower is making payments, you can provide their bank statements to the lender to potentially exclude this EMI from your debt calculations, increasing your eligibility."
    *   **Loans Nearing Closure:** Scan the \`allAccounts\` for any loans that will be fully paid off in the next 3-6 months. Suggest waiting until that account is closed to increase repayment capacity.
    *   **High Utilization Credit Cards:** If any credit card has utilization over 50%, suggest paying it down.
    *   **IMPORTANT RULE:** If, after a thorough analysis, you find NO clear, actionable opportunities in the data, the \`suggestionsToIncreaseEligibility\` array should contain ONLY ONE string: "Based on your current profile, the best approach is to continue maintaining a good payment history." Do NOT provide generic advice.

Generate the final, structured output based on this deep analysis.
`,
});

const loanEligibilityFlow = ai.defineFlow(
  {
    name: 'loanEligibilityFlow',
    inputSchema: LoanEligibilityInputSchema,
    outputSchema: LoanEligibilityOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to calculate loan eligibility.");
    }
    return output;
  }
);
