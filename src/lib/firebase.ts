
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Your web app's Firebase configuration is read from environment variables
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase for client-side using a singleton pattern
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Connect to emulators in development if the flag is set
if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
    try {
        // Ensure we don't connect to emulators multiple times.
        // @ts-ignore - _isInitialized is a private property but useful here to prevent re-connecting.
        if (!auth.emulatorConfig) {
            connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
            console.log("Connected to Auth Emulator");
        }
        // @ts-ignore
        if (!db.INTERNAL.settings.host.includes('127.0.0.1')) {
            connectFirestoreEmulator(db, "127.0.0.1", 8080);
            console.log("Connected to Firestore Emulator");
        }
        // @ts-ignore
        if (!storage.emulator) {
            connectStorageEmulator(storage, "127.0.0.1", 9199);
            console.log("Connected to Storage Emulator");
        }
    } catch (error) {
        console.error("Error connecting to Firebase emulators:", error);
    }
}


export { app, auth, db, storage, googleProvider };
