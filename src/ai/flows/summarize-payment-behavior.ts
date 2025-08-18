
'use server';

/**
 * @fileOverview An AI agent that summarizes payment behavior based on history.
 *
 * - summarizePaymentBehavior - A function that returns a concise summary.
 * - SummarizePaymentBehaviorInput - The input type for the function.
 * - SummarizePaymentBehaviorOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SummarizePaymentBehaviorInputSchema = z.object({
  rating: z.string().describe("A pre-calculated rating (e.g., 'Excellent', 'Good', 'Fair', 'Poor')."),
  paymentHistory: z.array(z.object({
      accountType: z.string(),
      history: z.array(z.string()).describe("An array of DPD strings (e.g., 'STD', '030', 'XXX').")
  })).describe("The payment history for all relevant accounts."),
});
export type SummarizePaymentBehaviorInput = z.infer<typeof SummarizePaymentBehaviorInputSchema>;

const SummarizePaymentBehaviorOutputSchema = z.object({
  summary: z.string().describe("A concise, one-paragraph summary of the user's payment behavior, explaining the provided rating. It should be written in an encouraging and easy-to-understand tone."),
});
export type SummarizePaymentBehaviorOutput = z.infer<typeof SummarizePaymentBehaviorOutputSchema>;


export async function summarizePaymentBehavior(
  input: SummarizePaymentBehaviorInput
): Promise<SummarizePaymentBehaviorOutput> {
  const prompt = ai.definePrompt({
    name: 'summarizePaymentBehaviorPrompt',
    input: { schema: SummarizePaymentBehaviorInputSchema },
    output: { schema: SummarizePaymentBehaviorOutputSchema },
    prompt: `You are a helpful credit analyst. Your task is to write a brief, user-friendly summary of a person's payment behavior based on their payment history data and a pre-calculated rating.

**Context:**
- **Pre-Calculated Rating:** {{{rating}}}
- **Payment History Data:**
\`\`\`json
{{{json paymentHistory}}}
\`\`\`

**Instructions:**
1.  Analyze the provided payment history data. Look for patterns like consistent on-time payments, occasional late payments, or severe delinquencies.
2.  Write a single-paragraph 'summary' that explains **why** the user received the given 'rating'.
3.  Your tone should be encouraging and clear.
4.  If the rating is "Excellent" or "Good", highlight the positive habits. For example: "Your 'Excellent' rating is well-deserved, reflecting a perfect record of on-time payments across all your accounts. This demonstrates strong financial discipline and is a key factor for lenders."
5.  If the rating is "Fair" or "Poor", explain the issues constructively without being alarming. For example: "Your 'Fair' rating is mainly due to a few late payments on your credit card over the last year. While most of your payments are on time, these recent slip-ups are what's holding your score back."
6.  Do not just list the data; interpret it for the user.
7.  The final output must be just the summary text.
`,
  });

  const { output } = await prompt(input);
  if (!output) {
    throw new Error("AI failed to generate a payment behavior summary.");
  }
  return output;
}
