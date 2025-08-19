
import { db } from '@/lib/firebase-client';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';

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
 * Fetches all credit report summaries for a specific user.
 * This function is intended for CLIENT-SIDE use.
 * @param userId The UID of the user whose reports to fetch.
 * @returns A promise that resolves to an array of the user's credit report summaries.
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
 * Fetches the most recent credit report summaries across all users.
 * This function is intended for CLIENT-SIDE use for a general dashboard.
 * @returns A promise that resolves to an array of recent credit report summaries.
 */
export async function getRecentReports(): Promise<CreditReportSummary[]> {
  const reportsCollection = collection(db, 'creditReports');
  const q = query(reportsCollection, orderBy('createdAt', 'desc'), limit(50));
  const querySnapshot = await getDocs(q);

  const reports: CreditReportSummary[] = [];
  querySnapshot.forEach((doc) => {
    reports.push({ id: doc.id, ...doc.data() } as CreditReportSummary);
  });

  return reports;
}
