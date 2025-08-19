
import * as admin from 'firebase-admin';

/**
 * Gets or initializes the Firebase Admin app.
 * @returns The initialized Firebase Admin app.
 */
function getAdminApp() {
  if (admin.apps.length) {
    return admin.app();
  } else {
    // Ensure the private key is formatted correctly.
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    try {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      };
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error) {
      console.error('Firebase admin initialization error:', error);
      throw new Error('Failed to initialize Firebase Admin SDK.'); // Throw error to indicate initialization failure
    }
  }
}

const adminApp = getAdminApp();
const adminDb = adminApp.firestore();
const adminAuth = adminApp.auth();

export { adminAuth, adminDb };
