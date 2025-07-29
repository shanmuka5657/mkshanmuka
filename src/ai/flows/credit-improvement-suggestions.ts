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
  paymentHistory: z.string().describe('Payment history details from the questionnaire.'),
  creditUtilization: z.string().describe('Credit utilization percentage from the questionnaire.'),
  creditAge: z.string().describe('Credit age (oldest account) from the questionnaire.'),
  creditMix: z.string().describe('Credit mix information from the questionnaire.'),
  inquiries: z.string().describe('Number of inquiries in the last 12 months from the questionnaire.'),
  dpdRecent: z.string().describe('DPD (Days Past Due) in the last 3 months from the questionnaire.'),
  writtenOff: z.string().describe('Information about written-off/settled accounts from the questionnaire.'),
  activeAccounts: z.string().describe('Number of active accounts from the questionnaire.'),
  overdue: z.string().describe('Overdue amount from the questionnaire.'),
  recentOpenings: z.string().describe('Recent account openings (last 6 months) from the questionnaire.'),
  loanPurpose: z.string().describe('Loan purpose from the questionnaire.'),
  utilTrend: z.string().describe('Utilization trend (3 months) from the questionnaire.'),
  institution: z.string().describe('Institution quality from the questionnaire.'),
  emiRatio: z.string().describe('EMI-to-income ratio from the questionnaire.'),
  cibilSummary: z.string().describe('Summary of the CIBIL report.'),
});
export type CreditImprovementInput = z.infer<typeof CreditImprovementInputSchema>;

const CreditImprovementOutputSchema = z.object({
  suggestions: z.string().describe('Personalized recommendations for improving credit score.'),
});
export type CreditImprovementOutput = z.infer<typeof CreditImprovementOutputSchema>;

export async function getCreditImprovementSuggestions(
  input: CreditImprovementInput
): Promise<CreditImprovementOutput> {
  return creditImprovementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'creditImprovementPrompt',
  input: {schema: CreditImprovementInputSchema},
  output: {schema: CreditImprovementOutputSchema},
  prompt: `You are an AI-powered credit advisor. Analyze the following credit report summary and questionnaire responses to provide personalized recommendations for improving the user's credit score.

CIBIL Report Summary: {{{cibilSummary}}}

Questionnaire Responses:
- Payment History: {{{paymentHistory}}}
- Credit Utilization: {{{creditUtilization}}}
- Credit Age: {{{creditAge}}}
- Credit Mix: {{{creditMix}}}
- Inquiries: {{{inquiries}}}
- DPD Recent: {{{dpdRecent}}}
- Written-off/Settled Accounts: {{{writtenOff}}}
- Active Accounts: {{{activeAccounts}}}
- Overdue Amount: {{{overdue}}}
- Recent Account Openings: {{{recentOpenings}}}
- Loan Purpose: {{{loanPurpose}}}
- Utilization Trend: {{{utilTrend}}}
- Institution Quality: {{{institution}}}
- EMI-to-Income Ratio: {{{emiRatio}}}

Provide actionable and specific advice to improve their creditworthiness. Focus on the areas where they can make the most impact. Structure response in paragraph format.
`,
});

const creditImprovementFlow = ai.defineFlow(
  {
    name: 'creditImprovementFlow',
    inputSchema: CreditImprovementInputSchema,
    outputSchema: CreditImprovementOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
