
'use client';

/**
 * @fileOverview A mock/in-memory data store for managing AI training candidates.
 * In a real application, this would be backed by a database like Firestore.
 */

import { AiRatingOutput } from "@/ai/flows/ai-rating";

export interface TrainingCandidate {
  id: string;
  status: 'pending_review' | 'approved' | 'rejected';
  createdAt: Date;
  data: AiRatingOutput; // Using AiRatingOutput as an example of what might be trained
}

// --- In-Memory Database ---

// We use a global variable to simulate a persistent store during development.
// This avoids the data being reset on every hot reload.
const globalForStore = globalThis as unknown as {
  trainingCandidates: TrainingCandidate[];
};

if (!globalForStore.trainingCandidates) {
    // Pre-populate with some sample data for demonstration purposes
    globalForStore.trainingCandidates = [
        {
            id: 'candidate-1',
            status: 'pending_review',
            createdAt: new Date(),
            data: {
                riskScore: 25,
                rating: 'Good',
                summary: 'This user has a solid credit history with consistent on-time payments, though their credit utilization is slightly high.',
                positiveFactors: ['Consistent on-time payments for over 24 months.', 'Good mix of credit types (credit card, auto loan).'],
                negativeFactors: ['Credit card utilization is at 65%, which is higher than the recommended 30%.', 'One recent credit inquiry in the last 30 days.'],
                scoreExplanation: 'The score was primarily based on the strong payment history, which carries the most weight. Points were deducted for the high credit utilization, which indicates a reliance on revolving credit.'
            }
        },
        {
            id: 'candidate-2',
            status: 'pending_review',
            createdAt: new Date(),
            data: {
                riskScore: 68,
                rating: 'Poor',
                summary: 'This user presents a high risk due to multiple recent delinquencies and a written-off account. Their debt-to-income ratio is also very high.',
                positiveFactors: ['Has a long credit history of over 10 years.'],
                negativeFactors: ['Has a written-off personal loan from 2 years ago.', 'Shows three 60-day delinquencies in the past 12 months.', 'Credit utilization is at 95% on all credit cards.'],
                scoreExplanation: 'The score is high (indicating high risk) due to severe negative factors, including a written-off account and recent late payments. These significantly outweigh the benefit of a long credit history.'
            }
        }
    ];
}

let candidates: TrainingCandidate[] = globalForStore.trainingCandidates;

// --- Public API ---

/**
 * Retrieves all training candidates from the store.
 * @returns An array of all current training candidates.
 */
export function getTrainingCandidates(): TrainingCandidate[] {
  // Return candidates that haven't been rejected
  return candidates.filter(c => c.status !== 'rejected');
}

/**
 * Marks a training candidate as approved.
 * @param id The ID of the candidate to approve.
 */
export function approveCandidate(id: string): void {
  const candidate = candidates.find(c => c.id === id);
  if (candidate) {
    candidate.status = 'approved';
  }
}

/**
 * Marks a training candidate as rejected, effectively deleting it.
 * @param id The ID of the candidate to reject.
 */
export function rejectCandidate(id: string): void {
  const index = candidates.findIndex(c => c.id === id);
  if (index !== -1) {
    // In this mock, we'll just mark as rejected. 
    // A real implementation might delete or archive the record.
    candidates[index].status = 'rejected';
  }
}

/**
 * Adds a new training candidate to the store for review.
 * In the context of the app, this would be called after a successful AI analysis.
 * @param data The analysis output to be used as training data.
 */
export function addTrainingCandidate(data: AiRatingOutput): void {
  const newCandidate: TrainingCandidate = {
    id: `candidate-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    status: 'pending_review',
    createdAt: new Date(),
    data: data
  };
  candidates.push(newCandidate);
}
