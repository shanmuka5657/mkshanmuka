
import { genkit, ai } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Base plugins that are always included.
const plugins = [];

// Use dynamic imports for firebase and dotprompt
async function initializePlugins() {
  try {
    const firebasePlugin = (await import('@genkit-ai/firebase')).firebase;
    const dotpromptPlugin = (await import('@genkit-ai/dotprompt')).dotprompt;
    plugins.push(dotpromptPlugin());
    plugins.push(firebasePlugin());
  } catch (error) {
    console.error('Failed to dynamically import Genkit plugins:', error);
    // Depending on your application's needs, you might want to throw an error here
    // or handle it gracefully, perhaps by disabling AI features.
  }
}

initializePlugins();

// Conditionally add the Google AI plugin only if the API key is available.
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_API_KEY') {
  plugins.push(googleAI());
} else {
  // Log a clear warning if the key is missing, as AI features will not work.
  console.warn(`
--------------------------------------------------
- WARNING: GEMINI_API_KEY is not set.
- The AI features of this app will not work.
- For local development, get a key from Google AI Studio
- and add it to the .env file in the root of your project.
--------------------------------------------------
  `);
}

// Configure Genkit with all the necessary plugins.
genkit({
  plugins,
  enableTracingAndMetrics: true, // Recommended for monitoring in Firebase console
});

// Export the 'ai' object for use in flows and other parts of the application.
export { ai };
