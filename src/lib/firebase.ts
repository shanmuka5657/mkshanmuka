// Import required Firebase services
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// --- DEBUGGING ---
// This will print the configuration to your browser's console.
// You can use this to verify that the environment variables from your .env file are being loaded correctly.
console.log("Firebase Config Being Used:", firebaseConfig);
// --- END DEBUGGING ---

// Initialize Firebase
// This check prevents re-initializing the app on hot reloads.
let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (e: any) {
    console.error("Failed to initialize Firebase. Please check your config.", e);
    // You might want to throw an error or handle this case in your UI
    // For now, we'll log it to see if this is the point of failure.
  }
} else {
  app = getApp();
}


// Initialize Firebase services
// We check if 'app' was successfully initialized before using it.
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;


// To avoid errors in components that import these, we need to handle the case where initialization fails.
// We'll export the initialized services, but they might be null if the config is wrong.
// The app's components should ideally check if these are null.

// A more robust way to export is to ensure they are never null, but this requires a valid config.
// For now, we cast to avoid breaking existing imports. This is for debugging.
export { app, auth, db, storage };
