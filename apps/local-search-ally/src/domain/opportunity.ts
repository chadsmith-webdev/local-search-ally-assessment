import { z } from "zod/v4";

export const estimateEvidenceLevelSchema = z.enum(["verified", "estimated", "potential-exposure"]);
export const inputVerificationSchema = z.enum(["verified", "self-reported", "inferred", "unavailable"]);
export const estimateConfidenceSchema = z.enum(["low", "moderate", "high"]);
export const opportunityInputUnitSchema = z.enum(["calls", "rate", "currency", "count"]);

export const opportunityInputSchema = z.object({
  value: z.number().nonnegative().optional(),
  lowValue: z.number().nonnegative().optional(),
  highValue: z.number().nonnegative().optional(),
  unit: opportunityInputUnitSchema,
  verification: inputVerificationSchema,
  sourceLabel: z.string().min(1).optional(),
  originalValue: z.number().nonnegative().optional(),
});

export const opportunityRangeSchema = z.object({
  low: z.number().nonnegative(),
  high: z.number().nonnegative(),
});

export const opportunityEstimateSchema = z.object({
  evidenceLevel: estimateEvidenceLevelSchema,
  missedCalls: opportunityRangeSchema,
  missedJobs: opportunityRangeSchema,
  monthlyRevenueOpportunity: opportunityRangeSchema,
  inputs: z.object({
    monthlyQualifiedLeads: opportunityInputSchema,
    opportunityLossRate: opportunityInputSchema,
    bookingRate: opportunityInputSchema,
    averageJobValue: opportunityInputSchema,
  }),
  confidence: estimateConfidenceSchema,
  explanation: z.string().min(1),
  limitations: z.array(z.string().min(1)),
});

export type EstimateEvidenceLevel = z.infer<typeof estimateEvidenceLevelSchema>;
export type InputVerification = z.infer<typeof inputVerificationSchema>;
export type EstimateConfidence = z.infer<typeof estimateConfidenceSchema>;
export type OpportunityInput = z.infer<typeof opportunityInputSchema>;
export type OpportunityEstimate = z.infer<typeof opportunityEstimateSchema>;
export type OpportunityRange = z.infer<typeof opportunityRangeSchema>;

export interface OpportunityEstimateInputs {
  monthlyQualifiedLeads: OpportunityInput;
  opportunityLossRate: OpportunityInput;
  bookingRate: OpportunityInput;
  averageJobValue: OpportunityInput;
}

function valueRange(input: OpportunityInput) {
  const low = input.lowValue ?? input.value;
  const high = input.highValue ?? input.value;

  if (low === undefined || high === undefined) return null;
  return {
    low: Math.min(low, high),
    high: Math.max(low, high),
  };
}

function roundRange(range: OpportunityRange) {
  return {
    low: Math.round(range.low),
    high: Math.round(range.high),
  };
}

export function classifyEvidenceLevel(inputs: OpportunityEstimateInputs): EstimateEvidenceLevel {
  const verifications = Object.values(inputs).map((input) => input.verification);
  if (verifications.every((verification) => verification === "verified")) return "verified";
  if (verifications.some((verification) => verification === "unavailable" || verification === "inferred")) {
    return "potential-exposure";
  }
  return "estimated";
}

export function classifyConfidence(inputs: OpportunityEstimateInputs): EstimateConfidence {
  const verifications = Object.values(inputs).map((input) => input.verification);
  if (verifications.every((verification) => verification === "verified")) return "high";
  if (verifications.some((verification) => verification === "inferred" || verification === "unavailable")) return "low";
  if (verifications.filter((verification) => verification === "self-reported").length >= 3) return "moderate";
  return "low";
}

export function calculateOpportunityEstimate(inputs: OpportunityEstimateInputs): OpportunityEstimate {
  const leadRange = valueRange(inputs.monthlyQualifiedLeads);
  const lossRange = valueRange(inputs.opportunityLossRate);
  const bookingRange = valueRange(inputs.bookingRate);
  const jobValueRange = valueRange(inputs.averageJobValue);
  const limitations: string[] = [];

  if (!leadRange) limitations.push("Qualified monthly lead volume is missing.");
  if (!lossRange) limitations.push("Opportunity-loss rate is missing.");
  if (!bookingRange) limitations.push("Call-to-booking rate is missing.");
  if (!jobValueRange) limitations.push("Average job value is missing.");

  if (!leadRange || !lossRange || !bookingRange || !jobValueRange) {
    return {
      evidenceLevel: "potential-exposure",
      missedCalls: { low: 0, high: 0 },
      missedJobs: { low: 0, high: 0 },
      monthlyRevenueOpportunity: { low: 0, high: 0 },
      inputs,
      confidence: "low",
      explanation: "There is not enough business data to calculate a reliable monthly opportunity estimate.",
      limitations,
    };
  }

  const missedCalls = roundRange({
    low: leadRange.low * lossRange.low,
    high: leadRange.high * lossRange.high,
  });
  const missedJobs = roundRange({
    low: missedCalls.low * bookingRange.low,
    high: missedCalls.high * bookingRange.high,
  });
  const monthlyRevenueOpportunity = roundRange({
    low: missedJobs.low * jobValueRange.low,
    high: missedJobs.high * jobValueRange.high,
  });

  return {
    evidenceLevel: classifyEvidenceLevel(inputs),
    missedCalls,
    missedJobs,
    monthlyRevenueOpportunity,
    inputs,
    confidence: classifyConfidence(inputs),
    explanation:
      "This estimate translates the supplied lead, booking, and job-value inputs into a monthly opportunity range.",
    limitations,
  };
}
