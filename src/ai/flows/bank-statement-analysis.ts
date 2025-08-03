
'use server';

/**
 * @fileOverview An AI agent that analyzes a bank statement and provides a detailed financial summary.
 *
 * - analyzeBankStatement - A function that handles the bank statement analysis.
 * - BankStatementAnalysisInput - The input type for the analyzeBankStatement function.
 * - BankStatementAnalysisOutput - The return type for the analyzeBankStatement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FlowUsage } from 'genkit/flow';

const BankStatementAnalysisInputSchema = z.object({
  statementText: z.string().describe('The full text extracted from the bank statement PDF.'),
});
export type BankStatementAnalysisInput = z.infer<typeof BankStatementAnalysisInputSchema>;

const AccountSummarySchema = z.object({
    accountHolder: z.string().describe('The full name of the account holder. Return "N/A" if not found.'),
    accountNumber: z.string().describe('The account number. Mask it like "******1234". Return "N/A" if not found.'),
    mobileNumber: z.string().describe('The account holder\'s mobile number. Return "N/A" if not found.'),
    address: z.string().describe('The account holder\'s primary address. Return "N/A" if not found.'),
    bankName: z.string().describe('The name of the bank. Return "N/A" if not found.'),
    statementPeriod: z.string().describe('The period of the statement (e.g., "01-05-2024 to 31-05-2024"). Return "N/A" if not found.'),
    openingBalance: z.string().describe('The opening balance of the statement, formatted as ₹X,XX,XXX. Return "N/A" if not found.'),
    closingBalance: z.string().describe('The closing balance of the statement, formatted as ₹X,XX,XXX. Return "N/A" if not found.'),
});

const FinancialOverviewSchema = z.object({
    totalDeposits: z.string().describe('The sum of all credit/deposit transactions, formatted as ₹X,XX,XXX.'),
    totalWithdrawals: z.string().describe('The sum of all debit/withdrawal transactions, formatted as ₹X,XX,XXX.'),
    averageBalance: z.string().describe('The average balance maintained during the statement period, formatted as ₹X,XX,XXX.'),
    estimatedMonthlyIncome: z.string().describe('The AI-estimated monthly income based on recurring salary-like credits, formatted as ₹X,XX,XXX.'),
});

const DetailedOverviewSchema = z.object({
    salaryCredits: z.string().describe('The sum of all transactions identified as salary credits, formatted as ₹X,XX,XXX. Return "₹0" if none found.'),
    incentiveCredits: z.string().describe('The sum of all transactions identified as incentives or bonuses, formatted as ₹X,XX,XXX. Return "₹0" if none found.'),
    mandateDebits: z.string().describe('The sum of all automated mandate debits (like ACH, ECS, NACH for EMIs or bills), formatted as ₹X,XX,XXX. Return "₹0" if none found.'),
    chequeInward: z.string().describe('The sum of all inward clearing cheques (credits), formatted as ₹X,XX,XXX. Return "₹0" if none found.'),
    chequeOutward: z.string().describe('The sum of all outward clearing cheques (debits), formatted as ₹X,XX,XXX. Return "₹0" if none found.'),
});

const FinancialHealthSchema = z.object({
    summary: z.string().describe('A brief, one-paragraph summary of the overall financial health based on the statement.'),
    strengths: z.array(z.string()).describe('A list of positive financial habits or indicators observed (e.g., "Consistent salary credits", "Positive closing balance").'),
    risks: z.array(z.string()).describe('A list of potential financial risks or areas for improvement (e.g., "High number of bounced checks", "Frequent low balance instances").'),
});

const TransactionDetailSchema = z.object({
    date: z.string().describe('The date of the transaction in DD-MM-YYYY format.'),
    description: z.string().describe('The transaction description or narration.'),
    type: z.enum(['credit', 'debit']).describe("The type of transaction."),
    amount: z.string().describe("The transaction amount, formatted as ₹X,XX,XXX."),
    category: z.string().describe("AI-identified category (e.g., 'Salary', 'Rent', 'Food', 'Shopping', 'EMI', 'Utilities', 'Transfer')."),
});

const BankStatementAnalysisOutputSchema = z.object({
  summary: AccountSummarySchema,
  overview: FinancialOverviewSchema,
  detailedOverview: DetailedOverviewSchema,
  health: FinancialHealthSchema,
  transactions: z.array(TransactionDetailSchema).describe("A list of the 10-15 most significant or recent transactions."),
});
export type BankStatementAnalysisOutput = z.infer<typeof BankStatementAnalysisOutputSchema>;


export async function analyzeBankStatement(
  input: BankStatementAnalysisInput
): Promise<{ output: BankStatementAnalysisOutput, usage: FlowUsage }> {
  return analyzeBankStatementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeBankStatementPrompt',
  input: {schema: BankStatementAnalysisInputSchema},
  output: {schema: BankStatementAnalysisOutputSchema},
  model: 'googleai/gemini-pro',
  prompt: `You are an expert financial analyst specializing in Indian bank statements. Your task is to meticulously read the provided bank statement text and extract key financial insights.

**Extraction & Analysis Tasks:**

1.  **Account Summary (summary):**
    *   Extract the account holder's name, mobile number, primary address, bank name, and full statement period.
    *   Find the account number and MASK it, showing only the last 4 digits (e.g., "******1234").
    *   Extract the opening and closing balance for the period.
    *   Format all currency values as "₹X,XX,XXX". If a field is not found, you MUST return "N/A".

2.  **Financial Overview (overview):**
    *   Calculate the sum of all credit (deposits) and debit (withdrawals) transactions.
    *   Calculate the average balance. If not explicitly mentioned, estimate it.
    *   Analyze the credit transactions to identify recurring, salary-like deposits and provide an 'estimatedMonthlyIncome'.

3.  **Detailed Financial Overview (detailedOverview):**
    *   Go through every transaction. Scrutinize the narration/description for keywords.
    *   **Salary Credits**: Find transactions with "SALARY", "SAL", "WAGES" etc. Sum them up.
    *   **Incentive Credits**: Find transactions with "INCENTIVE", "BONUS", "COMMISSION" etc. Sum them up.
    *   **Mandate Debits**: Find debit transactions with "MANDATE", "NACH", "ECS", "ACH", "SI" (Standing Instruction) often related to loan EMIs or bill payments. Sum them up.
    *   **Cheque Inward**: Find credit transactions with "CHQ-INWARD", "INWARD CLG", "CHEQUE DEPOSIT" etc. Sum them up.
    *   **Cheque Outward**: Find debit transactions with "CHQ-OUTWARD", "OUTWARD CLG", "CHEQUE PAID" etc. Sum them up.
    *   You MUST return a formatted currency string (e.g., "₹55,000") for each field. If no such transactions are found for a category, you MUST return "₹0".

4.  **Financial Health (health):**
    *   Write a concise, one-paragraph 'summary' of the user's financial health based on cash flow, balance trends, and transaction types.
    *   List key 'strengths' (e.g., regular savings, consistent income).
    *   List key 'risks' (e.g., high expenditure on non-essentials, check bounces, low average balance).

5.  **Transaction Highlights (transactions):**
    *   Identify the 10-15 most significant transactions. This includes large credits/debits, salary payments, loan EMIs, rent, etc.
    *   For each transaction, extract the date, description, type (credit/debit), and amount.
    *   Assign a logical 'category' to each transaction.

**Bank Statement Text:**
\`\`\`
{{{statementText}}}
\`\`\`

Provide the final, consolidated output in the required structured format.
`,
});

const analyzeBankStatementFlow = ai.defineFlow(
  {
    name: 'analyzeBankStatementFlow',
    inputSchema: BankStatementAnalysisInputSchema,
    outputSchema: z.object({
      output: BankStatementAnalysisOutputSchema,
      usage: z.any(),
    }),
  },
  async input => {
    const result = await prompt(input);
    const output = result.output;
    if (!output) {
      throw new Error("AI failed to analyze the bank statement.");
    }
    return { output, usage: result.usage };
  }
);
