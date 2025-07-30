'use server';

/**
 * @fileOverview A credit improvement suggestion AI agent.
 *
 * - getCreditImprovementSuggestions - A function that provides personalized recommendations for improving credit score.
 * - CreditImprovementInput - The input type for the getCreditImprovementSuggestions function.
 * - CreditImprovementOutput - The return type for the getCreditImprovementSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CreditImprovementInputSchema = z.object({
  creditReportText: z.string().describe('The full text of the CIBIL report.'),
});
export type CreditImprovementInput = z.infer<typeof CreditImprovementInputSchema>;

const CreditImprovementOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'Personalized recommendations for improving credit score, formatted as a paragraph.'
    ),
});
export type CreditImprovementOutput = z.infer<
  typeof CreditImprovementOutputSchema
>;

export async function getCreditImprovementSuggestions(
  input: CreditImprovementInput
): Promise<CreditImprovementOutput> {
  return creditImprovementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'creditImprovementPrompt',
  input: {schema: CreditImprovementInputSchema},
  output: {schema: CreditImprovementOutputSchema},
  prompt: `You are an AI-powered credit advisor. Analyze the following CIBIL report text to provide personalized recommendations for improving the user's credit score.

CIBIL Report Text:
\`\`\`
{{{creditReportText}}}
\`\`\`

Based on a thorough analysis of the entire report, provide actionable and specific advice to improve their creditworthiness. Focus on the most impactful areas. Structure the response in a clear, easy-to-understand paragraph format.
`,
});

const creditImprovementFlow = ai.defineFlow(
  {
    name: 'creditImprovementFlow',
    inputSchema: CreditImprovementInputSchema,
    outputSchema: CreditImprovementOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
