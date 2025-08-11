// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAeiyY3IH-zAkV8fSmmKyR1b32pCa46fQg",
  authDomain: "creditwise-ai-nd7s0.firebaseapp.com",
  projectId: "creditwise-ai-nd7s0",
  storageBucket: "creditwise-ai-nd7s0.appspot.com",
  messagingSenderId: "492248595221",
  appId: "1:492248595221:web:e4cd8882c947d66aa6071c",
  measurementId: "G-097GS4H5P7"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
