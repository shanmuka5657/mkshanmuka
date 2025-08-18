
const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fix handlebars warnings and resolution issues
    config.resolve.alias = {
      ...config.resolve.alias,
      // When handlebars.js tries to require('./handlebars.runtime'), this alias intercepts it.
      './handlebars.runtime': path.resolve(
        __dirname,
        "node_modules/handlebars/dist/cjs/handlebars.runtime.js"
      ),
      // General alias for the handlebars library
      handlebars: 'handlebars/dist/cjs/handlebars',
    };
    config.module.noParse = /(require-in-the-middle|handlebars)/;
    
    // Ignore OpenTelemetry warnings and add fallbacks for Genkit compatibility
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
    serverComponentsExternalPackages: ['handlebars', '@genkit-ai/core'],
  },
  serverActions: {
    bodySizeLimit: '100mb',
  },
};

module.exports = nextConfig;
