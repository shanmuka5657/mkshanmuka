
'use server';

/**
 * @fileOverview An AI agent that provides a technical risk assessment based on a credit report, focusing on key financial metrics.
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

const RiskFactorSchema = z.object({
    factor: z.string().describe('A title for the risk factor (e.g., "Payment History", "High Debt Burden").'),
    severity: z.enum(['Low', 'Medium', 'High']).describe('The severity of the factor.'),
    details: z.string().describe('A one-sentence explanation of the factor, citing specific data from the report.'),
});

const MitigationSchema = z.object({
    factor: z.string().describe('The risk factor this mitigation addresses (must match a title from the factors list).'),
    action: z.string().describe('A one-sentence, actionable suggestion to mitigate the specific risk.')
});

const RiskAssessmentOutputSchema = z.object({
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
  prompt: `You are an expert credit risk analyst. Your task is to conduct a detailed, technical risk assessment based on the provided structured credit data. Your focus is on quantifiable risk metrics (PD, EAD, LGD, Expected Loss) and identifying specific, data-backed risk factors. Do NOT be conversational.

Analyze the user's full structured data. Identify all potential risks, such as late payments, high credit utilization, negative account statuses (written-off, settled), and recent credit inquiries.

**Structured Credit Report Data:**
\`\`\`json
{{{json analysisResult}}}
\`\`\`

**Analysis and Calculation Tasks:**

1.  **Risk Score & Level:** Based on the severity of the data, generate a 'riskScore' (0-100, where 100 is the HIGHEST risk) and a summary 'riskLevel'. A high number of delinquencies or written-off accounts should result in a very high score.
2.  **Risk Factors:** Identify and list the top 3-4 most significant 'riskFactors'. For each, provide a 'severity' and 'details' that cite specific numbers or statuses from the report (e.g., "Multiple accounts show a 30-day delinquency status in the payment history.").
3.  **Suggested Mitigations:** For each identified risk factor, provide a corresponding and DISTINCT 'suggestedMitigations'. The mitigation 'action' should be a logical countermeasure to the 'factor' (e.g., For a "High Debt Burden" factor, suggest "Reduce outstanding balances to improve debt-to-income ratio.").
4.  **Probability of Default (PD):** Holistically analyze the data to estimate the 'probabilityOfDefault' (0-100%) of a default on a new loan in the next 24 months. Be realistic; multiple late payments should significantly increase this.
5.  **Default Probability Explanation:** Provide a detailed explanation for the PD score, referencing specific data points (e.g., "The PD is elevated due to the presence of a 'WRITTEN-OFF' personal loan and a 95% utilization on a credit card...").
6.  **Exposure at Default (EAD):** Calculate the total 'exposureAtDefault' by summing the 'outstanding' amounts of all active loans and credit cards from the 'allAccounts' array. This should be a number.
7.  **Loss Given Default (LGD):** Based on the mix of secured vs. unsecured debt in the account list, estimate a single, blended 'lossGivenDefault' percentage (0-100). Unsecured debt (personal, credit card) has higher LGD (typically 75-90%) than secured (auto, home) (typically 10-40%). Calculate a weighted average.
8.  **Expected Loss (EL):** You will provide the PD, LGD, and EAD values. The final EL will be calculated in code.

Generate the final, structured technical output based on your complete analysis.
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
