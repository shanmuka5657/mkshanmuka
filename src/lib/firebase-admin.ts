
import { cert, getApps, initializeApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;

// This is a safety check to ensure that the service account JSON is valid
// before attempting to parse it. It also handles the case where the environment
// variable might not be set during certain build steps.
let serviceAccount;
if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT);
    } catch (e) {
        console.error('Error parsing FIREBASE_ADMIN_SERVICE_ACCOUNT JSON:', e);
    }
} else {
    console.warn('FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set.');
}

if (!getApps().length) {
    // Only initialize if a service account is available
    if (serviceAccount) {
        adminApp = initializeApp({
            credential: cert(serviceAccount),
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        });
    } else {
        // Fallback initialization if no service account is found.
        // This might be useful in environments where Application Default Credentials are used.
        adminApp = initializeApp();
    }
} else {
    adminApp = getApps()[0];
}

adminAuth = getAuth(adminApp);
adminDb = getFirestore(adminApp);

export { adminAuth, adminDb };
