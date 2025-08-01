
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
import type { FlowUsage } from 'genkit/flow';

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
  dtiAnalysis: z.object({
      dtiPercentage: z.number().describe('The calculated Debt-to-Income ratio as a percentage.'),
      explanation: z.string().describe('A detailed, point-wise explanation of the DTI ratio and its real-world implications for financial health.')
  }).describe('Analysis of the Debt-to-Income Ratio.'),
  debtComposition: z.object({
      unsecuredDebtPercentage: z.number().describe('The percentage of total debt that is unsecured (e.g., personal loans, credit cards).'),
      explanation: z.string().describe('A point-wise analysis of the debt mix (secured vs. unsecured) and how it impacts financial risk.')
  }).describe('Analysis of the composition of debt.'),
  creditUtilizationAnalysis: z.object({
      overallUtilization: z.number().describe('The overall credit utilization percentage across all revolving credit lines.'),
      explanation: z.string().describe('A point-wise explanation of credit utilization, highlighting any high-utilization accounts and the associated risks.')
  }).describe('Analysis of credit utilization.'),
  overallOutlook: z.string().describe('A forward-looking summary of the financial situation, including potential future risks and opportunities. This should be a clear, point-wise explanation.'),
});
export type FinancialRiskOutput = z.infer<typeof FinancialRiskOutputSchema>;

export async function getFinancialRiskAssessment(
  input: FinancialRiskInput
): Promise<{ output: FinancialRiskOutput, usage: FlowUsage }> {
  return financialRiskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialRiskPrompt',
  input: {schema: FinancialRiskInputSchema},
  output: {schema: FinancialRiskOutputSchema},
  model: 'googleai/gemini-1.5-flash-latest',
  prompt: `You are a financial risk analyst. Your task is to assess the user's overall financial risk based on their credit report and estimated income. This is different from a loan default risk; it's about their broader financial stability. Your analysis must be detailed, non-generic, and provide real-world context in a point-wise format.

**User's Profile:**
- **Estimated Monthly Income:** ₹{{{estimatedIncome}}}
- **Full Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

**Your Task:**

1.  **Calculate EMIs and Balances:** First, meticulously scan the report to identify all active loans and credit cards. Sum up all monthly EMIs and total outstanding balances for both secured (auto, home) and unsecured (personal, credit card) debt.

2.  **Assign Overall Risk Rating:** Based on all subsequent points, assign a single 'financialRiskRating': 'Low', 'Medium', 'High', or 'Very High'.

3.  **DTI Analysis (dtiAnalysis):**
    *   Calculate the Debt-to-Income (DTI) ratio using the total EMIs and the provided income. Store it in 'dtiPercentage'.
    *   In 'explanation', provide a point-wise explanation. Start with a clear statement like "Your DTI is X%." Explain what this means in a real-world context (e.g., "For every ₹100 you earn, ₹X is used for debt payments."). Compare it to benchmarks (e.g., "A DTI below 35% is healthy, while above 50% is a significant strain on your finances.").

4.  **Debt Composition Analysis (debtComposition):**
    *   Calculate the percentage of total outstanding debt that is unsecured. Store it in 'unsecuredDebtPercentage'.
    *   In 'explanation', provide a point-wise analysis. Explain the difference between secured and unsecured debt. State how the user's current mix impacts their risk profile (e.g., "A high reliance on unsecured debt (like credit cards and personal loans) can indicate financial stress as it's often more expensive and not backed by an asset."). Reference specific numbers from their report.

5.  **Credit Utilization Analysis (creditUtilizationAnalysis):**
    *   Calculate the overall credit utilization across all revolving credit lines (credit cards, credit lines). Store it in 'overallUtilization'.
    *   In 'explanation', provide a point-wise analysis. Explain what credit utilization is and why it's important. Mention specific cards if they have high utilization (e.g., "Your overall utilization is X%, which is considered high. Specifically, your ICICI Credit Card is at 95% utilization (₹47,500 of ₹50,000 limit), which significantly impacts your credit score and suggests a reliance on credit for daily expenses.").

6.  **Overall Outlook (overallOutlook):**
    *   Provide a final, forward-looking summary in a a point-wise format. Synthesize all the above points into a clear outlook. For example: "Given your high DTI and reliance on credit card debt, your current financial situation is under strain. While you have a good payment history, an unexpected expense could be difficult to manage. The immediate priority should be to reduce the balance on your high-utilization credit cards."

Generate the final, structured output. Ensure all explanations are detailed and directly reference the user's data where possible to avoid being generic.`,
});

const financialRiskFlow = ai.defineFlow(
  {
    name: 'financialRiskFlow',
    inputSchema: FinancialRiskInputSchema,
    outputSchema: z.object({
        output: FinancialRiskOutputSchema,
        usage: z.any(),
    }),
  },
  async (input) => {
    const result = await prompt(input);
    if (!result.output) {
      throw new Error("AI failed to assess financial risk.");
    }
    return { output: result.output, usage: result.usage };
  }
);
