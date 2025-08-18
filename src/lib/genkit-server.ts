// src/lib/genkit-server.ts
import 'server-only';
import { genkit } from '../ai/genkit';

let isInitialized = false;

export async function getGenkit() {
  if (!isInitialized) {
    try {
      // Check if genkit has an init method before calling it
      if (typeof genkit.init === 'function') {
        await genkit.init();
      }
      isInitialized = true;
    } catch (error) {
      console.error('Genkit initialization failed:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
      throw new Error(`AI services unavailable: ${(error as Error).message}`);
    }
  }
  return genkit;
}