import {config} from 'dotenv';
config();

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const plugins = [];

// This check ensures the app doesn't crash if the API key is missing during deployment.
if (process.env.GEMINI_API_KEY) {
    plugins.push(googleAI({
        apiKey: process.env.GEMINI_API_KEY,
        apiVersion: 'v1beta', // Using v1beta for broader model compatibility
    }));
} else {
    // This warning will appear in your server logs.
    console.warn("GEMINI_API_KEY is not set. AI features will be disabled.");
}

export const ai = genkit({
  plugins,
});
