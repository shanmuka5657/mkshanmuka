
'use server';

/**
 * @fileOverview An AI agent that performs a comprehensive cross-verification of details between a CIBIL report, bank statement, and salary slips.
 *
 * - crossVerifyDocuments - A function that returns a detailed comparison.
 * - CrossVerificationInput - The input type for the function.
 * - CrossVerificationOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { SalarySlipAnalysisOutput } from './salary-slip-analysis';
import type { BankStatementAnalysisOutput } from './bank-statement-analysis';
import type { AnalyzeCreditReportOutput } from './credit-report-analysis';


const CrossVerificationInputSchema = z.object({
  cibilAnalysis: z.any().optional().describe('The structured analysis output from the CIBIL report flow.'),
  salarySlipAnalysis: z.any().optional().describe('The structured analysis output from the salary slip flow.'),
  bankStatementAnalysis: z.any().optional().describe('The structured analysis output from the bank statement flow.'),
});
export type CrossVerificationInput = {
    cibilAnalysis?: AnalyzeCreditReportOutput;
    salarySlipAnalysis?: SalarySlipAnalysisOutput;
    bankStatementAnalysis?: BankStatementAnalysisOutput;
};


const VerificationFieldSchema = z.object({
    status: z.enum(['Match', 'Mismatch', 'Partial Match', 'Not Found']).describe("The verification status for the field across available documents."),
    cibilValue: z.string().describe("The value found in the CIBIL report. Return 'N/A' if not available."),
    bankStatementValue: z.string().describe("The value found in the bank statement. Return 'N/A' if not available."),
    salarySlipValue: z.string().describe("The value found in the salary slip(s). Return 'N/A' if not available."),
    details: z.string().describe("A brief, one-sentence explanation of the status, especially for mismatches or partial matches."),
});

const CrossVerificationOutputSchema = z.object({
  name: VerificationFieldSchema.describe("Comparison of the applicant's name."),
  dob: VerificationFieldSchema.describe("Comparison of the applicant's date of birth."),
  pan: VerificationFieldSchema.describe("Comparison of the applicant's PAN number."),
  mobile: VerificationFieldSchema.describe("Comparison of the applicant's mobile number."),
  address: VerificationFieldSchema.describe("Comparison of the applicant's address."),
  income: z.object({
      status: z.enum(['Consistent', 'Inconsistent', 'Not Comparable']).describe("The verification status for income."),
      bankStatementIncome: z.string().describe("Estimated income from the bank statement. Return 'N/A' if not available."),
      salarySlipIncome: z.string().describe("Net salary from the most recent salary slip. Return 'N/A' if not available."),
      details: z.string().describe("A brief, one-sentence explanation of the income consistency."),
  }).describe("Comparison of monthly income between bank statement and salary slips."),
  overallAssessment: z.string().describe("A final, comprehensive summary of the cross-verification findings, concluding with a statement on the overall consistency of the documents and any recommended actions."),
});
export type CrossVerificationOutput = z.infer<typeof CrossVerificationOutputSchema>;


export async function crossVerifyDocuments(
  input: CrossVerificationInput
): Promise<CrossVerificationOutput> {
  return crossVerifyDocumentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'crossVerifyDocumentsPrompt',
  model: 'gemini-1.5-flash',
  input: {schema: CrossVerificationInputSchema},
  output: {schema: CrossVerificationOutputSchema},
  prompt: `You are an expert underwriter specializing in document verification. Your task is to meticulously compare the details from up to three sources: a CIBIL credit report, a bank statement analysis, and a salary slip analysis. Provide a definitive cross-verification report.

**Verification Rules:**
1.  **Compare All Available Data:** You will receive JSON data for each document that has been analyzed. If a document was not provided, its corresponding JSON will be missing. Your analysis must only use the provided data.
2.  **Name Matching:** Compare names across all available documents. A "Partial Match" is acceptable for minor variations (e.g., "Suresh Kumar" vs. "Suresh K."), but you must note the variation in the 'details'. Significant differences are a 'Mismatch'.
3.  **Exact Fields:** DOB and PAN must be an exact match across all documents where they appear.
4.  **Best Match Fields:** For Mobile and Address, find the best match. If addresses are slightly different but clearly refer to the same location, you can mark it as a 'Partial Match' and explain.
5.  **Income Comparison:** Compare the 'estimatedMonthlyIncome' from the bank statement with the 'netSalary' from the most recent salary slip. A difference of up to 15% can be considered 'Consistent'.
6.  **Handling Missing Data:** If a piece of information is missing from all sources, the status should be 'Not Found'. If it's present in some but not others, reflect that in the individual value fields (e.g., 'cibilValue: "...", bankStatementValue: "N/A"') and choose the most appropriate overall status.

**Source Documents Data:**

{{#if cibilAnalysis}}
**CIBIL Report Analysis:**
\`\`\`json
{{{json cibilAnalysis}}}
\`\`\`
{{/if}}

{{#if bankStatementAnalysis}}
**Bank Statement Analysis:**
\`\`\`json
{{{json bankStatementAnalysis}}}
\`\`\`
{{/if}}

{{#if salarySlipAnalysis}}
**Salary Slip Analysis:**
\`\`\`json
{{{json salarySlipAnalysis}}}
\`\`\`
{{/if}}

**Your Task:**
1.  Perform the comparison for each field (Name, DOB, PAN, Mobile, Address) and populate the output schema. For each field, provide the value from each available source.
2.  Perform the income comparison.
3.  Write a concise 'overallAssessment' summarizing your findings. Conclude with a clear statement about the data consistency and highlight any critical mismatches that require clarification (e.g., "A critical mismatch was found in the applicant's name between the CIBIL report and bank statement, which requires immediate clarification before proceeding.").

Generate the final, structured verification output.
`,
});

const crossVerifyDocumentsFlow = ai.defineFlow(
  {
    name: 'crossVerifyDocumentsFlow',
    inputSchema: CrossVerificationInputSchema,
    outputSchema: CrossVerificationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to cross-verify documents.");
    }
    return output;
  }
);
