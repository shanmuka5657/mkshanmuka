
'use server';

/**
 * @fileOverview An AI agent that calculates the total monthly EMI from a credit report and provides a breakdown of active loans.
 *
 * - calculateTotalEmi - A function that returns the sum of all EMIs and a list of active loans.
 * - CalculateTotalEmiInput - The input type for the calculateTotalEmi function.
 * - CalculateTotalEmiOutput - The return type for the calculateTotalEmi function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FlowUsage } from 'genkit/flow';

const CalculateTotalEmiInputSchema = z.object({
  creditReportText: z.string().describe('The full text extracted from the credit report.'),
});
export type CalculateTotalEmiInput = z.infer<typeof CalculateTotalEmiInputSchema>;

const LoanDetailSchema = z.object({
    loanType: z.string().describe("The type of the loan (e.g., 'Personal Loan', 'Credit Card')."),
    ownership: z.string().describe("The ownership type of the loan (e.g., 'Individual', 'Guarantor', 'Joint')."),
    sanctionedAmount: z.number().describe("The total amount sanctioned for the loan in INR."),
    currentBalance: z.number().describe("The current outstanding balance of the loan in INR."),
    emi: z.number().describe("The monthly EMI amount for this specific loan in INR."),
});

const CalculateTotalEmiOutputSchema = z.object({
  totalEmi: z
    .number()
    .describe(
      'The calculated total of all monthly EMI payments found in the report.'
    ),
  activeLoans: z.array(LoanDetailSchema).describe("A list of all active loans found in the report with their details."),
});
export type CalculateTotalEmiOutput = z.infer<typeof CalculateTotalEmiOutputSchema>;

export async function calculateTotalEmi(
  input: CalculateTotalEmiInput
): Promise<{ output: CalculateTotalEmiOutput, usage: FlowUsage }> {
  return calculateTotalEmiFlow(input);
}

const prompt = ai.definePrompt({
  name: 'calculateTotalEmiPrompt',
  input: {schema: CalculateTotalEmiInputSchema},
  output: {schema: CalculateTotalEmiOutputSchema},
  prompt: `You are a financial data extraction expert. Your task is to meticulously scan the provided credit report text and extract details for all active loans and calculate the total monthly EMI (Equated Monthly Installment).

**Instructions:**
1.  Go through the "ACCOUNT INFORMATION" or "ACCOUNT DETAILS" section of the report.
2.  For each account, look for fields like "Account Type", "Ownership", "Sanctioned Amount", "Current Balance", and "EMI Amount" (or "Instalment Amount").
3.  Only consider accounts that appear to be active loans (e.g., Personal Loan, Auto Loan, Home Loan, Credit Card). Ignore closed accounts.
4.  **Special Rule for Credit Cards:** For accounts of type 'Credit Card', if a specific 'EMI Amount' is not present, you MUST look for the 'Minimum Amount Due' and use that value for the 'emi' field. If neither is present, use 0.
5.  **Handling Zero EMI:** If for any loan type, the EMI amount is explicitly '0' or not mentioned (and it's not a credit card), extract it as 0. The user will have a chance to correct this.
6.  Extract the requested details for each active loan and add it to the 'activeLoans' array.
7.  Sum up the EMI amounts for all extracted active loans to get the 'totalEmi'.
8.  If you cannot find any EMI information, return 0 for totalEmi and an empty array for activeLoans.

**Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

Provide the final calculated total EMI amount and the detailed list of all active loans.
`,
});

const calculateTotalEmiFlow = ai.defineFlow(
  {
    name: 'calculateTotalEmiFlow',
    inputSchema: CalculateTotalEmiInputSchema,
    outputSchema: z.object({
        output: CalculateTotalEmiOutputSchema,
        usage: z.any(),
    }),
  },
  async (input) => {
    const result = await prompt(input);
    if (!result.output) {
      throw new Error("AI failed to calculate the total EMI.");
    }
    return { output: result.output, usage: result.usage };
  }
);
