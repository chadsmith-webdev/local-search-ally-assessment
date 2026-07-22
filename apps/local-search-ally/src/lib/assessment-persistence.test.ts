import { describe, expect, it } from "vitest";
import { createEmptyAssessmentSession } from "@/domain/assessment-session";
import { createAssessmentDeliveryConsent, createMarketingConsent } from "@/domain/consent";
import type { LeadAssessmentAssociation } from "@/domain/lead-assessments";
import type { AssessmentLead } from "@/domain/leads";
import { validateResultAccessToken } from "@/domain/result-access";
import { validateProductAccessToken } from "@/domain/product-access";
import type { ResultEmailJob } from "@/domain/result-email";
import type { SavedAssessmentResult } from "@/domain/results";
import { scoreAssessment } from "@/domain/scoring";
import { AssessmentPersistenceError, resolveAssessmentStoreAdapter } from "./assessment-repository";
import { createMemoryAssessmentRepository, getAssessmentRepository } from "./assessment-store";

const now = "2026-07-18T12:00:00.000Z";

function lead(id = "lead_test", assessmentId = "assessment_test"): AssessmentLead {
  return {
    id,
    email: "Owner@Example.com",
    firstName: "Taylor",
    businessName: "Triangle Home Services",
    assessmentId,
    contactSource: "assessment-results-gate",
    assessmentDeliveryConsent: createAssessmentDeliveryConsent({
      grantedAt: now,
      version: "assessment-contact-v1",
    }),
    marketingConsent: createMarketingConsent({
      granted: false,
      version: "assessment-contact-v1",
    }),
    createdAt: now,
    updatedAt: now,
  };
}

function association(leadId: string, assessmentId: string): LeadAssessmentAssociation {
  return {
    id: `event_${leadId}_${assessmentId}`,
    leadId,
    assessmentId,
    source: "assessment-results-gate",
    createdAt: now,
    updatedAt: now,
  };
}

function savedResult(assessmentId = "assessment_test", leadId = "lead_test"): SavedAssessmentResult {
  return {
    id: `result_${assessmentId}`,
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
    fallbackReason: "Test fixture.",
    resultEmailDeliveryStatus: "queued",
    createdAt: now,
    updatedAt: now,
  };
}

