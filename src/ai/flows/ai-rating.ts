
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
// TODO: This type might need adjustment based on the actual prompt input.
import type { RiskAssessmentOutput } from './risk-assessment';
import type { AnalyzeCreditReportOutput } from './credit-report-analysis';

// Corrected the type for riskAssessment to expect a single assessment object.
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
  riskAssessment: RiskAssessmentOutput['assessmentWithGuarantor']; // Use the more specific inner type
};

const AiRatingOutputSchema = z.object({
  riskScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'A technical risk score from 0 to 100, where 100 is the HIGHEST risk.'
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
  scoreExplanation: z.string().describe("A detailed, multi-sentence explanation of how the risk score was calculated, referencing specific data points and the weight given to each.")
});
export type AiRatingOutput = z.infer<typeof AiRatingOutputSchema>;

export async function getAiRating(
  input: AiRatingInput
): Promise<AiRatingOutput> {
  return aiRatingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiRatingPrompt',
  model: ai.model('googleai/gemini-1.5-flash'),
  input: {schema: AiRatingInputSchema},
  output: {schema: AiRatingOutputSchema},
  prompt: `You are an expert credit analyst. Your task is to provide a holistic AI-powered credit rating based on the provided structured credit report data and a pre-calculated risk assessment. Do NOT simply repeat the risk assessment. Your output should be a high-level, user-friendly summary.

Analyze the user's structured credit data and the pre-calculated risk factors. Then, generate a comprehensive score, a final rating, a summary, and lists of the most important positive and negative factors.

**CRITICAL RULES:**
- The final 'riskScore' MUST be a number between 0 and 100, where 100 is the HIGHEST risk. This is not a CIBIL score.
- The 'summary' should be easy to understand for a non-expert.
- The 'positiveFactors' and 'negativeFactors' lists should be distinct from each other and highlight the MOST impactful items. Do not just list every negative item.
- The 'scoreExplanation' must be detailed and explain the logic behind the score, referencing specific data points.

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
    outputSchema: AiRatingOutputSchema,
  },
  async (input: string | object) => {
    const {output} = await prompt(input);

    if (!output) {
      throw new Error("AI failed to provide a rating.");
    }
    return output;
  }
);
