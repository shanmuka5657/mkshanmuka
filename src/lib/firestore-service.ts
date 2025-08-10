
'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';

// This function now initializes the Admin SDK within the function scope
// to ensure it only runs when called and has access to environment variables.
function getAdminDb() {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID, // Use server-side variable
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  // Check if credentials are provided
  if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
    console.error("Firebase Admin credentials are not set in environment variables.");
    throw new Error('Firebase Admin credentials are not set in environment variables.');
  }

  // Ensure Firebase Admin is initialized
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount)
    });
  }
  return getFirestore();
}


/**
 * Calculates DPD (Days Past Due) statistics from account payment histories.
 * @param accounts - Array of account details from the analysis.
 * @returns An object with counts for different DPD buckets.
 */
function calculateDpdSummary(accounts: AnalyzeCreditReportOutput['allAccounts']) {
    const dpd = { onTime: 0, late30: 0, late60: 0, late90: 0, late90Plus: 0, default: 0 };
    if (!accounts) return dpd;

    for (const acc of accounts) {
        if (acc.paymentHistory && acc.paymentHistory !== 'NA') {
            const paymentMonths = acc.paymentHistory.split('|');
            for (const monthStatus of paymentMonths) {
                const s = monthStatus.trim().toUpperCase();
                if (s === 'STD' || s === '000' || s === 'XXX') {
                    dpd.onTime++;
                } else if (s === 'SUB' || s === 'DBT' || s === 'LSS') {
                    dpd.default++;
                } else {
                    const daysLate = parseInt(s, 10);
                    if (!isNaN(daysLate)) {
                        if (daysLate >= 1 && daysLate <= 30) dpd.late30++;
                        else if (daysLate >= 31 && daysLate <= 60) dpd.late60++;
                        else if (daysLate >= 61 && daysLate <= 90) dpd.late90++;
                        else if (daysLate > 90) dpd.late90Plus++;
                    }
                }
            }
        }
    }
    return dpd;
}

/**
 * Saves a structured summary of a credit analysis to Firestore.
 * @param analysisResult - The detailed output from the credit report analysis flow.
 * @param cibilScore - The CIBIL score extracted from the report.
 * @returns The ID of the newly created document in Firestore.
 */
export async function saveCreditAnalysisSummary(
  analysisResult: AnalyzeCreditReportOutput,
  cibilScore: number | null
): Promise<string> {
  
  try {
    const db = getAdminDb(); // Get initialized DB instance
    const { customerDetails, allAccounts, emiDetails } = analysisResult;

    const activeLoans = allAccounts.filter(acc => 
        !acc.status.toLowerCase().includes('closed') && 
        !acc.status.toLowerCase().includes('written-off') && 
        !acc.status.toLowerCase().includes('settled')
    ).length;

    const closedLoans = allAccounts.length - activeLoans;
    const dpdSummary = calculateDpdSummary(allAccounts);

    const reportSummary = {
      // Personal Info
      name: customerDetails.name,
      phoneNumber: customerDetails.mobileNumber,
      pan: customerDetails.pan,
      address: customerDetails.address,

      // Scores & Core Metrics
      cibilScore: cibilScore,
      totalEmi: emiDetails.totalEmi,
      
      // Loan Counts
      activeLoanCount: activeLoans,
      closedLoanCount: closedLoans,

      // DPD Summary
      dpdSummary: dpdSummary,

      // Timestamps
      createdAt: new Date(), // Using a client-side date for server action
    };

    const docRef = await db.collection('credit_reports').add(reportSummary);
    console.log('Credit report summary saved with ID: ', docRef.id);
    return docRef.id;
  } catch (e: any) {
    console.error('Error adding document to Firestore with Admin SDK: ', e);
    // Re-throw with a more user-friendly message
    if (e.message.includes('credentials')) {
        throw new Error('Server configuration error: Firebase Admin credentials are not set correctly. Please check your environment variables.');
    }
    throw new Error(`Failed to save analysis summary to the database: ${e.message}`);
  }
}
