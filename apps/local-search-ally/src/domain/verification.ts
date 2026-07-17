import type { Verification } from "./assessment";
import type { CollectedAssessmentData } from "./data-collection";

export function verificationForSignal(score: number, data: CollectedAssessmentData): Verification {
  if (data.missingSignals.length >= 2 && score < 50) return "unverified";
  if (data.missingSignals.length > 0) return "partially-verified";
  return "verified";
}

export function isAssessmentComplete(data: CollectedAssessmentData): boolean {
  return data.missingSignals.length <= 1;
}
