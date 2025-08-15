
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator, FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAeIyY3IH-zAkV8FSmmKyR1b32pCa46fQg",
  authDomain: "creditwise-ai-nd7s0.firebaseapp.com",
  projectId: "creditwise-ai-nd7s0",
  storageBucket: "creditwise-ai-nd7s0.appspot.com",
  messagingSenderId: "492248595221",
  appId: "1:492248595221:web:e4cd8882c947d66aa6071c",
  measurementId: "G-097G54H5P7"
};


// --- Robust Singleton Pattern for Firebase Initialization ---
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (getApps().length) {
  app = getApp();
} else {
  app = initializeApp(firebaseConfig);
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

// Connect to emulators in development.
// The `if (typeof window !== 'undefined')` check is crucial for Next.js to
// avoid trying to connect on the server-side, which would throw an error.
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Use a flag on the window object to avoid reconnecting on hot reloads
  if (!(window as any).firebaseEmulatorsConnected) {
      try {
          console.log("Connecting to Firebase client-side emulators...");
          // Use 127.0.0.1 instead of localhost to avoid potential DNS resolution issues in some environments
          connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
          connectFirestoreEmulator(db, "127.0.0.1", 9150);
          connectStorageEmulator(storage, "127.0.0.1", 9199);
          (window as any).firebaseEmulatorsConnected = true;
          console.log("Firebase client-side emulators connected.");
      } catch (error) {
          console.error("Error connecting to client-side emulators:", error);
      }
  }
}

export { app, auth, db, storage };
