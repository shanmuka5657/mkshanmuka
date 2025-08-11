
import {genkit} from 'genkit';
import {googleAI} from '@gen-ai/google-ai';

export const ai = genkit({
  plugins: [googleAI({
    apiKey: process.env.GOOGLE_API_KEY
  })],
  model: 'googleai/gemini-1.5-flash',
});
