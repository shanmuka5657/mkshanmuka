
'use server';

/**
 * @fileOverview An AI agent that provides a detailed credit summary from a CIBIL report, including a list of flagged accounts with potential issues.
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

const FlaggedAccountSchema = z.object({
    type: z.string().describe("The type of the account (e.g., 'Loan', 'Credit Card')."),
    status: z.string().describe("The current status or payment status of the account."),
    outstanding: z.string().describe("The outstanding balance, formatted as a currency string (e.g., ₹X,XXX)."),
    overdue: z.string().describe("The overdue amount, formatted as a currency string (e.g., ₹X,XXX)."),
    issue: z.string().describe("A brief, one-sentence description of why the account is flagged."),
});

const CreditSummaryOutputSchema = z.object({
  totalAccounts: z.number().describe('The total number of all credit accounts (active and closed).'),
  totalCreditLimit: z.number().describe('The sum of all sanctioned limits/high credits across all accounts in INR.'),
  totalOutstanding: z.number().describe('The sum of all current balances across all accounts in INR.'),
  totalDebt: z.number().describe('The sum of all current balances across all accounts (same as totalOutstanding) in INR.'),
  creditUtilization: z.string().describe('The overall credit utilization percentage based on revolving credit (e.g., Credit Cards). If limit is 0, return "N/A".'),
  debtToLimitRatio: z.string().describe('The debt-to-limit ratio as a percentage for all accounts. If limit is 0, return "N/A".'),
  activeAccounts: z.number().describe('The total number of currently active accounts.'),
  closedAccounts: z.number().describe('The total number of closed accounts.'),
  writtenOff: z.number().describe('The total number of accounts with a "Written-off" status.'),
  settled: z.number().describe('The total number of accounts with a "Settled" status.'),
  doubtful: z.number().describe('The total number of accounts with a "Doubtful" status.'),
  totalMonthlyEMI: z.number().describe('The sum of all monthly EMIs or installment amounts in INR.'),
  maxSingleEMI: z.number().describe('The largest single EMI amount found among all loans in INR.'),
  creditCardPayments: z.number().describe('The sum of minimum amount due or EMI for all credit card accounts in INR.'),
  flaggedAccounts: z.array(FlaggedAccountSchema).describe("A list of accounts that have potential issues negatively impacting the credit score."),
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
  prompt: `You are an expert financial data extraction and analysis AI. Your task is to meticulously scan the provided credit report text, calculate the values for the credit summary, and identify any "Flagged Accounts" with potential issues.

**Part 1: Credit Summary Calculation**
1.  **Iterate through all accounts** in the "ACCOUNT INFORMATION" or similar section.
2.  **Calculate Totals for All Accounts:**
    *   **totalAccounts**: Count every account listed.
    *   **activeAccounts**: Count accounts that are not closed, written-off, or settled.
    *   **closedAccounts**: Count accounts explicitly marked as "Closed".
    *   **writtenOff**: Count accounts with status "Written-off" or "Post (WO) Settled".
    *   **settled**: Count accounts with status "Settled".
    *   **doubtful**: Count accounts with status "Doubtful".
    *   **totalCreditLimit**: Sum the "Sanctioned Amount" or "High Credit" for ALL accounts.
    *   **totalOutstanding / totalDebt**: Sum the "Current Balance" for ALL accounts.
    *   **totalMonthlyEMI**: Sum the "EMI Amount" or "Instalment Amount" for ALL accounts.
    *   **maxSingleEMI**: Find the largest single "EMI Amount" from any account.
3.  **Calculate Ratios with Specific Rules:**
    *   **debtToLimitRatio**: Calculate this based on ALL accounts: (totalOutstanding / totalCreditLimit) * 100. Format as a percentage string (e.g., "35%"). If totalCreditLimit is 0, return "N/A".
    *   **creditUtilization**: THIS IS A SPECIAL CALCULATION. It must be based ONLY on revolving accounts like 'Credit Card' or 'Credit Line'.
        a. Find all 'Credit Card' or 'Credit Line' accounts.
        b. Sum their 'Current Balance'.
        c. Sum their 'Sanctioned Amount'/'High Credit' (this is the credit card limit).
        d. Calculate (Credit Card Balance / Credit Card Limit) * 100. Format as a percentage string.
        e. If the total credit card limit is 0, return "N/A".
    *   **creditCardPayments**: This must ONLY be the sum from 'Credit Card' type accounts. Sum their 'EMI Amount' or 'Minimum Amount Due'. If an EMI isn't specified, you MUST find the 'Minimum Amount Due' and use it. If both are zero or missing, use 0.
4.  **Zero Payment Rule:** If the calculated creditCardPayments is 0, you MUST return "N/A" for the creditUtilization field, regardless of balance or limit.

**Part 2: Flagged Account Identification**
Scan all accounts again and identify any account that meets one or more of the following criteria. Add each one to the 'flaggedAccounts' array.
1.  **Negative Status:** The account status is 'Written-off', 'Settled', 'Doubtful', or has a high DPD (e.g., '090', 'SUB', 'LSS'). Issue should be like "Account was written-off".
2.  **Missing EMI:** The account is an active loan with a 'Current Balance' greater than zero, but the 'EMI Amount' is '0' or not mentioned. Issue should be: "Active loan with no EMI mentioned."
3.  **Overdue Balance:** The 'Overdue Amount' is greater than zero. Issue should be: "Account has an overdue balance."

For each flagged account, provide the requested details. Outstanding and Overdue amounts must be formatted as currency strings (e.g., "₹38,620", "₹NaN" if not applicable).

**Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

Provide the final extracted data in the structured format, including both the summary and the list of flagged accounts.
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
    
    // Post-calculation for safety on debtToLimitRatio
    if (output.totalCreditLimit > 0) {
        const debtRatio = Math.round((output.totalOutstanding / output.totalCreditLimit) * 100);
        output.debtToLimitRatio = `${debtRatio}%`;
    } else {
        output.debtToLimitRatio = "N/A";
    }

    // The AI is instructed to handle credit utilization calculation and the zero payment rule,
    // so we trust its output directly for `creditUtilization`.
    
    return { output, usage: result.usage };
  }
);
