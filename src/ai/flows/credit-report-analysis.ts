
'use server';

/**
 * @fileOverview An AI agent that analyzes a credit report and provides a detailed breakdown of the user's credit profile.
 * This is the primary data extraction flow for the initial report analysis.
 *
 * - analyzeCreditReport - A function that handles the credit report analysis process.
 * - AnalyzeCreditReportInput - The input type for the analyzeCreditReport function.
 * - AnalyzeCreditReportOutput - The return type for the analyzeCreditReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { FlowUsage } from 'genkit/flow';

const AnalyzeCreditReportInputSchema = z.object({
  creditReportText: z.string().describe('The text extracted from the credit report.'),
});
export type AnalyzeCreditReportInput = z.infer<typeof AnalyzeCreditReportInputSchema>;

// New schemas to consolidate data fetching
const CustomerDetailsSchema = z.object({
  name: z.string().describe('The full name of the consumer. Return "N/A" if not found.'),
  dateOfBirth: z.string().describe('The consumer\'s date of birth in DD-MM-YYYY format. Return "N/A" if not found.'),
  pan: z.string().describe('The consumer\'s PAN ID. Return "N/A" if not found.'),
  gender: z.string().describe('The consumer\'s gender. Return "N/A" if not found.'),
  mobileNumber: z.string().describe('The consumer\'s primary mobile number. Return "N/A" if not found.'),
  address: z.string().describe('The consumer\'s primary address listed on the report. Return "N/A" if not found.'),
});

const AccountSummarySchema = z.object({
    total: z.string().describe('Total number of accounts (both active and closed). Return "N/A" if not found.'),
    zeroBalance: z.string().describe('Number of accounts with zero balance. Return "N/A" if not found.'),
    highCredit: z.string().describe('The total high credit or sanctioned amount across all accounts, formatted as ₹X,XX,XXX. Return "N/A" if not found.'),
    currentBalance: z.string().describe('The total current balance across all accounts, formatted as ₹X,XX,XXX. Return "N/A" if not found.'),
    overdue: z.string().describe('The total overdue amount across all accounts, formatted as ₹X,XX,XXX. Return "N/A" if not found.'),
    recentDate: z.string().describe('The date the most recent account was opened, in DD-MM-YYYY format. Return "N/A" if not found.'),
    oldestDate: z.string().describe('The date the oldest account was opened, in DD-MM-YYYY format. Return "N/A" if not found.'),
});

const EnquirySummarySchema = z.object({
    total: z.string().describe('Total number of enquiries. Return "N/A" if not found.'),
    past30Days: z.string().describe('Number of enquiries in the past 30 days. Return "N/A" if not found.'),
    past12Months: z.string().describe('Number of enquiries in the past 12 months. Return "N/A" if not found.'),
    past24Months: z.string().describe('Number of enquiries in the past 24 months. Return "N/A" if not found.'),
    recentDate: z.string().describe('The date of the most recent enquiry, in DD-MM-YYYY format. Return "N/A" if not found.'),
});

const ReportSummarySchema = z.object({
  accountSummary: AccountSummarySchema,
  enquirySummary: EnquirySummarySchema,
});

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

// Main output schema that consolidates everything
const AnalyzeCreditReportOutputSchema = z.object({
  customerDetails: CustomerDetailsSchema,
  reportSummary: ReportSummarySchema,
  allAccounts: z.array(AccountDetailSchema).describe("A complete list of every account found in the report with all details. This should be a direct extraction without summarization."),
});
export type AnalyzeCreditReportOutput = z.infer<typeof AnalyzeCreditReportOutputSchema>;

export async function analyzeCreditReport(input: AnalyzeCreditReportInput): Promise<{ output: AnalyzeCreditReportOutput, usage: FlowUsage }> {
  return analyzeCreditReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCreditReportPrompt',
  input: {schema: AnalyzeCreditReportInputSchema},
  output: {schema: AnalyzeCreditReportOutputSchema},
  model: 'googleai/gemini-1.5-pro',
  prompt: `You are an expert CIBIL report data extractor. Your ONLY job is to read the provided credit report text and extract all the specified information in a single pass. Do NOT perform any analysis, calculations, or summarizations beyond what is explicitly asked for in the schemas.

**Extraction Tasks:**

1.  **Consumer Details (customerDetails):**
    *   Find the "PERSONAL INFORMATION", "CONTACT INFORMATION", or "CONSUMER INFORMATION" section.
    *   Extract Name, Date of Birth (DD-MM-YYYY), PAN, Gender, Mobile Number, and the primary Address.
    *   If a field is missing, you MUST return "N/A".

2.  **Report Summary (reportSummary):**
    *   Locate the "SUMMARY" section, typically containing "ACCOUNT(S)" and "ENQUIRY(S)".
    *   **Account Summary:** Extract "Total", "Zero-Balance", "High Credit/Sanc. Amt.", "Current", "Overdue", "Recent" (DD-MM-YYYY), and "Oldest" (DD-MM-YYYY) values. Currency values must be formatted as "₹X,XX,XXX". If 0, use "₹0". If missing, use "N/A".
    *   **Enquiry Summary:** Extract "Total", "Past 30 days", "Past 12 months", "Past 24 months", and "Recent" (DD-MM-YYYY). If missing, use "N/A".

3.  **All Accounts (allAccounts):**
    *   This is the most critical task. Go to the "ACCOUNT INFORMATION" or similar section.
    *   Iterate through EVERY single account listed.
    *   For each account, extract all the fields defined in the AccountDetailSchema (type, ownership, status, sanctioned, outstanding, overdue, emi, opened, closed, paymentHistory).
    *   **Formatting is CRITICAL:**
        *   Currency fields MUST be a string like "₹X,XXX,XXX". If not applicable, use "₹NaN".
        *   Date fields MUST be in "DD-MM-YYYY" format. If not applicable, use "NA".
        *   For 'paymentHistory', extract the raw string exactly as it appears. Do not alter it. If not applicable, use "NA".

**Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

Provide the final, consolidated output in the required structured format.
`,
});

const analyzeCreditReportFlow = ai.defineFlow(
  {
    name: 'analyzeCreditReportFlow',
    inputSchema: AnalyzeCreditReportInputSchema,
    outputSchema: z.object({
      output: AnalyzeCreditReportOutputSchema,
      usage: z.any(),
    }),
  },
  async input => {
    const result = await prompt(input);
    const output = result.output;
    if (!output) {
      throw new Error("AI failed to analyze the report.");
    }

    return { output, usage: result.usage };
  }
);
