
'use server';

/**
 * @fileOverview An AI agent that analyzes a credit report and provides a detailed breakdown of the user's credit profile.
 * This is the primary data extraction flow for the initial report analysis. It now also calculates EMI details.
 *
 * - analyzeCreditReport - A function that handles the credit report analysis process.
 * - AnalyzeCreditReportInput - The input type for the analyzeCreditReport function.
 * - AnalyzeCreditReportOutput - The return type for the analyzeCreditReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCreditReportInputSchema = z.object({
  creditReportText: z.string().describe('The text extracted from the credit report.'),
});
export type AnalyzeCreditReportInput = z.infer<typeof AnalyzeCreditReportInputSchema>;

// Schemas for data extraction
const CustomerDetailsSchema = z.object({
  name: z.string().describe('The full name of the consumer. Return "N/A" if not found.'),
  dateOfBirth: z.string().describe('The consumer\'s date of birth in DD-MM-YYYY format. Return "N/A" if not found.'),
  pan: z.string().describe('The consumer\'s PAN ID. Return "N/A" if not found.'),
  gender: z.string().describe('The consumer\'s gender. Return "N/A" if not found.'),
  mobileNumber: z.string().describe('The consumer\'s primary mobile number. Return "N/A" if not found.'),
  address: z.string().describe('The consumer\'s primary address listed on the report. Return "N/A" if not found.'),
});

const AccountSummarySchema = z.object({
    total: z.string().describe('Total number of accounts (both active and closed). Return "0" if not found.'),
    active: z.string().describe('Number of accounts with an "Active" or "Open" status. Return "0" if not found.'),
    closed: z.string().describe('Number of accounts with a "Closed" status. Return "0" if not found.'),
    settled: z.string().describe('Number of accounts with a "Settled" status. Return "0" if not found.'),
    writtenOff: z.string().describe('Number of accounts with a "Written-Off" or "Post-WO" status. Return "0" if not found.'),
    doubtful: z.string().describe('Number of accounts with a "Doubtful" status. Return "0" if not found.'),
    highCredit: z.string().describe('The total high credit or sanctioned amount across all accounts, formatted as ₹X,XX,XXX. Return "₹0" if not found.'),
    currentBalance: z.string().describe('The total current balance (outstanding) across all accounts, formatted as ₹X,XX,XXX. Return "₹0" if not found.'),
    overdue: z.string().describe('The total overdue amount across all accounts, formatted as ₹X,XX,XXX. Return "₹0" if not found.'),
    creditUtilization: z.string().describe('The overall credit utilization percentage for all revolving credit lines (e.g., Credit Cards). Calculate as (Total Current Balance of CCs / Total High Credit of CCs) * 100. Return as a string like "25%". Return "0%" if not applicable.'),
    debtToLimitRatio: z.string().describe('The overall debt-to-limit ratio for all accounts. Calculate as (Total Current Balance of all accounts / Total High Credit of all accounts) * 100. Return as a string like "74%". Return "0%" if not applicable.'),
});


const EnquirySummarySchema = z.object({
    total: z.string().describe('Total number of enquiries. Return "0" if not found.'),
    past30Days: z.string().describe('Number of enquiries in the past 30 days. Return "0" if not found.'),
    past12Months: z.string().describe('Number of enquiries in the past 12 months. Return "0" if not found.'),
    past24Months: z.string().describe('Number of enquiries in the past 24 months. Return "0" if not found.'),
    recentDate: z.string().describe('The date of the most recent enquiry, in DD-MM-YYYY format. Return "N/A" if not found.'),
});

const ReportSummarySchema = z.object({
  accountSummary: AccountSummarySchema,
  enquirySummary: EnquirySummarySchema,
});

const MonthlyPaymentDetailSchema = z.object({
    month: z.string().describe("The three-letter abbreviation for the month (e.g., 'JAN', 'FEB')."),
    year: z.string().describe("The two-digit year (e.g., '24')."),
    status: z.string().describe("The DPD status code for that month (e.g., 'STD', '030', 'LSS')."),
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
    monthlyPaymentHistory: z.array(MonthlyPaymentDetailSchema).describe("A structured list of monthly payment statuses derived from the payment history string. Each entry should have the month, year, and status. If payment history is 'NA', this should be an empty array.")
});

const LoanDetailSchema = z.object({
    loanType: z.string().describe("The type of the loan (e.g., 'Personal Loan', 'Credit Card')."),
    ownership: z.string().describe("The ownership type of the loan (e.g., 'Individual', 'Guarantor', 'Joint')."),
    sanctionedAmount: z.number().describe("The total amount sanctioned for the loan in INR."),
    currentBalance: z.number().describe("The current outstanding balance of the loan in INR."),
    emi: z.number().describe("The monthly EMI amount for this specific loan in INR."),
});

// Main output schema that consolidates everything
const AnalyzeCreditReportOutputSchema = z.object({
  cibilScore: z.number().describe('The consumer\'s primary CIBIL score. Return 0 if not found.'),
  customerDetails: CustomerDetailsSchema,
  reportSummary: ReportSummarySchema,
  allAccounts: z.array(AccountDetailSchema).describe("A complete list of every account found in the report with all details."),
  // Consolidated EMI calculation output
  emiDetails: z.object({
    totalEmi: z.number().describe('The calculated total of all monthly EMI payments for active loans.'),
    activeLoans: z.array(LoanDetailSchema).describe("A list of all active loans with their details."),
  }).describe("Detailed breakdown of active loans and total EMI."),
});
export type AnalyzeCreditReportOutput = z.infer<typeof AnalyzeCreditReportOutputSchema>;

export async function analyzeCreditReport(input: AnalyzeCreditReportInput): Promise<AnalyzeCreditReportOutput> {
  return analyzeCreditReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCreditReportPrompt',
  model: 'gemini-1.5-flash',
  input: {schema: AnalyzeCreditReportInputSchema},
  output: {schema: AnalyzeCreditReportOutputSchema},
  prompt: `You are an expert CIBIL report data extractor. Your ONLY job is to read the provided credit report text and extract all specified information in a single, comprehensive pass. Do NOT perform any summarizations or calculations beyond what is explicitly asked for.

**CRITICAL RULE:** For every field you are asked to extract, if you cannot find the information in the provided text, you MUST return "N/A" for strings, 0 for numbers, or an empty array for lists. You must not leave any field blank or fail to return a value.

**Extraction Tasks:**

1.  **CIBIL Score (cibilScore):** Find the primary CIBIL score in the report. It's often labeled "CIBIL SCORE" or "CREDITVISION SCORE". Extract the 3-digit number. If not found, you MUST return 0.

2.  **Consumer Details (customerDetails):**
    *   Find the "PERSONAL INFORMATION" or similar section.
    *   Extract Name, Date of Birth (DD-MM-YYYY), PAN, Gender, Mobile Number, and the primary Address.
    *   If a field is missing, you MUST return "N/A".

3.  **Report Summary (reportSummary):**
    *   **Account Summary:** Iterate through all accounts to calculate and extract these fields. DO NOT just look for a summary table.
        *   Count the number of accounts for each status: "Total", "Active"/"Open", "Closed", "Settled", "Written-Off", "Doubtful".
        *   Calculate the SUM for "High Credit/Sanc. Amt.", "Current" balance, and "Overdue" amount across all accounts. Format currency as "₹X,XX,XXX". If 0, use "₹0".
        *   Calculate "Credit Utilization" and "Debt-to-Limit Ratio" as percentages, formatted as strings (e.g., "75%").
    *   **Enquiry Summary:** Locate the "ENQUIRY(S)" summary section. Extract "Total", "Past 30 days", "Past 12 months", "Past 24 months", and the most "Recent" enquiry date (DD-MM-YYYY).

4.  **All Accounts (allAccounts):**
    *   Go to the "ACCOUNT INFORMATION" section. Iterate through EVERY account.
    *   For each account, extract all fields defined in the AccountDetailSchema.
    *   **Monthly Payment History (monthlyPaymentHistory):** For each account, look for the payment history string which often has a date header (e.g., "Dec '23 | Nov '23 ..."). Parse this string. For each month-year-status triplet, create a structured object and add it to the 'monthlyPaymentHistory' array. If the date header is missing, you must infer the dates starting from the most recent month and going backwards. If the payment history is 'NA', this array MUST be empty.
    *   **CRITICAL FORMATTING:** Currency fields MUST be "₹X,XXX,XXX" (use "₹NaN" if not applicable). Dates MUST be "DD-MM-YYYY" (use "NA" if not applicable). 'paymentHistory' must be the raw, unaltered string.

5.  **EMI Calculation (emiDetails):**
    *   While iterating through all accounts for the task above, identify all **active loans**.
    *   For each active loan, extract the details required by the LoanDetailSchema. Convert currency amounts to numbers.
    *   **Special Rule for Credit Cards:** For 'Credit Card' accounts, if a specific 'EMI Amount' is not present, use the 'Minimum Amount Due' as the 'emi'. If neither is present, use 0.
    *   **Handling Zero EMI:** If an EMI amount is '0' or not mentioned (and it's not a credit card), extract it as 0.
    *   Sum up the EMI amounts for all extracted active loans to get the 'totalEmi'.
    *   If no active loans are found, return 0 for totalEmi and an empty array for activeLoans.

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
    outputSchema: AnalyzeCreditReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to analyze the report.");
    }
    return output;
  }
);
