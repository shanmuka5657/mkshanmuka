/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // This is a workaround for a bug in Next.js where it doesn't correctly
    // bundle Genkit dependencies.
    config.optimization.concatenateModules = false;

    // Mark Genkit packages as external for server bundles
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        /@genkit-ai\/(.*)/,
      );
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: [
      '@genkit-ai/firebase',
      '@genkit-ai/googleai',
      '@genkit-ai/dotprompt',
      'genkit',
    ],
  }
};

module.exports = nextConfig;
