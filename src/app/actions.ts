
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Saves a new credit report analysis summary to Firestore using the Admin SDK.
 * This is a Server Action and runs only on the server.
 * @param analysisResult The full analysis output from the AI.
 * @param cibilScore The CIBIL score extracted from the report.
 * @param userId The ID of the user saving the report.
 * @param pdfDownloadUrl Optional URL to the uploaded PDF in Firebase Storage.
 */
export async function saveReportSummaryAction(
  analysisResult: AnalyzeCreditReportOutput,
  cibilScore: number | null,
  userId: string,
  pdfDownloadUrl?: string,
): Promise<{id: string}> {

  // Prepare the data for Firestore
  const reportSummary = {
    userId: userId,
    name: analysisResult.customerDetails.name,
    pan: analysisResult.customerDetails.pan,
    mobileNumber: analysisResult.customerDetails.mobileNumber,
    cibilScore: cibilScore,
    totalEmi: analysisResult.emiDetails.totalEmi,
    activeLoanCount: analysisResult.emiDetails.activeLoans.length,
    createdAt: FieldValue.serverTimestamp(), // Use server-side timestamp
    pdfDownloadUrl: pdfDownloadUrl || null,
  };

  // Save the document to Firestore
  try {
    const reportsCollection = adminDb.collection('creditReports');
    const docRef = await reportsCollection.add(reportSummary);
    return { id: docRef.id };
  } catch (error) {
    console.error('Firestore save error:', error); // Enhanced logging
    throw new Error('Failed to save report to the database.');
  }
}
