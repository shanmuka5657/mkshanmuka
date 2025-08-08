
import type {NextConfig} from 'next';
// @ts-expect-error - no types for next-pwa
import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
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
       {
        source: '/veritypdf',
        destination: '/verify',
        permanent: true,
      },
       {
        source: '/crossverify',
        destination: '/cross-verify',
        permanent: true,
      },
    ]
  },
};

export default pwaConfig(nextConfig);
