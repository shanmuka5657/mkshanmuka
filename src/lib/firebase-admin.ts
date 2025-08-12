
import admin from 'firebase-admin';

// This is a server-only module.

/**
 * Initializes the Firebase Admin SDK.
 * It ensures that the app is only initialized once.
 */
export function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // When deployed to Firebase/Google Cloud, the SDK automatically finds the credentials.
  // For local development, you need to set the GOOGLE_APPLICATION_CREDENTIALS
  // environment variable to point to your service account key file.
  const credential = admin.credential.applicationDefault();

  return admin.initializeApp({
    credential,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}
