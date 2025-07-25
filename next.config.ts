// next.config.ts
import type { NextConfig } from 'next';
import type { Configuration as WebpackConfiguration } from 'webpack';

// Load environment variables from .env file
require('dotenv').config({ path: './.env' });

const nextConfig: NextConfig = {
  // Add a watchOptions configuration to ignore the 'functions' directory.
  // This prevents the Next.js dev server from restarting every time
  // the Cloud Functions are compiled.
  webpack: (config: WebpackConfiguration, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      // Don't watch the functions directory
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          ...(Array.isArray(config.watchOptions?.ignored) ? config.watchOptions.ignored : []),
          '**/functions/**'
        ],
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co', // Already used for placeholders
        port: '',
        pathname: '/**',
      }
    ],
  },