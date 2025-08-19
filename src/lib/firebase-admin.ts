
import { cert, getApps, initializeApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;

// Prefer individual env variables for security
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!getApps().length) {
    if (projectId && clientEmail && privateKey) {
        adminApp = initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey,
            }),
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        });
    } else {
        console.warn('Firebase Admin SDK credentials not fully set in environment variables. Falling back to default init.');
        // Fallback for environments like Google Cloud Run with default credentials
        adminApp = initializeApp();
    }
} else {
    adminApp = getApps()[0];
}

adminAuth = getAuth(adminApp);
adminDb = getFirestore(adminApp);

export { adminAuth, adminDb };
