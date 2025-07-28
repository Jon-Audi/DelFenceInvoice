// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getFirestore, Firestore, runTransaction, collection, doc, getDoc, writeBatch, query, where, orderBy, getDocs, DocumentReference, documentId } from 'firebase/firestore'; // Import Firestore related functions
import { getAuth, Auth } from 'firebase/auth'; // Import Auth related functions
import { getStorage, FirebaseStorage } from 'firebase/storage'; // Import Storage related functions


let firebaseConfig: any;

// For server-side rendering and build processes in App Hosting
if (process.env.FIREBASE_WEBAPP_CONFIG) {
  try {
    firebaseConfig = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
     console.log("[FirebaseInit] Loaded config from process.env.FIREBASE_WEBAPP_CONFIG.");
  } catch(e) {
    console.error("[FirebaseInit] Failed to parse FIREBASE_WEBAPP_CONFIG.", e);
    throw new Error("Firebase configuration from environment is invalid.");
  }
} else if (process.env.FIREBASE_CONFIG) { // Fallback for basic server-side config
  try {
    firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
     console.log("[FirebaseInit] Loaded config from process.env.FIREBASE_CONFIG.");
  } catch(e) {
    console.error("[FirebaseInit] Failed to parse FIREBASE_CONFIG.", e);
    throw new Error("Firebase configuration from environment is invalid.");
  }
} else {
   // Fallback for client-side local development using .env file
   console.log("[FirebaseInit] Loading config from NEXT_PUBLIC_ variables for local dev.");
   if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      const errMsg = "Firebase project ID is not defined in NEXT_PUBLIC_FIREBASE_PROJECT_ID. Please add your Firebase project configuration to a .env.local file in the root of your project.";
      console.error(`[FirebaseInit] ${errMsg}`);
      throw new Error(`CRITICAL STARTUP ERROR: ${errMsg}`);
   }
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

// Ensure projectId is defined after checking all sources
if (!firebaseConfig.projectId) {
  const errMsg = "CRITICAL STARTUP ERROR: Firebase projectId is not defined after checking all sources. Initialization failed.";
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

// Initialize other Firebase services if they are used
db = getFirestore(app);
authInstance = getAuth(app);
storage = getStorage(app);


// Initialize Analytics only in the browser
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

export { app, db, authInstance as auth, storage, analytics, runTransaction, collection, doc, getDoc, writeBatch, query, where, orderBy, getDocs, DocumentReference, documentId }; // Export necessary functions
