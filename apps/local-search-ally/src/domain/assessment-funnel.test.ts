import { describe, expect, it, beforeEach } from "vitest";
import { createAssessmentDeliveryConsent, createMarketingConsent } from "./consent";
import { createEntityId } from "./ids";
import type { AssessmentLead } from "./leads";
import { validateResultAccessToken } from "./result-access";
import {
  answerStepOrder,
  buildAssessmentInputFromAnswers,
  canAccessStep,
  createEmptyAssessmentSession,
  firstIncompleteStep,
  mergeStepAnswers,
} from "./assessment-session";
import { generateAssessmentResult } from "@/lib/assessment-generation";
import { getAssessmentStore } from "@/lib/assessment-store";

const completeStepData = {
  business: {
    businessName: "Triangle Home Services",
    firstName: "Taylor",
    trade: "HVAC contractor",
    websiteUrl: "https://example.com",
    googleBusinessProfileUrl: "https://example.com/profile",
    googleBusinessProfileName: "Triangle Home Services",
    serviceArea: "Raleigh, NC",
    teamSize: "2-5",
  },
  market: {
    primaryServices: "AC repair, furnace repair, maintenance",
    highestValueService: "Full HVAC replacement",
    citiesServed: "Raleigh, Cary, Apex",
    emergencyService: "yes",
    customerFocus: "residential",
    monthlyJobVolume: 40,
  },
  visibility: {
    appearsOnGoogleMaps: "yes",
    reviewCount: 80,
    mostRecentReviewAge: "90-days",
    reviewsRequestedConsistently: "no",
    projectPhotosPublished: "unsure",
    websiteRecentProjects: "no",
    businessInfoConsistent: "yes",
    googleBusinessProfileComplete: "yes",
  },
  conversion: {
    qualifiedCallsPerMonth: 20,
    missedCallsPerMonth: 8,
    missedCallCallbacks: "inconsistent",
    bookingRatePercent: 50,
    clearPhoneCta: "yes",
    requestForm: "yes",
    leadsTracked: "no",
    followUpSpeed: "same-day",
    leadHandlingBottleneck: "Missed calls are not always followed up.",
  },
  economics: {
    averageJobValue: 1200,
    averageJobValueConfidence: "estimated",
    qualifiedLeadVolume: 20,
    qualifiedLeadVolumeConfidence: "estimated",
    bookingRatePercent: 50,
    bookingRateConfidence: "estimated",
    knownMissedCallCount: 8,
    opportunityLossRateLowPercent: 40,
    opportunityLossRateHighPercent: 60,
  },
  goals: {
    primaryBusinessGoal: "Book more profitable replacement jobs.",
    urgentMarketingConcern: "Reviews and recent proof are inconsistent.",
    desiredOutcome: "stronger-reputation",
    implementationTime: "1-3-hours",
    implementer: "office-team",
    preferredFirstOutcome: "Create a repeatable review request workflow.",
  },
} as const;

function completeSession() {
  const createdAt = "2026-07-18T12:00:00.000Z";
  let session = createEmptyAssessmentSession("assessment_test", createdAt);
  for (const step of answerStepOrder) {
    session = mergeStepAnswers(session, step, completeStepData[step], createdAt);
  }
  return session;
}

