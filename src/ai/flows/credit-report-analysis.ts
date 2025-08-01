
'use server';

/**
 * @fileOverview An AI agent that analyzes a credit report and provides a detailed breakdown of credit strengths, weaknesses, and a risk assessment.
 *
 * - analyzeCreditReport - A function that handles the credit report analysis process.
 * - AnalyzeCreditReportInput - The input type for the analyzeCreditReport function.
 * - AnalyzeCreditReportOutput - The return type for the analyzeCreditReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { FlowUsage } from 'genkit/flow';

const AnalyzeCreditReportInputSchema = z.object({
  creditReportText: z.string().describe('The text extracted from the credit report.'),
});
export type AnalyzeCreditReportInput = z.infer<typeof AnalyzeCreditReportInputSchema>;

const CreditAnalysisSchema = z.object({
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

const RiskAnalysisSchema = z.object({
  score: z.number().describe('A risk score from 0 to 100, where 100 is lowest risk.'),
  level: z
    .enum(['Low', 'Medium', 'High'])
    .describe(
      'A single-word risk level (Low, Medium, or High).'
    ),
  factors: z
    .array(
      z.object({
        factor: z.string().describe('A title for the risk factor.'),
        severity: z.string().describe('The severity of the factor (e.g., Low, Medium, High).'),
        details: z.string().describe('A one-sentence explanation of the factor.'),
      })
    )
    .describe('A list of key risk factors identified in the report.'),
  mitigations: z.array(z.object({
    factor: z.string().describe('The risk factor this mitigation addresses.'),
    action: z.string().describe('A one-sentence actionable suggestion to mitigate the risk.')
  })).describe('A list of suggested actions to mitigate the identified risks.'),
  probabilityOfDefault: z.number().describe('The estimated probability of the user defaulting on a new loan in the next 24 months, as a percentage (0-100).'),
  defaultProbabilityExplanation: z.string().describe('A detailed, multi-sentence explanation of the factors that contributed to the probability of default calculation.'),
  exposureAtDefault: z.number().describe('The estimated total outstanding balance across all accounts if the user were to default, in INR.'),
  lossGivenDefault: z.number().describe('The estimated percentage of the Exposure at Default that would be lost if the user defaults (0-100).'),
  expectedLoss: z.number().describe('The final calculated Expected Loss (PD * LGD * EAD) in INR.'),
});


const AnalyzeCreditReportOutputSchema = z.object({
  analysis: CreditAnalysisSchema,
  risk: RiskAnalysisSchema,
});
export type AnalyzeCreditReportOutput = z.infer<typeof AnalyzeCreditReportOutputSchema>;

export async function analyzeCreditReport(input: AnalyzeCreditReportInput): Promise<{ output: AnalyzeCreditReportOutput, usage: FlowUsage }> {
  return analyzeCreditReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCreditReportPrompt',
  input: {schema: AnalyzeCreditReportInputSchema},
  output: {schema: AnalyzeCreditReportOutputSchema},
  prompt: `You are an expert credit analyst. Analyze the following credit report text and provide a detailed breakdown of the user's credit profile AND a comprehensive risk assessment. Structure your response into two main sections: 'analysis' and 'risk'.

**1. Analysis Section:**
- **strengths**: What are the positive aspects of this credit report? (e.g., long credit history, timely payments, low utilization).
- **weaknesses**: What are the negative aspects? (e.g., late payments, high number of inquiries, written-off accounts).
- **activeAccounts**: Summarize the current active loans and credit cards.
- **closedAccounts**: Summarize the accounts that have been closed.
- **dpdAnalysis**: Analyze the Days Past Due (DPD) history. Explain any patterns of late payments.
- **emiAnalysis**: Analyze the EMIs being paid for various loans.
- **creditUtilization**: Analyze the credit utilization ratio for each credit card and overall. Explain if it's high, low, or healthy.
- **creditHistoryLength**: Analyze the length of the credit history. Mention the age of the oldest account and the average age of all accounts.
- **creditMix**: Analyze the mix of credit products. Discuss the balance between secured loans (like home or auto loans) and unsecured loans (like personal loans or credit cards).

**2. Risk Assessment Section:**
- **score**: A risk score from 0-100. A higher score means lower risk. 100 is a perfect score.
- **level**: A summary level of 'Low', 'Medium', or 'High'.
- **factors**: A list of the most significant risk factors. For each, provide a short title, a severity, and a brief explanation.
- **mitigations**: For each major risk factor, provide a corresponding actionable mitigation strategy.
- **probabilityOfDefault (PD)**: Holistically analyze the entire report to estimate the probability (from 0 to 100) that the user might default (fail to pay for 90+ days) on a new loan within the next 24 months.
- **defaultProbabilityExplanation**: Provide a detailed, multi-sentence explanation for the 'probabilityOfDefault' score. Explain which specific factors (e.g., past DPD, high utilization, frequent inquiries, settled accounts) increased the probability, and which factors (e.g., long positive history, low debt) decreased it.
- **exposureAtDefault (EAD)**: Calculate the total outstanding balance across all active loans and credit cards. This represents the total amount the lender would be exposed to if the borrower defaults today. Sum up all 'Current Balance' fields and provide the total in INR.
- **lossGivenDefault (LGD)**: Based on the mix of credit (secured vs. unsecured loans), estimate the percentage of the EAD that would likely be unrecoverable in the event of a default. Unsecured debt (personal loans, credit cards) has a higher LGD (typically 50-90%) than secured debt (auto, home loans) (typically 10-50%). Provide a single, blended LGD percentage (0-100).
- **expectedLoss (EL)**: This will be calculated in code, so just provide the PD, LGD, and EAD values.

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
    outputSchema: z.object({
      output: AnalyzeCreditReportOutputSchema,
      usage: z.any(),
    }),
  },
  async input => {
    const result = await prompt(input);
    const output = result.output;
    if (!output) {
      throw new Error("AI failed to analyze the report.");
    }
    // Perform the Expected Loss calculation in code for accuracy.
    const pd = output.risk.probabilityOfDefault / 100;
    const lgd = output.risk.lossGivenDefault / 100;
    const ead = output.risk.exposureAtDefault;
    
    // Ensure the final EL is a number and round it for cleanliness.
    output.risk.expectedLoss = Math.round(pd * lgd * ead);

    return { output, usage: result.usage };
  }
);
