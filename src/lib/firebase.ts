
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator, Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator, FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAeIyY3IH-zAkV8FSmmKyR1b32pCa46fQg",
  authDomain: "creditwise-ai-nd7s0.firebaseapp.com",
  projectId: "creditwise-ai-nd7s0",
  storageBucket: "creditwise-ai-nd7s0.appspot.com",
  messagingSenderId: "492248595221",
  appId: "1:492248595221:web:3fe409487b8848d4a6071c",
  measurementId: "G-8LLWXP1RJP"
};

// --- Robust Singleton Pattern for Firebase Initialization ---

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

let firebaseServices: FirebaseServices | null = null;

function getFirebaseServices(): FirebaseServices {
  if (firebaseServices) {
    return firebaseServices;
  }

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  // Connect to emulators in development.
  // This logic will be tree-shaken in production builds.
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // Use a flag on the window object to avoid reconnecting on hot reloads
    if (!(window as any).firebaseEmulatorsConnected) {
      try {
        console.log("Connecting to Firebase emulators...");
        connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
        connectFirestoreEmulator(db, "127.0.0.1", 9150);
        connectStorageEmulator(storage, "127.0.0.1", 9199);
        (window as any).firebaseEmulatorsConnected = true;
        console.log("Firebase emulators connected for local development.");
      } catch (error) {
        console.error("Error connecting to Firebase emulators:", error);
      }
    }
  }

  firebaseServices = { app, auth, db, storage };
  return firebaseServices;
}

const { app, auth, db, storage } = getFirebaseServices();
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider };
