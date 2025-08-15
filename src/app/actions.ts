
'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { auth } from '@/lib/firebase'; // We need this for the client-side API key
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

// --- Server-Side Authentication Actions ---

async function signInWithEmail(email: string, password: string): Promise<string> {
    // This is a workaround to verify the password. We use the client SDK on the server.
    // NOTE: This relies on the server environment allowing outgoing requests to the Firebase Auth REST API.
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return await userCredential.user.getIdToken();
}

export async function emailLoginAction(formData: FormData): Promise<{ idToken: string } | { error: string }> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    try {
        const idToken = await signInWithEmail(email, password);
        return { idToken };
    } catch (error: any) {
        console.error("Server-side login failed:", error.code);
        return { error: error.code || 'An unexpected error occurred.' };
    }
}


export async function emailSignupAction(formData: FormData): Promise<{ idToken: string } | { error: string }> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
        // Step 1: Create the user with the Admin SDK
        const userRecord = await adminAuth.createUser({
            email,
            password,
        });

        // Step 2: Since creating a user doesn't sign them in, we now sign them in to get an ID token.
        const idToken = await signInWithEmail(email, password);
        return { idToken };
    } catch (error: any) {
        console.error("Server-side signup failed:", error.code);
        return { error: error.code || 'An unexpected error occurred.' };
    }
}
