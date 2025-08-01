
'use server';

/**
 * @fileOverview An AI agent that extracts consumer details from a credit report.
 *
 * - getCustomerDetails - A function that returns key consumer information.
 * - CustomerDetailsInput - The input type for the getCustomerDetails function.
 * - CustomerDetailsOutput - The return type for the getCustomerDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FlowUsage } from 'genkit/flow';

const CustomerDetailsInputSchema = z.object({
  creditReportText: z.string().describe('The full text extracted from the credit report.'),
});
export type CustomerDetailsInput = z.infer<typeof CustomerDetailsInputSchema>;

const CustomerDetailsOutputSchema = z.object({
  name: z.string().describe('The full name of the consumer.'),
  dateOfBirth: z.string().describe('The consumer\'s date of birth in DD-MM-YYYY format.'),
  pan: z.string().describe('The consumer\'s PAN ID.'),
  gender: z.string().describe('The consumer\'s gender.'),
  address: z.string().describe('The consumer\'s primary address listed on the report.'),
});
export type CustomerDetailsOutput = z.infer<typeof CustomerDetailsOutputSchema>;

export async function getCustomerDetails(
  input: CustomerDetailsInput
): Promise<{ output: CustomerDetailsOutput, usage: FlowUsage }> {
  return customerDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customerDetailsPrompt',
  input: {schema: CustomerDetailsInputSchema},
  output: {schema: CustomerDetailsOutputSchema},
  prompt: `You are an expert data extractor. Your task is to meticulously scan the provided credit report text and extract the key consumer details.

**Instructions:**
1.  Locate the "PERSONAL INFORMATION" or "CONSUMER INFORMATION" section of the report.
2.  Extract the following fields accurately:
    *   **Name:** The full name of the individual.
    *   **Date of Birth (DOB):** Must be in DD-MM-YYYY format.
    *   **PAN:** The Income Tax ID Number (PAN).
    *   **Gender:** The gender of the individual.
    *   **Address:** The most complete address listed (usually the "Permanent Address").
3.  **Handling Missing Data:** If any specific field is not found in the report, you MUST return "N/A" for that field. Do not leave it blank or make up data.

**Credit Report Text:**
\`\`\`
{{{creditReportText}}}
\`\`\`

Provide the final extracted data in the structured format.
`,
});

const customerDetailsFlow = ai.defineFlow(
  {
    name: 'customerDetailsFlow',
    inputSchema: CustomerDetailsInputSchema,
    outputSchema: z.object({
        output: CustomerDetailsOutputSchema,
        usage: z.any(),
    }),
  },
  async (input) => {
    const result = await prompt(input);
    if (!result.output) {
      throw new Error("AI failed to extract customer details.");
    }
    return { output: result.output, usage: result.usage };
  }
);
