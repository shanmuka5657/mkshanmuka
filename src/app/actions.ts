
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Saves a new credit report analysis to Firestore using the Admin SDK.
 * This now saves the full analysis object and the PDF download URL.
 * This is a Server Action and runs only on the server.
 * @param analysisResult The full analysis output from the AI.
 * @param userId The ID of the user saving the report.
 * @param pdfDownloadUrl Optional URL to the uploaded PDF in Firebase Storage.
 */
export async function saveReportSummaryAction(
  analysisResult: AnalyzeCreditReportOutput,
  userId: string,
  pdfDownloadUrl?: string,
): Promise<{id: string}> {

  // Prepare the data for Firestore, now including the full analysis result
  const reportData = {
    userId: userId, // This line was missing and is the cause of the issue
    name: analysisResult.customerDetails.name,
    pan: analysisResult.customerDetails.pan,
    mobileNumber: analysisResult.customerDetails.mobileNumber,
    cibilScore: analysisResult.cibilScore,
    totalEmi: analysisResult.emiDetails.totalEmi,
    activeLoanCount: analysisResult.emiDetails.activeLoans.length,
    createdAt: FieldValue.serverTimestamp(), // Use server-side timestamp
    fullAnalysis: analysisResult, // Store the entire analysis object
    pdfDownloadUrl: pdfDownloadUrl || null,
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
