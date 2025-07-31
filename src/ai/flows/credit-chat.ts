'use server';

/**
 * @fileOverview An AI agent that answers user questions about their credit report.
 *
 * - chatAboutCreditReport - A function that handles the chat interaction.
 * - CreditChatInput - The input type for the chat function.
 * - CreditChatOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CreditChatInputSchema = z.object({
  creditReportText: z
    .string()
    .describe('The full text of the user credit report.'),
  question: z.string().describe('The user question about the report.'),
});
export type CreditChatInput = z.infer<typeof CreditChatInputSchema>;

const CreditChatOutputSchema = z.object({
  answer: z
    .string()
    .describe('The AI-generated answer to the user question.'),
});
export type CreditChatOutput = z.infer<typeof CreditChatOutputSchema>;

export async function chatAboutCreditReport(
  input: CreditChatInput
): Promise<CreditChatOutput> {
  return creditChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'creditChatPrompt',
  input: { schema: CreditChatInputSchema },
  output: { schema: CreditChatOutputSchema },
  prompt: `You are a friendly and helpful AI credit expert. Your goal is to answer the user's questions based ONLY on the credit report provided. Do not invent information or provide financial advice. Be concise and clear in your explanations.

Credit Report Context:
\`\`\`
{{{creditReportText}}}
\`\`\`

User's Question:
"{{{question}}}"

Based on the report, answer the user's question.
`,
});

const creditChatFlow = ai.defineFlow(
  {
    name: 'creditChatFlow',
    inputSchema: CreditChatInputSchema,
    outputSchema: CreditChatOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
