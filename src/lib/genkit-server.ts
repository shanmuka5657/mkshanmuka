// src/lib/genkit-server.ts
import 'server-only';
import { ai } from '../ai/genkit';

// Since the genkit instance is already initialized on import in ../ai/genkit.ts,
// we can directly export it here.
/**
 * @deprecated This function is deprecated and will be removed. 
 * Import the `ai` instance directly from '@/ai/genkit' instead.
 */
export async function getGenkit(): Promise<any> {
  return ai;
}
