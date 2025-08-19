
import { db } from '@/lib/firebase-client';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
  doc,
  getDoc,
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
  fullAnalysis?: AnalyzeCreditReportOutput; // The full analysis is now optional here
}

/**
 * Fetches all credit report summaries for a specific user.
 * This function is intended for CLIENT-SIDE use.
 * @param userId The UID of the user whose reports to fetch.
 * @returns A promise that resolves to an array of the user's credit report summaries.
 */
export async function getReportsForUser(userId: string): Promise<CreditReportSummary[]> {
  const reportsCollection = collection(db, 'creditReports');
  const q = query(
    reportsCollection, 
    where('userId', '==', userId), 
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);

  const reports: CreditReportSummary[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    // We can exclude the large 'fullAnalysis' field from this list view if needed for performance
    // but for now, we'll keep it simple.
    reports.push({ id: doc.id, ...data } as CreditReportSummary);
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

/**
 * Fetches a single credit report by its document ID.
 * @param reportId The ID of the document to fetch from Firestore.
 * @returns A promise that resolves to the full credit report summary object, or null if not found.
 */
export async function getReportById(reportId: string): Promise<CreditReportSummary | null> {
    const reportDocRef = doc(db, 'creditReports', reportId);
    const docSnap = await getDoc(reportDocRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as CreditReportSummary;
    } else {
        console.log("No such document!");
        return null;
    }
}
