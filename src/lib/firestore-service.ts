
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, FieldValue, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';

// NOTE: This file no longer uses 'use server'. It's a client-side module.

export interface CreditReportSummary {
  id: string;
  userId: string;
  name: string;
  pan: string;
  cibilScore: number | null;
  totalEmi: number;
  activeLoanCount: number;
  closedLoanCount: number;
  dpdSummary: ReturnType<typeof calculateDpdSummary>;
  createdAt: Timestamp;
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
 * Saves a structured summary of a credit analysis to Firestore using the client SDK.
 * This now includes the logged-in user's UID.
 * @param analysisResult - The detailed output from the credit report analysis flow.
 * @param cibilScore - The CIBIL score extracted from the report.
 * @returns The ID of the newly created document in Firestore.
 */
export async function saveCreditAnalysisSummary(
  analysisResult: AnalyzeCreditReportOutput,
  cibilScore: number | null
): Promise<string> {
  try {
    const user = auth?.currentUser;
    if (!user) {
        throw new Error("User is not authenticated. Cannot save report.");
    }
    if (!db) {
      throw new Error("Firestore is not initialized. Check Firebase config.");
    }
    
    const { customerDetails, allAccounts, emiDetails } = analysisResult;

    const activeLoans = allAccounts.filter(acc => 
        !acc.status.toLowerCase().includes('closed') && 
        !acc.status.toLowerCase().includes('written-off') && 
        !acc.status.toLowerCase().includes('settled')
    ).length;

    const closedLoans = allAccounts.length - activeLoans;
    const dpdSummary = calculateDpdSummary(allAccounts);

    const reportSummary = {
      // User and Personal Info
      userId: user.uid,
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

/**
 * Fetches all credit report summaries for a specific user.
 * @param uid The user's UID.
 * @returns A promise that resolves to an array of report summaries.
 */
export async function getReportsForUser(uid: string): Promise<CreditReportSummary[]> {
  if (!db) {
    throw new Error("Firestore is not initialized.");
  }

  const reportsCol = collection(db, 'credit_reports');
  const q = query(reportsCol, where("userId", "==", uid), orderBy("createdAt", "desc"));

  const querySnapshot = await getDocs(q);
  const reports: CreditReportSummary[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    // Basic type check to ensure createdAt is a Firestore Timestamp
    if (data.createdAt && typeof data.createdAt.seconds === 'number') {
       reports.push({ id: doc.id, ...data } as CreditReportSummary);
    } else {
        console.warn(`Document ${doc.id} is missing or has an invalid createdAt field.`);
    }
  });

  return reports;
}
