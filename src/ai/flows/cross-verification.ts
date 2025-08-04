
'use server';

/**
 * @fileOverview An AI agent that cross-verifies details between a CIBIL report and salary slips.
 *
 * - crossVerifyDocuments - A function that returns a detailed comparison.
 * - CrossVerificationInput - The input type for the function.
 * - CrossVerificationOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FlowUsage } from 'genkit/flow';
import type { SalarySlipAnalysisOutput } from './salary-slip-analysis';

const CrossVerificationInputSchema = z.object({
  cibilReportText: z.string().describe('The full text extracted from the CIBIL credit report.'),
  salarySlipAnalysis: z.any().describe('The structured analysis output from the salary slip flow.'),
});
export type CrossVerificationInput = Omit<z.infer<typeof CrossVerificationInputSchema>, 'salarySlipAnalysis'> & {
  salarySlipAnalysis: SalarySlipAnalysisOutput;
};

const VerificationFieldSchema = z.object({
    status: z.enum(['Match', 'Mismatch', 'Not Found in CIBIL', 'Not Found in Salary Slip', 'Not Found in Both']).describe("The verification status for the field."),
    cibilValue: z.string().describe("The value found in the CIBIL report. Return 'N/A' if not found."),
    salarySlipValue: z.string().describe("The value found in the salary slip(s). Return 'N/A' if not found."),
    details: z.string().describe("A brief, one-sentence explanation of the status, especially for mismatches."),
});

const CrossVerificationOutputSchema = z.object({
  nameMatch: VerificationFieldSchema.describe("Comparison of the applicant's name."),
  dobMatch: VerificationFieldSchema.describe("Comparison of the applicant's date of birth."),
  panMatch: VerificationFieldSchema.describe("Comparison of the applicant's PAN number."),
  overallAssessment: z.string().describe("A final, comprehensive summary of the cross-verification findings, concluding with a statement on the overall consistency of the documents."),
});
export type CrossVerificationOutput = z.infer<typeof CrossVerificationOutputSchema>;


export async function crossVerifyDocuments(
  input: CrossVerificationInput
): Promise<{ output: CrossVerificationOutput, usage: FlowUsage }> {
  return crossVerifyDocumentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'crossVerifyDocumentsPrompt',
  input: {schema: CrossVerificationInputSchema},
  output: {schema: CrossVerificationOutputSchema},
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are an expert underwriter specializing in document verification. Your task is to meticulously compare the details from a CIBIL credit report against the data extracted from one or more salary slips and provide a definitive cross-verification report.

**Verification Rules:**
1.  **Name Matching:** Compare the name from the CIBIL report with the name(s) from the salary slips. Minor variations (e.g., "Suresh Kumar" vs. "Suresh K.") can be considered a Match, but you must note the variation in the 'details'. Significant differences are a 'Mismatch'.
2.  **Date of Birth (DOB) Matching:** Compare the DOB from both sources. It must be an exact match.
3.  **PAN Matching:** Compare the PAN ID from the CIBIL report with the PAN found on the salary slips (if available). It must be an exact match.
4.  **Handling Missing Data:** If a piece of information is missing from one source, the status should reflect that (e.g., 'Not Found in Salary Slip').

**Source Document 1: CIBIL Report Text**
\`\`\`
{{{cibilReportText}}}
\`\`\`

**Source Document 2: Extracted Salary Slip Analysis**
\`\`\`json
{{{json salarySlipAnalysis}}}
\`\`\`

**Your Task:**
Perform the comparison for each field (Name, DOB, PAN) and populate the output schema.
- For 'cibilValue', extract the data directly from the CIBIL text.
- For 'salarySlipValue', use the data from the provided JSON. If multiple salary slips have different values for a field, list them all and flag it as a 'Mismatch'.
- Write a concise 'overallAssessment' summarizing your findings. Conclude with a clear statement about the data consistency (e.g., "The key identifiers (Name, DOB, PAN) are consistent across all provided documents, indicating a high degree of confidence.", "A critical mismatch was found in the applicant's name, which requires immediate clarification.").

Generate the final, structured verification output.
`,
});

const crossVerifyDocumentsFlow = ai.defineFlow(
  {
    name: 'crossVerifyDocumentsFlow',
    inputSchema: CrossVerificationInputSchema,
    outputSchema: z.object({
      output: CrossVerificationOutputSchema,
      usage: z.any(),
    }),
  },
  async input => {
    const result = await prompt(input);
    const output = result.output;
    if (!output) {
      throw new Error("AI failed to cross-verify documents.");
    }
    return { output, usage: result.usage };
  }
);



