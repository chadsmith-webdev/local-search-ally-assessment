import { createParser, type ParseResult } from "@openuidev/react-lang";
import { assessmentLibrary } from "./library";

export interface OpenUIValidationResult {
  ok: boolean;
  result: ParseResult;
  errors: string[];
  counts: Record<string, number>;
}

const parser = createParser(assessmentLibrary.toJSONSchema());

export function validateOpenUIResponse(response: string): OpenUIValidationResult {
  const result = parser.parse(response);
  const counts = countComponents(response);
  const errors = [
    ...((result.meta?.errors ?? []).map((error) => `${error.code}: ${error.message}`)),
    ...validateRootAndCounts(response, counts),
  ];

  return {
    ok: Boolean(result.root) && errors.length === 0,
    result,
    errors,
    counts,
  };
}

export function countComponents(response: string) {
  const names = [
    "AssessmentResults",
    "AssessmentHeader",
    "OpportunityGapHero",
    "MissedCallsMetric",
    "MissedJobsMetric",
    "EstimateConfidence",
    "CalculationBreakdown",
    "AssumptionList",
    "IncompleteOpportunityState",
    "OverallScore",
    "CategoryScore",
    "CategoryScoreGrid",
    "SupportingFinding",
    "PriorityAction",
    "QuickWin",
    "NextBestStep",
    "LowTicketOfferCTA",
    "PrimaryDiagnosis",
  ];

  return Object.fromEntries(
    names.map((name) => {
      const matches = response.match(new RegExp(`=\\s*${name}\\(`, "g"));
      return [name, matches?.length ?? 0];
    }),
  );
}

export function validateRootAndCounts(response: string, counts = countComponents(response)) {
  const errors: string[] = [];
  if (!response.trim().startsWith("root = AssessmentResults(")) {
    errors.push("Response must start with root = AssessmentResults(...).");
  }
  if (counts.AssessmentHeader !== 1) errors.push("Response must use exactly one AssessmentHeader.");
  if (counts.OpportunityGapHero > 1) errors.push("Response must use no more than one OpportunityGapHero.");
  if (counts.MissedCallsMetric > 1) errors.push("Response must use no more than one MissedCallsMetric.");
  if (counts.MissedJobsMetric > 1) errors.push("Response must use no more than one MissedJobsMetric.");
  if (counts.EstimateConfidence !== 1) errors.push("Response must use exactly one EstimateConfidence.");
  if (counts.CalculationBreakdown > 1) errors.push("Response must use no more than one CalculationBreakdown.");
  if (counts.AssumptionList !== 1) errors.push("Response must use exactly one AssumptionList.");
  if (counts.IncompleteOpportunityState > 1) errors.push("Response must use no more than one IncompleteOpportunityState.");
  if (counts.OverallScore > 0) errors.push("Response must not use OverallScore.");
  if (counts.CategoryScore > 0) errors.push("Response must not use CategoryScore.");
  if (counts.CategoryScoreGrid > 0) errors.push("Response must not use CategoryScoreGrid.");
  if (counts.SupportingFinding > 5) errors.push("Response must use no more than five SupportingFinding components.");
  if (counts.PriorityAction > 3) errors.push("Response must use no more than three PriorityAction components.");
  if (counts.QuickWin > 5) errors.push("Response must use no more than five QuickWin components.");
  if (counts.NextBestStep > 1) errors.push("Response must use no more than one NextBestStep.");
  if (counts.LowTicketOfferCTA > 1) errors.push("Response must use no more than one LowTicketOfferCTA.");
  return errors;
}

export function attemptOpenUICorrection(response: string) {
  let corrected = response.trim();
  corrected = corrected.replace(/^```(?:openui|text)?\s*/i, "").replace(/```$/i, "").trim();

  if (!corrected.startsWith("root =") && corrected.includes("AssessmentResults(")) {
    const firstAssessment = corrected.indexOf("AssessmentResults(");
    corrected = `root = ${corrected.slice(firstAssessment)}`;
  }

  return corrected;
}
