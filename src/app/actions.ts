
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

// Helper function to map Firebase error codes to user-friendly messages
const mapFirebaseError = (errorCode: string): string => {
    switch (errorCode) {
        case 'EMAIL_EXISTS':
            return 'This email address is already in use by another account.';
        case 'OPERATION_NOT_ALLOWED':
            return 'Password sign-in is not enabled for this project.';
        case 'TOO_MANY_ATTEMPTS_TRY_LATER':
            return 'We have blocked all requests from this device due to unusual activity. Try again later.';
        case 'EMAIL_NOT_FOUND':
        case 'INVALID_PASSWORD':
        case 'INVALID_LOGIN_CREDENTIALS':
            return 'Invalid email or password. Please try again.';
        case 'INVALID_ID_TOKEN':
            return 'The user\'s credential is no longer valid. The user must sign in again.';
        case 'USER_DISABLED':
            return 'This account has been disabled by an administrator.';
        default:
            return 'An unexpected authentication error occurred. Please try again.';
    }
};


async function getFirebaseIdToken(endpoint: string, body: object): Promise<{ idToken?: string; error?: string }> {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
        return { error: 'Firebase API key is not configured on the server.' };
    }

    const url = `${endpoint}?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, returnSecureToken: true }),
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.error?.message || 'UNKNOWN_ERROR';
            return { error: mapFirebaseError(errorMessage) };
        }

        return { idToken: data.idToken };
    } catch (networkError) {
        console.error('Network error during Firebase auth:', networkError);
        return { error: 'A network error occurred. Please check your connection and try again.' };
    }
}


export async function emailSignupAction({ email, password }: Record<string, string>): Promise<{ idToken?: string, error?: string }> {
    const SIGNUP_ENDPOINT = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp';
    return getFirebaseIdToken(SIGNUP_ENDPOINT, { email, password });
}


export async function emailLoginAction({ email, password }: Record<string, string>): Promise<{ idToken?: string, error?: string }> {
    const SIGNIN_ENDPOINT = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
    return getFirebaseIdToken(SIGNIN_ENDPOINT, { email, password });
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
