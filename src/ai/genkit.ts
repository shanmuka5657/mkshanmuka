import {genkit, ModelDefinition} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const plugins = [];

// Define the models that the app will use
const gemini15flash: ModelDefinition = {
    name: 'gemini-1.5-flash',
    type: 'generative',
    version: '1.5',
};

// This check ensures the app doesn't crash if the API key is missing during deployment.
if (process.env.GEMINI_API_KEY) {
    plugins.push(googleAI({
        models: [gemini15flash] // Explicitly define the model
    }));
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
