import { z } from "zod/v4";

export const opportunityInputKeySchema = z.enum([
  "monthlyQualifiedLeads",
  "opportunityLossRate",
  "bookingRate",
  "averageJobValue",
]);
export const estimateEvidenceLevelSchema = z.enum(["verified", "estimated", "potential-exposure", "incomplete"]);
export const inputVerificationSchema = z.enum(["verified", "self-reported", "inferred", "unavailable"]);
export const estimateConfidenceSchema = z.enum(["low", "moderate", "high"]);
export const opportunityInputUnitSchema = z.enum(["count", "percent", "currency"]);

export const opportunityInputSchema = z.object({
  key: opportunityInputKeySchema,
  label: z.string().min(1),
  value: z.number().nonnegative().nullable().optional(),
  lowValue: z.number().nonnegative().nullable().optional(),
  highValue: z.number().nonnegative().nullable().optional(),
  unit: opportunityInputUnitSchema,
  verification: inputVerificationSchema,
  sourceLabel: z.string().min(1).nullable().optional(),
  explanation: z.string().min(1).nullable().optional(),
  editable: z.boolean(),
});

export const opportunityRangeSchema = z.object({
  low: z.number().nonnegative(),
  high: z.number().nonnegative(),
});

export const revenueOpportunityRangeSchema = opportunityRangeSchema.extend({
  currency: z.literal("USD"),
});

export const opportunityEstimateSchema = z.object({
  evidenceLevel: estimateEvidenceLevelSchema,
  missedCalls: opportunityRangeSchema.optional(),
  missedJobs: opportunityRangeSchema.optional(),
  monthlyRevenueOpportunity: revenueOpportunityRangeSchema.optional(),
  inputs: z.array(opportunityInputSchema).length(4),
  confidence: estimateConfidenceSchema,
  calculationSteps: z.array(z.string().min(1)),
  explanation: z.string().min(1),
  limitations: z.array(z.string().min(1)),
});

export type OpportunityInputKey = z.infer<typeof opportunityInputKeySchema>;
export type EstimateEvidenceLevel = z.infer<typeof estimateEvidenceLevelSchema>;
export type InputVerification = z.infer<typeof inputVerificationSchema>;
export type EstimateConfidence = z.infer<typeof estimateConfidenceSchema>;
export type OpportunityInput = z.infer<typeof opportunityInputSchema>;
export type OpportunityEstimate = z.infer<typeof opportunityEstimateSchema>;
export type OpportunityRange = z.infer<typeof opportunityRangeSchema>;
export type RevenueOpportunityRange = z.infer<typeof revenueOpportunityRangeSchema>;

export interface OpportunityEstimateInputs {
  monthlyQualifiedLeads: OpportunityInput;
  opportunityLossRate: OpportunityInput;
  bookingRate: OpportunityInput;
  averageJobValue: OpportunityInput;
}

function valueRange(input: OpportunityInput) {
  const low = input.lowValue ?? input.value;
  const high = input.highValue ?? input.value;

  if (low === undefined || high === undefined || low === null || high === null) return null;
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

function orderedInputs(inputs: OpportunityEstimateInputs) {
  return [
    inputs.monthlyQualifiedLeads,
    inputs.opportunityLossRate,
    inputs.bookingRate,
    inputs.averageJobValue,
  ];
}

export function formatOpportunityRange(
  range: OpportunityRange | RevenueOpportunityRange | undefined,
  unit: "count" | "percent" | "currency" = "count",
) {
  if (!range) return "Unavailable";
  const formatter =
    unit === "currency"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "currency" in range ? range.currency : "USD",
          maximumFractionDigits: 0,
        })
      : new Intl.NumberFormat("en-US", {
          style: "decimal",
          maximumFractionDigits: unit === "percent" ? 0 : 1,
        });
  const low = unit === "percent" ? range.low * 100 : range.low;
  const high = unit === "percent" ? range.high * 100 : range.high;
  const suffix = unit === "percent" ? "%" : "";

  if (low === high) return `${formatter.format(low)}${suffix}`;
  return `${formatter.format(low)}${suffix}–${formatter.format(high)}${suffix}`;
}

export function formatOpportunityInputValue(input: OpportunityInput) {
  const range = valueRange(input);
  if (!range) return "Unavailable";
  return formatOpportunityRange(range, input.unit);
}

function calculationSteps({
  missedCalls,
  missedJobs,
  monthlyRevenueOpportunity,
  inputs,
}: {
  missedCalls: OpportunityRange;
  missedJobs: OpportunityRange;
  monthlyRevenueOpportunity: RevenueOpportunityRange;
  inputs: OpportunityEstimateInputs;
}) {
  return [
    `${formatOpportunityInputValue(inputs.monthlyQualifiedLeads)} qualified monthly opportunities`,
    `× ${formatOpportunityInputValue(inputs.opportunityLossRate)} opportunity-loss rate`,
    `= ${formatOpportunityRange(missedCalls)} estimated missed calls`,
    `${formatOpportunityRange(missedCalls)} estimated missed calls`,
    `× ${formatOpportunityInputValue(inputs.bookingRate)} booking rate`,
    `= ${formatOpportunityRange(missedJobs)} estimated missed jobs`,
    `${formatOpportunityRange(missedJobs)} estimated missed jobs`,
    `× ${formatOpportunityInputValue(inputs.averageJobValue)} average job value`,
    `= ${formatOpportunityRange(monthlyRevenueOpportunity, "currency")} estimated monthly revenue opportunity`,
  ];
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
      evidenceLevel: "incomplete",
      inputs: orderedInputs(inputs),
      confidence: "low",
      calculationSteps: [],
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
  const monthlyRevenueOpportunity = {
    ...roundRange({
      low: missedJobs.low * jobValueRange.low,
      high: missedJobs.high * jobValueRange.high,
    }),
    currency: "USD" as const,
  };

  return {
    evidenceLevel: classifyEvidenceLevel(inputs),
    missedCalls,
    missedJobs,
    monthlyRevenueOpportunity,
    inputs: orderedInputs(inputs),
    confidence: classifyConfidence(inputs),
    calculationSteps: calculationSteps({
      missedCalls,
      missedJobs,
      monthlyRevenueOpportunity,
      inputs,
    }),
    explanation:
      "This estimate translates the supplied lead, booking, and job-value inputs into a monthly opportunity range.",
    limitations,
  };
}
