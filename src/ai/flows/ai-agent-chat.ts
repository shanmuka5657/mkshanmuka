
'use server';

/**
 * @fileOverview A general-purpose, multi-modal AI assistant that supports conversation history and can access CIBIL report context.
 *
 * - aiAgentChat - A function that handles the chat interaction.
 * - AiAgentChatHistory - the history type for the chat function.
 * - AiAgentChatOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { FlowUsage } from 'genkit/flow';

// Define the structure for a single message in the history
const AiAgentChatMessageSchema = z.object({
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
const AiAgentChatInputSchema = z.object({
  history: z.array(AiAgentChatMessageSchema).describe('The conversation history.'),
  cibilReportAvailable: z.boolean().describe('Whether a CIBIL report has been uploaded.'),
  bankStatementAvailable: z.boolean().describe('Whether a bank statement has been uploaded.'),
});
export type AiAgentChatHistory = z.infer<typeof AiAgentChatMessageSchema>;
export type AiAgentChatInput = z.infer<typeof AiAgentChatInputSchema>;


const AiAgentChatOutputSchema = z.object({
  answer: z
    .string()
    .describe('The AI-generated answer to the user message.'),
});
export type AiAgentChatOutput = z.infer<typeof AiAgentChatOutputSchema>;

export async function aiAgentChat(
  input: AiAgentChatInput
): Promise<{ output: AiAgentChatOutput, usage: FlowUsage }> {
  return aiAgentChatFlow(input);
}

const aiAgentChatFlow = ai.defineFlow(
  {
    name: 'aiAgentChatFlow',
    inputSchema: AiAgentChatInputSchema,
    outputSchema: z.object({
        output: AiAgentChatOutputSchema,
        usage: z.any(),
    }),
  },
  async ({ history, cibilReportAvailable, bankStatementAvailable }) => {
    
    let contextPrompt = '';
    if (cibilReportAvailable) {
      contextPrompt += `\nThe user has uploaded their CIBIL credit report. You have access to this document. Use this as a source of truth to answer questions. Do NOT ask them to upload it again.`;
    }
    if (bankStatementAvailable) {
        contextPrompt += `\nThe user has uploaded their bank statement. You have access to this document. Use this as a source of truth to answer questions. Do NOT ask them to upload it again.`;
    }

    if (!contextPrompt) {
        contextPrompt = `The user has not uploaded any document. If they ask questions that would require a CIBIL report or bank statement, you MUST inform them that you need them to upload a document first.`
    }

    const systemPrompt = `You are a helpful AI Agent for the CreditWise AI application. Your goal is to be helpful and answer the user's questions accurately and concisely based on the documents they have provided. Maintain a friendly and conversational tone.
    
    **CONTEXT:**
    ${contextPrompt}
    
    If the user provides an image or document in their message, use it as additional context for your answer.`
    
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-1.5-flash-preview',
      messages: history,
      system: systemPrompt,
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
      output: { answer: responseText },
      usage: llmResponse.usage,
    };
  }
);
