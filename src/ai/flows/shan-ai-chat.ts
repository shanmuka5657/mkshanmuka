
'use server';

/**
 * @fileOverview A general-purpose, multi-modal AI assistant named Shan AI that supports conversation history and can access CIBIL report context.
 *
 * - shanAiChat - A function that handles the chat interaction.
 * - ShanAiChatHistory - the history type for the chat function.
 * - ShanAiChatOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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

// The input now includes the history of the conversation and the CIBIL report
const ShanAiChatInputSchema = z.object({
  history: z.array(ShanAiChatMessageSchema).describe('The conversation history.'),
  cibilReportText: z.string().optional().describe('The full text of the user\'s CIBIL report.'),
});
export type ShanAiChatHistory = z.infer<typeof ShanAiChatMessageSchema>;
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

const shanAiChatFlow = ai.defineFlow(
  {
    name: 'shanAiChatFlow',
    inputSchema: ShanAiChatInputSchema,
    outputSchema: ShanAiChatOutputSchema,
  },
  async ({ history, cibilReportText }) => {
    
    const systemPrompt = `You are Shan AI, a powerful, general-purpose AI assistant. Your goal is to be helpful and answer the user's questions accurately and concisely. Maintain a friendly and conversational tone.
    
    ${cibilReportText ? 
    `IMPORTANT: You have access to the user's CIBIL credit report. Use it as the primary source of truth to answer any questions related to their credit history, score, accounts, etc. When asked about their score or other specific data, reference this report directly. Here is the report:
    \`\`\`
    ${cibilReportText}
    \`\`\``
    : `The user has not uploaded a credit report. If they ask questions about their credit, inform them that you need them to upload a report first.`}
    
    If the user provides an image or document in their message, use it as additional context for your answer.`
    
    const llmResponse = await ai.generate({
      messages: history,
      system: systemPrompt,
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
