
'use server';
/**
 * @fileOverview An AI agent that performs a financial risk assessment.
 *
 * - getFinancialRiskAssessment - A function that returns a detailed financial risk analysis.
 * - FinancialRiskInput - The input type for the getFinancialRiskAssessment function.
 * - FinancialRiskOutput - The return type for the getFinancialRiskAssessment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialRiskInputSchema = z.object({
  creditReportText: z
    .string()
    .describe('The full text extracted from the credit report.'),
  estimatedIncome: z
    .number()
    .describe("The user's estimated monthly income in INR."),
});
export type FinancialRiskInput = z.infer<typeof FinancialRiskInputSchema>;

const FinancialRiskOutputSchema = z.object({
  financialRiskRating: z
    .enum(['Low', 'Medium', 'High', 'Very High'])
    .describe(
      'A single rating for the overall financial risk (e.g., Low, Medium, High, Very High).'
    ),
  financialRiskSummary: z
    .string()
    .describe(
      'A comprehensive summary explaining the financial risk. It should cover debt-to-income ratio, reliance on unsecured vs. secured debt, and overall debt load.'
    ),
});
export type FinancialRiskOutput = z.infer<typeof FinancialRiskOutputSchema>;

export async function getFinancialRiskAssessment(
  input: FinancialRiskInput
): Promise<FinancialRiskOutput> {
  return financialRiskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialRiskPrompt',
  input: {schema: FinancialRiskInputSchema},
  output: {schema: FinancialRiskOutputSchema},
  prompt: `You are a financial risk analyst. Your task is to assess the user's overall financial risk based on their credit report and estimated income. This is different from a loan default risk; it's about their broader financial stability.

**User's Profile:**
- **Estimated Monthly Income:** ₹{{{estimatedIncome}}}
- **Full Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

**Your Task:**

1.  **Analyze Debt-to-Income (DTI) Ratio:** Calculate the DTI based on the EMIs in the report and the provided income. A DTI below 35% is generally healthy. 36-49% is manageable but indicates some risk. Above 50% is high risk.
2.  **Analyze Debt Composition:** Evaluate the mix of debt. A heavy reliance on unsecured debt (personal loans, credit cards) compared to secured debt (home, auto loans) increases financial risk.
3.  **Assess Overall Debt Load:** Look at the total outstanding balances relative to the income and sanctioned amounts. High credit utilization is a key indicator of financial stress.
4.  **Assign a Risk Rating:** Based on the above points, assign a single 'financialRiskRating': 'Low', 'Medium', 'High', or 'Very High'.
5.  **Write a Comprehensive Summary:** In 'financialRiskSummary', provide a detailed explanation for your rating. Clearly state the calculated DTI and explain how the debt composition and overall debt load contribute to the user's financial risk profile.

Generate the final, structured output.`,
});

const financialRiskFlow = ai.defineFlow(
  {
    name: 'financialRiskFlow',
    inputSchema: FinancialRiskInputSchema,
    outputSchema: FinancialRiskOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
