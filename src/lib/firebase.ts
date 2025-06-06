
// src/lib/firebase.ts

// Verbose logging for environment variable check
console.log("[FirebaseInit] Attempting to read NEXT_PUBLIC_FIREBASE_PROJECT_ID from process.env.");
const projectIdFromEnv = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
console.log(`[FirebaseInit] Value of NEXT_PUBLIC_FIREBASE_PROJECT_ID: "${projectIdFromEnv}" (Type: ${typeof projectIdFromEnv})`);

// CRITICAL CHECK: Ensure Project ID is available at the very start.
if (!projectIdFromEnv) { // Use the variable we just logged
  const errMsg = "CRITICAL STARTUP ERROR: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not defined in the environment. Firebase cannot initialize. Check apphosting.yaml and Cloud Run environment variable configuration.";
  console.error(errMsg);
  // This will ensure the application crashes immediately if the projectId is missing.
  // The error should be prominent in the Cloud Run logs.
  throw new Error(errMsg);
}

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getFirestore, type Firestore }   from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

// ✅ Load config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: projectIdFromEnv, // Use the checked variable
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let db: Firestore;
let authInstance: Auth; // Renamed from 'auth'
let analytics: Analytics | undefined;

// Prevent re-initialization on hot reload
if (getApps().length) {
  app = getApp();
} else {
  app = initializeApp(firebaseConfig);
}

// Initialize Firebase services
db = getFirestore(app);
authInstance = getAuth(app); // Use the renamed variable

if (typeof window !== "undefined") {
  try {
    // Check if measurementId is present before initializing analytics
    if (firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
    } else {
      analytics = undefined;
    }
  } catch (error) {
    analytics = undefined;
  }
}

export { app, db, authInstance as auth, analytics }; // Export authInstance as auth
