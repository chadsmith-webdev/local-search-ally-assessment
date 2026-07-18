import type { AssessmentInput, AssessmentResult, CategoryScoreData, Rating } from "./assessment";
import { collectAssessmentData } from "./data-collection";
import { getOfferRecommendation } from "./offers";
import { isAssessmentComplete, verificationForSignal } from "./verification";

function ratingFor(score: number): Rating {
  if (score >= 86) return "excellent";
  if (score >= 72) return "good";
  if (score >= 55) return "fair";
  if (score >= 35) return "weak";
  return "missing";
}

function category(id: string, label: string, score: number, summary: string, evidence: string, data: ReturnType<typeof collectAssessmentData>): CategoryScoreData {
  return {
    id,
    label,
    score,
    rating: ratingFor(score),
    summary,
    evidence,
    verification: verificationForSignal(score, data),
  };
}

export function scoreAssessment(input: AssessmentInput): AssessmentResult {
  const data = collectAssessmentData(input);
  const complete = isAssessmentComplete(data);
  const strongPerformance = complete && (input.monthlyLeadGoal ?? 0) >= 100;
  const primaryDiagnosisCategory = complete ? (strongPerformance ? "recent-proof" : "trust") : null;
  const supportingDiagnosisCategories = complete
    ? strongPerformance
      ? (["reviews", "project-proof"] as const)
      : (["reviews", "recent-proof", "project-proof"] as const)
    : [];
  const recommendedOfferSlug = primaryDiagnosisCategory
    ? getOfferRecommendation({
        primaryDiagnosisCategory,
        supportingDiagnosisCategories: [...supportingDiagnosisCategories],
      })?.slug ?? null
    : null;
  const categories = [
    category(
      "gbp",
      "Google profile",
      data.profileCompleteness,
      "The profile appears usable, but the most persuasive service and trust signals need tightening.",
      data.verifiedSignals.includes("Google Business Profile URL supplied")
        ? "A Google Business Profile URL was supplied for review."
        : "No Google Business Profile URL was supplied.",
      data,
    ),
    category(
      "reviews",
      "Review trust",
      data.reviewDepth,
      "Review depth can support trust, but recent proof and response quality remain important.",
      "The review signal is scored from the available profile completeness proxy.",
      data,
    ),
    category(
      "local-pages",
      "Local pages",
      data.localPageQuality,
      "The site needs clearer market-specific proof before it can consistently support booked jobs.",
      data.verifiedSignals.includes("Website URL supplied") ? "A website URL was supplied." : "No website URL was supplied.",
      data,
    ),
    category(
      "citations",
      "Citation consistency",
      data.citationConsistency,
      "Core business details should be made consistent across the contractor's visible footprint.",
      "Citation confidence is limited to the supplied business and profile signals.",
      data,
    ),
    category(
      "conversion",
      "Call readiness",
      data.conversionReadiness,
      "Homeowners need a faster path from trust to contact, especially on mobile visits.",
      "Conversion readiness uses the supplied site presence and assessment inputs.",
      data,
    ),
    category(
      "tracking",
      "Tracking confidence",
      data.trackingConfidence,
      "Lead goals and attribution need enough structure to separate visibility from booked-job impact.",
      input.monthlyLeadGoal ? "A monthly lead goal was supplied." : "No monthly lead goal was supplied.",
      data,
    ),
  ];

  const overallScore = complete
    ? Math.round(categories.reduce((total, item) => total + item.score, 0) / categories.length)
    : null;

  return {
    id: `assessment-${input.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    businessName: input.businessName,
    trade: input.trade,
    market: input.market,
    generatedAt: new Date("2026-07-17T12:00:00.000Z").toISOString(),
    status: complete ? "complete" : "incomplete",
    dataLimitations: data.missingSignals,
    overallScore,
    headline: strongPerformance
      ? `${input.businessName} is performing well, with the next opportunity in tracking and proof refreshes.`
      : complete
      ? `${input.businessName} has a workable local-search base, but call readiness is the clearest constraint.`
      : `${input.businessName} needs more source data before a complete assessment can be trusted.`,
    primaryDiagnosis: strongPerformance
      ? "The main opportunity is not a visibility rebuild. It is preserving trust momentum while improving attribution enough to see which local actions support booked jobs."
      : complete
      ? "The main opportunity is turning existing visibility into clearer homeowner confidence. The business has enough presence to be found, but the evidence trail from profile to local page to call action is uneven."
      : null,
    primaryDiagnosisCategory,
    supportingDiagnosisCategories: [...supportingDiagnosisCategories],
    strengthSummary: strongPerformance
      ? "The supplied profile, website, and lead-goal signals support a confident assessment and a narrower improvement plan."
      : complete
      ? "The business has enough supplied signals to form a practical improvement plan, with profile and site presence already available for verification."
      : null,
    lostCallRisk: strongPerformance
      ? "Some homeowners may still compare options if recent proof is not refreshed as the market changes."
      : complete
      ? "Some homeowners may continue comparing competitors if service proof, review recency, and contact paths are not obvious at the decision point."
      : null,
    categories,
    supportingFindings: strongPerformance
      ? [
          {
            title: "Measurement is the next leverage point",
            evidence: "The visibility foundation is strong enough that attribution can become more useful than broad profile cleanup.",
            whyItMatters: "Better attribution helps protect budget and effort from low-impact work.",
            severity: "low",
            verification: "verified",
          },
        ]
      : complete
      ? [
          {
            title: "Profile proof is present but not decisive",
            evidence: "The supplied profile signal supports discovery, but stronger service proof would make the profile more persuasive.",
            whyItMatters: "Contractors often lose calls when homeowners cannot quickly confirm fit, trust, and service area.",
            severity: "moderate",
            verification: "partially-verified",
          },
          {
            title: "Local landing proof needs sharper context",
            evidence: "The supplied website signal is present, but market-specific evidence should be easier to scan.",
            whyItMatters: "Clear local proof can reduce comparison shopping and make the next call feel lower risk.",
            severity: "high",
            verification: "partially-verified",
          },
        ]
      : [],
    priorityActions: strongPerformance
      ? [
          {
            priority: "first",
            title: "Improve booked-job attribution",
            rationale: "The business should know which local actions influence valuable calls.",
            outcome: "Clearer attribution can protect high-performing channels and reduce wasted effort.",
            effort: "medium",
          },
        ]
      : complete
      ? [
          {
            priority: "first",
            title: "Tighten the Google profile service proof",
            rationale: "The profile is the most immediate trust surface for local homeowners.",
            outcome: "A clearer profile can support more qualified calls from existing visibility.",
            effort: "medium",
          },
          {
            priority: "second",
            title: "Rewrite the highest-value local service page",
            rationale: "The site needs proof that connects the service, market, and homeowner concern.",
            outcome: "A stronger page can help visitors decide without needing extra comparison steps.",
            effort: "high",
          },
          {
            priority: "third",
            title: "Create a simple lead-source review habit",
            rationale: "Visibility work needs a feedback loop tied to calls and booked jobs.",
            outcome: "The business can separate ranking movement from revenue-useful demand.",
            effort: "low",
          },
        ]
      : [],
    quickWins: strongPerformance
      ? [
          {
            title: "Refresh proof on the top service page",
            checklistLabel: "Add one recent project or review theme to the strongest local page",
            impact: "A proof refresh can help maintain trust without changing the broader strategy.",
            completed: false,
          },
        ]
      : complete
      ? [
          {
            title: "Add service-area proof near the first call action",
            checklistLabel: "Add market and nearby neighborhood proof above the fold",
            impact: "This can make the call path feel more relevant to homeowners in the target market.",
            completed: false,
          },
          {
            title: "Pin one recent review theme",
            checklistLabel: "Feature a recent review theme beside the primary contact action",
            impact: "Fresh trust language can reduce uncertainty before a call.",
            completed: false,
          },
        ]
      : [],
    nextBestStep: strongPerformance
      ? "Keep the current local foundation in place and improve attribution before making broad visibility changes."
      : complete
      ? "Review the Google profile and top local service page together, then fix the proof gaps that would most likely affect call confidence."
      : "Supply the missing website, Google profile, or lead-goal details before relying on recommendations.",
    recommendedOfferSlug,
    ctaActionId: complete ? "book-consultation" : "request-assessment-review",
  };
}
