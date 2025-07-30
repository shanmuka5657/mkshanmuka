
'use server';
/**
 * @fileOverview An AI agent that performs a comprehensive credit underwriting analysis.
 *
 * - getCreditUnderwriting - A function that returns a detailed underwriting decision.
 * - CreditUnderwritingInput - The input type for the getCreditUnderwriting function.
 * - CreditUnderwritingOutput - The return type for the getCreditUnderwriting function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CreditUnderwritingInputSchema = z.object({
  creditReportText: z
    .string()
    .describe('The full text extracted from the credit report.'),
  aiRating: z
    .object({
      aiScore: z.number(),
      rating: z.string(),
      summary: z.string(),
      positiveFactors: z.array(z.string()),
      negativeFactors: z.array(z.string()),
    })
    .describe('The previously generated AI Credit Rating.'),
  estimatedIncome: z
    .number()
    .describe("The user's estimated monthly income in INR."),
  loanType: z
    .enum(['Personal Loan', 'Home Loan', 'Auto Loan', 'Loan Against Property'])
    .describe('The type of loan the user is applying for.'),
  desiredLoanAmount: z
    .number()
    .describe('The loan amount the user is requesting in INR.'),
  desiredTenure: z
    .number()
    .describe('The desired loan tenure in months.'),
  desiredInterestRate: z
    .number()
    .describe('The desired annual interest rate for the loan (e.g., 12.5).'),
});
export type CreditUnderwritingInput = z.infer<
  typeof CreditUnderwritingInputSchema
>;

const CreditUnderwritingOutputSchema = z.object({
  underwritingDecision: z
    .enum([
      'Approved',
      'Conditionally Approved',
      'Declined',
      'Requires Manual Review',
    ])
    .describe('The final underwriting decision.'),
  approvedLoanAmount: z
    .number()
    .describe('The loan amount the AI has approved in INR. Can be lower than requested.'),
  recommendedInterestRate: z
    .string()
    .describe('The recommended annual interest rate for the loan (e.g., "10.5% - 11.5%").'),
  recommendedTenure: z
    .number()
    .describe('The recommended loan tenure in months.'),
  underwritingSummary: z
    .string()
    .describe(
      'A comprehensive, multi-paragraph summary explaining the decision. It should detail the factors (positive and negative) from the credit report that influenced the outcome, leaving no questions unanswered.'
    ),
  requiredDocuments: z
    .array(z.string())
    .describe('A list of documents required for the specified loan type.'),
  conditions: z
    .array(z.string())
    .describe(
      'A list of conditions that must be met for the loan to be disbursed (e.g., "Income verification via bank statements"). Empty if no conditions.'
    ),
});
export type CreditUnderwritingOutput = z.infer<
  typeof CreditUnderwritingOutputSchema
>;

export async function getCreditUnderwriting(
  input: CreditUnderwritingInput
): Promise<CreditUnderwritingOutput> {
  return creditUnderwritingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'creditUnderwritingPrompt',
  input: {schema: CreditUnderwritingInputSchema},
  output: {schema: CreditUnderwritingOutputSchema},
  prompt: `You are a senior credit underwriter for a major bank in India. Your task is to perform an exceptionally comprehensive and exhaustive underwriting analysis for a loan application. Your response must be so thorough that it preempts any potential questions from the applicant. You must be fair and follow standard banking risk policies.

**Applicant's Profile:**
- **Loan Type Requested:** {{{loanType}}}
- **Desired Loan Amount:** ₹{{{desiredLoanAmount}}}
- **Desired Tenure:** {{{desiredTenure}}} months
- **Desired Interest Rate:** {{{desiredInterestRate}}}%
- **Estimated Monthly Income:** ₹{{{estimatedIncome}}}
- **AI Credit Score:** {{{aiRating.aiScore}}}/100 (Rating: {{{aiRating.rating}}})
- **AI Credit Summary:** {{{aiRating.summary}}}

**Full Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

**Your Underwriting Task:**

1.  **Holistic Analysis:** Scrutinize every detail of the full credit report and all provided data. Pay extremely close attention to payment history (DPD patterns, frequency, and severity), credit utilization on each account and overall, age of all credit lines (oldest, newest, average), the mix and quality of credit types (secured vs. unsecured), and the pattern/frequency of recent inquiries.
2.  **Debt-to-Income (DTI) Calculation and Impact:** A critical factor is the DTI ratio. Total existing EMIs from the report plus the EMI of the proposed new loan should not exceed 50-60% of the applicant's monthly income. You must estimate the EMI for the requested loan to calculate this and explicitly state the calculated DTI ratio and how it impacted your decision.
3.  **Make a Decision:** Based on your exhaustive analysis, decide on one of the following outcomes: 'Approved', 'Conditionally Approved', 'Declined', or 'Requires Manual Review'.
4.  **Determine and Justify Loan Terms:** If approved or conditionally approved, determine a realistic 'approvedLoanAmount', 'recommendedInterestRate', and 'recommendedTenure'. The approved amount can be less than the desired amount if the risk is high. The interest rate must be justified based on the AI score, risk factors, and market standards. Explain *why* the recommended terms might differ from what the user desired.
5.  **Write a Comprehensive, Unquestionable Summary:** This is the most critical part. Your summary must be multi-paragraph and leave no stone unturned.
    - Start with a clear statement of the decision.
    - Explain *exactly* how the applicant's profile (income, DTI, AI score) led to the decision.
    - Reference specific positive factors (e.g., "consistent on-time payments for a home loan of 5 years shows credit discipline") and negative factors (e.g., "high utilization of 95% on two credit cards and a recent written-off personal loan of ₹50,000 indicates high credit risk and poor financial management").
    - Connect these specific factors directly to the approved loan amount, interest rate, and tenure. For example, if declining, state "The application was declined due to a high DTI of 65% and a recent history of late payments on a personal loan, which makes further credit extension too risky at this time."
6.  **List Required Documents:** Provide a standard, comprehensive list of documents required for the specified 'loanType'.
7.  **List Conditions:** If the decision is 'Conditionally Approved', list the specific, actionable conditions required for final approval (e.g., "Clearance of the outstanding balance on the settled credit card account," "Submission of last 6 months of bank statements for income verification").

Generate the final, structured output based on this complete and thoroughly justified analysis.`,
});

const creditUnderwritingFlow = ai.defineFlow(
  {
    name: 'creditUnderwritingFlow',
    inputSchema: CreditUnderwritingInputSchema,
    outputSchema: CreditUnderwritingOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
