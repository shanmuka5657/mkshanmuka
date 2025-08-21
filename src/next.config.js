/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // This line is crucial for Firebase Admin SDK and Genkit to work in Server Actions
    serverComponentsExternalPackages: ['firebase-admin', '@genkit-ai/firebase', '@genk' +
'it-ai/dotprompt', 'genkit'],
  }
};

module.exports = nextConfig;
