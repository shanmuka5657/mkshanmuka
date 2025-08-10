
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, FieldValue } from 'firebase/firestore';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';

// NOTE: This file no longer uses 'use server'. It's a client-side module.

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
 * Saves a structured summary of a credit analysis to Firestore using the client SDK.
 * @param analysisResult - The detailed output from the credit report analysis flow.
 * @param cibilScore - The CIBIL score extracted from the report.
 * @returns The ID of the newly created document in Firestore.
 */
export async function saveCreditAnalysisSummary(
  analysisResult: AnalyzeCreditReportOutput,
  cibilScore: number | null
): Promise<string> {
  try {
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
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'credit_reports'), reportSummary);
    console.log('Credit report summary saved with ID: ', docRef.id);
    return docRef.id;
  } catch (e: any) {
    console.error('Firestore Write Error:', e);
    throw new Error(`Failed to save analysis summary to the database: ${e.message}`);
  }
}
