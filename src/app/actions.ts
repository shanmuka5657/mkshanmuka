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
  console.log("SERVER ACTION: Called with userId:", userId);
  if (!analysisResult || !userId) {
    console.error("SERVER ACTION ERROR: Invalid analysis data or user ID provided.");
    throw new Error('Invalid analysis data or user ID provided.');
  }

  // Prepare the data for Firestore, ensuring all required fields are present
  const reportData = {
    userId: userId,
    name: analysisResult.customerDetails.name || 'N/A',
    pan: analysisResult.customerDetails.pan?.[0] || 'N/A', // Save primary PAN
    mobileNumber: analysisResult.customerDetails.mobileNumber?.[0] || 'N/A', // Save primary mobile
    cibilScore: analysisResult.cibilScore || 0,
    totalEmi: analysisResult.emiDetails.totalEmi || 0,
    activeLoanCount: analysisResult.emiDetails.activeLoans.length || 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(), // Use server-side timestamp from the Admin SDK
    fullAnalysis: analysisResult, // Store the entire analysis object
    pdfDownloadUrl: pdfDownloadUrl || null,
  };
  console.log("SERVER ACTION: Prepared data for Firestore:", { ...reportData, fullAnalysis: "OMITTED FOR BREVITY" });


  // Save the document to Firestore
  try {
    const reportsCollection = adminDb.collection('creditReports');
    const docRef = await reportsCollection.add(reportData);
    console.log("SERVER ACTION: Report saved to DB successfully with ID:", docRef.id);
    return { id: docRef.id };
  } catch (error) {
    console.error('SERVER ACTION Firestore save error:', error); // Enhanced logging
    throw new Error('Failed to save report to the database.');
  }
}


/**
 * Updates an existing credit report in Firestore with new analysis data.
 * @param reportId The ID of the document to update.
 * @param updatedAnalysis The new, full analysis object to save.
 * @returns An object indicating success.
 */
export async function updateReportAction(
  reportId: string,
  updatedAnalysis: AnalyzeCreditReportOutput
): Promise<{ success: boolean }> {
  console.log("SERVER ACTION: Updating report ID:", reportId);
  if (!reportId || !updatedAnalysis) {
    console.error("SERVER ACTION ERROR: Invalid report ID or analysis data provided.");
    throw new Error('Invalid report ID or analysis data provided.');
  }

  const reportRef = adminDb.collection('creditReports').doc(reportId);

  try {
    // Update the fullAnalysis field and a timestamp for when it was last updated
    await reportRef.update({
      fullAnalysis: updatedAnalysis,
      lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("SERVER ACTION: Report updated successfully.");
    return { success: true };
  } catch (error) {
    console.error('SERVER ACTION Firestore update error:', error);
    throw new Error('Failed to update report in the database.');
  }
}
