
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

// This function now safely handles server-side execution.
const loadCandidates = (): TrainingCandidate[] => {
  if (typeof window === 'undefined') {
    return []; // Return empty array if not in a browser
  }
  try {
    const storedCandidates = localStorage.getItem('trainingCandidates');
    return storedCandidates ? JSON.parse(storedCandidates) : [];
  } catch (error) {
    console.error("Failed to load training candidates from localStorage", error);
    return [];
  }
};

let candidates: TrainingCandidate[] = loadCandidates();

// Function to save candidates to localStorage
const saveCandidatesToStorage = (candidatesToSave: TrainingCandidate[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('trainingCandidates', JSON.stringify(candidatesToSave));
  } catch (error) {
    console.error("Failed to save training candidates to localStorage", error);
  }
};

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
  // We need to re-load from storage here to ensure we have the latest version.
  candidates = loadCandidates();
  return [...candidates];
}

export function approveCandidate(id: string) {
  const currentCandidates = loadCandidates();
  const candidate = currentCandidates.find(c => c.id === id);
  if (candidate) {
    candidate.status = 'approved';
    saveCandidatesToStorage(currentCandidates);
    candidates = currentCandidates;
  }
}

export function rejectCandidate(id: string) {
  let currentCandidates = loadCandidates();
  currentCandidates = currentCandidates.filter(c => c.id !== id);
  saveCandidatesToStorage(currentCandidates);
  candidates = currentCandidates;
}
