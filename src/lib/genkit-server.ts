// src/lib/genkit-server.ts
import 'server-only';
import { ai } from '../ai/genkit';

// Since the genkit instance is already initialized on import in ../ai/genkit.ts,
// we can directly export it here.
export async function getGenkit(): Promise<any> {
  return ai;
}