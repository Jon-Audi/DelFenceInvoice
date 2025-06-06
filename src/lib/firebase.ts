
// src/lib/firebase.ts

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
  console.error(
    "CRITICAL Firebase Config Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or undefined."
  );
  // This error will likely cause initializeApp to fail or Firebase services to be unusable.
  // Ensure this variable is correctly set in your environment (apphosting.yaml for deployments).
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
