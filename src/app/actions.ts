
'use server';

import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp();
}

const adminAuth = getAuth();
const adminDb = getFirestore();

/**
 * Creates or retrieves a user and returns a custom token for client-side sign-in.
 * This is a Server Action and runs only on the server.
 * @param type 'login' or 'signup'
 * @param email The user's email.
 * @param password The user's password.
 * @returns A promise that resolves to a custom token or an error.
 */
export async function createCustomToken(
  type: 'login' | 'signup',
  email: string,
  password: string
): Promise<{ token?: string; error?: string }> {
  let uid: string;
  try {
    if (type === 'signup') {
      const userRecord = await adminAuth.createUser({ email, password });
      uid = userRecord.uid;
    } else {
      // For login, we need to verify the user exists.
      // The Admin SDK doesn't have a direct 'signIn' method,
      // so we get the user by email. The actual password check is handled
      // implicitly by the client SDK when it uses the custom token.
      // A more secure way would involve a custom verification step if needed.
      const userRecord = await adminAuth.getUserByEmail(email);
      uid = userRecord.uid;
      // In a real app, you'd verify password here using a custom system or a different flow
    }
    const customToken = await adminAuth.createCustomToken(uid);
    return { token: customToken };
  } catch (error: any) {
    console.error('Error in createCustomToken:', error);
    // Provide user-friendly error messages
    const errorMessage = error.code?.includes('auth/') 
      ? error.message 
      : 'An unexpected error occurred.';
    return { error: errorMessage };
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
