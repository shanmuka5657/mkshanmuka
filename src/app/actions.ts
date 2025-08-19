
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Saves a new credit report analysis to Firestore using the Admin SDK.
 * This now saves the full analysis object.
 * This is a Server Action and runs only on the server.
 * @param analysisResult The full analysis output from the AI.
 * @param cibilScore The CIBIL score extracted from the report.
 * @param userId The ID of the user saving the report.
 */
export async function saveReportSummaryAction(
  analysisResult: AnalyzeCreditReportOutput,
  cibilScore: number | null,
  userId: string,
): Promise<{id: string}> {

  // Prepare the data for Firestore, now including the full analysis result
  const reportData = {
    userId: userId,
    name: analysisResult.customerDetails.name,
    pan: analysisResult.customerDetails.pan,
    mobileNumber: analysisResult.customerDetails.mobileNumber,
    cibilScore: cibilScore,
    totalEmi: analysisResult.emiDetails.totalEmi,
    activeLoanCount: analysisResult.emiDetails.activeLoans.length,
    createdAt: FieldValue.serverTimestamp(), // Use server-side timestamp
    fullAnalysis: analysisResult, // Store the entire analysis object
  };

  // Save the document to Firestore
  try {
    const reportsCollection = adminDb.collection('creditReports');
    const docRef = await reportsCollection.add(reportData);
    return { id: docRef.id };
  } catch (error) {
    console.error('Firestore save error:', error); // Enhanced logging
    throw new Error('Failed to save report to the database.');
  }
}
