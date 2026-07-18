import type { AssessmentInput, AssessmentResult } from "@/domain/assessment";
import { calculateOpportunityEstimate } from "@/domain/opportunity";
import { scoreAssessment } from "@/domain/scoring";

export const standardAssessmentInput: AssessmentInput = {
  businessName: "Triangle Home Services",
  trade: "HVAC contractor",
  market: "Raleigh, NC",
  websiteUrl: "https://example.com",
  googleBusinessProfileUrl: "https://example.com/profile",
  monthlyQualifiedLeads: 20,
  bookingRatePercent: 50,
  averageJobValue: 1200,
};

export const highRiskAssessmentInput: AssessmentInput = {
  businessName: "Oak Ridge Plumbing",
  trade: "Plumbing contractor",
  market: "Greensboro, NC",
};

export const strongAssessmentInput: AssessmentInput = {
  businessName: "Summit Roofing Co.",
  trade: "Roofing contractor",
  market: "Charlotte, NC",
  websiteUrl: "https://example.com",
  googleBusinessProfileUrl: "https://example.com/profile",
  monthlyLeadGoal: 120,
  monthlyQualifiedLeads: 120,
  bookingRatePercent: 55,
  averageJobValue: 1500,
};

export const longContractorNameInput: AssessmentInput = {
  businessName: "Piedmont Emergency Heating Cooling Electrical Plumbing and Drain Services",
  trade: "Home services contractor",
  market: "Winston-Salem, NC",
  websiteUrl: "https://example.com",
  googleBusinessProfileUrl: "https://example.com/profile",
  monthlyQualifiedLeads: 2000,
  bookingRatePercent: 75,
  averageJobValue: 100000,
};

export const weakOpportunityAssessmentInput: AssessmentInput = {
  businessName: "Capital City Drain and Leak Repair",
  trade: "Plumbing contractor",
  market: "Durham, NC",
  websiteUrl: "https://example.com",
  googleBusinessProfileUrl: "https://example.com/profile",
  monthlyLeadGoal: 30,
  averageJobValue: 850,
};

export const sampleAssessmentResult = scoreAssessment(standardAssessmentInput);
export const highRiskAssessmentResult = scoreAssessment(highRiskAssessmentInput);
export const strongAssessmentResult = scoreAssessment(strongAssessmentInput);
export const longContractorNameResult = scoreAssessment(longContractorNameInput);
export const weakOpportunityAssessmentResult = scoreAssessment(weakOpportunityAssessmentInput);

export const eligibleOfferAssessmentResult = {
  ...sampleAssessmentResult,
  id: "assessment-eligible-review-proof-offer",
  primaryDiagnosisCategory: "reviews",
  supportingDiagnosisCategories: ["recent-proof", "project-proof"],
  recommendedOfferSlug: "contractor-review-proof-system",
} satisfies AssessmentResult;

export const ineligibleOfferAssessmentResult = {
  ...sampleAssessmentResult,
  id: "assessment-ineligible-review-proof-offer",
  primaryDiagnosisCategory: "reviews",
  supportingDiagnosisCategories: ["call-handling"],
  recommendedOfferSlug: "contractor-review-proof-system",
} satisfies AssessmentResult;

export const inactiveOfferAssessmentResult = {
  ...eligibleOfferAssessmentResult,
  id: "assessment-inactive-review-proof-offer",
} satisfies AssessmentResult;

export const verifiedMissedCallAssessmentResult = {
  ...sampleAssessmentResult,
  id: "assessment-verified-missed-call-data",
  opportunityEstimate: calculateOpportunityEstimate({
    monthlyQualifiedLeads: {
      key: "monthlyQualifiedLeads",
      label: "Qualified monthly opportunities",
      value: 20,
      unit: "count",
      verification: "verified",
      sourceLabel: "Verified call-tracking report",
      explanation: "Verified qualified call opportunities from the most recent monthly report.",
      editable: true,
    },
    opportunityLossRate: {
      key: "opportunityLossRate",
      label: "Opportunity-loss rate",
      lowValue: 0.4,
      highValue: 0.6,
      unit: "percent",
      verification: "verified",
      sourceLabel: "Verified missed-call review",
      explanation: "Verified missed or abandoned call exposure from the tracking report.",
      editable: true,
    },
    bookingRate: {
      key: "bookingRate",
      label: "Call-to-job booking rate",
      value: 0.5,
      unit: "percent",
      verification: "verified",
      sourceLabel: "Verified booked-job report",
      explanation: "Verified percentage of qualified calls that became booked jobs.",
      editable: true,
    },
    averageJobValue: {
      key: "averageJobValue",
      label: "Average job value",
      value: 1200,
      unit: "currency",
      verification: "verified",
      sourceLabel: "Verified sales report",
      explanation: "Verified average value for recently completed jobs.",
      editable: true,
    },
  }),
} satisfies AssessmentResult;

export const incompleteOpportunityAssessmentResult = {
  ...sampleAssessmentResult,
  id: "assessment-incomplete-opportunity-estimate",
  opportunityEstimate: highRiskAssessmentResult.opportunityEstimate,
} satisfies AssessmentResult;

export const activeReadyOfferComponentAssessmentResult = {
  ...eligibleOfferAssessmentResult,
  id: "assessment-active-ready-offer-component-only",
} satisfies AssessmentResult;

export const visualViewports = [
  { name: "phone-320", width: 320, height: 720 },
  { name: "phone-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1024", width: 1024, height: 900 },
  { name: "desktop-1440", width: 1440, height: 1000 },
] as const;
