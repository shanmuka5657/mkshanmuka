
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
      'A comprehensive, multi-paragraph summary explaining the decision. It should detail the factors (positive and negative) from the credit report that influenced the outcome.'
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
  prompt: `You are a senior credit underwriter for a major bank in India. Your task is to perform a comprehensive underwriting analysis for a loan application. You must be thorough, fair, and follow standard banking risk policies.

**Applicant's Profile:**
- **Loan Type Requested:** {{{loanType}}}
- **Desired Loan Amount:** ₹{{{desiredLoanAmount}}}
- **Desired Tenure:** {{{desiredTenure}}} months
- **Estimated Monthly Income:** ₹{{{estimatedIncome}}}
- **AI Credit Score:** {{{aiRating.aiScore}}}/100 (Rating: {{{aiRating.rating}}})
- **AI Credit Summary:** {{{aiRating.summary}}}

**Full Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

**Your Underwriting Task:**

1.  **Analyze the Entire Profile:** Scrutinize the full credit report and all provided data. Pay close attention to payment history (DPD), credit utilization, age of credit lines, recent inquiries, written-off/settled accounts, and the mix of credit types.
2.  **Determine Debt-to-Income (DTI) Ratio:** A key factor is that total EMIs (including the proposed new loan) should not exceed 50-60% of the applicant's monthly income. You will need to estimate the EMI for the requested loan to calculate this.
3.  **Make a Decision:** Based on your analysis, decide on one of the following outcomes: 'Approved', 'Conditionally Approved', 'Declined', or 'Requires Manual Review'.
4.  **Determine Loan Terms:** If approved or conditionally approved, determine a realistic 'approvedLoanAmount', 'recommendedInterestRate', and 'recommendedTenure'. The approved amount can be less than the desired amount if the risk is too high. The interest rate should be based on the AI score and rating (higher score = lower rate).
5.  **Write a Comprehensive Summary:** Explain your decision in detail. Reference specific positive factors (e.g., "consistent on-time payments for home loan") and negative factors (e.g., "high utilization on two credit cards and a recent written-off personal loan") from the report to justify your conclusion.
6.  **List Required Documents:** Provide a standard list of documents required for the specified 'loanType'.
7.  **List Conditions:** If the decision is 'Conditionally Approved', list the specific conditions required for final approval.

Generate the final, structured output based on this complete and thorough analysis.`,
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
