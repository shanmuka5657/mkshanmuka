

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Fix handlebars warnings
    config.module.noParse = /(require-in-the-middle|handlebars)/;
    
    // Ignore OpenTelemetry warnings and add fallbacks
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@opentelemetry/winston-transport': false,
      '@opentelemetry/exporter-jaeger': false,
      fs: false,
      path: false,
      os: false,
    };
    
    return config;
  },
  experimental: {
    instrumentationHook: false,
    turbo: {}
  },
  serverActions: {
    bodySizeLimit: '100mb',
  },
};

module.exports = nextConfig;
