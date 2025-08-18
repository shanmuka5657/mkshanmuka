// src/lib/genkit-server.ts
import 'server-only';

let isInitialized = false;
let genkitInstance;

export async function getGenkit() {
  if (!isInitialized) {
    try {
      const { genkit } = await import('../ai/genkit');
      // Check if genkit has an init method before calling it
      if (typeof genkit.init === 'function') {
        await genkit.init();
      }
      isInitialized = true;
      genkitInstance = genkit;
    } catch (error) {
      console.error('Genkit initialization failed:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
      throw new Error(`AI services unavailable: ${(error as Error).message}`);
    }
  }
  return genkitInstance;
}