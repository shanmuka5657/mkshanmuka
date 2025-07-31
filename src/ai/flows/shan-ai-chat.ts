
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
import { Message } from '@genkit-ai/googleai';


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

// Transform the Zod schema-based history into the format Genkit expects
function mapHistoryToGenkitMessages(history: ShanAiChatHistory[]): Message[] {
  return history.map(message => {
    const parts: Part[] = message.content.map(part => {
      if (part.text) {
        return { text: part.text };
      }
      if (part.media) {
        return { media: { url: part.media.url, contentType: part.media.contentType } };
      }
      return { text: '' }; // Should not happen with valid data
    }).filter(p => p.text || p.media);

    return new Message({role: message.role, content: parts});
  });
}

const shanAiChatFlow = ai.defineFlow(
  {
    name: 'shanAiChatFlow',
    inputSchema: ShanAiChatInputSchema,
    outputSchema: ShanAiChatOutputSchema,
  },
  async ({ history }) => {
    const genkitMessages = mapHistoryToGenkitMessages(history);

    const llmResponse = await ai.generate({
      prompt: {
        messages: genkitMessages,
      },
      system: `You are Shan AI, a powerful, general-purpose AI assistant. Your goal is to be helpful and answer the user's questions accurately and concisely. Maintain a friendly and conversational tone. If the user provides an image or document, use it as the primary context for your answer.`,
      model: 'googleai/gemini-2.0-flash',
    });

    const responseText = llmResponse.text;
    if (!responseText) {
      throw new Error("The AI returned an empty response.");
    }

    return {
      answer: responseText,
    };
  }
);
