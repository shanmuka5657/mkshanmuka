
import type { AiRatingOutput } from "@/ai/flows/ai-rating";
import type { FinancialRiskOutput } from "@/ai/flows/financial-risk-assessment";
import type { CreditUnderwritingOutput } from "@/ai/flows/credit-underwriting";

// This is a mock database / store for training candidates.
// In a real application, this would be a database like Firestore.

export type TrainingData = {
    rawCreditReport: string;
    aiRating: AiRatingOutput | null;
    financialRisk: FinancialRiskOutput | null;
    creditUnderwriting: CreditUnderwritingOutput | null;
};

export type TrainingCandidate = {
  id: string;
  timestamp: string;
  status: 'pending_review' | 'approved' | 'rejected';
  data: TrainingData;
};

let candidates: TrainingCandidate[] = [];

// Function to load candidates from localStorage
const loadCandidates = (): TrainingCandidate[] => {
  if (typeof window === 'undefined') return [];
  try {
    const storedCandidates = localStorage.getItem('trainingCandidates');
    return storedCandidates ? JSON.parse(storedCandidates) : [];
  } catch (error) {
    console.error("Failed to load training candidates from localStorage", error);
    return [];
  }
};

// Function to save candidates to localStorage
const saveCandidatesToStorage = (candidatesToSave: TrainingCandidate[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('trainingCandidates', JSON.stringify(candidatesToSave));
  } catch (error) {
    console.error("Failed to save training candidates to localStorage", error);
  }
};


// Initialize candidates from localStorage
candidates = loadCandidates();

export function saveTrainingCandidate(data: TrainingData) {
  const newCandidate: TrainingCandidate = {
    id: `candidate_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    status: 'pending_review',
    data,
  };
  candidates.unshift(newCandidate); // Add to the beginning of the list
  saveCandidatesToStorage(candidates);
}

export function getTrainingCandidates(): TrainingCandidate[] {
  // Return a copy to prevent direct mutation
  return [...candidates];
}

export function approveCandidate(id: string) {
  const candidate = candidates.find(c => c.id === id);
  if (candidate) {
    candidate.status = 'approved';
    saveCandidatesToStorage(candidates);
  }
}

export function rejectCandidate(id: string) {
  candidates = candidates.filter(c => c.id !== id);
  saveCandidatesToStorage(candidates);
}

    