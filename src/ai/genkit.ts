// src/ai/genkit.ts

import { genkit } from 'genkit';
import { googleAI } from "@genkit-ai/googleai";
import * as firebaseProvider from "@genkit-ai/firebase";
// Pick correct core initializer
const genkitInit = (core as any).genkit || (core as any).initGenkit;
if (!genkitInit) {
  throw new Error(
    "[Genkit] Neither genkit() nor initGenkit() found in @genkit-ai/core. Please check your package version."
  );
}

// Pick correct firebase plugin
const firebasePlugin =
  (firebaseProvider as any).firebaseAi ||
  (firebaseProvider as any).firebase ||
import { z } from "zod";
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
  model: googleAI.model('gemini-2.5-flash'),
});

// Example schema
export const ExampleSchema = z.object({
  message: z.string(),
});

// Test function
export async function testAI(prompt: string) {
  const response = await ai.generate({
    prompt,
    output: { schema: ExampleSchema },
  });

  return response.output;
}
