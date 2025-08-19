
import * as admin from 'firebase-admin';

/**
 * Gets or initializes the Firebase Admin app.
 * @returns The initialized Firebase Admin app.
 */
function getAdminApp() {
  if (admin.apps.length) {
    return admin.app();
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    console.error("Missing Firebase environment variables! Check your .env file.");
    // Log which variables are missing for easier debugging
    if (!process.env.FIREBASE_PROJECT_ID) console.error("FIREBASE_PROJECT_ID is not set.");
    if (!process.env.FIREBASE_CLIENT_EMAIL) console.error("FIREBASE_CLIENT_EMAIL is not set.");
    if (!privateKey) console.error("FIREBASE_PRIVATE_KEY is not set.");
    throw new Error("Missing Firebase environment variables!");
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  };

  try {
    // Log environment variables for debugging, but not the private key itself
    console.log('Initializing Firebase Admin for project:', process.env.FIREBASE_PROJECT_ID);
    console.log('Using client email:', process.env.FIREBASE_CLIENT_EMAIL);
    console.log('Firebase PRIVATE_KEY loaded:', !!privateKey);

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    throw new Error('Failed to initialize Firebase Admin SDK.'); // Throw error to indicate initialization failure
  }
}

const adminApp = getAdminApp();
const adminDb = adminApp.firestore();
const adminAuth = adminApp.auth();

export { adminAuth, adminDb };
