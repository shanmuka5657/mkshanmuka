
'use server';

/**
 * @fileOverview An AI agent that provides a technical risk assessment based on a credit report.
 * It performs a single, comprehensive analysis on the provided customized data.
 * All critical financial metrics (PD, LGD, EAD, EL) are calculated deterministically in code
 * to ensure consistency and reliability. The AI's role is to provide qualitative analysis
 * and explanations based on these pre-calculated metrics.
 *
 * - getRiskAssessment - A function that returns a detailed risk assessment.
 * - RiskAssessmentInput - The input type for the getRiskAssessment function.
 * - RiskAssessmentOutput - The return type for the getRiskAssessment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { AnalyzeCreditReportOutput, AccountDetail } from './credit-report-analysis';

// Helper to get the correct EMI value, prioritizing manual edits
const getEmiValue = (acc: AccountDetail | any): number => {
    if (acc.manualEmi !== undefined && acc.manualEmi !== null) {
        return acc.manualEmi;
    }
    const emiString = String(acc.emi ?? '0');
    const parsedEmi = Number(emiString.replace(/[^0-9.]+/g, ""));
    return isNaN(parsedEmi) ? 0 : parsedEmi;
};


const RiskAssessmentInputSchema = z.object({
  analysisResult: z
    .any()
    .describe('The full, structured analysis from the initial credit report parsing flow, potentially with user edits.'),
});
export type RiskAssessmentInput = {
    analysisResult: AnalyzeCreditReportOutput;
};

// The main output schema now contains a single, unified assessment
const RiskAssessmentOutputSchema = z.object({
  riskScore: z.number().min(0).max(100).describe('A technical risk score from 0 to 100, where 100 is the HIGHEST risk.'),
  riskLevel: z
    .enum(['Low', 'Medium', 'High', 'Very High'])
    .describe(
      'A single-word risk level (Low, Medium, High, or Very High).'
    ),
  riskFactors: z
    .array(z.object({
        factor: z.string().describe('A title for the risk factor (e.g., "Payment History", "High Debt Burden").'),
        severity: z.enum(['Low', 'Medium', 'High']).describe('The severity of the factor.'),
        details: z.string().describe('A one-sentence explanation of the factor, citing specific data from the report.'),
    }))
    .describe('A list of the top 3-4 key risk factors identified in the report.'),
  suggestedMitigations: z
    .array(z.object({
        factor: z.string().describe('The risk factor this mitigation addresses (must match a title from the factors list).'),
        action: z.string().describe('A one-sentence, actionable suggestion to mitigate the specific risk.')
    }))
    .describe('A list of suggested actions to mitigate the identified risks. Each action must correspond to a listed risk factor.'),
  probabilityOfDefault: z.number().describe('The estimated probability of the user defaulting on a new loan in the next 24 months, as a percentage (0-100).'),
  defaultProbabilityExplanation: z.string().describe('A detailed, multi-sentence explanation of the factors that contributed to the probability of default calculation, citing specific data points like DPD history or high utilization.'),
  riskScoreExplanation: z.string().describe("A detailed, multi-sentence explanation of how the final risk score was determined, referencing the key factors and the weight given to each (e.g., 'The high risk score of 75 is primarily driven by the recent 90-day delinquency on the personal loan, which is the most heavily weighted factor...')."),
  exposureAtDefault: z.number().describe('The estimated total outstanding balance across all accounts if the user were to default, in INR.'),
  eadExplanation: z.string().describe("A one-sentence explanation stating that EAD is the sum of outstanding balances for all active, considered accounts."),
  lossGivenDefault: z.number().describe('The estimated percentage of the Exposure at Default that would be lost if the user defaults (0-100).'),
  lgdExplanation: z.string().describe("A detailed, multi-sentence explanation for the LGD percentage, referencing the mix of secured vs. unsecured debt in the considered accounts."),
  expectedLoss: z.number().describe('The final calculated Expected Loss (PD * LGD * EAD) in INR.'),
  elExplanation: z.string().describe("A one-sentence explanation stating that EL is calculated by multiplying PD, EAD, and LGD, and what the final number represents."),
  usage: z.object({
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
      totalTokens: z.number().optional(),
  }).optional().describe("Token usage for the generation call."),
});
export type RiskAssessmentOutput = z.infer<typeof RiskAssessmentOutputSchema>;


export async function getRiskAssessment(
  input: RiskAssessmentInput
): Promise<RiskAssessmentOutput> {
  return riskAssessmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'riskAssessmentPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: z.object({
      analysisResult: z.any(),
      preCalculatedPd: z.number(),
      preCalculatedLgd: z.number(),
      preCalculatedEad: z.number(),
  })},
  output: {schema: z.object({
      riskScore: RiskAssessmentOutputSchema.shape.riskScore,
      riskLevel: RiskAssessmentOutputSchema.shape.riskLevel,
      riskFactors: RiskAssessmentOutputSchema.shape.riskFactors,
      suggestedMitigations: RiskAssessmentOutputSchema.shape.suggestedMitigations,
      riskScoreExplanation: RiskAssessmentOutputSchema.shape.riskScoreExplanation,
      defaultProbabilityExplanation: RiskAssessmentOutputSchema.shape.defaultProbabilityExplanation,
      eadExplanation: RiskAssessmentOutputSchema.shape.eadExplanation,
      lgdExplanation: RiskAssessmentOutputSchema.shape.lgdExplanation,
      elExplanation: RiskAssessmentOutputSchema.shape.elExplanation,
  })},
  prompt: `You are an expert credit risk analyst. Your task is to provide a qualitative analysis based on pre-calculated financial metrics and a user-customized, pre-filtered set of credit data. Do NOT perform any calculations yourself. The calculations have been done for you based on the user's explicit choices.

**CRITICAL INSTRUCTIONS:**
1.  **ANALYZE ONLY:** Your ONLY job is to analyze the provided data and generate the qualitative outputs: risk score, risk factors, mitigations, and explanations.
2.  **USE PRE-CALCULATED DATA:** You MUST use the provided metrics as the absolute source of truth for your explanations.
    *   **Probability of Default (PD):** {{{preCalculatedPd}}}%
    *   **Loss Given Default (LGD):** {{{preCalculatedLgd}}}%
    *   **Exposure at Default (EAD):** ₹{{{preCalculatedEad}}}

**User-Customized & Pre-Filtered Credit Report Data (Source of Truth):**
This data represents ONLY the accounts the user has chosen to include in the analysis. Your entire analysis must be based SOLELY on this provided information.
\`\`\`json
{{{json analysisResult}}}
\`\`\`

**Your Task:**

1.  **Risk Score & Level:** Based on the provided data (especially the PD) and the severity of items in the credit report (delinquencies, write-offs), generate a 'riskScore' (0-100, 100 is HIGHEST risk) and a corresponding 'riskLevel'. A high PD should result in a high risk score.
2.  **Risk Factors & Mitigations:** Identify the top 3-4 'riskFactors' from the JSON data that justify the high PD and risk score. For each factor, provide an actionable 'suggestedMitigations'.
3.  **Generate Explanations (CRITICAL):**
    *   **riskScoreExplanation:** Explain *why* you assigned the risk score, linking it directly to the risk factors and the pre-calculated PD.
    *   **defaultProbabilityExplanation:** Explain *why* the pre-calculated PD of {{{preCalculatedPd}}}% is appropriate, citing specific evidence from the credit data (e.g., "The PD is high due to a 90-day delinquency...").
    *   **eadExplanation:** Provide a simple, one-sentence explanation for EAD.
    *   **lgdExplanation:** Explain *why* the LGD of {{{preCalculatedLgd}}}% is appropriate by analyzing the mix of secured vs. unsecured debt in the provided data.
    *   **elExplanation:** Provide a simple, one-sentence explanation for what Expected Loss represents.

Generate the final, structured output. Do NOT include fields for financial metrics (PD, LGD, EAD, EL) in your direct output; they will be added in code.
`,
});

const riskAssessmentFlow = ai.defineFlow(
  {
    name: 'riskAssessmentFlow',
    inputSchema: z.object({ analysisResult: z.any() }), // Keep public input simple
    outputSchema: RiskAssessmentOutputSchema,
  },
  async (input: RiskAssessmentInput) => {
    
    // =================================================================
    // STEP 1: Perform deterministic calculations based on USER EDITS.
    // =================================================================
    
    // CRITICAL: Filter to only include accounts the user has explicitly marked as "isConsidered".
    // Fallback to true if isConsidered is not defined (for original report analysis)
    const consideredAccounts = input.analysisResult.allAccounts.filter(acc => (acc as any).isConsidered !== false);
    
    // --- EAD Calculation ---
    const calculatedEad = consideredAccounts.reduce((sum, acc) => {
        const status = acc.status.toLowerCase();
        if (status === 'active' || status === 'open') {
             const outstandingNum = Number(String(acc.outstanding).replace(/[^0-9.-]+/g,""));
             return sum + (isNaN(outstandingNum) ? 0 : outstandingNum);
        }
        return sum;
    }, 0);

    // --- PD Calculation (Rules-Based) ---
    let calculatedPd = 5; // Base PD
    consideredAccounts.forEach(acc => {
        if (acc.status.toLowerCase().includes('written-off') || acc.status.toLowerCase().includes('settled')) {
            calculatedPd += 30;
        }
        (acc.monthlyPaymentHistory || []).slice(0, 12).forEach(pmt => {
            const dpd = parseInt(String(pmt.status).replace('STD', '0'), 10);
            if (!isNaN(dpd)) {
                if (dpd >= 90) calculatedPd += 20;
                else if (dpd >= 60) calculatedPd += 10;
                else if (dpd >= 30) calculatedPd += 5;
            }
        });
    });
    const creditUtilization = parseFloat(input.analysisResult.reportSummary.accountSummary.creditUtilization);
    if (!isNaN(creditUtilization) && creditUtilization > 80) {
        calculatedPd += 10;
    }
    calculatedPd = Math.min(calculatedPd, 95); // Cap PD at 95%

    // --- LGD Calculation (Rules-Based) ---
    const unsecuredTypes = ['credit card', 'personal loan', 'consumer loan'];
    const { totalUnsecured, totalSecured } = consideredAccounts.reduce((acc, loan) => {
        const outstanding = Number(String(loan.outstanding).replace(/[^0-9.-]+/g,""));
        if (unsecuredTypes.some(type => loan.type.toLowerCase().includes(type))) {
            acc.totalUnsecured += outstanding;
        } else {
            acc.totalSecured += outstanding;
        }
        return acc;
    }, { totalUnsecured: 0, totalSecured: 0 });

    const totalOutstanding = totalSecured + totalUnsecured;
    let calculatedLgd = 0;
    if (totalOutstanding > 0) {
        // Assume 90% LGD for unsecured, 35% for secured
        const weightedLgd = (totalUnsecured * 0.90) + (totalSecured * 0.35);
        calculatedLgd = (weightedLgd / totalOutstanding) * 100;
    }
    calculatedLgd = Math.round(calculatedLgd);
    
    // =================================================================
    // STEP 2: Call the AI with pre-calculated data for analysis.
    // =================================================================
    
    // Create a lean analysis object containing only the considered accounts for the AI
    const customizedAnalysisForAI = {
        ...input.analysisResult,
        allAccounts: consideredAccounts, // Pass only the filtered accounts
    };

    const {output, usage} = await prompt({
        analysisResult: customizedAnalysisForAI,
        preCalculatedEad: calculatedEad,
        preCalculatedPd: calculatedPd,
        preCalculatedLgd: calculatedLgd,
    });

    if (!output) {
      throw new Error("AI failed to provide a risk assessment.");
    }
    
    // =================================================================
    // STEP 3: Combine coded calculations and AI analysis.
    // =================================================================
    const pd = calculatedPd / 100;
    const lgd = calculatedLgd / 100;
    const ead = calculatedEad;
    const calculatedEl = Math.round(pd * lgd * ead);

    // Construct the full output object
    const finalOutput: RiskAssessmentOutput = {
        ...output,
        probabilityOfDefault: calculatedPd,
        lossGivenDefault: calculatedLgd,
        exposureAtDefault: ead,
        expectedLoss: calculatedEl,
        usage: usage,
    };
    
    return finalOutput;
  }
);
