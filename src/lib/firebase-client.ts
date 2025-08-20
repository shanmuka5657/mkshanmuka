
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, RecaptchaVerifier, connectAuthEmulator } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Extend the Window interface to include our reCAPTCHA verifier
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}

const clientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Basic validation to ensure environment variables are loaded
if (!clientConfig.apiKey || !clientConfig.projectId) {
  console.error("Firebase config is missing. Make sure your .env file is set up correctly.");
}


let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (getApps().length) {
  app = getApp();
} else {
  app = initializeApp(clientConfig);
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

// Use auth emulator in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && !auth.emulatorConfig) {
    // Check if window.location.hostname is localhost
    if (window.location.hostname === "localhost") {
        console.log("Connecting to Firebase Auth Emulator");
        connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    }
}


export { app, auth, db, storage };