describe("assessment funnel foundation", () => {
  beforeEach(() => {
    getAssessmentStore().reset();
  });

  it("creates a draft session and enforces required step order", () => {
    const session = createEmptyAssessmentSession("assessment_step_test", "2026-07-18T12:00:00.000Z");

    expect(session.status).toBe("draft");
    expect(session.currentStep).toBe("business");
    expect(canAccessStep("business", session.answers)).toBe(true);
    expect(canAccessStep("market", session.answers)).toBe(false);
    expect(firstIncompleteStep(session.answers)).toBe("business");
  });

  it("saves and resumes completed step answers", () => {
    const session = completeSession();

    expect(firstIncompleteStep(session.answers)).toBeNull();
    expect(canAccessStep("review", session.answers)).toBe(true);
    expect(session.answers.business?.businessName).toBe("Triangle Home Services");
    expect(buildAssessmentInputFromAnswers(session.answers)).toMatchObject({
      businessName: "Triangle Home Services",
      monthlyQualifiedLeads: 20,
      bookingRatePercent: 50,
      averageJobValue: 1200,
    });
  });

  it("keeps assessment delivery consent independent from marketing consent", async () => {
    const store = getAssessmentStore();
    const session = completeSession();
    const lead: AssessmentLead = {
      id: "lead_test",
      email: "owner@example.com",
      firstName: "Taylor",
      businessName: "Triangle Home Services",
      assessmentId: session.id,
      contactSource: "assessment-results-gate",
      assessmentDeliveryConsent: createAssessmentDeliveryConsent({
        grantedAt: "2026-07-18T12:00:00.000Z",
        version: "assessment-contact-v1",
      }),
      marketingConsent: createMarketingConsent({
        granted: false,
        version: "assessment-contact-v1",
      }),
      createdAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:00:00.000Z",
    };

    await store.saveSession({ ...session, status: "contact-captured", currentStep: "generating", leadId: lead.id });
    await store.saveLead(lead);

    expect((await store.findLeadByEmail("OWNER@example.com"))?.id).toBe(lead.id);
    expect(lead.assessmentDeliveryConsent.granted).toBe(true);
    expect(lead.marketingConsent?.granted).toBe(false);
    expect(lead.marketingConsent?.grantedAt).toBeUndefined();
  });

  it("generates idempotent saved results, access tokens, and development email jobs", async () => {
    const store = getAssessmentStore();
    const session = completeSession();
    const lead: AssessmentLead = {
      id: createEntityId("lead", "lead-fixture"),
      email: "owner@example.com",
      firstName: "Taylor",
      businessName: "Triangle Home Services",
      assessmentId: session.id,
      contactSource: "assessment-results-gate",
      assessmentDeliveryConsent: createAssessmentDeliveryConsent({
        grantedAt: "2026-07-18T12:00:00.000Z",
      }),
      marketingConsent: createMarketingConsent({
        granted: true,
        grantedAt: "2026-07-18T12:00:00.000Z",
      }),
      createdAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:00:00.000Z",
    };

    await store.saveLead(lead);
    await store.saveSession({ ...session, status: "contact-captured", currentStep: "generating", leadId: lead.id });

    const first = await generateAssessmentResult({
      assessmentId: session.id,
      origin: "https://local.test",
      now: "2026-07-18T12:01:00.000Z",
    });
    const second = await generateAssessmentResult({
      assessmentId: session.id,
      origin: "https://local.test",
      now: "2026-07-18T12:02:00.000Z",
    });

    expect(first.status).toBe("completed");
    expect(second.status).toBe("completed");
    if (first.status !== "completed" || second.status !== "completed") return;

    expect(second.result.id).toBe(first.result.id);
    expect(first.result.result.recommendedOfferSlug).toBe("contractor-review-proof-system");
    expect(first.result.result.opportunityEstimate.monthlyRevenueOpportunity).toEqual({
      low: 4800,
      high: 7200,
      currency: "USD",
    });
    expect(first.result.openUIResponse).not.toContain("OverallScore(");
    expect(first.result.openUIResponse).not.toContain("CategoryScoreGrid(");

    const tokens = await store.findResultAccessTokensForResult(first.result.id);
    expect(validateResultAccessToken({ tokenValue: first.tokenValue, resultId: first.result.id, tokens }).status).toBe("valid");
    expect(validateResultAccessToken({ tokenValue: first.tokenValue, resultId: "result_wrong", tokens }).status).toBe("invalid-token");
    expect(
      validateResultAccessToken({
        tokenValue: first.tokenValue,
        resultId: first.result.id,
        tokens: [{ ...tokens[0], status: "expired", expiresAt: "2026-07-18T12:00:00.000Z" }],
        now: "2026-07-18T12:03:00.000Z",
      }).status,
    ).toBe("expired-access");

    const snapshot = store.snapshot();
    expect(snapshot.emailJobs).toHaveLength(1);
    expect(snapshot.emailJobs[0].status).toBe("development-unsent");
    expect(snapshot.emailJobs[0].assessmentDeliveryConsent.granted).toBe(true);
  });
});
