
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, FirebaseStorage, connectStorageEmulator } from "firebase/storage";

const clientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

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

// In a development environment, connect to the emulators
if (process.env.NODE_ENV === 'development') {
    // It's important to check if the emulators are already running to avoid errors.
    // The connect*Emulator functions throw an error if called more than once.
    // A common pattern is to use a flag or check a property on the service object.
    // For simplicity, we'll assume they're not connected yet on initial load.
    // In a real app, you might add more robust checks.
    try {
        connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
        connectFirestoreEmulator(db, '127.0.0.1', 9150);
        connectStorageEmulator(storage, '127.0.0.1', 9199);
        console.log("Connected to Firebase emulators");
    } catch (error) {
        // This catch block will handle cases where the emulators are already connected,
        // preventing the app from crashing on hot reloads.
        console.warn("Firebase emulators already connected or connection failed:", error);
    }
}

export { app, auth, db, storage };
