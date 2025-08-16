
import { db } from '@/lib/firebase-client';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

// This is the shape of the summary data we store in Firestore.
export interface CreditReportSummary {
  id: string;
  userId?: string; // userId is now optional
  name: string;
  pan: string;
  mobileNumber: string;
  cibilScore: number | null;
  totalEmi: number;
  activeLoanCount: number;
  createdAt: Timestamp;
}

/**
 * Fetches all credit report summaries.
 * This function is intended for CLIENT-SIDE use.
 * Since auth is removed, it fetches all reports.
 * @returns A promise that resolves to an array of credit report summaries.
 */
export async function getAllReports(): Promise<CreditReportSummary[]> {
  const reportsCollection = collection(db, 'creditReports');
  const q = query(reportsCollection);
  const querySnapshot = await getDocs(q);

  const reports: CreditReportSummary[] = [];
  querySnapshot.forEach((doc) => {
    reports.push({ id: doc.id, ...doc.data() } as CreditReportSummary);
  });

  return reports;
}
