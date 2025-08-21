
import * as admin from 'firebase-admin';

/**
 * Gets or initializes the Firebase Admin app.
 * @returns The initialized Firebase Admin app.
 */
function getAdminApp() {
  if (admin.apps.length) {
    return admin.app();
  }

  // The FIREBASE_ADMIN_SERVICE_ACCOUNT is a JSON string. We need to parse it.
  const serviceAccountString = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;

  if (!serviceAccountString) {
    console.error("Missing Firebase environment variable: FIREBASE_ADMIN_SERVICE_ACCOUNT! Check your .env.local file.");
    throw new Error("Missing Firebase environment variable!");
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountString);

    // Log environment variables for debugging, but not the private key itself
    console.log('Initializing Firebase Admin for project:', serviceAccount.project_id);
    console.log('Using client email:', serviceAccount.client_email);
    
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    console.error('This might be due to a malformed JSON string in the FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable.');
    throw new Error('Failed to initialize Firebase Admin SDK.');
  }
}

const adminApp = getAdminApp();
const adminDb = adminApp.firestore();
const adminAuth = adminApp.auth();

export { adminAuth, adminDb };
