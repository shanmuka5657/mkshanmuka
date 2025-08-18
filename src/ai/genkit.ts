import { genkit } from "@genkit-ai/core";
import { googleAI } from "@genkit-ai/googleai";
import { firebaseAi } from "@genkit-ai/firebase";
import { z } from "zod";

// ✅ Initialize Genkit with proper providers
export const ai = genkit({
  // Logging helps during debugging
  logLevel: "debug",

  // Providers
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY, // <-- Make sure this env var is set
    }),
    firebaseAi(), // <-- Correct import/function (not firebase())
  ],
});

// ✅ Example schema (optional, good practice)
export const ExampleSchema = z.object({
  message: z.string(),
});

// ✅ Example model call (you can remove if unused)
export async function testAI(prompt: string) {
  const response = await ai.generate({
    model: "googleai/gemini-1.5-flash", // pick your Gemini model here
    prompt,
  });

  return response.outputText();
}
