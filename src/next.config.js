/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
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
