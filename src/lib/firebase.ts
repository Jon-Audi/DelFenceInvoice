
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
// import { getAnalytics } from "firebase/analytics"; // Uncomment if you plan to use Analytics

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Log individual environment variables
console.log("[Firebase Init] Attempting to load environment variables:");
console.log("[Firebase Init] NEXT_PUBLIC_FIREBASE_API_KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log("[Firebase Init] NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
console.log("[Firebase Init] NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log("[Firebase Init] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
console.log("[Firebase Init] NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
console.log("[Firebase Init] NEXT_PUBLIC_FIREBASE_APP_ID:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
console.log("[Firebase Init] NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:", process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID);


const firebaseConfig: FirebaseOptions = firebaseConfigValues;

// TEMPORARY DEBUG LINE - Log the constructed config object
console.log("[Firebase Init] Firebase config object being used for initialization:", firebaseConfig);

// Check for critical missing configuration before initializing
if (!firebaseConfig.apiKey) {
  console.error("[Firebase Init Error] CRITICAL: Firebase API Key is missing. Ensure NEXT_PUBLIC_FIREBASE_API_KEY is set in your .env file and the server was restarted.");
}

// Initialize Firebase
let app;
if (!getApps().length) {
  console.log("[Firebase Init] No Firebase apps initialized yet. Initializing a new app.");
  try {
    app = initializeApp(firebaseConfig);
    console.log("[Firebase Init] Firebase app initialized successfully.");
  } catch (e: any) {
    console.error("[Firebase Init Error] Error during initializeApp:", e.message, e);
  }
} else {
  app = getApp();
  console.log("[Firebase Init] Firebase app already initialized. Getting existing app.");
}

let db: any, authInstance: any; // Renamed to avoid conflict with auth import, use 'any' for now if type causes issue

if (app) {
  try {
    db = getFirestore(app);
    authInstance = getAuth(app); // Use this instance
    console.log("[Firebase Init] Firestore and Auth instances obtained.");
  } catch (e: any) {
    console.error("[Firebase Init Error] Error obtaining Firestore or Auth instance:", e.message, e);
  }
} else {
  console.error("[Firebase Init Error] Firebase app object is undefined after initialization attempt. Firestore and Auth cannot be initialized.");
}

// let analytics; // Uncomment if you plan to use Analytics
// if (typeof window !== 'undefined' && app) { // Analytics should only be initialized on the client
//   analytics = getAnalytics(app);
// }

export { app, db, authInstance as auth }; // Export the initialized auth instance
