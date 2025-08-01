
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
import type { FlowUsage } from 'genkit/flow';

const LoanEligibilityInputSchema = z.object({
  aiScore: z
    .number()
    .describe('The AI-generated credit score, ranging from 0 to 100.'),
  rating: z.string().describe('The overall credit rating (e.g., Excellent, Good, Fair, Poor).'),
  monthlyIncome: z.number().describe('The estimated monthly income of the user in INR.'),
  totalMonthlyEMI: z.number().describe('The user\'s total existing monthly EMI payments in INR.'),
  creditReportText: z.string().describe('The full text of the user\'s credit report for detailed analysis.'),
});
export type LoanEligibilityInput = z.infer<typeof LoanEligibilityInputSchema>;

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
      'A detailed, multi-sentence summary explaining exactly how the eligible loan amount was calculated. It must reference specific factors from the credit report (payment history, DPD, credit utilization, existing loans) and explain how they influenced the final amount.'
    ),
  suggestionsToIncreaseEligibility: z
    .array(z.string())
    .describe('A list of specific, actionable suggestions for how the user can increase their loan eligibility.'),
});
export type LoanEligibilityOutput = z.infer<typeof LoanEligibilityOutputSchema>;

export async function getLoanEligibility(
  input: LoanEligibilityInput
): Promise<{ output: LoanEligibilityOutput, usage: FlowUsage }> {
  return loanEligibilityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'loanEligibilityPrompt',
  input: { schema: LoanEligibilityInputSchema },
  output: { schema: LoanEligibilityOutputSchema },
  model: 'googleai/gemini-pro',
  prompt: `You are an expert loan officer at a digital bank in India. Your task is to perform a holistic and realistic estimation of a user's eligibility for a personal loan and provide actionable, non-generic advice on how to improve it. You must be deterministic and base your calculations on clear logic.

**User's Financial Profile:**
- **AI Credit Score:** {{aiScore}}/100
- **Credit Rating:** {{rating}}
- **Estimated Monthly Income:** ₹{{monthlyIncome}}
- **Total Existing Monthly EMI:** ₹{{totalMonthlyEMI}}

**Full Credit Report for Analysis:**
\`\`\`
{{{creditReportText}}}
\`\`\`

**Your Task (Follow these steps precisely):**

1.  **Determine a Safe DTI Ratio:** Based on the user's AI score and risk factors evident in the report, determine a safe Debt-to-Income (DTI) ratio.
    - **Excellent (85-100):** 55%
    - **Good (70-84):** 50%
    - **Fair (55-69):** 45%
    - **Poor (<55):** 35%
    - **ADJUSTMENT:** If the report shows significant negative marks (e.g., a written-off account, more than two 30+ DPD in the last year), reduce the determined DTI by 5%.

2.  **Calculate Repayment Capacity:** Use a strict formula.
    *   **Repayment Capacity** = (Monthly Income * Your Determined Safe DTI %) - Total Existing Monthly EMI.
    *   If the result is negative, set Repayment Capacity to 0. Store this exact amount. This value is critical and represents the maximum new EMI the user can afford.

3.  **Calculate Eligible Loan Amount:** Based on the calculated 'repaymentCapacity', determine a realistic personal loan amount. Assume a standard personal loan tenure of 48 months. Use the 'repaymentCapacity' as the EMI for this new loan to calculate the principal amount. If Repayment Capacity is 0, the loan amount must also be 0.

4.  **Estimate Interest Rate:** Provide a realistic interest rate range based on their AI score and overall risk profile.
    - Excellent (85-100): 10.5% - 12.5%
    - Good (70-84): 12.5% - 15.0%
    - Fair (55-69): 15.0% - 20.0%
    - Poor (<55): Likely ineligible, but if eligible, >20.0%.

5.  **Write a Detailed, Justified Summary:** Your summary must clearly explain *why* you arrived at your calculated 'eligibleLoanAmount'. For example: "Based on your consistent on-time payments and a determined safe DTI of 55%, we calculated you can manage an additional EMI of ₹{{repaymentCapacity}}. This makes you eligible for a loan of approximately ₹{{eligibleLoanAmount}}." OR "Although your income is high, your report shows a high credit utilization of 90% and a recent late payment. This reduced your safe DTI to 40% and limits your repayment capacity to ₹{{repaymentCapacity}}, resulting in a lower eligible amount of ₹{{eligibleLoanAmount}}."

6.  **Generate Actionable, Non-Generic Suggestions:** Based on your deep analysis of the report, provide a list of specific suggestions.
    *   **Guarantor Loans:** If you find loans where the user's ownership is 'Guarantor' and the loan is in good standing (DPD is 000/STD), suggest: "You are a guarantor for a loan with an EMI of [Amount]. If this EMI was included in your total debt, you can increase your eligibility by providing the lender with proof (e.g., bank statements) that the primary borrower is making these payments, not you."
    *   **Loans Nearing Closure:** Scan the report for any loans that will be fully paid off in the next 3-6 months. If you find one, suggest: "Your [Loan Type] with an EMI of [Amount] is scheduled to be closed in the next few months. If you wait to apply for a new loan until after this account is closed, your repayment capacity will increase by that EMI amount, making you eligible for a significantly larger loan."
    *   **High Utilization Credit Cards:** If any credit card has utilization over 50%, suggest: "Your [Card Name] has a high utilization of [X%]. Paying down this balance to below 30% will not only improve your credit score but also demonstrate better financial management to lenders, which can increase your loan eligibility."
    *   **Consolidate Small Debts:** If there are multiple small personal loans or credit card debts, you could suggest consolidation.
    *   **IMPORTANT RULE:** If, after a thorough analysis, you find NO clear, actionable opportunities in the report (no guarantor loans, no loans nearing closure, low credit utilization, etc.), then the \`suggestionsToIncreaseEligibility\` array should contain ONLY ONE string: "Based on your current report, there are no immediate actions to significantly increase your loan eligibility. The best approach is to continue maintaining a good payment history." Do NOT provide generic advice in this case.

Generate the final, structured output based on this deep analysis.
`,
});

const loanEligibilityFlow = ai.defineFlow(
  {
    name: 'loanEligibilityFlow',
    inputSchema: LoanEligibilityInputSchema,
    outputSchema: z.object({
        output: LoanEligibilityOutputSchema,
        usage: z.any(),
    }),
  },
  async (input) => {
    const result = await prompt(input);
    if (!result.output) {
      throw new Error("AI failed to calculate loan eligibility.");
    }
    return { output: result.output, usage: result.usage };
  }
);
