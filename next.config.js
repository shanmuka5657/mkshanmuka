
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@opentelemetry/winston-transport': false,
      '@opentelemetry/exporter-jaeger': false
    };
    return config;
  },
  experimental: {
    instrumentationHook: false
  }
};

module.exports = nextConfig;
