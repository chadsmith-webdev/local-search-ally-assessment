import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyAssessmentSession } from "@/domain/assessment-session";
import { createAssessmentDeliveryConsent, createMarketingConsent } from "@/domain/consent";
import type { AssessmentLead } from "@/domain/leads";
import type { SavedAssessmentResult } from "@/domain/results";
import { scoreAssessment } from "@/domain/scoring";
import { createMemoryAssessmentRepository } from "./assessment-store";
import { sendAssessmentResultEmail } from "./transactional-email-service";
import { processResendWebhook } from "./resend-webhook";

const now = "2026-07-20T12:00:00.000Z";

function lead(assessmentId = "assessment_webhook"): AssessmentLead {
  return {
    id: "lead_webhook",
    email: "owner@example.com",
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

function savedResult(assessmentId = "assessment_webhook", leadId = "lead_webhook"): SavedAssessmentResult {
  return {
    id: "result_webhook",
    assessmentId,
    leadId,
    result: scoreAssessment({
      businessName: "Triangle Home Services",
      trade: "HVAC contractor",
      market: "Raleigh, NC",
      websiteUrl: "https://example.com",
      googleBusinessProfileUrl: "https://example.com/profile",
      monthlyQualifiedLeads: 20,
      bookingRatePercent: 50,
      averageJobValue: 1200,
      missedCallsPerMonth: 8,
      opportunityLossRateLowPercent: 40,
      opportunityLossRateHighPercent: 60,
    }),
    rendererMode: "deterministic-fallback",
    fallbackReason: "Webhook test fixture.",
    resultEmailDeliveryStatus: "queued",
    createdAt: now,
    updatedAt: now,
  };
}

async function sentResultEmailFixture() {
  const repository = createMemoryAssessmentRepository();
  const session = createEmptyAssessmentSession("assessment_webhook", now);
  const owner = lead(session.id);
  const result = savedResult(session.id, owner.id);
  await repository.saveSession({ ...session, status: "completed", leadId: owner.id, resultId: result.id });
  await repository.saveLead(owner);
  await repository.saveResult(result);
  const access = await repository.createResultAccess(result, now);
  await sendAssessmentResultEmail({
    resultId: result.id,
    access,
    repository,
    provider: { send: async () => ({ providerMessageId: "email_result_webhook" }) },
    now,
  });
  return { repository, result };
}

function signedHeaders(id = "evt_resend_1") {
  return new Headers({
    "svix-id": id,
    "svix-timestamp": now,
    "svix-signature": "signature",
  });
}

describe("Resend webhook processing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("updates result email delivery status and handles webhook replay idempotently", async () => {
    vi.stubEnv("APP_BASE_URL", "https://assessment.example");
    const { repository, result } = await sentResultEmailFixture();

    const first = await processResendWebhook({
      rawBody: "{}",
      headers: signedHeaders(),
      repository,
      now,
      verifyEvent: () => ({
        id: "evt_resend_1",
        type: "email.delivered",
        data: { email_id: "email_result_webhook" },
      }),
    });
    const second = await processResendWebhook({
      rawBody: "{}",
      headers: signedHeaders(),
      repository,
      now,
      verifyEvent: () => ({
        id: "evt_resend_1",
        type: "email.delivered",
        data: { email_id: "email_result_webhook" },
      }),
    });

    expect(first).toEqual({ status: "processed" });
    expect(second).toEqual({ status: "processed" });
    expect((await repository.findResult(result.id))?.resultEmailDeliveryStatus).toBe("delivered");
    expect((await repository.findEmailJobByProviderMessageId("email_result_webhook"))?.status).toBe("delivered");
    expect(repository.snapshot().resendWebhookEvents).toHaveLength(1);
    expect(repository.snapshot().resendWebhookEvents[0]).toMatchObject({
      resendEventId: "evt_resend_1",
      processingStatus: "processed",
      attemptCount: 2,
    });
  });

  it("does not downgrade delivered email status when sent arrives after delivered", async () => {
    vi.stubEnv("APP_BASE_URL", "https://assessment.example");
    const { repository, result } = await sentResultEmailFixture();

    await processResendWebhook({
      rawBody: "{}",
      headers: signedHeaders("evt_resend_delivered"),
      repository,
      now,
      verifyEvent: () => ({
        id: "evt_resend_delivered",
        type: "email.delivered",
        data: { email_id: "email_result_webhook" },
      }),
    });
    await processResendWebhook({
      rawBody: "{}",
      headers: signedHeaders("evt_resend_sent"),
      repository,
      now,
      verifyEvent: () => ({
        id: "evt_resend_sent",
        type: "email.sent",
        data: { email_id: "email_result_webhook" },
      }),
    });

    expect((await repository.findResult(result.id))?.resultEmailDeliveryStatus).toBe("delivered");
    expect((await repository.findEmailJobByProviderMessageId("email_result_webhook"))?.status).toBe("delivered");
  });

  it("rejects unsigned webhooks without recording raw payloads", async () => {
    vi.stubEnv("APP_BASE_URL", "https://assessment.example");
    const { repository } = await sentResultEmailFixture();

    await expect(
      processResendWebhook({
        rawBody: JSON.stringify({ private: "payload" }),
        headers: new Headers(),
        repository,
        now,
        verifyEvent: () => {
          throw new Error("should not verify");
        },
      }),
    ).rejects.toThrow(/missing required signature headers/i);

    expect(JSON.stringify(repository.snapshot())).not.toContain("payload");
  });
});
