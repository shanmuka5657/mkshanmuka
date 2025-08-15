'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';

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

// A helper type for our action responses
type AuthActionResult = {
  idToken?: string;
  error?: string;
};

// --- NEW Server Action for Sign-Up ---
export async function emailSignupAction({ email, password }: { email: string, password: string }): Promise<AuthActionResult> {
  try {
    const userRecord = await adminAuth.createUser({ email, password });
    const customToken = await adminAuth.createCustomToken(userRecord.uid);
    
    // To get an ID token, we need to sign in with the custom token.
    // This requires a client-side SDK or a call to the REST API.
    // The Admin SDK alone cannot generate an ID token directly.
    // We will call the REST API from the server to get the ID token.
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      throw new Error('Firebase API key is not configured. Please set NEXT_PUBLIC_FIREBASE_API_KEY.');
    }
    const restApiUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`;

    const res = await fetch(restApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error.message || 'Failed to exchange custom token for ID token.');
    }

    return { idToken: data.idToken };
  } catch (error: any) {
    // Provide user-friendly error messages
    if (error.code === 'auth/email-already-exists') {
      return { error: 'This email address is already in use by another account.' };
    }
    return { error: error.message || 'An unexpected error occurred during sign-up.' };
  }
}

// --- NEW Server Action for Login ---
export async function emailLoginAction({ email, password }: { email: string, password: string }): Promise<AuthActionResult> {
  try {
    // The Admin SDK cannot verify passwords directly.
    // The standard way to achieve this server-side is to use the Firebase REST API.
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      throw new Error('Firebase API key is not configured. Please set NEXT_PUBLIC_FIREBASE_API_KEY.');
    }
    const restApiUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    
    const res = await fetch(restApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
    });

    const data = await res.json();
    if (!res.ok) {
      // Map Firebase REST API errors to user-friendly messages
      const errorMessage = data.error.message;
      if (errorMessage === 'INVALID_LOGIN_CREDENTIALS') {
        throw new Error('Invalid email or password. Please try again.');
      }
      throw new Error(errorMessage || 'An error occurred during login.');
    }

    return { idToken: data.idToken };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred during login.' };
  }
}
