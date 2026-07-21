import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyAssessmentSession } from "@/domain/assessment-session";
import { createAssessmentDeliveryConsent, createMarketingConsent } from "@/domain/consent";
import type { AssessmentLead } from "@/domain/leads";
import type { SavedAssessmentResult } from "@/domain/results";
import { scoreAssessment } from "@/domain/scoring";
import { createMemoryAssessmentRepository } from "./assessment-store";
import { sendAssessmentResultEmail } from "./transactional-email-service";
import type { TransactionalEmailProvider } from "./resend-email-provider";

const now = "2026-07-20T12:00:00.000Z";

function lead(assessmentId = "assessment_email"): AssessmentLead {
  return {
    id: "lead_email",
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

function savedResult(assessmentId = "assessment_email", leadId = "lead_email"): SavedAssessmentResult {
  return {
    id: "result_email",
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
    fallbackReason: "Email delivery test fixture.",
    resultEmailDeliveryStatus: "queued",
    createdAt: now,
    updatedAt: now,
  };
}

async function resultFixture() {
  const repository = createMemoryAssessmentRepository();
  const session = createEmptyAssessmentSession("assessment_email", now);
  const owner = lead(session.id);
  const result = savedResult(session.id, owner.id);
  await repository.saveSession({ ...session, status: "completed", leadId: owner.id, resultId: result.id });
  await repository.saveLead(owner);
  await repository.saveResult(result);
  const access = await repository.createResultAccess(result, now);
  return { repository, result, access };
}

describe("transactional email service", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends assessment result email through the provider and stores only token hashes", async () => {
    vi.stubEnv("APP_BASE_URL", "https://assessment.example");
    const { repository, result, access } = await resultFixture();
    const provider: TransactionalEmailProvider = {
      send: vi.fn(async () => ({ providerMessageId: "email_result_123" })),
    };

    const first = await sendAssessmentResultEmail({ resultId: result.id, access, repository, provider, now });
    const second = await sendAssessmentResultEmail({ resultId: result.id, access, repository, provider, now });
    const snapshot = repository.snapshot();

    expect(first.status).toBe("sent");
    expect(second.status).toBe("sent");
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(snapshot.emailJobs).toHaveLength(1);
    expect(snapshot.emailJobs[0]).toMatchObject({
      provider: "resend",
      templateId: "assessment-results",
      templateVersion: "v1",
      providerMessageId: "email_result_123",
      attemptCount: 1,
    });
    expect(JSON.stringify(snapshot)).not.toContain(access.tokenValue);
  });

  it("records failed delivery when configuration is missing without blocking result access", async () => {
    vi.stubEnv("APP_BASE_URL", "");
    const { repository, result, access } = await resultFixture();

    const job = await sendAssessmentResultEmail({ resultId: result.id, access, repository, now });
    const saved = await repository.findResult(result.id);

    expect(job.status).toBe("failed");
    expect(job.errorMessage).toMatch(/APP_BASE_URL|required/i);
    expect(saved?.resultEmailDeliveryStatus).toBe("failed");
  });
});
