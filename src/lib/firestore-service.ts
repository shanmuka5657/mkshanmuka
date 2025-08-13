
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, FieldValue, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { AnalyzeCreditReportOutput } from '@/ai/flows/credit-report-analysis';
import type { AiRatingOutput } from '@/ai/flows/ai-rating';

// NOTE: This file no longer uses 'use server'. It's a client-side module.

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

export type TrainingCandidateData = {
    creditReportAnalysis: AnalyzeCreditReportOutput;
    aiRating: AiRatingOutput;
    // Add other analyses here as they are created
};

/**
 * Saves a training candidate to Firestore for later review.
 * This is intended to be called after a successful analysis.
 * @param data - The data payload for the training candidate.
 * @returns The ID of the newly created document.
 */
export async function saveTrainingCandidate(data: TrainingCandidateData): Promise<string> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error("User is not authenticated. Cannot save training candidate.");
  }
  if (!db) {
    throw new Error("Firestore is not initialized.");
  }

  const candidateData = {
    userId: user.uid,
    status: 'pending_review', // Default status for new candidates
    createdAt: serverTimestamp(),
    ...data,
  };

  const docRef = await addDoc(collection(db, 'training_candidates'), candidateData);
  console.log('Training candidate saved with ID: ', docRef.id);
  return docRef.id;
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
        acc.status &&
        !acc.status.toLowerCase().includes('closed') && 
        !acc.status.toLowerCase().includes('written-off') && 
        !acc.status.toLowerCase().includes('settled')
    ).length;

    const reportData = {
      // User and Personal Info
      userId: user.uid,
      name: customerDetails.name,
      pan: customerDetails.pan,
      mobileNumber: customerDetails.mobileNumber,

      // Scores & Core Metrics
      cibilScore: cibilScore,
      totalEmi: emiDetails.totalEmi,
      
      // Loan Counts
      activeLoanCount: activeLoans,

      // Timestamps
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'credit_reports'), reportData);
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
  // The query for an index on userId and createdAt was failing.
  // We will query only by userId and sort the results on the client.
  const q = query(reportsCol, where("userId", "==", uid));

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
