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
      throw new Error('AI services unavailable');
    }
  }
  return genkit;
}