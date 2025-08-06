
'use server';

/**
 * @fileOverview An AI agent that provides a comprehensive risk assessment based on a credit report.
 *
 * - getRiskAssessment - A function that returns a detailed risk assessment.
 * - RiskAssessmentInput - The input type for the getRiskAssessment function.
 * - RiskAssessmentOutput - The return type for the getRiskAssessment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FlowUsage } from 'genkit/flow';
import type { AnalyzeCreditReportOutput } from './credit-report-analysis';


const RiskAssessmentInputSchema = z.object({
  analysisResult: z
    .any()
    .describe('The full, structured analysis from the initial credit report parsing flow.'),
});
export type RiskAssessmentInput = {
    analysisResult: AnalyzeCreditReportOutput;
};

const RiskAssessmentOutputSchema = z.object({
  score: z.number().describe('A risk score from 0 to 100, where 100 is lowest risk.'),
  level: z
    .enum(['Low', 'Medium', 'High'])
    .describe(
      'A single-word risk level (Low, Medium, or High).'
    ),
  factors: z
    .array(
      z.object({
        factor: z.string().describe('A title for the risk factor.'),
        severity: z.string().describe('The severity of the factor (e.g., Low, Medium, High).'),
        details: z.string().describe('A one-sentence explanation of the factor.'),
      })
    )
    .describe('A list of key risk factors identified in the report.'),
  mitigations: z.array(z.object({
    factor: z.string().describe('The risk factor this mitigation addresses.'),
    action: z.string().describe('A one-sentence actionable suggestion to mitigate the risk.')
  })).describe('A list of suggested actions to mitigate the identified risks.'),
  probabilityOfDefault: z.number().describe('The estimated probability of the user defaulting on a new loan in the next 24 months, as a percentage (0-100).'),
  defaultProbabilityExplanation: z.string().describe('A detailed, multi-sentence explanation of the factors that contributed to the probability of default calculation.'),
  exposureAtDefault: z.number().describe('The estimated total outstanding balance across all accounts if the user were to default, in INR.'),
  lossGivenDefault: z.number().describe('The estimated percentage of the Exposure at Default that would be lost if the user defaults (0-100).'),
  expectedLoss: z.number().describe('The final calculated Expected Loss (PD * LGD * EAD) in INR.'),
});
export type RiskAssessmentOutput = z.infer<typeof RiskAssessmentOutputSchema>;

export async function getRiskAssessment(
  input: RiskAssessmentInput
): Promise<{ output: RiskAssessmentOutput, usage: FlowUsage }> {
  return riskAssessmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'riskAssessmentPrompt',
  input: {schema: RiskAssessmentInputSchema},
  output: {schema: RiskAssessmentOutputSchema},
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are an expert credit risk analyst. Your task is to conduct a detailed risk assessment based on the provided structured credit data, including key metrics like PD, EAD, LGD, and Expected Loss. Do NOT use raw text.

Analyze the user's full structured data. Identify all potential risks, such as late payments, high credit utilization, negative account statuses (written-off, settled), and recent credit inquiries.

**Structured Credit Report Data:**
\`\`\`json
{{{json analysisResult}}}
\`\`\`

**Analysis and Calculation Tasks:**

1.  **Risk Score & Level:** Based on the data, generate a 'score' (0-100, 100=lowest risk) and a summary 'level' ('Low', 'Medium', 'High').
2.  **Risk Factors:** Identify and list the most significant risk 'factors'.
3.  **Mitigations:** For each major risk factor, provide a corresponding actionable mitigation strategy.
4.  **Probability of Default (PD):** Holistically analyze the data to estimate the 'probabilityOfDefault' (0-100%) of a default on a new loan in the next 24 months.
5.  **Default Probability Explanation:** Provide a detailed explanation for the PD score, referencing specific data points (e.g., DPD from payment history, high utilization, settled accounts).
6.  **Exposure at Default (EAD):** Calculate the total 'exposureAtDefault' by summing the outstanding balances of all active loans and credit cards from the structured data.
7.  **Loss Given Default (LGD):** Based on the mix of secured vs. unsecured debt in the account list, estimate a single, blended 'lossGivenDefault' percentage (0-100). Unsecured debt (personal, credit card) has higher LGD (50-90%) than secured (auto, home) (10-50%).
8.  **Expected Loss (EL):** You will provide the PD, LGD, and EAD values. The final EL will be calculated in code.

Generate the final output based on your complete analysis of the structured data.
`,
});

const riskAssessmentFlow = ai.defineFlow(
  {
    name: 'riskAssessmentFlow',
    inputSchema: RiskAssessmentInputSchema,
    outputSchema: z.object({
        output: RiskAssessmentOutputSchema,
        usage: z.any(),
    }),
  },
  async (input) => {
    const result = await prompt(input);
    const output = result.output;

    if (!output) {
        throw new Error("AI failed to provide a risk assessment.");
    }

    // Perform the Expected Loss calculation in code for accuracy.
    const pd = output.probabilityOfDefault / 100;
    const lgd = output.lossGivenDefault / 100;
    const ead = output.exposureAtDefault;
    
    // Ensure the final EL is a number and round it for cleanliness.
    output.expectedLoss = Math.round(pd * lgd * ead);

    return { output, usage: result.usage };
  }
);
