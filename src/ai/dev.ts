
import { config } from 'dotenv';
config();

import '@/ai/flows/credit-report-analysis.ts'; // MODIFIED - Now the primary analysis flow
import '@/ai/flows/ai-rating.ts';
import '@/ai/flows/loan-eligibility.ts';
import '@/ai/flows/credit-underwriting.ts';
import '@/ai/flows/financial-risk-assessment.ts';
import '@/ai/flows/shan-ai-chat.ts';
import '@/ai/flows/calculate-total-emi.ts';
import '@/ai/flows/report-summary.ts';
import '@/ai/flows/credit-summary.ts';
import '@/ai/flows/customer-details.ts';

