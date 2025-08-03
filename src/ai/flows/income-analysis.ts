
'use server';

/**
 * @fileOverview An AI agent that estimates income from a credit report.
 *
 * - getIncomeAnalysis - A function that returns an estimated income and stability score.
 * - IncomeAnalysisInput - The input type for the getIncomeAnalysis function.
 * - IncomeAnalysisOutput - The return type for the getIncomeAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FlowUsage } from 'genkit/flow';

const IncomeAnalysisInputSchema = z.object({
  creditReportText: z.string().describe('The full text extracted from the credit report.'),
});
export type IncomeAnalysisInput = z.infer<typeof IncomeAnalysisInputSchema>;

const IncomeAnalysisOutputSchema = z.object({
  estimatedIncome: z
    .number()
    .describe(
      'The AI-estimated monthly income in INR, based on loan amounts, EMIs, and credit limits.'
    ),
  stabilityScore: z
    .number()
    .describe(
      'A score from 0 to 100 indicating income stability. Higher scores mean more stable income, based on factors like payment consistency and employment data in the report.'
    ),
  explanation: z
    .string()
    .describe(
      'A detailed, multi-sentence explanation of how the income was estimated and what factors influenced the stability score. It must reference specific accounts or patterns in the report.'
    ),
});
export type IncomeAnalysisOutput = z.infer<typeof IncomeAnalysisOutputSchema>;

export async function getIncomeAnalysis(
  input: IncomeAnalysisInput
): Promise<{ output: IncomeAnalysisOutput, usage: FlowUsage }> {
  return getIncomeAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'incomeAnalysisPrompt',
  input: {schema: IncomeAnalysisInputSchema},
  output: {schema: IncomeAnalysisOutputSchema},
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are an expert financial analyst who specializes in estimating income from credit reports. Your task is to analyze the provided CIBIL report and infer the user's monthly income and its stability.

**Methodology:**
1.  **Analyze Repayment Behavior:** Look at the size and type of loans (e.g., Home Loan, Auto Loan) and their corresponding EMIs. Large EMIs on high-value loans suggest a higher income.
2.  **Credit Limits:** High credit card limits can also be an indicator of the income level the bank has assessed for the user.
3.  **Payment History:** Consistent, on-time payments across all accounts indicate stable financial behavior, which often correlates with stable income.
4.  **Enquiries:** Very frequent enquiries for new credit, especially unsecured loans, might suggest income stress.
5.  **Employment Information:** If the report contains any information about the user's employer or length of employment, use it to assess income stability.

**Tasks:**

1.  **Estimate Monthly Income (estimatedIncome):**
    *   Synthesize all the financial indicators from the report.
    *   Provide a realistic, single number estimate for the user's monthly income in INR. For example, if a user is paying a ₹25,000 home loan EMI and a ₹10,000 car loan EMI, their income is likely upwards of ₹1,00,000 per month.
    *   Do not just sum the EMIs. You must infer the income required to sustain such payments.

2.  **Assess Income Stability (stabilityScore):**
    *   Provide a score from 0-100.
    *   **High Score (80-100):** Long credit history, perfect payment record (no DPD), mix of secured and unsecured loans, stable employment if mentioned.
    *   **Medium Score (50-79):** Some late payments (30 DPD), high utilization on credit cards, many recent credit inquiries.
    *   **Low Score (0-49):** Major delinquencies (90+ DPD), written-off or settled accounts, short credit history with negative remarks.

3.  **Provide a Detailed Explanation (explanation):**
    *   This is the most important part. Clearly explain *how* you arrived at your estimations.
    *   Reference specific accounts from the report. For example: "The income estimation of ₹85,000 is based on the significant monthly commitment of a ₹35,000 EMI for your HDFC Home Loan, combined with a good credit card limit of ₹2,00,000 on your ICICI card. The high stability score of 92 is due to your flawless payment history over the past 36 months and the long-standing nature of your primary loan accounts."

**Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

Generate the final, structured output.`,
});

const getIncomeAnalysisFlow = ai.defineFlow(
  {
    name: 'getIncomeAnalysisFlow',
    inputSchema: IncomeAnalysisInputSchema,
    outputSchema: z.object({
        output: IncomeAnalysisOutputSchema,
        usage: z.any(),
    }),
  },
  async (input) => {
    const result = await prompt(input);
    if (!result.output) {
      throw new Error("AI failed to provide an income analysis.");
    }
    return { output: result.output, usage: result.usage };
  }
);
