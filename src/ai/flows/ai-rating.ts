
'use server';

/**
 * @fileOverview An AI agent that provides a comprehensive credit rating based on a report.
 *
 * - getAiRating - A function that returns a detailed credit rating.
 * - AiRatingInput - The input type for the getAiRating function.
 * - AiRatingOutput - The return type for the getAiRating function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiRatingInputSchema = z.object({
  creditReportText: z
    .string()
    .describe('The full text extracted from the credit report.'),
  riskAssessment: z
    .object({
      score: z.number(),
      level: z.string(),
      factors: z.array(
        z.object({
          factor: z.string(),
          severity: z.string(),
          details: z.string(),
        })
      ),
    })
    .describe('A client-side pre-calculated risk assessment.'),
});
export type AiRatingInput = z.infer<typeof AiRatingInputSchema>;

const AiRatingOutputSchema = z.object({
  aiScore: z
    .number()
    .describe(
      'A holistic score from 0 to 100, based on all available data.'
    ),
  rating: z
    .string()
    .describe(
      'A single-word rating for the credit health (e.g., Excellent, Good, Fair, Poor).'
    ),
  summary: z
    .string()
    .describe(
      'A brief, one-paragraph summary of the overall credit health.'
    ),
  positiveFactors: z
    .array(z.string())
    .describe('A list of key strengths and positive factors.'),
  negativeFactors: z
    .array(z.string())
    .describe('A list of key weaknesses and areas for improvement.'),
});
export type AiRatingOutput = z.infer<typeof AiRatingOutputSchema>;

export async function getAiRating(
  input: AiRatingInput
): Promise<AiRatingOutput> {
  return aiRatingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiRatingPrompt',
  input: {schema: AiRatingInputSchema},
  output: {schema: AiRatingOutputSchema},
  prompt: `You are an expert credit analyst. Your task is to provide a holistic AI-powered credit rating based on the provided credit report text and a pre-calculated risk assessment.

Analyze the user's full credit report and the pre-calculated risk factors. Then, generate a comprehensive score, a final rating, a summary, and lists of the most important positive and negative factors.

The final aiScore should be a number between 0 and 100, where 100 is a perfect score.

**Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

**Pre-Calculated Risk Assessment:**
- Risk Score: {{{riskAssessment.score}}}/100
- Risk Level: {{{riskAssessment.level}}}
- Risk Factors:
{{#each riskAssessment.factors}}
  - {{factor}} ({{severity}}): {{details}}
{{/each}}

Based on your complete analysis of all the provided information, generate the final output.
`,
});

const aiRatingFlow = ai.defineFlow(
  {
    name: 'aiRatingFlow',
    inputSchema: AiRatingInputSchema,
    outputSchema: AiRatingOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
