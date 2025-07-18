// next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add a watchOptions configuration to ignore the 'functions' directory.
  // This prevents the Next.js dev server from restarting every time
  // the Cloud Functions are compiled.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't watch the functions directory
      config.watchOptions.ignored = [
        ...(Array.isArray(config.watchOptions.ignored) ? config.watchOptions.ignored : []),
        '**/functions/**'
      ];
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
}

module.exports = nextConfig;
