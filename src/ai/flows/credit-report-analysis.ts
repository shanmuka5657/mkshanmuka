
'use server';

/**
 * @fileOverview An AI agent that analyzes a credit report and provides a detailed breakdown of credit strengths and weaknesses.
 *
 * - analyzeCreditReport - A function that handles the credit report analysis process.
 * - AnalyzeCreditReportInput - The input type for the analyzeCreditReport function.
 * - AnalyzeCreditReportOutput - The return type for the analyzeCreditReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCreditReportInputSchema = z.object({
  creditReportText: z.string().describe('The text extracted from the credit report.'),
});
export type AnalyzeCreditReportInput = z.infer<typeof AnalyzeCreditReportInputSchema>;

const AnalyzeCreditReportOutputSchema = z.object({
  strengths: z
    .string()
    .describe('A detailed explanation of the strengths found in the CIBIL report.'),
  weaknesses: z
    .string()
    .describe('A detailed explanation of the weaknesses found in the CIBIL report.'),
  activeAccounts: z
    .string()
    .describe('An analysis of the active accounts in the report.'),
  closedAccounts: z
    .string()
    .describe('An analysis of the closed accounts in the report.'),
  dpdAnalysis: z
    .string()
    .describe('An analysis of the Days Past Due (DPD) information.'),
  emiAnalysis: z.string().describe('An analysis of the EMIs being paid for loans.'),
  creditUtilization: z.string().describe('A detailed analysis of credit utilization across all credit cards and credit lines.'),
  creditHistoryLength: z.string().describe('An analysis of the age of the credit history, including oldest and average account ages.'),
  creditMix: z.string().describe('An analysis of the mix of credit types (e.g., secured vs. unsecured loans).'),
});
export type AnalyzeCreditReportOutput = z.infer<typeof AnalyzeCreditReportOutputSchema>;

export async function analyzeCreditReport(input: AnalyzeCreditReportInput): Promise<AnalyzeCreditReportOutput> {
  return analyzeCreditReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCreditReportPrompt',
  input: {schema: AnalyzeCreditReportInputSchema},
  output: {schema: AnalyzeCreditReportOutputSchema},
  prompt: `You are a credit analysis expert. Analyze the following credit report text and provide a detailed breakdown of the user's credit profile. Structure your response into the following sections, providing a detailed explanation for each:

- **strengths**: What are the positive aspects of this credit report? (e.g., long credit history, timely payments, low utilization).
- **weaknesses**: What are the negative aspects? (e.g., late payments, high number of inquiries, written-off accounts).
- **activeAccounts**: Summarize the current active loans and credit cards.
- **closedAccounts**: Summarize the accounts that have been closed.
- **dpdAnalysis**: Analyze the Days Past Due (DPD) history. Explain any patterns of late payments.
- **emiAnalysis**: Analyze the EMIs being paid for various loans.
- **creditUtilization**: Analyze the credit utilization ratio for each credit card and overall. Explain if it's high, low, or healthy.
- **creditHistoryLength**: Analyze the length of the credit history. Mention the age of the oldest account and the average age of all accounts.
- **creditMix**: Analyze the mix of credit products. Discuss the balance between secured loans (like home or auto loans) and unsecured loans (like personal loans or credit cards).

Credit Report Text:
\`\`\`
{{{creditReportText}}}
\`\`\`
`,
});

const analyzeCreditReportFlow = ai.defineFlow(
  {
    name: 'analyzeCreditReportFlow',
    inputSchema: AnalyzeCreditReportInputSchema,
    outputSchema: AnalyzeCreditReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
