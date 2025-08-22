
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // This is a workaround for a bug in Next.js where it doesn't correctly
    // bundle Genkit dependencies.
    config.optimization.concatenateModules = false;
    config.optimization = {
      ...config.optimization,
      concatenateModules: false,
      minimize: false
    };

    // Mark Genkit packages as external for server bundles
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        /@genkit-ai\/.*/,
        function ({ context, request }, callback) {
          if (request?.startsWith('@genkit-ai')) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        }
      );
    }
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb', // Allow larger PDF uploads
      serverActionsTimeout: 120000, // Increase timeout to 120 seconds (2 minutes)
      allowedOrigins: ['localhost:3000', 'your-production-domain.com']
    },
    serverComponentsExternalPackages: [
      '@genkit-ai/firebase',
      '@genkit-ai/dotprompt',
      'genkit',
    ],
  }
};

module.exports = nextConfig;
