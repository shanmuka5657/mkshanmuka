
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

const RiskAssessmentInputSchema = z.object({
  creditReportText: z
    .string()
    .describe('The full text extracted from the credit report.'),
});
export type RiskAssessmentInput = z.infer<typeof RiskAssessmentInputSchema>;

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
): Promise<RiskAssessmentOutput> {
  return riskAssessmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'riskAssessmentPrompt',
  input: {schema: RiskAssessmentInputSchema},
  output: {schema: RiskAssessmentOutputSchema},
  prompt: `You are an expert credit risk analyst. Your task is to conduct a detailed risk assessment based on the provided credit report text, including key metrics like PD, EAD, LGD, and Expected Loss.

Analyze the user's full credit report. Identify all potential risks, such as late payments, high credit utilization, negative account statuses (written-off, settled), and recent credit inquiries.

Based on your analysis, generate a comprehensive risk assessment.

- **score**: A risk score from 0-100. A higher score means lower risk. 100 is a perfect score.
- **level**: A summary level of 'Low', 'Medium', or 'High'.
- **factors**: A list of the most significant risk factors. For each, provide a short title, a severity, and a brief explanation.
- **mitigations**: For each major risk factor, provide a corresponding actionable mitigation strategy.
- **probabilityOfDefault (PD)**: Holistically analyze the entire report to estimate the probability (from 0 to 100) that the user might default (fail to pay for 90+ days) on a new loan within the next 24 months.
- **defaultProbabilityExplanation**: Provide a detailed, multi-sentence explanation for the 'probabilityOfDefault' score. Explain which specific factors (e.g., past DPD, high utilization, frequent inquiries, settled accounts) increased the probability, and which factors (e.g., long positive history, low debt) decreased it.
- **exposureAtDefault (EAD)**: Calculate the total outstanding balance across all active loans and credit cards. This represents the total amount the lender would be exposed to if the borrower defaults today. Sum up all 'Current Balance' fields and provide the total in INR.
- **lossGivenDefault (LGD)**: Based on the mix of credit (secured vs. unsecured loans), estimate the percentage of the EAD that would likely be unrecoverable in the event of a default. Unsecured debt (personal loans, credit cards) has a higher LGD (typically 50-90%) than secured debt (auto, home loans) (typically 10-50%). Provide a single, blended LGD percentage (0-100).
- **expectedLoss (EL)**: Calculate the Expected Loss in INR using the formula: EL = (PD / 100) * (LGD / 100) * EAD.

**Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

Generate the final output based on your complete analysis.
`,
});

const riskAssessmentFlow = ai.defineFlow(
  {
    name: 'riskAssessmentFlow',
    inputSchema: RiskAssessmentInputSchema,
    outputSchema: RiskAssessmentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
