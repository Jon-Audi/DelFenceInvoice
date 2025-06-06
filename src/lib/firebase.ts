
// src/lib/firebase.ts

// CRITICAL CHECK: Ensure Project ID is available at the very start.
if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
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
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let db: Firestore;
let authInstance: Auth; // Renamed from 'auth'
let analytics: Analytics | undefined;

if (!firebaseConfig.projectId) {
  // This block should theoretically not be reached if the check at the top of the file works,
  // but it's kept as a secondary safeguard.
  console.error(
    "CRITICAL Firebase Config Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or undefined in firebase.ts. This will cause Firebase SDK initialization to fail.",
    "Current value from process.env:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    "Full firebaseConfig object:", JSON.stringify(firebaseConfig)
  );
  // Throwing an error here too if the top check somehow didn't catch it.
  throw new Error("Firebase projectId is missing in firebaseConfig object after initial environment check.");
}

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
      // console.warn("Firebase Analytics is not initialized because NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is missing.");
      analytics = undefined;
    }
  } catch (error) {
    // console.warn("Firebase Analytics could not be initialized.", error);
    analytics = undefined;
  }
}

export { app, db, authInstance as auth, analytics }; // Export authInstance as auth
