
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
  // We now pass the pre-calculated EAD to the prompt
  preCalculatedEad: z.number().optional().describe('The pre-calculated Exposure at Default in INR.'),
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
  defaultProbabilityExplanation: z.string().describe('A detailed, multi-sentence explanation of the factors that contributed to the probability of default calculation, citing specific data points like DPD history or high utilization.'),
  riskScoreExplanation: z.string().describe("A detailed, multi-sentence explanation of how the final risk score was determined, referencing the key factors and the weight given to each (e.g., 'The high risk score of 75 is primarily driven by the recent 90-day delinquency on the personal loan, which is the most heavily weighted factor...')."),
  exposureAtDefault: z.number().describe('The estimated total outstanding balance across all accounts if the user were to default, in INR.'),
  eadExplanation: z.string().describe("A one-sentence explanation stating that EAD is the sum of outstanding balances for all active, considered accounts."),
  lossGivenDefault: z.number().describe('The estimated percentage of the Exposure at Default that would be lost if the user defaults (0-100).'),
  lgdExplanation: z.string().describe("A detailed, multi-sentence explanation for the LGD percentage, referencing the mix of secured vs. unsecured debt in the considered accounts."),
  expectedLoss: z.number().describe('The final calculated Expected Loss (PD * LGD * EAD) in INR.'),
  elExplanation: z.string().describe("A one-sentence explanation stating that EL is calculated by multiplying PD, EAD, and LGD, and what the final number represents."),
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
  output: {schema: z.object({
      // The AI is no longer responsible for EAD or EL calculation.
      riskScore: RiskAssessmentOutputSchema.shape.riskScore,
      riskLevel: RiskAssessmentOutputSchema.shape.riskLevel,
      riskFactors: RiskAssessmentOutputSchema.shape.riskFactors,
      suggestedMitigations: RiskAssessmentOutputSchema.shape.suggestedMitigations,
      probabilityOfDefault: RiskAssessmentOutputSchema.shape.probabilityOfDefault,
      lossGivenDefault: RiskAssessmentOutputSchema.shape.lossGivenDefault,
      // Explanations are still required.
      riskScoreExplanation: RiskAssessmentOutputSchema.shape.riskScoreExplanation,
      defaultProbabilityExplanation: RiskAssessmentOutputSchema.shape.defaultProbabilityExplanation,
      eadExplanation: RiskAssessmentOutputSchema.shape.eadExplanation,
      lgdExplanation: RiskAssessmentOutputSchema.shape.lgdExplanation,
      elExplanation: RiskAssessmentOutputSchema.shape.elExplanation,
  })},
  prompt: `You are an expert credit risk analyst. Your task is to conduct a detailed, technical risk assessment based on the provided structured credit data. This data has been manually edited by a user, and you MUST treat it as the absolute source of truth.

**CRITICAL INSTRUCTIONS:**
1.  **FILTER ACCOUNTS:** From the \`analysisResult.allAccounts\` array, you MUST first filter and use ONLY the accounts where the \`isConsidered\` flag is set to \`true\`. Completely IGNORE any account where \`isConsidered\` is \`false\`.
2.  **USE MANUAL EMI:** When calculating total debt or obligations, if an account has a \`manualEmi\` value, you MUST use that value. Otherwise, use the standard \`emi\` value.
3.  **BASE ALL ANALYSIS ON FILTERED DATA:** Your entire analysis, including risk score, risk factors, PD, LGD, and all explanations, MUST be based *only* on the filtered set of accounts. Do NOT reference any data from the excluded accounts in your explanations.
4.  **DO NOT CALCULATE EAD:** The Exposure at Default (EAD) has been pre-calculated and is provided for your context. You must only provide an explanation for it.
    *   **Pre-Calculated EAD:** ₹{{{preCalculatedEad}}}

**Structured Credit Report Data (Source of Truth):**
\`\`\`json
{{{json analysisResult}}}
\`\`\`

**Your Task:**

1.  **Analyze the Filtered Data Holistically:** Apply the critical instructions above to analyze the user-customized dataset.
2.  **Risk Score & Level:** Generate a 'riskScore' (0-100, 100 is HIGHEST risk) and 'riskLevel' ('Low', 'Medium', 'High', 'Very High'). High delinquencies, written-off accounts, or high utilization in the *filtered data* must result in a significantly higher score.
3.  **Risk Factors:** List the top 3-4 most significant 'riskFactors' based *only* on the filtered data. Cite specific numbers in your details.
4.  **Suggested Mitigations:** For each identified risk factor, provide a corresponding and actionable mitigation suggestion.
5.  **Probability of Default (PD):** Estimate the 'probabilityOfDefault' (0-100%) for a new loan in the next 24 months based on the filtered data.
6.  **Loss Given Default (LGD):** Estimate a blended 'lossGivenDefault' percentage (0-100) based on the mix of secured vs. unsecured debt in the *filtered data*. Unsecured debt should lead to a higher LGD.

**Explanations (CRITICAL):**
*   **riskScoreExplanation:** Provide a detailed explanation for how you arrived at the final 'riskScore'. Explain which factors carried the most weight.
*   **defaultProbabilityExplanation:** Clearly explain your reasoning for the PD score, referencing specific elements from the *filtered* report.
*   **eadExplanation:** Provide a simple, one-sentence explanation for EAD, stating it's the sum of outstanding balances for active, considered accounts. Use the pre-calculated value in your explanation if relevant.
*   **lgdExplanation:** Provide a detailed explanation for the LGD percentage, specifically referencing the mix of secured vs. unsecured debt in the *filtered* accounts and how that impacts potential recovery.
*   **elExplanation:** Provide a simple, one-sentence explanation for EL, stating that it's calculated from PD, EAD, and LGD, and represents the statistical financial loss a lender might expect.

Generate the final, structured output. Do NOT include fields for 'exposureAtDefault' or 'expectedLoss' in your direct output, as they are calculated in code.
`,
});

const riskAssessmentFlow = ai.defineFlow(
  {
    name: 'riskAssessmentFlow',
    inputSchema: z.object({ analysisResult: z.any() }), // Keep public input simple
    outputSchema: RiskAssessmentOutputSchema,
  },
  async (input: RiskAssessmentInput) => {
    
    // STEP 1: Perform deterministic calculations in code.
    const consideredAccounts = input.analysisResult.allAccounts.filter(acc => (acc as any).isConsidered);
    
    const calculatedEad = consideredAccounts.reduce((sum, acc) => {
        const status = acc.status.toLowerCase();
        if (status === 'active' || status === 'open') {
             const outstandingNum = Number(String(acc.outstanding).replace(/[^0-9.-]+/g,""));
             return sum + (isNaN(outstandingNum) ? 0 : outstandingNum);
        }
        return sum;
    }, 0);

    // STEP 2: Call the AI with pre-calculated data for analysis and explanation.
    const {output, usage} = await prompt({
        analysisResult: input.analysisResult,
        preCalculatedEad: calculatedEad,
    });

    if (!output) {
      throw new Error("AI failed to provide a risk assessment.");
    }
    
    // STEP 3: Combine coded calculations and AI analysis into the final result.
    const pd = output.probabilityOfDefault / 100;
    const lgd = output.lossGivenDefault / 100;
    const ead = calculatedEad;
    const calculatedEl = Math.round(pd * lgd * ead);

    // Construct the full output object
    const finalOutput: RiskAssessmentOutput = {
        ...output,
        exposureAtDefault: ead,
        expectedLoss: calculatedEl,
        usage: usage,
    };
    
    return finalOutput;
  }
);

    