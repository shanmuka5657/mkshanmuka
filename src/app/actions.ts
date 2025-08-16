'use server';

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';

/**
 * Saves a new credit report analysis summary to Firestore using the Admin SDK.
 * This is a Server Action and runs only on the server.
 * @param idToken The Firebase ID token of the authenticated user.
 * @param analysisResult The full analysis output from the AI.
 * @param cibilScore The CIBIL score extracted from the report.
 */
export async function saveReportSummaryAction(
  idToken: string,
  analysisResult: AnalyzeCreditReportOutput,
  cibilScore: number | null
): Promise<void> {
  if (!idToken) {
    throw new Error('User is not authenticated.');
  }

  let decodedIdToken;
  try {
    // Verify the ID token. This is the secure way to authenticate server-side.
    decodedIdToken = await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    console.error('Failed to verify ID token:', error);
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
