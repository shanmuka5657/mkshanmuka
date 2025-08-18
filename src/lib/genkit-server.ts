// src/lib/genkit-server.ts
import 'server-only';
import initializeGenkit from '../ai/genkit';
let genkitInstance;

let initializationPromise: Promise<any> | null = null;

export async function getGenkit(): Promise<any> {
 if (!initializationPromise) {
    initializationPromise = initializeGenkit()
 .then((instance: any) => {
 return instance;
      })
 .catch((error: any) => {
 console.error('Genkit initialization failed:', error);
 initializationPromise = null; // Allow retry
 throw error;
      });
  }
 return initializationPromise;
}