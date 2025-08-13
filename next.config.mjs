/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';

const nextConfig = {
  // Your Next.js config options here
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

export default pwaConfig(nextConfig);
