
import { genkit, ai } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

let _genkitInstance;

export async function initializeGenkit() {
  if (_genkitInstance) return _genkitInstance;

  try {
    // Use dynamic imports to avoid Webpack issues
    const [firebasePlugin, dotpromptPlugin] = await Promise.all([
      import('@genkit-ai/firebase').then(m => m.firebase).catch(() => null),
      import('@genkit-ai/dotprompt').then(m => m.dotprompt).catch(() => null)
    ]);

    const plugins = [];
    if (firebasePlugin) plugins.push(firebasePlugin());
    if (dotpromptPlugin) plugins.push(dotpromptPlugin());

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

    _genkitInstance = genkit.configure({
      plugins,
      enableTracingAndMetrics: true, // Recommended for monitoring in Firebase console
    });

    // Initialize if the method exists
    if (typeof _genkitInstance.init === 'function') {
      await _genkitInstance.init();
    }

    return _genkitInstance;
  } catch (error) {
    console.error('Genkit initialization failed:', error);
    throw new Error('Failed to initialize AI services');
  }
}
