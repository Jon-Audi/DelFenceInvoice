// next.config.ts
import type { NextConfig } from 'next';
import type { Configuration as WebpackConfiguration } from 'webpack';

// This logic makes the server-side Firebase config available to the client-side
// by mapping it to NEXT_PUBLIC_ variables. This is safe because this config
// is designed to be public.
let firebaseWebAppConfig: Record<string, string> = {};
if (process.env.FIREBASE_WEBAPP_CONFIG) {
  try {
    const config = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
    firebaseWebAppConfig = {
      NEXT_PUBLIC_FIREBASE_API_KEY: config.apiKey,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: config.authDomain,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: config.projectId,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: config.storageBucket,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: config.messagingSenderId,
      NEXT_PUBLIC_FIREBASE_APP_ID: config.appId,
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: config.measurementId,
    };
  } catch (e) {
    console.error("Failed to parse FIREBASE_WEBAPP_CONFIG", e);
  }
}

const nextConfig: NextConfig = {
  env: {
    ...firebaseWebAppConfig,
  },
  webpack: (config: WebpackConfiguration, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          ...(Array.isArray(config.watchOptions?.ignored) ? config.watchOptions.ignored : []),
          '**/functions/**',
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
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
