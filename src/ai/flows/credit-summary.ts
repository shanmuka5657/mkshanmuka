
'use server';

/**
 * @fileOverview An AI agent that provides a detailed list of all accounts from a CIBIL report.
 *
 * - getCreditSummary - A function that returns a comprehensive list of all accounts.
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

const AccountDetailSchema = z.object({
    type: z.string().describe("The type of the account (e.g., 'Credit Card', 'Personal Loan')."),
    ownership: z.string().describe("The ownership type (e.g., 'Individual', 'Joint')."),
    status: z.string().describe("The current account status (e.g., 'OPEN', 'CLOSED', 'WRITTEN-OFF')."),
    sanctioned: z.string().describe("The sanctioned amount, formatted as a currency string. Use '₹NaN' if not applicable."),
    outstanding: z.string().describe("The outstanding balance, formatted as a currency string. Use '₹NaN' if not applicable."),
    overdue: z.string().describe("The overdue amount, formatted as a currency string. Use '₹NaN' if not applicable."),
    emi: z.string().describe("The EMI amount, formatted as a currency string. Use '₹NaN' if not applicable."),
    opened: z.string().describe("The date the account was opened in DD-MM-YYYY format. Use 'NA' if not applicable."),
    closed: z.string().describe("The date the account was closed in DD-MM-YYYY format. Use 'NA' if not applicable."),
    paymentHistory: z.string().describe("The raw payment history string (e.g., '000|000|STD...'). Use 'NA' if not applicable."),
});

const CreditSummaryOutputSchema = z.object({
  allAccounts: z.array(AccountDetailSchema).describe("A complete list of every account found in the report with all details."),
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
  prompt: `You are an expert financial data extraction AI. Your ONLY task is to meticulously scan the provided credit report text and extract the raw data for every single account into the 'allAccounts' array.

**CRITICAL INSTRUCTIONS:**
1.  **NO SUMMARIES, NO CALCULATIONS:** Do NOT perform any calculations or summarizations. Do not count total accounts, active accounts, or anything else. Your only job is to extract the raw data for each account exactly as it appears.
2.  **EXTRACT ALL ACCOUNTS:** Go through every single account one by one in the "ACCOUNT INFORMATION" or similar section.
3.  **DATA FORMATTING:**
    *   For any value that is not present or not applicable, use "NA" for text/date fields and "₹NaN" for currency fields.
    *   **type**: The account type.
    *   **ownership**: The ownership status.
    *   **status**: The current account status. CRITICAL: Capture the status exactly as written (e.g., 'OPEN', 'CLOSED', 'WRITTEN-OFF', 'SETTLED').
    *   **sanctioned**: Sanctioned Amount, formatted as a currency string.
    *   **outstanding**: Current Balance, formatted as a currency string.
    *   **overdue**: Overdue Amount, formatted as a currency string.
    *   **emi**: EMI Amount, formatted as a currency string.
    *   **opened**: Date Opened, in DD-MM-YYYY format.
    *   **closed**: Date Closed, in DD-MM-YYYY format.
    *   **paymentHistory**: The raw, complete payment history string (e.g., '000|000|STD...'). Do not analyze or change it.

**Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

Provide the final extracted list of all accounts.
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
    
    return { output, usage: result.usage };
  }
);
