import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
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
 * This function is intended for CLIENT-SIDE use.
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
