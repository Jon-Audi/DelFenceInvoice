// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
    allowedDevOrigins: [
      'https://9003-firebase-studio-1748981876423.cluster-f4iwdviaqvc2ct6pgytzw4xqy4.cloudworkstations.dev'
    ]
  }
}

module.exports = nextConfig;
