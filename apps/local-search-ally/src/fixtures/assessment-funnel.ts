import { createAssessmentDeliveryConsent, createMarketingConsent } from "@/domain/consent";
import { createEntityId } from "@/domain/ids";
import type { AssessmentLead } from "@/domain/leads";
import { hashResultAccessToken, type ResultAccessToken } from "@/domain/result-access";
import { createEmptyAssessmentSession, mergeStepAnswers } from "@/domain/assessment-session";
import { type SavedAssessmentResult } from "@/domain/results";
import { getAssessmentStore } from "@/lib/assessment-store";
import { generateAssessmentResult } from "@/lib/assessment-generation";

const now = "2026-07-18T12:00:00.000Z";

export const developmentFunnelAnswers = {
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

function completeFixtureSession(id: string) {
  let session = createEmptyAssessmentSession(id, now);
  session = mergeStepAnswers(session, "business", developmentFunnelAnswers.business, now);
  session = mergeStepAnswers(session, "market", developmentFunnelAnswers.market, now);
  session = mergeStepAnswers(session, "visibility", developmentFunnelAnswers.visibility, now);
  session = mergeStepAnswers(session, "conversion", developmentFunnelAnswers.conversion, now);
  session = mergeStepAnswers(session, "economics", developmentFunnelAnswers.economics, now);
  session = mergeStepAnswers(session, "goals", developmentFunnelAnswers.goals, now);
  return session;
}

function fixtureLead(assessmentId: string): AssessmentLead {
  return {
    id: `lead_${assessmentId}`,
    email: `${assessmentId}@example.com`,
    firstName: "Taylor",
    businessName: "Triangle Home Services",
    assessmentId,
    contactSource: "assessment-results-gate",
    assessmentDeliveryConsent: createAssessmentDeliveryConsent({ grantedAt: now }),
    marketingConsent: createMarketingConsent({ granted: false }),
    createdAt: now,
    updatedAt: now,
  };
}

export async function createDevelopmentAssessmentFunnelFixtures(origin = "http://localhost:3010") {
  const store = getAssessmentStore();

  const partial = createEmptyAssessmentSession("assessment_dev_partial", now);
  await store.saveSession(mergeStepAnswers(partial, "business", developmentFunnelAnswers.business, now));

  const complete = completeFixtureSession("assessment_dev_complete");
  await store.saveSession({ ...complete, currentStep: "review" });

  const weak = completeFixtureSession("assessment_dev_weak_economics");
  await store.saveSession({
    ...weak,
    currentStep: "review",
    answers: {
      ...weak.answers,
      economics: {
        ...weak.answers.economics,
        averageJobValue: undefined,
        averageJobValueConfidence: "unknown",
      },
    },
  });

  const contact = completeFixtureSession("assessment_dev_contact");
  await store.saveSession({ ...contact, status: "reviewed", currentStep: "contact" });

  const generating = completeFixtureSession("assessment_dev_generating");
  const generatingLead = fixtureLead(generating.id);
  await store.saveLead(generatingLead);
  await store.saveSession({ ...generating, status: "contact-captured", currentStep: "generating", leadId: generatingLead.id });

  const failed = completeFixtureSession("assessment_dev_generation_failed");
  const failedLead = fixtureLead(failed.id);
  await store.saveLead(failedLead);
  await store.saveSession({
    ...failed,
    status: "generation-failed",
    currentStep: "generating",
    leadId: failedLead.id,
    generationError: "Development fixture generation failure.",
  });

  const generated = await generateAssessmentResult({
    assessmentId: generating.id,
    origin,
    now,
  });

  const fixtureLinks = [
    { label: "New assessment", href: "/assessment" },
    { label: "Partially completed assessment", href: "/assessment/assessment_dev_partial/market" },
    { label: "Review screen with complete inputs", href: "/assessment/assessment_dev_complete/review" },
    { label: "Review screen with weak economics inputs", href: "/assessment/assessment_dev_weak_economics/review" },
    { label: "Email-capture default state", href: "/assessment/assessment_dev_contact/contact" },
    { label: "Email-capture validation error", href: "/assessment/assessment_dev_contact/contact?error=invalid-email" },
    { label: "Generating state", href: "/assessment/assessment_dev_generating/generating" },
    { label: "Generation failure state", href: "/assessment/assessment_dev_generation_failed/generating" },
  ];

  if (generated.status === "completed") {
    const invalidTokenHref = `/results/${generated.result.id}?token=invalid`;
    const expiredTokenValue = "rat_dev_expired_fixture";
    const expiredToken: ResultAccessToken = {
      id: "access_dev_expired_result",
      resultId: generated.result.id,
      assessmentId: generated.result.assessmentId,
      leadId: generated.result.leadId,
      tokenDigest: hashResultAccessToken(expiredTokenValue),
      status: "expired",
      createdAt: now,
      expiresAt: now,
    };
    await store.saveResultAccessToken(expiredToken, expiredTokenValue);

    const emailFailedResult: SavedAssessmentResult = {
      ...generated.result,
      id: "result_dev_email_failed",
      resultEmailDeliveryStatus: "failed",
    };
    await store.saveResult(emailFailedResult);
    const emailFailedAccess = await store.createResultAccess(emailFailedResult, now);

    const fallbackResult: SavedAssessmentResult = {
      ...generated.result,
      id: "result_dev_fallback",
      rendererMode: "deterministic-fallback",
      openUIResponse: undefined,
      fallbackReason: "Development fixture fallback state.",
    };
    await store.saveResult(fallbackResult);
    const fallbackAccess = await store.createResultAccess(fallbackResult, now);

    fixtureLinks.push(
      { label: "Secure result", href: generated.resultUrl.replace(origin, "") },
      { label: "Invalid result token", href: invalidTokenHref },
      { label: "Expired result token", href: `/results/${generated.result.id}?token=${expiredTokenValue}` },
      {
        label: "Result-email failure with result still available",
        href: `/results/${emailFailedResult.id}?token=${emailFailedAccess.tokenValue}`,
      },
      {
        label: "OpenUI failure with deterministic fallback",
        href: `/results/${fallbackResult.id}?token=${fallbackAccess.tokenValue}`,
      },
    );
  }

  return fixtureLinks;
}
