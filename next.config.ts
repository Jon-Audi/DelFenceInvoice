// next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // Server Actions are enabled by default in the App Router.
  // Explicitly setting serverActions: true might cause issues with
  // some build environments if they don't recognize the top-level key
  // or have their own way of enabling it.
}

module.exports = nextConfig;
