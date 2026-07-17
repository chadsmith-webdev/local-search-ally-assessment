import type { AssessmentInput } from "./assessment";

export interface CollectedAssessmentData {
  profileCompleteness: number;
  reviewDepth: number;
  localPageQuality: number;
  citationConsistency: number;
  conversionReadiness: number;
  trackingConfidence: number;
  verifiedSignals: string[];
  missingSignals: string[];
}

export function collectAssessmentData(input: AssessmentInput): CollectedAssessmentData {
  const hasWebsite = Boolean(input.websiteUrl);
  const hasProfile = Boolean(input.googleBusinessProfileUrl);
  const hasStrongInputs = hasWebsite && hasProfile && (input.monthlyLeadGoal ?? 0) >= 100;

  return {
    profileCompleteness: hasStrongInputs ? 92 : hasProfile ? 78 : 38,
    reviewDepth: hasStrongInputs ? 91 : hasProfile ? 64 : 42,
    localPageQuality: hasStrongInputs ? 86 : hasWebsite ? 72 : 34,
    citationConsistency: hasStrongInputs ? 84 : hasWebsite && hasProfile ? 68 : 46,
    conversionReadiness: hasStrongInputs ? 89 : hasWebsite ? 58 : 32,
    trackingConfidence: hasStrongInputs ? 78 : input.monthlyLeadGoal ? 62 : 36,
    verifiedSignals: [
      `${input.businessName} trade and market supplied`,
      hasWebsite ? "Website URL supplied" : "",
      hasProfile ? "Google Business Profile URL supplied" : "",
    ].filter(Boolean),
    missingSignals: [
      hasWebsite ? "" : "Website URL not supplied",
      hasProfile ? "" : "Google Business Profile URL not supplied",
      input.monthlyLeadGoal ? "" : "Monthly lead goal not supplied",
    ].filter(Boolean),
  };
}
