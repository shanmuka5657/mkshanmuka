
'use server';

/**
 * @fileOverview A general-purpose, multi-modal AI assistant named Shan AI.
 *
 * - shanAiChat - A function that handles the chat interaction.
 * - ShanAiChatInput - The input type for the chat function.
 * - ShanAiChatOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ShanAiChatInputSchema = z.object({
  message: z.string().describe('The user message.'),
  media: z
    .string()
    .optional()
    .describe(
      "A media file (image or document) as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ShanAiChatInput = z.infer<typeof ShanAiChatInputSchema>;

const ShanAiChatOutputSchema = z.object({
  answer: z
    .string()
    .describe('The AI-generated answer to the user message.'),
});
export type ShanAiChatOutput = z.infer<typeof ShanAiChatOutputSchema>;

export async function shanAiChat(
  input: ShanAiChatInput
): Promise<ShanAiChatOutput> {
  return shanAiChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'shanAiChatPrompt',
  input: { schema: ShanAiChatInputSchema },
  output: { schema: ShanAiChatOutputSchema },
  prompt: `You are Shan AI, a powerful, general-purpose AI assistant. Your goal is to be helpful and answer the user's questions accurately and concisely.

{{#if media}}
You have been provided with an image or document to analyze. Use it as the primary context for your answer.
Image/Document: {{media url=media}}
{{/if}}

User's Message:
"{{{message}}}"

Provide your answer.`,
});

const shanAiChatFlow = ai.defineFlow(
  {
    name: 'shanAiChatFlow',
    inputSchema: ShanAiChatInputSchema,
    outputSchema: ShanAiChatOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
