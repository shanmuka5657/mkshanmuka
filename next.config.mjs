
/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@genkit-ai/dotprompt'],
    webpack: (config, { isServer }) => {
        config.module.noParse = /require-in-the-middle/;
        return config;
    },
    async redirects() {
        return [
          {
            source: '/',
            destination: '/dashboard',
            permanent: true,
          },
        ]
    },
};

export default nextConfig;
