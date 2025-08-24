
'use server';

/**
 * @fileOverview An AI agent that provides a technical risk assessment based on a credit report.
 * It now performs two separate analyses: one considering all accounts, and one excluding guarantor accounts.
 *
 * - getRiskAssessment - A function that returns a detailed risk assessment.
 * - RiskAssessmentInput - The input type for the getRiskAssessment function.
 * - RiskAssessmentOutput - The return type for the getRiskAssessment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { AnalyzeCreditReportOutput } from './credit-report-analysis';

const RiskAssessmentInputSchema = z.object({
  analysisResult: z
    .any()
    .describe('The full, structured analysis from the initial credit report parsing flow.'),
});
export type RiskAssessmentInput = {
    analysisResult: AnalyzeCreditReportOutput;
};

// Defines the structure for a single, complete risk assessment
const SingleRiskAssessmentSchema = z.object({
  riskScore: z.number().min(0).max(100).describe('A technical risk score from 0 to 100, where 100 is the HIGHEST risk.'),
  riskLevel: z
    .enum(['Low', 'Medium', 'High', 'Very High'])
    .describe(
      'A single-word risk level (Low, Medium, High, or Very High).'
    ),
  riskFactors: z
    .array(z.object({
        factor: z.string().describe('A title for the risk factor (e.g., "Payment History", "High Debt Burden").'),
        severity: z.enum(['Low', 'Medium', 'High']).describe('The severity of the factor.'),
        details: z.string().describe('A one-sentence explanation of the factor, citing specific data from the report.'),
    }))
    .describe('A list of the top 3-4 key risk factors identified in the report.'),
  suggestedMitigations: z
    .array(z.object({
        factor: z.string().describe('The risk factor this mitigation addresses (must match a title from the factors list).'),
        action: z.string().describe('A one-sentence, actionable suggestion to mitigate the specific risk.')
    }))
    .describe('A list of suggested actions to mitigate the identified risks. Each action must correspond to a listed risk factor.'),
  probabilityOfDefault: z.number().describe('The estimated probability of the user defaulting on a new loan in the next 24 months, as a percentage (0-100).'),
  defaultProbabilityExplanation: z.string().describe('A detailed, multi-sentence explanation of the factors that contributed to the probability of default calculation.'),
  exposureAtDefault: z.number().describe('The estimated total outstanding balance across all accounts if the user were to default, in INR.'),
  lossGivenDefault: z.number().describe('The estimated percentage of the Exposure at Default that would be lost if the user defaults (0-100).'),
  expectedLoss: z.number().describe('The final calculated Expected Loss (PD * LGD * EAD) in INR.'),
});
export type SingleRiskAssessment = z.infer<typeof SingleRiskAssessmentSchema>;

// The main output schema now contains two separate assessments
const RiskAssessmentOutputSchema = z.object({
  assessmentWithGuarantor: SingleRiskAssessmentSchema.describe("The risk assessment when considering ALL accounts, including those where the user is a guarantor."),
  assessmentWithoutGuarantor: SingleRiskAssessmentSchema.describe("The risk assessment when EXCLUDING accounts where the user is only a guarantor."),
  usage: z.object({
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
      totalTokens: z.number().optional(),
  }).optional().describe("Token usage for the generation call."),
});
export type RiskAssessmentOutput = z.infer<typeof RiskAssessmentOutputSchema>;


export async function getRiskAssessment(
  input: RiskAssessmentInput
): Promise<RiskAssessmentOutput> {
  return riskAssessmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'riskAssessmentPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: RiskAssessmentInputSchema},
  output: {schema: RiskAssessmentOutputSchema},
  prompt: `You are an expert credit risk analyst. Your task is to conduct two separate, detailed, technical risk assessments based on the provided structured credit data.

**Structured Credit Report Data:**
\`\`\`json
{{{json analysisResult}}}
\`\`\`

**CRITICAL INSTRUCTIONS:**

You MUST perform two complete and independent analyses and return both in the final JSON output:

1.  **Assessment With Guarantor Loans:**
    *   Analyze the user's credit data considering **ALL** accounts, including those where their ownership is listed as 'Guarantor'.
    *   This analysis should reflect the total risk exposure, including contingent liabilities from guaranteed loans.
    *   Populate every field in the 'assessmentWithGuarantor' object based on this holistic view.

2.  **Assessment Without Guarantor Loans:**
    *   Analyze the user's credit data again, but this time **EXCLUDE** all accounts where the ownership is 'Guarantor'.
    *   This analysis should reflect the user's personal credit risk, independent of their guarantor obligations.
    *   Populate every field in the 'assessmentWithoutGuarantor' object based on this filtered view.

**For EACH of the two assessments, you must perform the following steps:**

1.  **Risk Score & Level:** Generate a 'riskScore' (0-100, 100 is HIGHEST risk) and 'riskLevel' ('Low', 'Medium', 'High', 'Very High'). High delinquencies, written-off accounts, or high utilization must result in a significantly higher score.
2.  **Risk Factors:** List the top 3-4 most significant 'riskFactors' based on the data for that specific scenario. Cite specific numbers in your details.
3.  **Suggested Mitigations:** For each identified risk factor, provide a corresponding and actionable mitigation suggestion.
4.  **Probability of Default (PD):** Estimate the 'probabilityOfDefault' (0-100%) for a new loan in the next 24 months based on the data for that scenario.
5.  **Default Probability Explanation:** Clearly explain your reasoning for the PD score, referencing specific elements from the report (e.g., "The PD is elevated due to recent late payments...").
6.  **Exposure at Default (EAD):** Calculate EAD by summing the 'outstanding' amounts of all active loans/cards included in that specific scenario.
7.  **Loss Given Default (LGD):** Estimate a blended 'lossGivenDefault' percentage (0-100) based on the mix of secured vs. unsecured debt in the data for that specific scenario. Unsecured debt should lead to a higher LGD.
8.  **Expected Loss (EL):** You will provide PD, LGD, and EAD values. The final EL will be calculated in the calling code.

Generate the final, structured output containing both completed assessments.
`,
});

const riskAssessmentFlow = ai.defineFlow(
  {
    name: 'riskAssessmentFlow',
    inputSchema: RiskAssessmentInputSchema,
    outputSchema: RiskAssessmentOutputSchema,
  },
  async (input: RiskAssessmentInput) => {
    const {output, usage} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to provide a risk assessment.");
    }
    
    // Calculate Expected Loss for both assessments
    const calculateEL = (assessment: SingleRiskAssessment) => {
        const pd = assessment.probabilityOfDefault / 100;
        const lgd = assessment.lossGivenDefault / 100;
        const ead = assessment.exposureAtDefault;
        assessment.expectedLoss = Math.round(pd * lgd * ead);
    };

    calculateEL(output.assessmentWithGuarantor);
    calculateEL(output.assessmentWithoutGuarantor);

    output.usage = usage;
    
    return output;
  }
);
