
'use server';

/**
 * @fileOverview An AI agent that provides a technical risk assessment based on a credit report.
 * It now performs two separate analyses: one with all loans, and one excluding guarantor loans.
 *
 * - getRiskAssessment - A function that returns a detailed dual risk assessment.
 * - RiskAssessmentInput - The input type for the getRiskAssessment function.
 * - RiskAssessmentOutput - The return type for the getRiskAssessment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { AnalyzeCreditReportOutput } from './credit-report-analysis';
import { getAiRating } from './ai-rating';


const RiskAssessmentInputSchema = z.object({
  analysisResult: z
    .any()
    .describe('The full, structured analysis from the initial credit report parsing flow.'),
});
export type RiskAssessmentInput = {
    analysisResult?: AnalyzeCreditReportOutput;
};

const RiskFactorSchema = z.object({
    factor: z.string().describe('A title for the risk factor (e.g., "Payment History", "High Debt Burden").'),
    severity: z.enum(['Low', 'Medium', 'High']).describe('The severity of the factor.'),
    details: z.string().describe('A one-sentence explanation of the factor, citing specific data from the report.'),
});

const MitigationSchema = z.object({
    factor: z.string().describe('The risk factor this mitigation addresses (must match a title from the factors list).'),
    action: z.string().describe('A one-sentence, actionable suggestion to mitigate the specific risk.')
});

const SingleAssessmentSchema = z.object({
  riskScore: z.number().min(0).max(100).describe('A technical risk score from 0 to 100, where 100 is the HIGHEST risk.'),
  riskLevel: z
    .enum(['Low', 'Medium', 'High', 'Very High'])
    .describe(
      'A single-word risk level (Low, Medium, High, or Very High).'
    ),
  riskFactors: z
    .array(RiskFactorSchema)
    .describe('A list of the top 3-4 key risk factors identified in the report.'),
  suggestedMitigations: z
    .array(MitigationSchema)
    .describe('A list of suggested actions to mitigate the identified risks. Each action must correspond to a listed risk factor.'),
  probabilityOfDefault: z.number().describe('The estimated probability of the user defaulting on a new loan in the next 24 months, as a percentage (0-100).'),
  defaultProbabilityExplanation: z.string().describe('A detailed, multi-sentence explanation of the factors that contributed to the probability of default calculation.'),
  exposureAtDefault: z.number().describe('The estimated total outstanding balance across all accounts if the user were to default, in INR.'),
  lossGivenDefault: z.number().describe('The estimated percentage of the Exposure at Default that would be lost if the user defaults (0-100).'),
  expectedLoss: z.number().describe('The final calculated Expected Loss (PD * LGD * EAD) in INR.'),
});

const RiskAssessmentOutputSchema = z.object({
  assessmentWithGuarantor: SingleAssessmentSchema.describe("The complete risk assessment including all loans."),
  assessmentWithoutGuarantor: SingleAssessmentSchema.describe("The risk assessment performed after filtering out all loans where ownership is 'Guarantor'."),
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
  prompt: `You are an expert credit risk analyst. Your task is to conduct a detailed, technical risk assessment based on the provided structured credit data.
Your output MUST contain two complete, separate assessments: one including ALL loans, and a second one EXCLUDING all loans where the user is a 'Guarantor'.

**Structured Credit Report Data:**
\`\`\`json
{{{json analysisResult}}}
\`\`\`

**Instructions for Dual Analysis:**

**PASS 1: Assessment With Guarantor Loans**
1.  Analyze the complete, unaltered structured data provided above.
2.  Perform a full risk assessment, calculating all the metrics required by the 'SingleAssessmentSchema'.
3.  Populate the \`assessmentWithGuarantor\` object in the final output with these results.

**PASS 2: Assessment Without Guarantor Loans**
1.  Take the original structured data and create a temporary, filtered version of the 'allAccounts' array. This filtered array MUST NOT contain any account where the 'ownership' field is 'Guarantor'.
2.  If there are no guarantor loans, this assessment will be identical to PASS 1. You MUST still perform the analysis and populate the fields.
3.  Using only this filtered data, perform a second, complete risk assessment. Recalculate everything from scratch: Risk Score, Risk Level, all risk factors, and all financial metrics (PD, EAD, LGD).
4.  Populate the \`assessmentWithoutGuarantor\` object in the final output with these new results.

**Detailed Calculation Logic for Each Pass:**

1.  **Risk Score & Level:** Generate a 'riskScore' (0-100, 100 is HIGHEST risk) and 'riskLevel'. High delinquencies or written-off accounts must result in a very high score.
2.  **Risk Factors:** List the top 3-4 most significant 'riskFactors' based on the data for that pass. Cite specific numbers.
3.  **Suggested Mitigations:** For each risk factor, provide a corresponding mitigation action.
4.  **Probability of Default (PD):** Estimate the 'probabilityOfDefault' (0-100%) for a new loan in the next 24 months.
5.  **Default Probability Explanation:** Explain the PD score, referencing the specific data used in that pass.
6.  **Exposure at Default (EAD):** Calculate EAD by summing the 'outstanding' amounts of all active loans/cards in the data for that pass.
7.  **Loss Given Default (LGD):** Estimate a blended 'lossGivenDefault' percentage (0-100) based on the mix of secured vs. unsecured debt in the data for that pass.
8.  **Expected Loss (EL):** You will provide PD, LGD, and EAD values. The final EL will be calculated in code.

Generate the final, structured output containing BOTH assessments.
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
    
    // Calculate Expected Loss for the first assessment
    let pd1 = output.assessmentWithGuarantor.probabilityOfDefault / 100;
    let lgd1 = output.assessmentWithGuarantor.lossGivenDefault / 100;
    let ead1 = output.assessmentWithGuarantor.exposureAtDefault;
    output.assessmentWithGuarantor.expectedLoss = Math.round(pd1 * lgd1 * ead1);

    // Calculate Expected Loss for the second assessment
    let pd2 = output.assessmentWithoutGuarantor.probabilityOfDefault / 100;
    let lgd2 = output.assessmentWithoutGuarantor.lossGivenDefault / 100;
    let ead2 = output.assessmentWithoutGuarantor.exposureAtDefault;
    output.assessmentWithoutGuarantor.expectedLoss = Math.round(pd2 * lgd2 * ead2);

    output.usage = usage;
    
    // Now, get the AI rating
    if (input.analysisResult) {
        const aiRatingOutput = await getAiRating({
            analysisResult: input.analysisResult,
            riskAssessment: output.assessmentWithoutGuarantor,
        });
        // We don't directly return the rating here, but this ensures it's part of the overall process
        // In a real scenario, you might merge this into the output.
    }

    return output;
  }
);