function emailJob(result: SavedAssessmentResult, accessTokenId = "access_test"): ResultEmailJob {
  return {
    id: `event_email_${result.id}`,
    leadId: result.leadId,
    assessmentId: result.assessmentId,
    resultId: result.id,
    recipientEmail: "owner@example.com",
    resultUrlPath: `/results/${result.id}`,
    resultAccessTokenId: accessTokenId,
    resultCategory: result.result.primaryDiagnosisCategory,
    recommendedOfferSlug: result.result.recommendedOfferSlug,
    assessmentDeliveryConsent: createAssessmentDeliveryConsent({ grantedAt: now }),
    marketingConsent: createMarketingConsent({ granted: false }),
    idempotencyKey: `result-email:${result.id}`,
    status: "development-unsent",
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

describe("assessment persistence boundary", () => {
  it("isolates test memory repositories and supports save/resume", async () => {
    const first = createMemoryAssessmentRepository();
    const second = createMemoryAssessmentRepository();
    const session = createEmptyAssessmentSession("assessment_resume", now);

    await first.createSession(session);

    expect(await first.findSession("assessment_resume")).toEqual(session);
    expect(await second.findSession("assessment_resume")).toBeNull();
  });

  it("keeps the app-level memory repository stable across repeated repository lookups", async () => {
    const first = getAssessmentRepository();
    first.reset();
    const session = createEmptyAssessmentSession("assessment_singleton_resume", now);

    await first.createSession(session);

    const second = getAssessmentRepository();
    expect(await second.findSession("assessment_singleton_resume")).toEqual(session);
    first.reset();
  });

  it("normalizes duplicate leads and allows one lead to be associated with multiple assessments", async () => {
    const store = createMemoryAssessmentRepository();
    const firstLead = await store.saveLead(lead("lead_owner", "assessment_one"));
    const existing = await store.findLeadByEmail("owner@example.COM");

    expect(firstLead.email).toBe("owner@example.com");
    expect(existing?.id).toBe("lead_owner");
    await expect(store.saveLead({ ...lead("lead_other", "assessment_two"), email: "OWNER@example.com" })).rejects.toMatchObject({
      code: "duplicate-key",
    });

    await store.associateLeadWithAssessment(association(firstLead.id, "assessment_one"));
    await store.associateLeadWithAssessment(association(firstLead.id, "assessment_two"));
    await store.associateLeadWithAssessment(association(firstLead.id, "assessment_two"));

    expect(await store.findLeadAssessments(firstLead.id)).toHaveLength(2);
    expect((await store.findLead(firstLead.id))?.assessmentDeliveryConsent.granted).toBe(true);
    expect((await store.findLead(firstLead.id))?.marketingConsent?.granted).toBe(false);
  });

  it("creates one result per assessment and rolls back failed transactions", async () => {
    const store = createMemoryAssessmentRepository();
    const result = savedResult();

    await store.createResultOnce(result);
    const duplicate = await store.createResultOnce({ ...result, id: "result_other" });
    expect(duplicate.id).toBe(result.id);

    await expect(
      store.transaction(async (transaction) => {
        await transaction.createSession(createEmptyAssessmentSession("assessment_rollback", now));
        throw new AssessmentPersistenceError("Simulated failure.", "store-unavailable");
      }),
    ).rejects.toMatchObject({ code: "store-unavailable" });

    expect(await store.findSession("assessment_rollback")).toBeNull();
  });

  it("stores only token hashes and validates expiration and revocation", async () => {
    const store = createMemoryAssessmentRepository();
    const result = savedResult();
    await store.saveResult(result);

    const access = await store.createResultAccess(result, now);
    const tokens = await store.findResultAccessTokensForResult(result.id);
    const snapshot = JSON.stringify(store.snapshot());

    expect(tokens).toHaveLength(1);
    expect(tokens[0].tokenDigest).toHaveLength(64);
    expect(tokens[0].expiresAt).toBe("2026-08-17T12:00:00.000Z");
    expect(snapshot).not.toContain(access.tokenValue);
    expect(validateResultAccessToken({ tokenValue: access.tokenValue, resultId: result.id, tokens, now }).status).toBe("valid");

    const revoked = await store.revokeResultAccessToken(access.token.id, "2026-07-18T12:01:00.000Z");
    expect(revoked?.status).toBe("revoked");
    expect(
      validateResultAccessToken({
        tokenValue: access.tokenValue,
        resultId: result.id,
        tokens: await store.findResultAccessTokensForResult(result.id),
        now: "2026-07-18T12:02:00.000Z",
      }).status,
    ).toBe("revoked-access");

    const rotated = await store.rotateResultAccessToken(result, "2026-07-18T12:03:00.000Z");
    expect(rotated.token.id).not.toBe(access.token.id);
    expect(validateResultAccessToken({ tokenValue: rotated.tokenValue, resultId: result.id, tokens: [rotated.token] }).status).toBe("valid");
  });

  it("expires secure product-access links after 30 days without revoking the entitlement", async () => {
    const store = createMemoryAssessmentRepository();
    const entitlement = await store.saveProductEntitlement({
      id: "entitlement_policy_window",
      purchaseId: "purchase_policy_window",
      leadId: "lead_policy_window",
      productSlug: "contractor-review-proof-system",
      productVersion: "1.0",
      status: "active",
      grantedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const access = await store.createProductAccess(entitlement, now);
    const tokens = await store.findProductAccessTokensForProduct("contractor-review-proof-system");
    const entitlements = await store.findProductEntitlementsForProduct("contractor-review-proof-system");

    expect(access.token.expiresAt).toBe("2026-08-17T12:00:00.000Z");
    expect(
      validateProductAccessToken({
        tokenValue: access.tokenValue,
        productSlug: "contractor-review-proof-system",
        now: "2026-08-17T12:01:00.000Z",
        entitlements,
        tokens,
      }).status,
    ).toBe("expired-access");
    expect(store.snapshot().productEntitlements[0]).toMatchObject({ status: "active" });
  });

  it("queues result email events idempotently without storing raw result tokens", async () => {
    const store = createMemoryAssessmentRepository();
    const result = savedResult();
    const job = emailJob(result, "access_result");

    const first = await store.queueResultEmailOnce(job);
    const second = await store.queueResultEmailOnce({ ...job, id: "event_other" });
    const snapshot = store.snapshot();

    expect(second.id).toBe(first.id);
    expect(snapshot.emailJobs).toHaveLength(1);
    expect(snapshot.emailJobs[0]).toMatchObject({
      resultUrlPath: `/results/${result.id}`,
      resultAccessTokenId: "access_result",
      attemptCount: 0,
    });
    expect(JSON.stringify(snapshot.emailJobs)).not.toContain("?token=");
  });

  it("rejects memory persistence in production configuration", () => {
    expect(() => resolveAssessmentStoreAdapter({ adapter: "memory", nodeEnv: "production" })).toThrow(
      /memory assessment store is development-only/i,
    );
    expect(() => resolveAssessmentStoreAdapter({ adapter: undefined, nodeEnv: "production" })).toThrow(/must be configured/i);
    expect(resolveAssessmentStoreAdapter({ adapter: "postgres", nodeEnv: "production" })).toBe("postgres");
  });
});
