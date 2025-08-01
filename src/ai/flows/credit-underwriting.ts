
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
  employmentType: z
    .enum(['Salaried', 'Self-employed', 'Daily Wage Earner'])
    .describe('The employment status of the applicant.'),
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
    .describe('A list of documents required for the specified loan type and employment type.'),
  conditions: z
    .array(z.string())
    .describe(
      'A list of conditions that must be met for the loan to be disbursed (e.g., "Income verification via bank statements"). Empty if no conditions.'
    ),
  probabilityOfDefault: z.number().describe('The estimated probability of the user defaulting on a new loan in the next 24 months, as a percentage (0-100).'),
  lossGivenDefault: z.number().describe('The estimated percentage of the Exposure at Default that would be lost if the user defaults (0-100).'),
  exposureAtDefault: z.number().describe('The estimated total outstanding balance across all accounts if the user were to default, in INR.'),
  expectedLoss: z.number().describe('The final calculated Expected Loss (PD * LGD * EAD) in INR.'),
  riskMetricsExplanation: z.object({
    pd: z.string().describe("A detailed, multi-sentence explanation for the 'probabilityOfDefault' score, referencing specific report factors."),
    lgd: z.string().describe("A detailed, multi-sentence explanation for the 'lossGivenDefault' percentage, referencing the mix of secured vs. unsecured debt."),
    ead: z.string().describe("A detailed, multi-sentence explanation for the 'exposureAtDefault' amount, explaining what it represents."),
  }).describe('Detailed explanations for the key risk metrics.'),
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
- **Employment Type:** {{{employmentType}}}
- **AI Credit Score:** {{{aiRating.aiScore}}}/100 (Rating: {{{aiRating.rating}}})
- **AI Credit Summary:** {{{aiRating.summary}}}

**Full Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

**Your Underwriting Task:**

1.  **Holistic Analysis:** Scrutinize every detail of the full credit report and all provided data. Pay extremely close attention to payment history (DPD patterns, frequency, and severity), credit utilization on each account and overall, age of all credit lines (oldest, newest, average), the mix and quality of credit types (secured vs. unsecured), and the pattern/frequency of recent inquiries.
2.  **Income Stability Analysis:** The applicant's 'employmentType' is a critical factor. Salaried individuals have stable income. Self-employed income can be variable and requires more documentation. Daily wage earners have the least stable income and pose the highest risk. Your decision and required documents must reflect this.
3.  **Debt-to-Income (DTI) Calculation and Impact:** A critical factor is the DTI ratio. Total existing EMIs from the report plus the EMI of the proposed new loan should not exceed 50-60% of the applicant's monthly income. You must estimate the EMI for the requested loan to calculate this and explicitly state the calculated DTI ratio and how it impacted your decision. The acceptable DTI may be lower for less stable employment types.
4.  **Make a Decision:** Based on your exhaustive analysis, decide on one of the following outcomes: 'Approved', 'Conditionally Approved', 'Declined', 'Requires Manual Review'.
5.  **Determine and Justify Loan Terms:** If approved or conditionally approved, determine a realistic 'approvedLoanAmount', 'recommendedInterestRate', and 'recommendedTenure'. The approved amount can be less than the desired amount if the risk is high. The interest rate must be justified based on the AI score, risk factors, employment type, and market standards. Explain *why* the recommended terms might differ from what the user desired.
6.  **Write a Comprehensive, Unquestionable Summary:** This is the most critical part. Your summary must be multi-paragraph and leave no stone unturned.
    - Start with a clear statement of the decision.
    - Explain *exactly* how the applicant's profile (income, DTI, AI score, employment stability) led to the decision.
    - Reference specific positive factors (e.g., "consistent on-time payments for a home loan of 5 years shows credit discipline") and negative factors (e.g., "high utilization of 95% on two credit cards and a recent written-off personal loan of ₹50,000 indicates high credit risk and poor financial management").
    - Connect these specific factors directly to the approved loan amount, interest rate, and tenure. For example, if declining, state "The application was declined due to a high DTI of 65% combined with the variable nature of self-employment income, which makes further credit extension too risky at this time."
7.  **List Required Documents:** Provide a standard, comprehensive list of documents required for the specified 'loanType' AND 'employmentType'. For example, salaried employees need salary slips, while self-employed individuals need ITR and business financials. Daily wage earners might need affidavits or bank statements.
8.  **List Conditions:** If the decision is 'Conditionally Approved', list the specific, actionable conditions required for final approval (e.g., "Clearance of the outstanding balance on the settled credit card account," "Submission of last 6 months of bank statements for income verification").
9.  **Advanced Risk Metrics:** As part of your final analysis, determine and explain the following:
    *   **exposureAtDefault (EAD):** Calculate the total outstanding balance across all active loans and credit cards. This represents the total amount the lender would be exposed to if the borrower defaults today. Sum up all 'Current Balance' fields and provide the total in INR.
    *   **probabilityOfDefault (PD):** Holistically analyze the entire report to estimate the probability (from 0 to 100) that the user might default (fail to pay for 90+ days) on a new loan within the next 24 months.
    *   **lossGivenDefault (LGD):** Based on the mix of credit (secured vs. unsecured loans), estimate the percentage of the EAD that would likely be unrecoverable in the event of a default. Unsecured debt (personal loans, credit cards) has a higher LGD (typically 50-90%) than secured debt (auto, home loans) (typically 10-50%). Provide a single, blended LGD percentage (0-100).
    *   **riskMetricsExplanation:** Provide detailed, multi-sentence explanations for each metric (pd, lgd, ead), explaining which specific factors influenced the calculation.
    *   **DO NOT** calculate the final 'expectedLoss'. Only provide the component values (PD, LGD, EAD). The final calculation will be handled by the system.

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

    if (!output) {
      throw new Error("AI failed to provide an underwriting analysis.");
    }

    // Perform the Expected Loss calculation in code for accuracy.
    const pd = output.probabilityOfDefault / 100;
    const lgd = output.lossGivenDefault / 100;
    const ead = output.exposureAtDefault;
    
    // Ensure the final EL is a number and round it for cleanliness.
    output.expectedLoss = Math.round(pd * lgd * ead);

    return output;
  }
);
