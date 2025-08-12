
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import dotenv from 'dotenv';

// Your web app's Firebase configuration is injected by the build process
const firebaseConfig: FirebaseOptions = {
  "projectId": "creditwise-ai-nd7s0",
  "appId": "1:492248595221:web:ba48c35eec8dc524a6071c",
  "storageBucket": "creditwise-ai-nd7s0.appspot.com",
  "apiKey": "AIzaSyAeIyY3IH-zAkV8FSmmKyR1b32pCa46fQg",
  "authDomain": "creditwise-ai-nd7s0.firebaseapp.com",
  "messagingSenderId": "492248595221"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider };
