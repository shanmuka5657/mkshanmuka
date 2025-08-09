
import type {NextConfig} from 'next';

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
        permanent: true
      },
       {
        source: '/crossverify',
        destination: '/cross-verify',
        permanent: true
      },
    ]
  },
};

export default nextConfig;
