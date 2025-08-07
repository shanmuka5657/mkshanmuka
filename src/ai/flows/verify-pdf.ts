
'use server';

/**
 * @fileOverview An AI agent that analyzes multiple generic documents, extracts key data, and performs fraud detection.
 *
 * - verifyPdf - A function that handles the document analysis.
 * - VerifyPdfInput - The input type for the verifyPdf function.
 * - VerifyPdfOutput - The return type for the verifyPdf function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FlowUsage } from 'genkit/flow';

const VerifyPdfInputSchema = z.object({
  documents: z.array(z.object({
      fileName: z.string(),
      dataUri: z.string().describe("A document as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  })).describe('An array of documents to be analyzed.'),
});
export type VerifyPdfInput = z.infer<typeof VerifyPdfInputSchema>;


const ExtractedDetailsSchema = z.object({
    fileName: z.string().describe('The original file name of the document.'),
    documentType: z.string().describe('The AI-identified type of the document (e.g., "Salary Slip", "Bank Statement", "Invoice", "Contract", "Unknown"). Return "N/A" if not found.'),
    keyInfo: z.string().describe('The most important identifying information from the document (e.g., for a salary slip, "Net Salary for May 2024"; for an invoice, "Invoice #1234 for Client X"). Return "N/A" if not found.'),
    primaryAmount: z.string().describe('The single most significant currency amount on the document (e.g., Net Salary, Closing Balance, Total Amount Due), formatted as a currency string (e.g., ₹X,XX,XXX). Return "N/A" if not found.'),
});

const FraudDetectionSchema = z.object({
    consistencyCheck: z.string().describe("A summary of consistency checks across all documents for fields like Name, DOB, DOJ, and PAN number. Note any discrepancies."),
    patternAnalysis: z.string().describe("Analysis of numerical patterns. Note if values are consistent or have unexplained variations. For statements/slips, mention if the credit/debit date is consistent."),
    formattingAnomalies: z.string().describe("A summary of any formatting anomalies detected, such as extra spaces, misaligned text, different fonts, or pixelation which could indicate editing."),
    tamperingIndicators: z.string().describe("A summary of any direct signs of tampering, like edited figures, overwritten text, or inconsistent logos/headers."),
    overallAssessment: z.string().describe("A final, comprehensive assessment of the documents' authenticity, summarizing all findings into a conclusion (e.g., 'High risk of fraud', 'Moderate risk, manual verification recommended', 'Appears authentic')."),
    authenticityConfidence: z.number().min(0).max(100).describe("A numerical confidence score from 0 to 100 on the authenticity of the documents, where 100 is completely authentic."),
});

const VerifyPdfOutputSchema = z.object({
  extractedDetails: z.array(ExtractedDetailsSchema).describe("A list of detailed data extracted from each individual document."),
  fraudReport: FraudDetectionSchema.describe("A comprehensive report detailing the fraud analysis across all provided documents."),
});
export type VerifyPdfOutput = z.infer<typeof VerifyPdfOutputSchema>;


const verifyPdfPrompt = ai.definePrompt({
  name: 'verifyPdfPrompt',
  input: {schema: VerifyPdfInputSchema},
  output: {schema: VerifyPdfOutputSchema},
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are a forensic document analyst. Your task is to meticulously analyze a batch of documents, extract key information, and perform a comprehensive, multi-layered fraud detection analysis.

**Input Documents:**
{{#each documents}}
- **File:** {{{fileName}}}
{{{media url=dataUri}}}
{{/each}}

**Your Analysis Task (Perform these steps):**

1.  **Individual Extraction (extractedDetails):**
    *   For each document provided, extract the following details precisely:
        *   The original file name.
        *   Identify the 'documentType' (e.g., "Salary Slip", "Bank Statement", "Invoice", "Contract", "Unknown").
        *   Extract the most important piece of 'keyInfo' that summarizes the document's purpose.
        *   Find the most significant currency amount and extract it as 'primaryAmount', formatted as a currency string (e.g., ₹X,XX,XXX or $X,XXX.XX).
    *   Create one JSON object in the 'extractedDetails' array for each document. If a field isn't found, you MUST return "N/A".

2.  **Comprehensive Fraud Report (fraudReport):**
    *   After extracting data, perform a cross-document forensic analysis. Scrutinize each document for signs of tampering using the following layers:
    *   **Consistency Check:** Compare static details (Names, Dates, Company info, IDs) across all documents. Are they identical? Report any mismatch.
    *   **Pattern Analysis:** Analyze numerical data. Are there logical progressions or unexplained, volatile changes?
    *   **Formatting Anomalies (Layout & Text Layer):** Scrutinize the layout of each document. Look for inconsistencies in fonts, alignments, spacing, or logos that differ slightly between slips. These are classic signs of a forged document. Mention things like "extra spaces" or "uneven line gaps".
    *   **Tampering Indicators (Visual Layer):** Look for direct evidence of image manipulation. Are there blurry areas, compression artifacts, or pixelation around numbers that could indicate editing? Does any text look 'pasted on'? Are headers, logos, or signatures inconsistent?
    *   **Overall Assessment:** Based on all the above points, provide a final, conclusive summary of your findings. Give a clear recommendation on the document's authenticity.
    *   **Authenticity Confidence:** Provide a numerical confidence score from 0 to 100. A score of 95+ suggests high confidence in authenticity. A score below 70 suggests a high probability of fraud and requires manual review.

Generate the final, consolidated output in the required structured format.
`,
});

const verifyPdfFlow = ai.defineFlow(
  {
    name: 'verifyPdfFlow',
    inputSchema: VerifyPdfInputSchema,
    outputSchema: z.object({
      output: VerifyPdfOutputSchema,
      usage: z.any(),
    }),
  },
  async input => {
    const result = await verifyPdfPrompt(input);
    const output = result.output;
    if (!output) {
      throw new Error("AI failed to analyze the documents.");
    }
    return { output, usage: result.usage };
  }
);


export async function verifyPdf(
  input: VerifyPdfInput
): Promise<{ output: VerifyPdfOutput; usage: FlowUsage }> {
  // This function is the server action called by the client.
  // It directly calls the flow and returns its result.
  return await verifyPdfFlow(input);
}
