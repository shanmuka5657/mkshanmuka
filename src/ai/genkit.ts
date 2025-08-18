import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const plugins = [];

// This check ensures the app doesn't crash if the API key is missing during deployment.
if (process.env.GEMINI_API_KEY) {
    plugins.push(googleAI());
} else {
    // This warning will appear in your server logs.
    console.warn(`
--------------------------------------------------
- WARNING: GEMINI_API_KEY is not set.
- The AI features of this app will not work.
- Get a key from Google AI Studio and add it
- to the .env file in the root of your project.
--------------------------------------------------
    `);
}

export const ai = genkit({
  plugins,
});
