
'use server';

/**
 * @fileOverview An AI agent that performs an advanced search on a credit report to extract summary information.
 *
 * - getReportSummary - A function that returns key summary data points from a credit report.
 * - ReportSummaryInput - The input type for the getReportSummary function.
 * - ReportSummaryOutput - The return type for the getReportSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FlowUsage } from 'genkit/flow';

const ReportSummaryInputSchema = z.object({
  creditReportText: z.string().describe('The full text extracted from the credit report.'),
});
export type ReportSummaryInput = z.infer<typeof ReportSummaryInputSchema>;


const AccountSummarySchema = z.object({
    total: z.string().describe('Total number of accounts (both active and closed).'),
    zeroBalance: z.string().describe('Number of accounts with zero balance.'),
    highCredit: z.string().describe('The total high credit or sanctioned amount across all accounts, formatted as ₹X,XX,XXX.'),
    currentBalance: z.string().describe('The total current balance across all accounts, formatted as ₹X,XX,XXX.'),
    overdue: z.string().describe('The total overdue amount across all accounts, formatted as ₹X,XX,XXX.'),
    recentDate: z.string().describe('The date the most recent account was opened, in DD-MM-YYYY format.'),
    oldestDate: z.string().describe('The date the oldest account was opened, in DD-MM-YYYY format.'),
});

const EnquirySummarySchema = z.object({
    total: z.string().describe('Total number of enquiries.'),
    past30Days: z.string().describe('Number of enquiries in the past 30 days.'),
    past12Months: z.string().describe('Number of enquiries in the past 12 months.'),
    past24Months: z.string().describe('Number of enquiries in the past 24 months.'),
    recentDate: z.string().describe('The date of the most recent enquiry, in DD-MM-YYYY format.'),
});

const ReportSummaryOutputSchema = z.object({
  accountSummary: AccountSummarySchema.describe('A summary of all credit accounts.'),
  enquirySummary: EnquirySummarySchema.describe('A summary of all credit enquiries.'),
});
export type ReportSummaryOutput = z.infer<typeof ReportSummaryOutputSchema>;

export async function getReportSummary(
  input: ReportSummaryInput
): Promise<{ output: ReportSummaryOutput, usage: FlowUsage }> {
  return reportSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'reportSummaryPrompt',
  input: {schema: ReportSummaryInputSchema},
  output: {schema: ReportSummaryOutputSchema},
  prompt: `You are a CIBIL report analysis expert. Your task is to meticulously scan the provided credit report text and extract the specific data points for the Account Summary and Enquiry Summary sections.

**Instructions:**
1.  Locate the "SUMMARY" section of the report. This section usually contains two sub-sections: "ACCOUNT(S)" and "ENQUIRY(S)".
2.  **For the Account Summary:**
    *   Extract "Total", "Zero-Balance", "High Credit/Sanc. Amt.", "Current", "Overdue", "Recent", and "Oldest" values.
    *   Currency values (High Credit, Current, Overdue) MUST be formatted as a string like "₹X,XXX,XXX". Do not return numbers. If a value is 0, return "₹0".
    *   Date values (Recent, Oldest) must be in DD-MM-YYYY format.
3.  **For the Enquiry Summary:**
    *   Extract "Total", "Past 30 days", "Past 12 months", "Past 24 months", and "Recent" values.
    *   The "Recent" date must be in DD-MM-YYYY format.
4.  **Handling Missing Data:** If any specific field is not found in the report, you MUST return "N/A" for that field. Do not leave it blank or make up data.

**Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

Provide the final extracted data in the structured format.
`,
});

const reportSummaryFlow = ai.defineFlow(
  {
    name: 'reportSummaryFlow',
    inputSchema: ReportSummaryInputSchema,
    outputSchema: z.object({
        output: ReportSummaryOutputSchema,
        usage: z.any(),
    }),
  },
  async (input) => {
    const result = await prompt(input);
    if (!result.output) {
      throw new Error("AI failed to extract the report summary.");
    }
    return { output: result.output, usage: result.usage };
  }
);
