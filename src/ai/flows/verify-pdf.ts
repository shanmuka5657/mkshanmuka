
'use server';

/**
 * @fileOverview A forensic AI agent that analyzes a PDF for signs of tampering.
 *
 * - verifyPdf - A function that handles the forensic analysis process.
 * - VerifyPdfInput - The input type for the verifyPdf function.
 * - VerifyPdfOutput - The return type for the verifyPdf function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FlowUsage } from 'genkit/flow';

const VerifyPdfInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF document as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
  metadata: z.object({
      CreationDate: z.string().optional(),
      ModDate: z.string().optional(),
      Producer: z.string().optional(),
  }).describe('The metadata extracted from the PDF document.'),
});
export type VerifyPdfInput = z.infer<typeof VerifyPdfInputSchema>;

const VerifyPdfOutputSchema = z.object({
  documentType: z.string().describe('The inferred type of the document (e.g., "Resume", "Bank Statement").'),
  metadataAnalysis: z.object({
    producer: z.string().describe("The PDF producer tool listed in the metadata."),
    creationDate: z.string().describe("The creation date from metadata."),
    modDate: z.string().describe("The modification date from metadata."),
    summary: z.string().describe("A comprehensive summary of metadata findings and their implications."),
  }),
  contentAnalysis: z.object({
    textLayer: z.string().describe("A detailed, multi-sentence analysis of the text layer. Explain if the text is selectable, purely image-based (like a scan), or a mix. Discuss the implications (e.g., 'Image-only documents are easier to tamper with')."),
    fontConsistency: z.string().describe("A detailed, multi-sentence analysis of font and spacing consistency. Mention specific inconsistencies if found (e.g., 'While most text uses Arial, the total amount appears in a different font, which is suspicious'). If consistent, state that and why it adds to authenticity."),
    visualElements: z.string().describe("A detailed, multi-sentence analysis of visual elements. Describe logos, headers, and footers. Note any signs of manipulation like pixelation, blurriness around key figures, or misaligned elements. If none are found, state that the visual elements appear consistent and professional."),
  }),
  suspicionFlags: z.array(z.object({
    issue: z.string().describe("The potential issue identified."),
    value: z.string().describe("The value found for the issue."),
    risk: z.enum(['Low', 'Medium', 'High']).describe("The assigned risk level."),
  })).describe("A table of suspicion flags found in the document."),
  confidenceScore: z.object({
    score: z.number().describe("The final confidence score from 0 to 100."),
    explanation: z.string().describe("A detailed explanation of how the score was calculated based on deductions."),
  }),
  finalVerdict: z.object({
    verdict: z.enum(['Authentic', 'Suspicious', 'Likely Altered']).describe("The final verdict on the document's authenticity."),
    recommendation: z.string().describe("A clear, detailed recommendation for the user."),
  }),
  disclaimer: z.string().describe("The mandatory disclaimer for the report."),
});
export type VerifyPdfOutput = z.infer<typeof VerifyPdfOutputSchema>;


export async function verifyPdf(input: VerifyPdfInput): Promise<{ output: VerifyPdfOutput, usage: FlowUsage }> {
  const {output, usage} = await verifyPdfFlow(input);
  if (!output) {
      throw new Error("AI failed to provide a forensic analysis.");
  }
  return { output, usage };
}


const prompt = ai.definePrompt({
    name: 'verifyPdfPrompt',
    model: 'googleai/gemini-1.5-flash',
    input: {schema: VerifyPdfInputSchema},
    output: {schema: VerifyPdfOutputSchema},
    prompt: `You are a world-class forensic document analyst. Your task is to conduct a thorough forensic analysis of the provided PDF and return your findings in a structured JSON format. The confidence score must be a direct reflection of the detailed forensic report.

**Analysis Instructions:**

1.  **Document Type Inference:** First, infer the type of document (e.g., "Resume", "Bank Statement", "Invoice", "Scanned Receipt").
2.  **Metadata Analysis:**
    *   Examine the creation and modification dates from the provided metadata:
        *   Creation Date: '{{{metadata.CreationDate}}}'
        *   Modification Date: '{{{metadata.ModDate}}}'
    *   If the modification date is missing or identical to the creation date, this is a strong indicator of authenticity.
    *   A different modification date is a strong indicator of alteration.
    *   Note the PDF Producer Tool: '{{{metadata.Producer}}}'. Be suspicious of common online editors ('iLovePDF', 'Smallpdf', 'PDFescape', 'Sejda', etc.) for official documents. Professional tools (Adobe, Microsoft Office, enterprise systems) are less suspicious.
    *   Provide a detailed and comprehensive summary of your metadata findings, explaining the implications of the dates and producer tool.
3.  **Text, Font, and Visual Analysis (Content Analysis):**
    *   For each sub-section (textLayer, fontConsistency, visualElements), you MUST provide a detailed, multi-sentence explanation of your findings. Do NOT use generic, single-sentence answers.
    *   **Text Layer:** Determine if text is selectable, purely image-based (like a scan), or a mix. Explain the implications of this finding (e.g., "The document contains selectable text, which is common for system-generated reports. However, some areas are image-based, which could indicate a screenshot was pasted in.").
    *   **Font & Spacing Consistency:** Analyze fonts, sizes, and spacing. Describe your findings in detail (e.g., "The document consistently uses Times New Roman at 10pt. There are no signs of inconsistent fonts or spacing, which strengthens its claim to authenticity.").
    *   **Visuals:** Look for signs of manipulated images, pixelated logos, or layouts that don't match official templates. Elaborate on what you see (e.g., "The bank's logo in the header appears sharp and clear, with no signs of compression artifacts. The table alignment is perfect, suggesting it was generated by software and not manually edited.").
4.  **Suspicion Flags:** Based on ALL your findings, create a table of suspicion flags. For each potential issue (e.g., "Missing Creation Date", "Font Mismatch", "Scanned Image"), record the value you found and assign a risk level (Low, Medium, or High).
5.  **Confidence Score Calculation:**
    *   Start with a base score of 100.
    *   Use the following formula as a **strict guideline** to calculate the final confidence score. Subtract weights for each issue found.
        *   Missing Creation Date: -10
        *   Suspicious PDF Tool (Online Editor): -30
        *   Font Mismatch: -10
        *   Inconsistent Spacing: -10
        *   Scanned Image Detected: -20
        *   Text Inserted over Image: -25
        *   Different ModDate: -40
    *   The final score must be a direct result of this calculation. Provide a comprehensive summary explaining the score (e.g., "The score started at 100. 30 points were deducted for the use of a suspicious PDF tool, resulting in a final score of 70.").
6.  **Verdict and Recommendation:**
    *   **CRITICAL RULE:** If the "Suspicious PDF Tool (Online Editor)" flag is present, the final 'verdict' MUST be "Suspicious".
    *   Otherwise, use the score: 80-100 = "Authentic", 60-79 = "Suspicious", <60 = "Likely Altered".
    *   Provide a clear and detailed recommendation for the user, outlining specific next steps they can take.

**Disclaimer:** The final section of the report should always contain the text: "This report is generated automatically using AI and forensic techniques. It is not a substitute for legal document authentication. Use for preliminary screening only."

**PDF Document for Analysis:**
{{media url=pdfDataUri}}
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
  async (input) => {
    const result = await prompt(input);
    const output = result.output;
    if (!output) {
      throw new Error("AI failed to provide a forensic analysis.");
    }
    return { output, usage: result.usage };
  }
);
