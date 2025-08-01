
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
  loanEligibility: z
    .object({
        eligibleLoanAmount: z.number(),
        estimatedInterestRate: z.string(),
        repaymentCapacity: z.number(),
        eligibilitySummary: z.string(),
        suggestionsToIncreaseEligibility: z.array(z.string()),
    })
    .describe('The previously calculated loan eligibility.'),
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
    .describe('The loan amount the AI has approved in INR. Cannot exceed the pre-calculated eligible amount.'),
  recommendedInterestRate: z
    .string()
    .describe('The recommended annual interest rate for the loan (e.g., "10.5% - 11.5%").'),
  recommendedTenure: z
    .number()
    .describe('The recommended loan tenure in months.'),
  underwritingSummary: z
    .string()
    .describe(
      'A comprehensive, multi-paragraph summary explaining the decision. It should detail the factors (positive and negative) that influenced the outcome.'
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
  finalProfileRating: z.enum(['Very Low Risk', 'Low Risk', 'Moderate Risk', 'High Risk', 'Very High Risk']).describe("A final, single overall rating for the entire profile, considering all inputs."),
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
  prompt: `You are a senior credit underwriter for a major bank in India. Your task is to perform a final, comprehensive underwriting analysis and provide a definitive overall rating for the profile.

**CRITICAL CONSTRAINT:** The maximum loan amount you can approve is strictly limited by the pre-calculated 'repaymentCapacity' from the loan eligibility step. You CANNOT approve a loan amount higher than what the eligibility calculation has deemed affordable. If the 'repaymentCapacity' is 0, you must decline the loan.

**Applicant's Profile & Pre-Calculated Data:**
- **Loan Type Requested:** {{{loanType}}}
- **Desired Loan Amount:** ₹{{{desiredLoanAmount}}}
- **Desired Tenure:** {{{desiredTenure}}} months
- **Estimated Monthly Income:** ₹{{{estimatedIncome}}}
- **Employment Type:** {{{employmentType}}}
- **AI Credit Score:** {{{aiRating.aiScore}}}/100 (Rating: {{{aiRating.rating}}})
- **Pre-Calculated Max Repayment Capacity:** ₹{{{loanEligibility.repaymentCapacity}}}/month
- **Pre-Calculated Max Eligible Loan Amount:** ₹{{{loanEligibility.eligibleLoanAmount}}}

**Full Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

**Your Underwriting Task:**

1.  **Adhere to Eligibility Limits:** Your decision MUST respect the pre-calculated eligibility. If the desired loan amount is higher than the 'Pre-Calculated Max Eligible Loan Amount', you should either reduce the approved amount or decline. If 'repaymentCapacity' is zero, you must decline.
2.  **Make a Final Decision:** Based on a holistic analysis of all data (the report, income, employment stability, and eligibility limits), decide on one outcome: 'Approved', 'Conditionally Approved', 'Declined', 'Requires Manual Review'.
3.  **Determine and Justify Loan Terms:** If approved, determine a final 'approvedLoanAmount' (cannot exceed {{{loanEligibility.eligibleLoanAmount}}}), 'recommendedInterestRate', and 'recommendedTenure'. Explain *why* the terms might differ from the user's request, linking it to specific risk factors.
4.  **Write a Comprehensive Summary:** Provide a multi-paragraph summary explaining the decision. Reference specific positive and negative factors from the report and how they, combined with the eligibility constraints, led to the final outcome.
5.  **List Documents and Conditions:** Provide a standard list of 'requiredDocuments' for the specified 'loanType' and 'employmentType'. If conditionally approved, list the 'conditions'.
6.  **Calculate and Explain Risk Metrics:** Determine 'probabilityOfDefault' (PD), 'lossGivenDefault' (LGD), and 'exposureAtDefault' (EAD). For each, provide a detailed 'riskMetricsExplanation' justifying your calculation based on report specifics. EAD should be the sum of all current balances on active accounts.
7.  **Assign a Final, Overall Profile Rating:** This is the most important output. Synthesize every piece of information—CIBIL score, AI score, income stability, DTI, the entire report analysis, and the final underwriting decision—into a single, definitive 'finalProfileRating'. The rating must be one of: 'Very Low Risk', 'Low Risk', 'Moderate Risk', 'High Risk', 'Very High Risk'. This rating should be the ultimate summary of the applicant's profile.

Generate the final, structured output. Do not calculate 'expectedLoss'; the system will handle it.`,
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

    