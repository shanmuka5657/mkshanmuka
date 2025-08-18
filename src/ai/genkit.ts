import {genkit, ai} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {firebase} from '@genkit-ai/firebase';

// The 'firebase' import is a plugin object, not a function.
// It should be passed directly into the plugins array.
const plugins = [firebase()];

(async () => {
  const { dotprompt } = await import('@genkit-ai/dotprompt');
  plugins.unshift(dotprompt());
})();

if (process.env.GENKIT_GEMINI_API_KEY) {
  plugins.push(googleAI());
} else {
  console.warn(`
--------------------------------------------------
- WARNING: GEMINI_API_KEY is not set.
- The AI features of this app will not work.
- For local development, get a key from Google AI Studio
- and add it to the .env file in the root of your project.
--------------------------------------------------
  `);
}

genkit({
  plugins,
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export {ai};
