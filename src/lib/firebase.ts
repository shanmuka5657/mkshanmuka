// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyAeIyY3IH-zAkV8FSmmKyR1b32pCa46fQg",
  authDomain: "creditwise-ai-nd7s0.firebaseapp.com",
  projectId: "creditwise-ai-nd7s0",
  storageBucket: "creditwise-ai-nd7s0.appspot.com",
  messagingSenderId: "492248595221",
  appId: "1:492248595221:web:3fe409487b8848d4a6071c",
  measurementId: "G-8LLWXP1RJP"
};

// Initialize Firebase for client-side using a singleton pattern
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with auth integration
const db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
});

const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Connect to emulators in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && !(auth as any)._isEmulated) {
    // Point to the emulators running on localhost.
    // connectAuthEmulator(auth, 'http://localhost:9099');
    // connectFirestoreEmulator(db, 'localhost', 9150);
    // connectStorageEmulator(storage, 'localhost', 9199);
}


export { app, auth, db, storage, googleProvider };
