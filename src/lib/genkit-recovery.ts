// src/lib/genkit-recovery.ts
import { getGenkit } from './genkit-server';

let retryCount = 0;
const MAX_RETRIES = 3;

export async function withGenkitRetry<T>(fn: (genkit: any) => Promise<T>): Promise<T> {
  try {
    const genkit = await getGenkit();
    return await fn(genkit);
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.warn(`Retrying Genkit operation (attempt ${retryCount})`);
      return withGenkitRetry(fn);
    }
    throw error;
  }
}
// src/lib/genkit-recovery.ts
import { getGenkit } from './genkit-server';

let retryCount = 0;
const MAX_RETRIES = 3;

export async function withGenkitRetry<T>(fn: (genkit: any) => Promise<T>): Promise<T> {
  try {
    const genkit = await getGenkit();
    return await fn(genkit);
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.warn(`Retrying Genkit operation (attempt ${retryCount})`);
      return withGenkitRetry(fn);
    }
    throw error;
  }
}