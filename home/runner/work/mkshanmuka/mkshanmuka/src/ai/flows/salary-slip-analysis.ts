
'use server';

/**
 * @fileOverview An AI agent that analyzes multiple salary slips, extracts key data, and performs fraud detection.
 *
 * - analyzeSalarySlips - A function that handles the salary slip analysis.
 * - SalarySlipAnalysisInput - The input type for the analyzeSalarySlips function.
 * - SalarySlipAnalysisOutput - The return type for the analyzeSalarySlips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SalarySlipAnalysisInputSchema = z.object({
  salarySlips: z.array(z.object({
      fileName: z.string(),
      dataUri: z.string().describe("A salary slip document as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  })).describe('An array of salary slip documents to be analyzed.'),
});
export type SalarySlipAnalysisInput = z.infer<typeof SalarySlipAnalysisInputSchema>;


const ExtractedSlipDetailsSchema = z.object({
    fileName: z.string().describe('The original file name of the salary slip.'),
    payMonth: z.string().describe('The month and year of the salary slip (e.g., "May 2024"). Return "N/A" if not found.'),
    name: z.string().describe('The employee\'s full name. Return "N/A" if not found.'),
    dateOfBirth: z.string().describe('The employee\'s date of birth. Return "N/A" if not found.'),
    dateOfJoining: z.string().describe('The employee\'s date of joining. Return "N/A" if not found.'),
    grossSalary: z.string().describe('The total gross salary, formatted as ₹X,XX,XXX. Return "N/A" if not found.'),
    incentives: z.string().describe('Any incentives or bonuses, formatted as ₹X,XX,XXX. Return "₹0" if none found.'),
    netSalary: z.string().describe('The final net salary, formatted as ₹X,XX,XXX. Return "N/A" if not found.'),
});

const FraudDetectionSchema = z.object({
    consistencyCheck: z.string().describe("A summary of consistency checks across all documents for fields like Name, DOB, DOJ, and PAN number. Note any discrepancies."),
    patternAnalysis: z.string().describe("Analysis of salary patterns. Note if the net salary is consistent or has unexplained variations. Mention if the salary credit date is consistent."),
    formattingAnomalies: z.string().describe("A summary of any formatting anomalies detected, such as extra spaces, misaligned text, different fonts, or pixelation which could indicate editing."),
    tamperingIndicators: z.string().describe("A summary of any direct signs of tampering, like edited figures, overwritten text, or inconsistent logos/headers."),
    overallAssessment: z.string().describe("A final, comprehensive assessment of the documents' authenticity, summarizing all findings into a conclusion (e.g., 'High risk of fraud', 'Moderate risk, manual verification recommended', 'Appears authentic')."),
    authenticityConfidence: z.number().min(0).max(100).describe("A numerical confidence score from 0 to 100 on the authenticity of the documents, where 100 is completely authentic."),
});

const SalarySlipAnalysisOutputSchema = z.object({
  extractedSlips: z.array(ExtractedSlipDetailsSchema).describe("A list of detailed data extracted from each individual salary slip."),
  fraudReport: FraudDetectionSchema.describe("A comprehensive report detailing the fraud analysis across all provided documents."),
});
export type SalarySlipAnalysisOutput = z.infer<typeof SalarySlipAnalysisOutputSchema>;

export async function analyzeSalarySlips(
  input: SalarySlipAnalysisInput
): Promise<SalarySlipAnalysisOutput> {
  return analyzeSalarySlipsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSalarySlipsPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: SalarySlipAnalysisInputSchema},
  output: {schema: SalarySlipAnalysisOutputSchema},
  prompt: `You are a forensic document analyst specializing in verifying Indian salary slips for loan applications. Your task is to meticulously analyze a batch of salary slips, extract key information, and perform a comprehensive, multi-layered fraud detection analysis.

**Input Documents:**
{{#each salarySlips}}
- **File:** {{{fileName}}}
{{{media url=dataUri}}}
{{/each}}

**Your Analysis Task (Perform these steps):**

1.  **Individual Extraction (extractedSlips):**
    *   For each salary slip provided, extract the following details precisely:
        *   The original file name.
        *   Pay Month (e.g., "May 2024").
        *   Employee Name.
        *   Date of Birth (DOB).
        *   Date of Joining (DOJ).
        *   Gross Salary (formatted as "₹X,XX,XXX").
        *   Incentives/Bonuses (formatted as "₹X,XX,XXX", return "₹0" if none).
        *   Net Salary (formatted as "₹X,XX,XXX").
    *   Create one JSON object in the 'extractedSlips' array for each document. If a field isn't found, you MUST return "N/A".

2.  **Comprehensive Fraud Report (fraudReport):**
    *   After extracting data, perform a cross-document forensic analysis. Scrutinize each document for signs of tampering using the following layers:
    *   **Consistency Check:** Compare static details (Name, DOB, DOJ, company name, PAN) across all slips. Are they identical? Report any mismatch.
    *   **Pattern Analysis:** Analyze the salary figures. Is there a logical progression or are there unexplained, volatile changes in gross or net pay? Is the salary credit date consistent?
    *   **Formatting Anomalies (Layout & Text Layer):** Scrutinize the layout of each document. Look for inconsistencies in fonts (e.g., a different font for one number), alignments (e.g., a misaligned column), spacing between text, or logos that differ slightly between slips. These are classic signs of a forged document. Mention things like "extra spaces" or "uneven line gaps".
    *   **Tampering Indicators (Visual Layer):** Look for direct evidence of image manipulation. Are there blurry areas, compression artifacts, or pixelation around numbers that could indicate editing? Does any text look 'pasted on'? Are headers, logos, or signatures inconsistent?
    *   **Overall Assessment:** Based on all the above points, provide a final, conclusive summary of your findings. Give a clear recommendation on the document's authenticity.
    *   **Authenticity Confidence:** Provide a numerical confidence score from 0 to 100. A score of 95+ suggests high confidence in authenticity. A score below 70 suggests a high probability of fraud and requires manual review.

Generate the final, consolidated output in the required structured format.
`,
});

const analyzeSalarySlipsFlow = ai.defineFlow(
  {
    name: 'analyzeSalarySlipsFlow',
    inputSchema: SalarySlipAnalysisInputSchema,
    outputSchema: SalarySlipAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to analyze the salary slips.");
    }
    return output;
  }
);
