
'use server';

/**
 * @fileOverview An AI agent that provides a detailed credit summary from a CIBIL report.
 *
 * - getCreditSummary - A function that returns a comprehensive credit summary.
 * - CreditSummaryInput - The input type for the getCreditSummary function.
 * - CreditSummaryOutput - The return type for the getCreditSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FlowUsage } from 'genkit/flow';

const CreditSummaryInputSchema = z.object({
  creditReportText: z.string().describe('The full text extracted from the credit report.'),
});
export type CreditSummaryInput = z.infer<typeof CreditSummaryInputSchema>;


const CreditSummaryOutputSchema = z.object({
  totalAccounts: z.number().describe('The total number of all credit accounts (active and closed).'),
  totalCreditLimit: z.number().describe('The sum of all sanctioned limits/high credits across all accounts in INR.'),
  totalOutstanding: z.number().describe('The sum of all current balances across all accounts in INR.'),
  totalDebt: z.number().describe('The sum of all current balances across all accounts (same as totalOutstanding) in INR.'),
  creditUtilization: z.string().describe('The overall credit utilization percentage. If limit is 0, return "N/A".'),
  debtToLimitRatio: z.string().describe('The debt-to-limit ratio as a percentage. If limit is 0, return "N/A".'),
  activeAccounts: z.number().describe('The total number of currently active accounts.'),
  closedAccounts: z.number().describe('The total number of closed accounts.'),
  writtenOff: z.number().describe('The total number of accounts with a "Written-off" status.'),
  settled: z.number().describe('The total number of accounts with a "Settled" status.'),
  doubtful: z.number().describe('The total number of accounts with a "Doubtful" status.'),
  totalMonthlyEMI: z.number().describe('The sum of all monthly EMIs or installment amounts in INR.'),
  maxSingleEMI: z.number().describe('The largest single EMI amount found among all loans in INR.'),
  creditCardPayments: z.number().describe('The sum of minimum amount due or EMI for all credit card accounts in INR.'),
});
export type CreditSummaryOutput = z.infer<typeof CreditSummaryOutputSchema>;

export async function getCreditSummary(
  input: CreditSummaryInput
): Promise<{ output: CreditSummaryOutput, usage: FlowUsage }> {
  return creditSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'creditSummaryPrompt',
  input: {schema: CreditSummaryInputSchema},
  output: {schema: CreditSummaryOutputSchema},
  prompt: `You are an expert financial data extraction AI. Your task is to meticulously scan the provided credit report text and calculate the values for the credit summary.

**Instructions:**
1.  **Iterate through all accounts** in the "ACCOUNT INFORMATION" or similar section.
2.  **Calculate Totals:**
    *   **totalAccounts**: Count every account listed.
    *   **activeAccounts**: Count accounts that are not closed, written-off, or settled.
    *   **closedAccounts**: Count accounts explicitly marked as "Closed".
    *   **writtenOff**: Count accounts with status "Written-off" or "Post (WO) Settled".
    *   **settled**: Count accounts with status "Settled".
    *   **doubtful**: Count accounts with status "Doubtful".
    *   **totalCreditLimit**: Sum the "Sanctioned Amount" or "High Credit" for all accounts.
    *   **totalOutstanding / totalDebt**: Sum the "Current Balance" for all accounts.
    *   **totalMonthlyEMI**: Sum the "EMI Amount" or "Instalment Amount" for all accounts.
    *   **maxSingleEMI**: Find the largest single "EMI Amount" from any account.
    *   **creditCardPayments**: For "Credit Card" type accounts only, sum the "EMI Amount" or "Minimum Amount Due".
3.  **Calculate Ratios:**
    *   **creditUtilization / debtToLimitRatio**: Calculate (totalOutstanding / totalCreditLimit) * 100. Format as a percentage string (e.g., "35%"). If totalCreditLimit is 0, return "N/A".
4.  **Handle Missing Data:** If a value cannot be found, return 0 for numbers and "N/A" for strings.

**Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

Provide the final extracted data in the structured format.
`,
});

const creditSummaryFlow = ai.defineFlow(
  {
    name: 'creditSummaryFlow',
    inputSchema: CreditSummaryInputSchema,
    outputSchema: z.object({
        output: CreditSummaryOutputSchema,
        usage: z.any(),
    }),
  },
  async (input) => {
    const result = await prompt(input);
    const output = result.output;
    if (!output) {
      throw new Error("AI failed to extract the credit summary.");
    }
    
    // Post-calculation for safety
    if (output.totalCreditLimit > 0) {
        const utilization = Math.round((output.totalOutstanding / output.totalCreditLimit) * 100);
        output.creditUtilization = `${utilization}%`;
        output.debtToLimitRatio = `${utilization}%`;
    } else {
        output.creditUtilization = "N/A";
        output.debtToLimitRatio = "0%";
    }
    
    return { output, usage: result.usage };
  }
);
