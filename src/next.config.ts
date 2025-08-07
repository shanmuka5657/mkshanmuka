
import type {NextConfig} from 'next';
// @ts-expect-error - no types for next-pwa
import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  register: true,
  skipWaiting: true,
  disable: false, // Always enable the PWA
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/creditwiseai',
        destination: '/credit',
        permanent: true,
      },
    ]
  },
};

export default pwaConfig(nextConfig);
