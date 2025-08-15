// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration is read from environment variables
// This is more secure and flexible than hardcoding values.
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCrBPP288-XP7WiC2FH8k6ldEoIY4zU9zw",
  authDomain: "creditwise-ai-nd7s0.firebaseapp.com",
  projectId: "creditwise-ai-nd7s0",
  storageBucket: "creditwise-ai-nd7s0.appspot.com",
  messagingSenderId: "56946356736",
  appId: "1:56946356736:web:2d31294de43a89e9fed1f5",
};

// Initialize Firebase for client-side using a singleton pattern
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();


export { app, auth, db, storage, googleProvider };
