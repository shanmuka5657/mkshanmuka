// src/ai/genkit.ts

import * as core from "@genkit-ai/core";
import { googleAI } from "@genkit-ai/googleai";
// Import everything from firebase to check what's available
import * as firebaseProvider from "@genkit-ai/firebase";
import { z } from "zod";

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
  undefined;

if (!firebasePlugin) {
  console.warn(
    "[Genkit] Firebase plugin not found. Check your @genkit-ai/firebase version."
  );
}

export const ai = genkitInit({
  logLevel: "debug",
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
    ...(firebasePlugin ? [firebasePlugin()] : []), // only add if exists
  ],
});

// Example schema
export const ExampleSchema = z.object({
  message: z.string(),
});

// Test function
export async function testAI(prompt: string) {
  const response = await ai.generate({
    model: "googleai/gemini-1.5-flash",
    prompt,
  });

  return response.outputText();
}
