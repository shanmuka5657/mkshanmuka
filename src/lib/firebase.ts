
// Import required Firebase services
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase configuration from environment variables.
// These variables MUST be set in a file named ".env.local" in the root of your project.
// Example .env.local file:
// NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
// ... and so on for all the variables below.

const firebaseConfig = {
  // Found in Project Settings > General > Your Apps > Web App > SDK setup and configuration > Config
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// --- VALIDATION AND DEBUGGING ---
// This block will check if the environment variables are loaded correctly.
// If any are missing, it will log a detailed error message to the server console.
const missingConfig = Object.entries(firebaseConfig).filter(([key, value]) => !value);

if (missingConfig.length > 0) {
  const errorMessage = `Firebase configuration is missing the following environment variables: ${missingConfig.map(([key]) => `NEXT_PUBLIC_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`).join(', ')}. Please check your .env.local file.`;
  console.error(errorMessage);
  // We throw an error only on the server-side to prevent app from running with bad config.
  if (typeof window === 'undefined') {
    throw new Error(errorMessage);
  }
} else {
    console.log("Firebase config loaded successfully.");
}
// --- END VALIDATION ---

// Initialize Firebase
// This check prevents re-initializing the app on hot reloads in development.
let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (e: any) {
    console.error("Critical Error: Failed to initialize Firebase. This is likely due to an invalid configuration. Please verify your .env.local file against the Firebase console.", e);
  }
} else {
  app = getApp();
}


// Initialize and export Firebase services.
// The app will not function correctly if 'app' is undefined due to an initialization error.
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;

export { app, auth, db, storage };
