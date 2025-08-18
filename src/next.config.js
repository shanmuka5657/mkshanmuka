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
