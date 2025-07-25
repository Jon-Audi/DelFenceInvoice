// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

let firebaseConfig: any;

// In a server-side or build environment (like App Hosting), GOOGLE_CLOUD_PROJECT is set.
// The Firebase Admin SDK and other server-side tools use this.
// For client-side code, App Hosting injects FIREBASE_WEBAPP_CONFIG.
if (process.env.FIREBASE_WEBAPP_CONFIG) {
  try {
    firebaseConfig = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
     console.log("[FirebaseInit] Loaded config from process.env.FIREBASE_WEBAPP_CONFIG.");
  } catch(e) {
    console.error("[FirebaseInit] Failed to parse FIREBASE_WEBAPP_CONFIG.", e);
    throw new Error("Firebase configuration from environment is invalid.");
  }
} else if (process.env.FIREBASE_CONFIG) {
    // Fallback for environments that might only provide the basic config
  try {
    firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
     console.log("[FirebaseInit] Loaded config from process.env.FIREBASE_CONFIG.");
  } catch(e) {
    console.error("[FirebaseInit] Failed to parse FIREBASE_CONFIG.", e);
    throw new Error("Firebase configuration from environment is invalid.");
  }
} else {
   // Fallback to client-side environment variables for local development
   console.log("[FirebaseInit] Loading config from NEXT_PUBLIC_ variables for local dev.");
   firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
   };
}


if (!firebaseConfig.projectId) {
  const errMsg = "CRITICAL STARTUP ERROR: Firebase projectId is not defined. Initialization failed. Check environment variables.";
  console.error(errMsg);
  throw new Error(errMsg);
}

let app: FirebaseApp;
let db: Firestore;
let authInstance: Auth;
let storage: FirebaseStorage;
let analytics: Analytics | undefined;

if (getApps().length) {
  app = getApp();
} else {
  app = initializeApp(firebaseConfig);
}

db = getFirestore(app);
authInstance = getAuth(app);
storage = getStorage(app);

if (typeof window !== "undefined") {
  try {
    if (firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
    } else {
      analytics = undefined;
    }
  } catch (error) {
    analytics = undefined;
  }
}

export { app, db, authInstance as auth, storage, analytics };
