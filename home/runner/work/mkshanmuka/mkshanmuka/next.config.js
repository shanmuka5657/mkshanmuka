
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Fix handlebars warnings
    config.module.noParse = /(require-in-the-middle|handlebars)/;
    
    // Ignore OpenTelemetry warnings
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
