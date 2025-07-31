
'use server';

/**
 * @fileOverview A general-purpose, multi-modal AI assistant named Shan AI that supports conversation history.
 *
 * - shanAiChat - A function that handles the chat interaction.
 * - ShanAiChatHistory - the history type for the chat function.
 * - ShanAiChatOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { type Part } from 'genkit/ai';


// Define the structure for a single message in the history
const ShanAiChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.array(z.object({
    text: z.string().optional(),
    media: z.object({
      url: z.string(),
      contentType: z.string().optional(),
    }).optional(),
  }))
});

// The input now includes the history of the conversation
const ShanAiChatInputSchema = z.object({
  history: z.array(ShanAiChatMessageSchema).describe('The conversation history.'),
});
export type ShanAiChatHistory = z.infer<typeof ShanAiChatMessageSchema>;

const ShanAiChatOutputSchema = z.object({
  answer: z
    .string()
    .describe('The AI-generated answer to the user message.'),
});
export type ShanAiChatOutput = z.infer<typeof ShanAiChatOutputSchema>;

export async function shanAiChat(
  history: ShanAiChatHistory[]
): Promise<ShanAiChatOutput> {
  return shanAiChatFlow({ history });
}

const shanAiChatFlow = ai.defineFlow(
  {
    name: 'shanAiChatFlow',
    inputSchema: ShanAiChatInputSchema,
    outputSchema: ShanAiChatOutputSchema,
  },
  async ({ history }) => {
    
    const llmResponse = await ai.generate({
      messages: history,
      system: `You are Shan AI, a powerful, general-purpose AI assistant. Your goal is to be helpful and answer the user's questions accurately and concisely. Maintain a friendly and conversational tone. If the user provides an image or document, use it as the primary context for your answer.`,
      model: 'googleai/gemini-2.0-flash',
    });

    const responseText = llmResponse.text;
    if (!responseText) {
      // In case the model returns a non-text response or an error.
      const toolResponse = llmResponse.output?.content[0]?.toolRequest;
      if(toolResponse) {
          throw new Error("The AI tried to use a tool, but none were provided.");
      }
      throw new Error("The AI returned an empty or invalid response.");
    }

    return {
      answer: responseText,
    };
  }
);
