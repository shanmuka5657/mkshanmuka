// src/ai/genkit.ts

import { genkit } from 'genkit';
import { googleAI } from "@genkit-ai/googleai";
import { z } from "zod";
import * as firebaseProvider from "@genkit-ai/firebase";

// Pick correct firebase plugin
const firebasePlugin =
  (firebaseProvider as any).firebaseAi ||
  (firebaseProvider as any).firebase ||
  undefined;

if (!firebasePlugin) {
  console.warn(
    "[Genkit] Firebase plugin not found. Check your @genkit-ai/firebase version."
  );
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
    ...(firebasePlugin ? [firebasePlugin()] : []),
  ],
  // model: googleAI.model("gemini-2.5-flash"), // Moved model configuration here
});
export { googleAI }; // Export the imported googleAI
// Example schema: Define the output schema for the AI response using Zod.
export const ExampleSchema = z.object({
  message: z.string(),
});

// Test function: A helper function to demonstrate calling the AI with a prompt and schema.
export async function testAI(prompt: string) {
  const response = await ai.generate({
    prompt, // The input prompt for the AI.
    output: { schema: ExampleSchema },
  });

  return response.output;
}
