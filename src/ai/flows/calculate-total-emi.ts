
'use server';

/**
 * @fileOverview An AI agent that calculates the total monthly EMI from a credit report.
 *
 * - calculateTotalEmi - A function that returns the sum of all EMIs found in the report.
 * - CalculateTotalEmiInput - The input type for the calculateTotalEmi function.
 * - CalculateTotalEmiOutput - The return type for the calculateTotalEmi function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CalculateTotalEmiInputSchema = z.object({
  creditReportText: z.string().describe('The full text extracted from the credit report.'),
});
export type CalculateTotalEmiInput = z.infer<typeof CalculateTotalEmiInputSchema>;

const CalculateTotalEmiOutputSchema = z.object({
  totalEmi: z
    .number()
    .describe(
      'The calculated total of all monthly EMI payments found in the report.'
    ),
});
export type CalculateTotalEmiOutput = z.infer<typeof CalculateTotalEmiOutputSchema>;

export async function calculateTotalEmi(
  input: CalculateTotalEmiInput
): Promise<CalculateTotalEmiOutput> {
  return calculateTotalEmiFlow(input);
}

const prompt = ai.definePrompt({
  name: 'calculateTotalEmiPrompt',
  input: {schema: CalculateTotalEmiInputSchema},
  output: {schema: CalculateTotalEmiOutputSchema},
  prompt: `You are a financial data extraction expert. Your task is to meticulously scan the provided credit report text and calculate the total monthly EMI (Equated Monthly Installment).

**Instructions:**
1.  Go through the "ACCOUNT INFORMATION" or "ACCOUNT DETAILS" section of the report.
2.  For each account, look for a field labeled "EMI Amount", "Instalment Amount", "Monthly Payment Amount", or similar.
3.  Only consider accounts that appear to be active loans (e.g., Personal Loan, Auto Loan, Home Loan). Ignore credit cards unless there's a clear EMI plan mentioned.
4.  Sum up the EMI amounts for all active loans.
5.  If you cannot find any EMI information, return 0.

**Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

Provide only the final calculated total EMI amount.
`,
});

const calculateTotalEmiFlow = ai.defineFlow(
  {
    name: 'calculateTotalEmiFlow',
    inputSchema: CalculateTotalEmiInputSchema,
    outputSchema: CalculateTotalEmiOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI failed to calculate the total EMI.");
    }
    return output;
  }
);
