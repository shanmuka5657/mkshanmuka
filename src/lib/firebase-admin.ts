
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
    } catch (e) {
        
        serviceAccount = undefined;
    }
} else {
    
}

if (!getApps().length) {
    if (serviceAccount) {
        adminApp = initializeApp({
            credential: cert(serviceAccount),
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        });
    } else {
        // Fallback for environments where service account is not set
        // This may still cause issues if no other auth method is available
        adminApp = initializeApp();
    }
} else {
    adminApp = getApps()[0];
}

adminAuth = getAuth(adminApp);
adminDb = getFirestore(adminApp);

export { adminAuth, adminDb };
