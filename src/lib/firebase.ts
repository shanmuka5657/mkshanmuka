
// Import required Firebase services
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// This was provided by you and is now hardcoded to ensure a successful connection.
const firebaseConfig = {
  apiKey: "AIzaSyAeIyY3IH-zAkV8FSmmKyR1b32pCa46fQg",
  authDomain: "creditwise-ai-nd7s0.firebaseapp.com",
  projectId: "creditwise-ai-nd7s0",
  storageBucket: "creditwise-ai-nd7s0.firebasestorage.app",
  messagingSenderId: "492248595221",
  appId: "1:492248595221:web:ba48c35eec8dc524a6071c",
  measurementId: "G-EDD2KZWTYX"
};


// Initialize Firebase
// This check prevents re-initializing the app on hot reloads in development.
let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully with hardcoded config.");
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
