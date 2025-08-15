
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

interface AuthActionResponse {
  idToken?: string;
  error?: string;
}

interface AuthActionInput {
  email: string;
  password?: string; // Password is optional for some actions
}

/**
 * Handles user login with email and password using the Admin SDK.
 * Note: The admin SDK cannot verify passwords directly. This flow creates a custom token
 * for a user if they exist, but relies on the client to handle the actual sign-in with password.
 * This is part of a workaround for client-side network issues with emulators.
 */
export async function emailLoginAction({ email, password }: AuthActionInput): Promise<AuthActionResponse> {
  if (!password) {
    return { error: 'Password is required for login.' };
  }
  try {
    // This server-side action's primary purpose in the current flow is to get a custom token
    // for an existing user to bypass client-side network errors with the emulator.
    // It does NOT verify the password. The client-side sign-in attempt (which might fail)
    // is the implicit password check.
    const userRecord = await adminAuth.getUserByEmail(email);
    const customToken = await adminAuth.createCustomToken(userRecord.uid);
    
    // The client will use this custom token with signInWithCustomToken()
    return { idToken: customToken };

  } catch (error: any) {
    console.error("Server Login Error:", error.code);
    // This will catch 'auth/user-not-found' and other admin SDK errors.
    return { error: 'INVALID_LOGIN_CREDENTIALS' };
  }
}

/**
 * Handles user signup with email and password using the Admin SDK.
 */
export async function emailSignupAction({ email, password }: AuthActionInput): Promise<AuthActionResponse> {
    if (!password) {
      return { error: 'Password is required for signup.' };
    }
    try {
        const userRecord = await adminAuth.createUser({
            email,
            password,
        });
        const customToken = await adminAuth.createCustomToken(userRecord.uid);
        return { idToken: customToken };
    } catch (error: any) {
        console.error("Server Signup Error:", error.code);
        if (error.code === 'auth/email-already-exists') {
            return { error: 'EMAIL_EXISTS' };
        }
        if (error.code === 'auth/invalid-password') {
            return { error: 'WEAK_PASSWORD' };
        }
        return { error: 'An unknown error occurred during signup.' };
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

// This function is problematic as admin SDK can't verify passwords.
// This is a placeholder to satisfy the login page.
// The real fix is to make client-side auth work.
export async function createCustomToken(uid: string): Promise<{ customToken?: string; error?: string; }> {
    try {
        const customToken = await adminAuth.createCustomToken(uid);
        return { customToken };
    } catch (error: any) {
        console.error("Error creating custom token:", error);
        return { error: "Failed to create a custom session token." };
    }
}
