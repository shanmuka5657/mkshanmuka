
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
import type { AiRatingOutput } from './ai-rating';
import type { LoanEligibilityOutput } from './loan-eligibility';
import type { RiskAssessmentOutput } from './risk-assessment';
import type { AnalyzeCreditReportOutput } from './credit-report-analysis';


const CreditUnderwritingInputSchema = z.object({
  analysisResult: z
    .any()
    .describe('The full, structured analysis from the initial credit report parsing flow.'),
  aiRating: z
    .any()
    .describe('The previously generated AI Credit Rating.'),
  loanEligibility: z
    .any()
    .describe('The previously calculated loan eligibility.'),
  riskAssessment: z
    .any()
    .describe('The previously calculated financial risk assessment.'),
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
  userComments: z
    .string()
    .optional()
    .describe('A string containing any comments or notes the user has added about their specific loans.'),
});

export type CreditUnderwritingInput = {
    analysisResult: AnalyzeCreditReportOutput;
    aiRating: AiRatingOutput;
    loanEligibility: LoanEligibilityOutput;
    riskAssessment: RiskAssessmentOutput;
    estimatedIncome: number;
    employmentType: "Salaried" | "Self-employed" | "Daily Wage Earner";
    loanType: "Personal Loan" | "Home Loan" | "Auto Loan" | "Loan Against Property";
    desiredLoanAmount: number;
    desiredTenure: number;
    userComments?: string;
};


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
    .describe('The loan amount the AI has approved in INR. Cannot exceed the pre-calculated eligible amount or the desired amount.'),
  recommendedInterestRate: z
    .string()
    .describe('The recommended annual interest rate for the loan (e.g., "10.5% - 11.5%").'),
  recommendedTenure: z
    .number()
    .describe('The recommended loan tenure in months.'),
  underwritingSummary: z
    .string()
    .describe(
      'A comprehensive, multi-paragraph summary explaining the decision. It should detail the factors (positive and negative) that influenced the outcome, and MUST reference any user comments provided.'
    ),
  requiredDocuments: z
    .array(z.string())
    .describe('A list of documents required for the specified loan type and employment type.'),
  conditions: z
    .array(z.string())
    .describe(
      'A list of conditions that must be met for the loan to be disbursed (e.g., "Income verification via bank statements"). Empty if no conditions.'
    ),
  probabilityOfDefault: z.number().describe('The estimated probability of the user defaulting on a new loan in the next 24 months, as a percentage (0-100). This should be taken directly from the risk assessment input.'),
  lossGivenDefault: z.number().describe('The estimated percentage of the Exposure at Default that would be lost if the user defaults (0-100). This should be taken directly from the risk assessment input.'),
  exposureAtDefault: z.number().describe('The estimated total outstanding balance across all accounts if the user were to default, in INR. This should be taken directly from the risk assessment input.'),
  expectedLoss: z.number().describe('The final calculated Expected Loss (PD * LGD * EAD). This should be taken directly from the risk assessment input.'),
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
  model: 'gemini-1.5-flash',
  input: {schema: CreditUnderwritingInputSchema},
  output: {schema: CreditUnderwritingOutputSchema},
  prompt: `You are a senior credit underwriter for a major bank in India. Your task is to perform a final, comprehensive underwriting analysis based on a collection of pre-analyzed, structured data. Do NOT use raw text.

**CRITICAL RULES:**
1.  **NEVER APPROVE MORE THAN REQUESTED:** The 'approvedLoanAmount' CANNOT be higher than the 'desiredLoanAmount'.
2.  **RESPECT ELIGIBILITY LIMITS:** The 'approvedLoanAmount' must ALSO NOT exceed the 'Pre-Calculated Max Eligible Loan Amount'. If the 'repaymentCapacity' is 0, you MUST decline the loan. Your final approved amount must be the lower of the desired amount and the eligible amount.
3.  **USE PRE-CALCULATED RISK METRICS**: You have been provided with pre-calculated risk metrics (PD, LGD, EAD, EL). You MUST use these exact values in your output. Do NOT recalculate them.

**Applicant's Profile & Pre-Calculated Data:**
- **Loan Type Requested:** {{{loanType}}}
- **Desired Loan Amount:** ₹{{{desiredLoanAmount}}}
- **Desired Tenure:** {{{desiredTenure}}} months
- **Estimated Monthly Income:** ₹{{{estimatedIncome}}}
- **Employment Type:** {{{employmentType}}}
- **Pre-Calculated Max Repayment Capacity:** ₹{{{loanEligibility.repaymentCapacity}}}/month
- **Pre-Calculated Max Eligible Loan Amount:** ₹{{{loanEligibility.eligibleLoanAmount}}}

{{#if userComments}}
**IMPORTANT USER COMMENTS ON LOANS:**
The user has provided the following notes about their loans. You MUST consider these comments in your analysis and reference them in your summary.
\`\`\`
{{{userComments}}}
\`\`\`
{{/if}}

**Full Structured Credit Data:**
\`\`\`json
{{{json analysisResult}}}
\`\`\`

**AI Credit Rating Data:**
\`\`\`json
{{{json aiRating}}}
\`\`\`

**Financial Risk Assessment Data:**
\`\`\`json
{{{json riskAssessment}}}
\`\`\`

**Your Underwriting Task:**

1.  **Make a Final Decision:** Based on a holistic analysis of all structured data, decide on one outcome: 'Approved', 'Conditionally Approved', 'Declined', 'Requires Manual Review'.
2.  **Determine and Justify Loan Terms:** If approved, determine the final loan terms, adhering strictly to the critical rules.
3.  **Write a Comprehensive Summary:** Explain *exactly* how you reached your decision. Reference specific positive and negative factors from the structured data. If the user provided comments, you MUST address them. If you reduce the loan amount, explain *why*, linking it to specific risks (e.g., "While the applicant requested ₹6,00,000, the approved amount was reduced to ₹4,50,000 due to a high DTI ratio and a recent 30-day delinquency...").
4.  **List Documents and Conditions:** Provide a standard list of 'requiredDocuments'. Add risk-based 'conditions' if you see inconsistencies (e.g., a 'Daily Wage Earner' with an unusually high income).
5.  **Use Pre-Calculated Risk Metrics:** Populate the risk fields with the exact values from the input. Write detailed explanations for each metric in 'riskMetricsExplanation'.
6.  **Assign a Final, Overall Profile Rating:** Synthesize everything into a single, definitive 'finalProfileRating'.

Generate the final, structured output.`,
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
    
    const riskAssessment = input.riskAssessment as RiskAssessmentOutput;

    // Ensure the final output uses the exact pre-calculated values for consistency.
    output.probabilityOfDefault = riskAssessment.assessmentWithoutGuarantor.probabilityOfDefault;
    output.lossGivenDefault = riskAssessment.assessmentWithoutGuarantor.lossGivenDefault;
    output.exposureAtDefault = riskAssessment.assessmentWithoutGuarantor.exposureAtDefault;
    output.expectedLoss = riskAssessment.assessmentWithoutGuarantor.expectedLoss;

    return output;
  }
);
