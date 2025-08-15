
'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { auth as clientAuth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

// --- Robust Singleton Pattern for Firebase Admin Initialization ---
let adminApp: App;
if (!getApps().length) {
  adminApp = initializeApp();
} else {
  adminApp = getApps()[0];
}

const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);


/**
 * Handles user login via email and password using a client-side Firebase instance
 * on the server to verify credentials and returns an ID token.
 * This is a Server Action.
 * @param formData The form data containing the user's email and password.
 */
export async function emailLoginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
    const idToken = await userCredential.user.getIdToken();
    return { idToken };
  } catch (error: any) {
    console.error('Server-side login error:', error.code);
    return { error: error.code || 'An unexpected error occurred.' };
  }
}

/**
 * Handles user sign-up via email and password using the Firebase Admin SDK.
 * This is a Server Action.
 * @param formData The form data containing the user's email and password.
 */
export async function emailSignupAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    // Create the user with Firebase Admin SDK
    await adminAuth.createUser({
      email,
      password,
    });
    
    // After creating the user, sign them in to get an ID token
    const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
    const idToken = await userCredential.user.getIdToken();

    return { idToken };
  } catch (error: any) {
    console.error('Server-side signup error:', error.code);
    return { error: error.code || 'An unexpected error occurred.' };
  }
}


/**
 * Saves a new credit report analysis summary to Firestore using the Admin SDK.
 * This is a Server Action and runs only on the server.
 * @param analysisResult The full analysis output from the AI.
 * @param cibilScore The CIBIL score extracted from the report.
 */
export async function saveReportSummaryAction(
  analysisResult: AnalyzeCreditReportOutput,
  cibilScore: number | null
): Promise<void> {
  // 1. Verify user authentication using the session cookie
  const sessionCookie = cookies().get('__session')?.value || '';
  
  if (!sessionCookie) {
      throw new Error('User is not authenticated.');
  }

  let decodedIdToken;
  try {
    // Verify the session cookie. This will also verify if it's expired.
    decodedIdToken = await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
    console.error('Failed to verify session cookie:', error);
    throw new Error('User is not authenticated or session has expired.');
  }

  const userId = decodedIdToken.uid;
  if (!userId) {
    throw new Error('Authentication failed: No user ID found.');
  }

  // 2. Prepare the data for Firestore
  const reportSummary = {
    userId: userId,
    name: analysisResult.customerDetails.name,
    pan: analysisResult.customerDetails.pan,
    mobileNumber: analysisResult.customerDetails.mobileNumber,
    cibilScore: cibilScore,
    totalEmi: analysisResult.emiDetails.totalEmi,
    activeLoanCount: analysisResult.emiDetails.activeLoans.length,
    createdAt: new Date(), // Use a server-side timestamp
  };

  // 3. Save the document to Firestore
  try {
    const reportsCollection = adminDb.collection('creditReports');
    await reportsCollection.add(reportSummary);
  } catch (error) {
    console.error('Error writing to Firestore:', error);
    throw new Error('Failed to save report to the database.');
  }
}
