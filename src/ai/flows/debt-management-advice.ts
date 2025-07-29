// src/ai/flows/debt-management-advice.ts
'use server';

/**
 * @fileOverview Provides AI-driven debt management advice based on user's financial situation.
 *
 * - getDebtManagementAdvice - A function that returns debt management suggestions.
 * - DebtManagementAdviceInput - The input type for the getDebtManagementAdvice function.
 * - DebtManagementAdviceOutput - The return type for the getDebtManagementAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DebtManagementAdviceInputSchema = z.object({
  totalEmi: z.number().describe('Total monthly EMI payments.'),
  otherObligations: z.number().describe('Other monthly financial obligations (rent, utilities, etc.).'),
  dtiRatio: z.number().describe('Target debt-to-income ratio (percentage).'),
  creditReportAnalysis: z.string().describe('AI analysis of the user credit report.'),
});
export type DebtManagementAdviceInput = z.infer<typeof DebtManagementAdviceInputSchema>;

const DebtManagementAdviceOutputSchema = z.object({
  advice: z.string().describe('AI-generated debt management advice and strategies.'),
});
export type DebtManagementAdviceOutput = z.infer<typeof DebtManagementAdviceOutputSchema>;

export async function getDebtManagementAdvice(input: DebtManagementAdviceInput): Promise<DebtManagementAdviceOutput> {
  return debtManagementAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'debtManagementAdvicePrompt',
  input: {schema: DebtManagementAdviceInputSchema},
  output: {schema: DebtManagementAdviceOutputSchema},
  prompt: `You are an AI assistant specialized in providing debt management advice.

  Based on the user's financial information and credit report analysis, offer personalized and actionable strategies for optimizing debt repayment and improving their financial health.

  Consider the following details:
  - Total Monthly EMI: {{{totalEmi}}}
  - Other Monthly Obligations: {{{otherObligations}}}
  - Target Debt-to-Income Ratio: {{{dtiRatio}}}%
  - Credit Report Analysis: {{{creditReportAnalysis}}}

  Provide clear, concise, and practical advice that the user can implement to manage their debt effectively.
  `,
});

const debtManagementAdviceFlow = ai.defineFlow(
  {
    name: 'debtManagementAdviceFlow',
    inputSchema: DebtManagementAdviceInputSchema,
    outputSchema: DebtManagementAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
