
import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent initialization errors.
if (!admin.apps.length) {
  // The service account key is securely passed as an environment variable.
  // The value is the JSON content, not a file path.
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_ADMIN_SDK_CONFIG as string
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Export the initialized admin instance to be used in other server-side files.
export const firebaseAdmin = admin;
