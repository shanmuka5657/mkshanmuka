import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';

// This is the shape of the summary data we store in Firestore.
export interface CreditReportSummary {
  id: string;
  userId: string;
  name: string;
  pan: string;
  mobileNumber: string;
  cibilScore: number | null;
  totalEmi: number;
  activeLoanCount: number;
  createdAt: Timestamp;
}

/**
 * Fetches all credit report summaries for a given user.
 * @param userId The ID of the user whose reports to fetch.
 * @returns A promise that resolves to an array of credit report summaries.
 */
export async function getReportsForUser(userId: string): Promise<CreditReportSummary[]> {
  const reportsCollection = collection(db, 'creditReports');
  const q = query(reportsCollection, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  const reports: CreditReportSummary[] = [];
  querySnapshot.forEach((doc) => {
    reports.push({ id: doc.id, ...doc.data() } as CreditReportSummary);
  });

  return reports;
}

/**
 * Saves a new credit report analysis summary to Firestore.
 * @param userId The ID of the user who owns the report.
 * @param analysisResult The full analysis output from the AI.
 * @param cibilScore The CIBIL score extracted from the report.
 * @returns A promise that resolves when the report is saved.
 */
export async function saveReportForUser(
  userId: string,
  analysisResult: AnalyzeCreditReportOutput,
  cibilScore: number | null
): Promise<void> {
  const reportsCollection = collection(db, 'creditReports');

  const reportSummary: Omit<CreditReportSummary, 'id' | 'createdAt'> & { createdAt: any } = {
    userId: userId,
    name: analysisResult.customerDetails.name,
    pan: analysisResult.customerDetails.pan,
    mobileNumber: analysisResult.customerDetails.mobileNumber,
    cibilScore: cibilScore,
    totalEmi: analysisResult.emiDetails.totalEmi,
    activeLoanCount: analysisResult.emiDetails.activeLoans.length,
    createdAt: serverTimestamp(),
  };

  await addDoc(reportsCollection, reportSummary);
}
