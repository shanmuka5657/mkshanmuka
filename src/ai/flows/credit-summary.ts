
'use server';

/**
 * @fileOverview An AI agent that provides a detailed list of all accounts from a CIBIL report and a DPD summary.
 *
 * - getCreditSummary - A function that returns a comprehensive list of all accounts and DPD analysis.
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
    paymentHistory: z.string().describe("A summary of the payment history (e.g., 'STD', '090'). Use 'NA' if not applicable."),
});

const DPDSummarySchema = z.object({
  onTime: z.number().describe('Total number of on-time payments (STD or 000).'),
  late30: z.number().describe('Total number of payments that were 1-30 days late.'),
  late60: z.number().describe('Total number of payments that were 31-60 days late.'),
  late90: z.number().describe('Total number of payments that were 61-90 days late.'),
  late90Plus: z.number().describe('Total number of payments that were over 90 days late (e.g., SUB, DBT).'),
  default: z.number().describe('Total number of months reported as Default or Loss (LSS).'),
});


const CreditSummaryOutputSchema = z.object({
  allAccounts: z.array(AccountDetailSchema).describe("A complete list of every account found in the report with all details."),
  dpdSummary: DPDSummarySchema.describe("A summary of the Days Past Due (DPD) payment history across all accounts."),
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
  prompt: `You are an expert financial data extraction AI. Your task is to meticulously scan the provided credit report text and extract data for two key sections: a complete list of 'All Accounts' and a 'DPD Analysis'.

**Part 1: DPD (Days Past Due) Analysis**
Scan the payment history strings for ALL accounts. Tally up the total number of months for each DPD category and populate the 'dpdSummary' object.
- **onTime**: Count all instances of 'STD' or '000'.
- **late30**: Count all instances from '001' to '030'.
- **late60**: Count all instances from '031' to '060'.
- **late90**: Count all instances from '061' to '090'.
- **late90Plus**: Count all instances of 'SUB' or any number greater than 90.
- **default**: Count all instances of 'DBT' (Doubtful) or 'LSS' (Loss).


**Part 2: All Account Details Extraction**
Go through every single account one by one in the "ACCOUNT INFORMATION" or similar section and extract the following details for the 'allAccounts' array. Do NOT perform any calculations or summarizations. Your only job is to extract the raw data for each account. For any value that is not present or not applicable, use "NA" for text/date fields and "₹NaN" for currency fields.
- **type**: The account type.
- **ownership**: The ownership status.
- **status**: The current account status. CRITICAL: Capture the status exactly as written (e.g., 'OPEN', 'CLOSED', 'WRITTEN-OFF', 'SETTLED', 'DOUBTFUL').
- **sanctioned**: Sanctioned Amount, formatted as a currency string.
- **outstanding**: Current Balance, formatted as a currency string.
- **overdue**: Overdue Amount, formatted as a currency string.
- **emi**: EMI Amount, formatted as a currency string.
- **opened**: Date Opened, in DD-MM-YYYY format.
- **closed**: Date Closed, in DD-MM-YYYY format.
- **paymentHistory**: The payment history string (e.g., '000|000|STD...').

**Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

Provide the final extracted data in the structured format, including the DPD analysis and the complete list of all accounts. Do not provide any summary fields like totalAccounts or totalDebt.
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
