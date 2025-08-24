
'use server';

/**
 * @fileOverview An AI agent that provides a technical risk assessment based on a credit report.
 * It performs a single, comprehensive analysis on the provided customized data.
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
    .describe('The full, structured analysis from the initial credit report parsing flow, potentially with user edits.'),
});
export type RiskAssessmentInput = {
    analysisResult: AnalyzeCreditReportOutput;
};

// The main output schema now contains a single, unified assessment
const RiskAssessmentOutputSchema = z.object({
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
  prompt: `You are an expert credit risk analyst. Your task is to conduct a single, detailed, technical risk assessment based on the provided structured credit data. This data may have been manually edited by a user, so you must treat it as the absolute source of truth.

**Structured Credit Report Data (Source of Truth):**
\`\`\`json
{{{json analysisResult}}}
\`\`\`

**Your Task:**

1.  **Analyze the Data Holistically:** Analyze all accounts present in the \`analysisResult.allAccounts\` array. Do not perform any filtering unless specified by user edits within the data itself (e.g., an account marked as not considered).
2.  **Risk Score & Level:** Generate a 'riskScore' (0-100, 100 is HIGHEST risk) and 'riskLevel' ('Low', 'Medium', 'High', 'Very High'). High delinquencies, written-off accounts, or high utilization must result in a significantly higher score.
3.  **Risk Factors:** List the top 3-4 most significant 'riskFactors' based on the provided data. Cite specific numbers in your details.
4.  **Suggested Mitigations:** For each identified risk factor, provide a corresponding and actionable mitigation suggestion.
5.  **Probability of Default (PD):** Estimate the 'probabilityOfDefault' (0-100%) for a new loan in the next 24 months.
6.  **Default Probability Explanation:** Clearly explain your reasoning for the PD score, referencing specific elements from the report (e.g., "The PD is elevated due to recent late payments...").
7.  **Exposure at Default (EAD):** Calculate EAD by summing the 'outstanding' amounts of all active loans/cards.
8.  **Loss Given Default (LGD):** Estimate a blended 'lossGivenDefault' percentage (0-100) based on the mix of secured vs. unsecured debt. Unsecured debt should lead to a higher LGD.
9.  **Expected Loss (EL):** You will provide PD, LGD, and EAD values. The final EL will be calculated in the calling code.

Generate the final, structured output for a single, unified assessment.
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
    
    // Calculate Expected Loss
    const pd = output.probabilityOfDefault / 100;
    const lgd = output.lossGivenDefault / 100;
    const ead = output.exposureAtDefault;
    output.expectedLoss = Math.round(pd * lgd * ead);

    output.usage = usage;
    
    return output;
  }
);
