
'use server';
/**
 * @fileOverview An AI agent that performs a financial risk assessment based on a POST-LOAN scenario.
 * It calculates the financial health metrics after a new loan's EMI has been added.
 *
 * - getPostLoanAnalysis - A function that returns a detailed financial risk analysis.
 * - PostLoanAnalysisInput - The input type for the getPostLoanAnalysis function.
 * - PostLoanAnalysisOutput - The return type for the getPostLoanAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { AnalyzeCreditReportOutput } from './credit-report-analysis';

const PostLoanAnalysisInputSchema = z.object({
  analysisResult: z
    .any()
    .describe('The full, structured analysis from the initial credit report parsing flow.'),
  estimatedIncome: z
    .number()
    .describe("The user's estimated monthly income in INR."),
  monthlyFixedObligations: z
    .number()
    .describe("The user's monthly fixed obligations in INR (e.g., rent)."),
  postLoanTotalEmi: z
    .number()
    .describe("The user's new total EMI after adding the eligible loan's EMI."),
});
export type PostLoanAnalysisInput = {
    analysisResult: AnalyzeCreditReportOutput;
    estimatedIncome: number;
    monthlyFixedObligations: number;
    postLoanTotalEmi: number;
};

const PostLoanAnalysisOutputSchema = z.object({
  financialRiskRating: z
    .enum(['Low', 'Medium', 'High', 'Very High'])
    .describe(
      'A single rating for the overall financial risk AFTER taking the new loan (e.g., Low, Medium, High, Very High).'
    ),
  dtiAnalysis: z.object({
      dtiPercentage: z.number().describe('The calculated post-loan Debt-to-Income ratio as a percentage.'),
      explanation: z.string().describe('A detailed, multi-sentence explanation of the new DTI ratio and its implications.')
  }).describe('Analysis of the post-loan Debt-to-Income Ratio.'),
  foirAnalysis: z.object({
      foirPercentage: z.number().describe('The calculated post-loan Fixed Obligation to Income Ratio (FOIR) as a percentage.'),
      explanation: z.string().describe('A detailed, multi-sentence explanation of the new FOIR and its impact.')
  }).describe('Analysis of the post-loan Fixed Obligation to Income Ratio.'),
  debtComposition: z.object({
      unsecuredDebtPercentage: z.number().describe('The percentage of total debt that is unsecured (this ratio does not change post-loan unless the new loan type is specified, so it reflects the current state).'),
      explanation: z.string().describe('An analysis of the debt mix (secured vs. unsecured) and how it impacts financial risk.')
  }).describe('Analysis of the composition of debt.'),
  creditUtilizationAnalysis: z.object({
      overallUtilization: z.number().describe('The overall credit utilization percentage across all revolving credit lines (this ratio does not change post-loan).'),
      explanation: z.string().describe('A detailed explanation of credit utilization and its associated risks.')
  }).describe('Analysis of credit utilization.'),
  overallOutlook: z.string().describe('A forward-looking summary of the financial situation AFTER taking the new loan, including potential future risks and opportunities.'),
});
export type PostLoanAnalysisOutput = z.infer<typeof PostLoanAnalysisOutputSchema>;

export async function getPostLoanAnalysis(
  input: PostLoanAnalysisInput
): Promise<PostLoanAnalysisOutput> {
  return postLoanAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'postLoanAnalysisPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: PostLoanAnalysisInputSchema},
  output: {schema: PostLoanAnalysisOutputSchema},
  prompt: `You are a financial risk analyst. Your task is to assess the user's financial risk profile under a "what-if" scenario where they have just taken on a new loan. Your analysis must be based on their new, higher total monthly EMI.

**User's Profile:**
- **Estimated Monthly Income:** ₹{{{estimatedIncome}}}
- **Monthly Fixed Obligations (e.g., Rent):** ₹{{{monthlyFixedObligations}}}
- **NEW Post-Loan Total Monthly EMI:** ₹{{{postLoanTotalEmi}}}
- **Structured Credit Report Data (for debt composition and utilization context):**
\`\`\`json
{{{json analysisResult}}}
\`\`\`

**Your Task:**

1.  **Calculate Post-Loan Metrics:** Use the **NEW Post-Loan Total Monthly EMI** of **₹{{{postLoanTotalEmi}}}** for all relevant calculations. The debt composition and credit utilization will remain the same as the new loan is not yet on the report.

2.  **Assign Overall Post-Loan Risk Rating:** Based on all subsequent points, assign a single 'financialRiskRating': 'Low', 'Medium', 'High', or 'Very High' that reflects the user's situation *after* taking the loan.

3.  **Post-Loan DTI Analysis (dtiAnalysis):**
    *   Calculate the new DTI ratio: (NEW Post-Loan Total EMI / Monthly Income) * 100. Store it in 'dtiPercentage'.
    *   In 'explanation', provide a detailed explanation of what this new DTI means for their financial health.

4.  **Post-Loan FOIR Analysis (foirAnalysis):**
    *   Calculate the new FOIR: ((NEW Post-Loan Total EMI + Monthly Fixed Obligations) / Monthly Income) * 100. Store it in 'foirPercentage'.
    *   In 'explanation', provide a detailed explanation of the new FOIR and its impact on their disposable income and future borrowing capacity.

5.  **Debt Composition Analysis (debtComposition):**
    *   Calculate the percentage of total outstanding debt that is unsecured from the provided credit data. Store it in 'unsecuredDebtPercentage'.
    *   In 'explanation', analyze the current debt mix. Explain how this composition (e.g., a high reliance on unsecured debt) contributes to the overall post-loan risk profile.

6.  **Credit Utilization Analysis (creditUtilizationAnalysis):**
    *   Calculate the overall credit utilization across all revolving credit lines from the provided credit data. Store it in 'overallUtilization'.
    *   In 'explanation', explain how the current credit utilization impacts their financial flexibility, especially now with an added loan payment.

7.  **Overall Post-Loan Outlook (overallOutlook):**
    *   Provide a final, forward-looking summary. Synthesize all the above points into a clear outlook on their financial situation *with the new loan*. Highlight the new challenges and opportunities (e.g., "With the new loan, your FOIR will be at 54%, which is manageable but leaves little room for new credit. The priority must now be to aggressively pay down high-interest credit card debt...").

Generate the final, structured output for this post-loan scenario.
`,
});

const postLoanAnalysisFlow = ai.defineFlow(
  {
    name: 'postLoanAnalysisFlow',
    inputSchema: PostLoanAnalysisInputSchema,
    outputSchema: PostLoanAnalysisOutputSchema,
  },
  async (input: PostLoanAnalysisInput) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to assess post-loan financial risk.");
    }
    return output;
  }
);
