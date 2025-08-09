
'use server';

/**
 * @fileOverview An AI agent that provides a comprehensive credit rating based on a report.
 * This is a high-level, user-friendly assessment of credit health.
 *
 * - getAiRating - A function that returns a detailed credit rating.
 * - AiRatingInput - The input type for the getAiRating function.
 * - AiRatingOutput - The return type for the getAiRating function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { FlowUsage } from 'genkit/flow';
import type { RiskAssessmentOutput } from './risk-assessment';
import type { AnalyzeCreditReportOutput } from './credit-report-analysis';

const AiRatingInputSchema = z.object({
  analysisResult: z
    .any()
    .describe('The full, structured analysis from the initial credit report parsing flow.'),
  riskAssessment: z
    .any()

    .describe('A detailed, pre-calculated risk assessment including PD, LGD, etc.'),
});
export type AiRatingInput = {
  analysisResult: AnalyzeCreditReportOutput;
  riskAssessment: RiskAssessmentOutput;
};

const AiRatingOutputSchema = z.object({
  aiScore: z
    .number()
    .min(300)
    .max(900)
    .describe(
      'A holistic score from 300 to 900, similar to a standard credit score, based on all available data.'
    ),
  rating: z
    .string()
    .describe(
      'A single-word rating for the credit health (e.g., Excellent, Good, Fair, Poor).'
    ),
  summary: z
    .string()
    .describe(
      'A brief, one-paragraph summary of the overall credit health, written in encouraging and easy-to-understand language.'
    ),
  positiveFactors: z
    .array(z.string())
    .describe('A list of 2-3 key strengths and positive factors that are helping the score.'),
  negativeFactors: z
    .array(z.string())
    .describe('A list of 2-3 key weaknesses and areas for improvement that are hurting the score.'),
});
export type AiRatingOutput = z.infer<typeof AiRatingOutputSchema>;

export async function getAiRating(
  input: AiRatingInput
): Promise<{ output: AiRatingOutput, usage: FlowUsage }> {
  return aiRatingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiRatingPrompt',
  input: {schema: AiRatingInputSchema},
  output: {schema: AiRatingOutputSchema},
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are an expert credit analyst. Your task is to provide a holistic AI-powered credit rating based on the provided structured credit report data and a pre-calculated risk assessment. Do NOT simply repeat the risk assessment. Your output should be a high-level, user-friendly summary.

Analyze the user's structured credit data and the pre-calculated risk factors. Then, generate a comprehensive score, a final rating, a summary, and lists of the most important positive and negative factors.

**CRITICAL RULES:**
- The final 'aiScore' MUST be a number between 300 and 900, where 900 is a perfect score. This should feel like a real-world credit score.
- The 'summary' should be easy to understand for a non-expert.
- The 'positiveFactors' and 'negativeFactors' lists should be distinct from each other and highlight the MOST impactful items. Do not just list every negative item.

**Structured Credit Report Data:**
\`\`\`json
{{{json analysisResult}}}
\`\`\`

**Pre-Calculated Risk Assessment Data (for context):**
\`\`\`json
{{{json riskAssessment}}}
\`\`\`

Based on your complete analysis of all the provided structured information, generate the final, user-friendly output.
`,
});

const aiRatingFlow = ai.defineFlow(
  {
    name: 'aiRatingFlow',
    inputSchema: AiRatingInputSchema,
    outputSchema: z.object({
        output: AiRatingOutputSchema,
        usage: z.any(),
    }),
  },
  async (input) => {
    const result = await prompt(input);
    if (!result.output) {
      throw new Error("AI failed to provide a rating.");
    }
    return { output: result.output, usage: result.usage };
  }
);
