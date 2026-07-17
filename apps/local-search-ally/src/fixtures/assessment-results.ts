import type { AssessmentInput } from "@/domain/assessment";
import { scoreAssessment } from "@/domain/scoring";

export const standardAssessmentInput: AssessmentInput = {
  businessName: "Triangle Home Services",
  trade: "HVAC contractor",
  market: "Raleigh, NC",
  websiteUrl: "https://example.com",
  googleBusinessProfileUrl: "https://example.com/profile",
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
};

export const longContractorNameInput: AssessmentInput = {
  businessName: "Piedmont Emergency Heating Cooling Electrical Plumbing and Drain Services",
  trade: "Home services contractor",
  market: "Winston-Salem, NC",
  websiteUrl: "https://example.com",
  googleBusinessProfileUrl: "https://example.com/profile",
  monthlyLeadGoal: 90,
};

export const sampleAssessmentResult = scoreAssessment(standardAssessmentInput);
export const highRiskAssessmentResult = scoreAssessment(highRiskAssessmentInput);
export const strongAssessmentResult = scoreAssessment(strongAssessmentInput);
export const longContractorNameResult = scoreAssessment(longContractorNameInput);

export const visualViewports = [
  { name: "phone-320", width: 320, height: 720 },
  { name: "phone-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1024", width: 1024, height: 900 },
  { name: "desktop-1440", width: 1440, height: 1000 },
] as const;
