
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
  })).describe('A list of suggested actions to mitigate the identified risks.')
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
  prompt: `You are an expert credit risk analyst. Your task is to conduct a detailed risk assessment based on the provided credit report text.

Analyze the user's full credit report. Identify all potential risks, such as late payments, high credit utilization, negative account statuses (written-off, settled), and recent credit inquiries.

Based on your analysis, generate a comprehensive risk assessment.

- **score**: A risk score from 0-100. A higher score means lower risk. 100 is a perfect score.
- **level**: A summary level of 'Low', 'Medium', or 'High'.
- **factors**: A list of the most significant risk factors. For each, provide a short title, a severity, and a brief explanation.
- **mitigations**: For each major risk factor, provide a corresponding actionable mitigation strategy.

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
