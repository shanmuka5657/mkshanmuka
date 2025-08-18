
import { cert, getApps, initializeApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;

let serviceAccount;
if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT);
        // This is the crucial fix: replace escaped newlines in the private key.
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
    } catch (e) {
        console.warn('Could not parse FIREBASE_ADMIN_SERVICE_ACCOUNT, falling back to default init.');
        serviceAccount = undefined;
    }
}

if (!getApps().length) {
    if (serviceAccount) {
        adminApp = initializeApp({
            credential: cert(serviceAccount),
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        });
    } else {
        // Fallback for environments where service account is not set
        // This is the default for many cloud environments
        adminApp = initializeApp();
    }
} else {
    adminApp = getApps()[0];
}

adminAuth = getAuth(adminApp);
adminDb = getFirestore(adminApp);

export { adminAuth, adminDb };
