"use server";

import { redirect } from "next/navigation";
import { createAssessmentDeliveryConsent, createMarketingConsent } from "@/domain/consent";
import { createEntityId } from "@/domain/ids";
import type { AssessmentLead } from "@/domain/leads";
import type { LeadAssessmentAssociation } from "@/domain/lead-assessments";
import {
  type AnswerStep,
  type AssessmentSession,
  canAccessStep,
  createEmptyAssessmentSession,
  firstIncompleteStep,
  mergeStepAnswers,
  nextStepFor,
  stepSchemas,
} from "@/domain/assessment-session";
import { getOfferRecommendationForResult } from "@/domain/offers";
import { buildAssessmentInputFromAnswers } from "@/domain/assessment-session";
import { scoreAssessment } from "@/domain/scoring";
import { getAssessmentRepository } from "@/lib/assessment-store";

function now() {
  return new Date().toISOString();
}

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function errorRedirect(assessmentId: string, step: string, message: string) {
  redirect(`/assessment/${assessmentId}/${step}?error=${encodeURIComponent(message)}`);
}

export async function startAssessmentAction() {
  const store = getAssessmentRepository();
  const createdAt = now();
  const session = createEmptyAssessmentSession(createEntityId("assessment"), createdAt);
  await store.createSession(session);
  await store.recordEvent({
    name: "assessment_started",
    assessmentId: session.id,
    idempotencyKey: `assessment-started:${session.id}`,
    occurredAt: createdAt,
  });
  redirect(`/assessment/${session.id}/business`);
}

export async function saveAssessmentStepAction(assessmentId: string, step: AnswerStep, formData: FormData) {
  const store = getAssessmentRepository();
  const session = await store.findSession(assessmentId);
  if (!session) redirect("/assessment?error=session-not-found");

  const submitted = formObject(formData);
  const parsed = stepSchemas[step].safeParse(submitted);
  const updatedAt = now();

  if (!parsed.success) {
    await store.saveSession({
      ...session,
      currentStep: step,
      answers: {
        ...session.answers,
        [step]: submitted,
      },
      updatedAt,
    } as AssessmentSession);
    await store.recordEvent({
      name: "assessment_step_validation_failed",
      assessmentId,
      idempotencyKey: `step-validation-failed:${assessmentId}:${step}:${updatedAt}`,
      occurredAt: updatedAt,
    });
    errorRedirect(assessmentId, step, parsed.error.issues[0]?.message ?? "Check the highlighted fields.");
  }

  const updated = mergeStepAnswers(session, step, submitted, updatedAt);
  await store.saveSession(updated);
  await store.recordEvent({
    name: "assessment_step_completed",
    assessmentId,
    idempotencyKey: `step-completed:${assessmentId}:${step}:${updatedAt}`,
    occurredAt: updatedAt,
  });
  redirect(`/assessment/${assessmentId}/${nextStepFor(step)}`);
}

export async function completeReviewAction(assessmentId: string) {
  const store = getAssessmentRepository();
  const session = await store.findSession(assessmentId);
  if (!session) redirect("/assessment?error=session-not-found");
  const incomplete = firstIncompleteStep(session.answers);
  if (incomplete) redirect(`/assessment/${assessmentId}/${incomplete}?error=required-prior-step`);

  const updatedAt = now();
  await store.saveSession({
    ...session,
    status: "reviewed",
    currentStep: "contact",
    updatedAt,
  });
  await store.recordEvent({
    name: "assessment_review_completed",
    assessmentId,
    idempotencyKey: `review-completed:${assessmentId}`,
    occurredAt: updatedAt,
  });
  redirect(`/assessment/${assessmentId}/contact`);
}

export async function captureLeadAction(assessmentId: string, formData: FormData) {
  const store = getAssessmentRepository();
  const session = await store.findSession(assessmentId);
  if (!session) redirect("/assessment?error=session-not-found");
  if (!canAccessStep("contact", session.answers)) {
    const incomplete = firstIncompleteStep(session.answers);
    redirect(`/assessment/${assessmentId}/${incomplete ?? "business"}?error=required-prior-step`);
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? session.answers.business?.businessName ?? "").trim();
  const marketingConsentGranted = formData.get("marketingConsent") === "on";
  const submittedAt = now();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    await store.recordEvent({
      name: "email_capture_failed",
      assessmentId,
      idempotencyKey: `email-capture-failed:${assessmentId}:${submittedAt}`,
      occurredAt: submittedAt,
    });
    redirect(`/assessment/${assessmentId}/contact?error=invalid-email`);
  }

  const input = buildAssessmentInputFromAnswers(session.answers);
  const previewResult = scoreAssessment(input);
  const existingLead = await store.findLeadByEmail(email);
  const lead: AssessmentLead = {
    id: existingLead?.id ?? createEntityId("lead"),
    email,
    firstName: firstName || existingLead?.firstName,
    businessName: businessName || existingLead?.businessName,
    assessmentId,
    contactSource: "assessment-results-gate",
    resultCategory: previewResult.primaryDiagnosisCategory ?? undefined,
    recommendedOfferSlug: getOfferRecommendationForResult(previewResult)?.slug ?? previewResult.recommendedOfferSlug ?? undefined,
    assessmentDeliveryConsent: createAssessmentDeliveryConsent({
      grantedAt: submittedAt,
      version: "assessment-contact-v1",
    }),
    marketingConsent: createMarketingConsent({
      granted: marketingConsentGranted,
      grantedAt: submittedAt,
      version: "assessment-contact-v1",
    }),
    createdAt: existingLead?.createdAt ?? submittedAt,
    updatedAt: submittedAt,
  };

  const savedLead = await store.transaction(async (transaction) => {
    const persistedLead = await transaction.saveLead(lead);
    const association: LeadAssessmentAssociation = {
      id: createEntityId("event", `lead-assessment-${persistedLead.id}-${assessmentId}`),
      leadId: persistedLead.id,
      assessmentId,
      source: "assessment-results-gate",
      createdAt: submittedAt,
      updatedAt: submittedAt,
    };
    await transaction.associateLeadWithAssessment(association);
    await transaction.saveSession({
      ...session,
      status: "contact-captured",
      currentStep: "generating",
      leadId: persistedLead.id,
      updatedAt: submittedAt,
    });
    return persistedLead;
  });
  await store.recordEvent({
    name: "email_capture_submitted",
    assessmentId,
    leadId: savedLead.id,
    idempotencyKey: `email-capture-submitted:${assessmentId}`,
    occurredAt: submittedAt,
  });
  await store.recordEvent({
    name: marketingConsentGranted ? "marketing_consent_granted" : "marketing_consent_declined",
    assessmentId,
    leadId: savedLead.id,
    idempotencyKey: `marketing-consent:${assessmentId}`,
    occurredAt: submittedAt,
  });
  redirect(`/assessment/${assessmentId}/generating`);
}
