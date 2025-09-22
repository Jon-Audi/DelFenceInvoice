// next.config.ts
import type { NextConfig } from 'next';

// This function safely parses the server-side Firebase config
// and prepares it for the client-side.
const getClientFirebaseConfig = () => {
  if (process.env.FIREBASE_WEBAPP_CONFIG) {
    try {
      const firebaseConfig = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
      return {
        NEXT_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
        NEXT_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId,
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: firebaseConfig.measurementId,
      };
    } catch (e) {
      console.error("Failed to parse FIREBASE_WEBAPP_CONFIG:", e);
      return {};
    }
  }
  // Return empty object if the server-side variable isn't set (e.g., local dev)
  // In local dev, these will be picked up from the .env file instead.
  return {};
};

const nextConfig: NextConfig = {
  // Expose the server-side config to the client-side using the `env` key.
  env: getClientFirebaseConfig(),
  experimental: {
    serverActions: true, // Explicitly enable server actions
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
