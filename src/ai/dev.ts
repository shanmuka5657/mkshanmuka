
import { config } from 'dotenv';
config();

import '@/ai/flows/credit-report-analysis.ts'; // MODIFIED - Now the primary analysis flow
import '@/ai/flows/ai-rating.ts';
import '@/ai/flows/loan-eligibility.ts';
// import '@/ai/flows/credit-underwriting.ts'; // Removed
import '@/ai/flows/financial-risk-assessment.ts';
import '@/ai/flows/risk-assessment.ts';
import '@/ai/flows/bank-statement-analysis.ts';
import '@/ai/flows/salary-slip-analysis.ts';
import '@/ai/flows/cross-verification.ts';
import '@/ai/flows/verify-pdf.ts';
import '@/ai/flows/calculate-total-emi.ts';
