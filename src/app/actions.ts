'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import admin from 'firebase-admin';

/**
 * Saves a new credit report analysis to Firestore using the Admin SDK.
 * This now saves the full analysis object and the PDF download URL.
 * This is a Server Action and runs only on the server.
 * @param analysisResult The full analysis output from the AI.
 * @param userId The ID of the user saving the report.
 * @param pdfDownloadUrl Optional URL to the uploaded PDF in Firebase Storage.
 * @returns An object with the new document ID.
 */
export async function saveReportSummaryAction(
  analysisResult: AnalyzeCreditReportOutput,
  userId: string,
  pdfDownloadUrl?: string
): Promise<{ id: string }> {
  if (!analysisResult || !userId) {
    throw new Error('Invalid analysis data or user ID provided.');
  }

  // Prepare the data for Firestore, ensuring all required fields are present
  const reportData = {
    userId: userId,
    name: analysisResult.customerDetails.name || 'N/A',
    pan: analysisResult.customerDetails.pan || 'N/A',
    mobileNumber: analysisResult.customerDetails.mobileNumber || 'N/A',
    cibilScore: analysisResult.cibilScore || 0,
    totalEmi: analysisResult.emiDetails.totalEmi || 0,
    activeLoanCount: analysisResult.emiDetails.activeLoans.length || 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(), // Use server-side timestamp from the Admin SDK
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
