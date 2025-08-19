
import * as admin from 'firebase-admin';

// Ensure the private key is formatted correctly.
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// Check if the app is already initialized to prevent errors.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminAuth, adminDb };
