import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createEmptyAssessmentSession } from "@/domain/assessment-session";
import { createAssessmentDeliveryConsent, createMarketingConsent } from "@/domain/consent";
import type { AssessmentLead } from "@/domain/leads";
import type { ResultEmailJob } from "@/domain/result-email";
import type { SavedAssessmentResult } from "@/domain/results";
import { validateResultAccessToken } from "@/domain/result-access";
import { scoreAssessment } from "@/domain/scoring";
import { AssessmentPersistenceError } from "./assessment-repository";
import { PostgresAssessmentRepository } from "./postgres-assessment-repository";

const { Client } = pg;

function loadLocalEnv() {
  for (const file of [".env", ".env.local"]) {
    try {
      const contents = readFileSync(join(process.cwd(), file), "utf8");
      for (const line of contents.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const index = trimmed.indexOf("=");
        const key = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
        if ((key === "DATABASE_URL" || key === "DATABASE_SCHEMA") && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    } catch {
      // Tests skip below when DATABASE_URL is absent.
    }
  }
}

loadLocalEnv();

const databaseUrl = process.env.DATABASE_URL;
const runIntegration = Boolean(databaseUrl);
const schema = `lsa_it_${randomUUID().replace(/-/g, "_")}`;
const now = "2026-07-19T12:00:00.000Z";

function session(id: string) {
  return createEmptyAssessmentSession(id, now);
}

function lead(id: string, assessmentId: string, email = "owner@example.com"): AssessmentLead {
  return {
    id,
    email,
    firstName: "Taylor",
    businessName: "Triangle Home Services",
    assessmentId,
    contactSource: "assessment-results-gate",
    assessmentDeliveryConsent: createAssessmentDeliveryConsent({ grantedAt: now, version: "assessment-contact-v1" }),
    marketingConsent: createMarketingConsent({ granted: false, version: "assessment-contact-v1" }),
    createdAt: now,
    updatedAt: now,
  };
}

function result(id: string, assessmentId: string, leadId: string): SavedAssessmentResult {
  return {
    id,
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
    fallbackReason: "Integration fallback.",
    resultEmailDeliveryStatus: "queued",
    createdAt: now,
    updatedAt: now,
  };
}

function emailJob(savedResult: SavedAssessmentResult, tokenId: string): ResultEmailJob {
  return {
    id: `event_email_${savedResult.id}`,
    leadId: savedResult.leadId,
    assessmentId: savedResult.assessmentId,
    resultId: savedResult.id,
    recipientEmail: "owner@example.com",
    resultUrlPath: `/results/${savedResult.id}`,
    resultAccessTokenId: tokenId,
    resultCategory: savedResult.result.primaryDiagnosisCategory,
    recommendedOfferSlug: savedResult.result.recommendedOfferSlug,
    assessmentDeliveryConsent: createAssessmentDeliveryConsent({ grantedAt: now }),
    marketingConsent: createMarketingConsent({ granted: false }),
    idempotencyKey: `result-email:${savedResult.id}`,
    status: "development-unsent",
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

describe.skipIf(!runIntegration)("PostgresAssessmentRepository", () => {
  let admin: pg.Client;

  beforeAll(async () => {
    admin = new Client({
      connectionString: databaseUrl,
      ssl: databaseUrl?.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
    });
    await admin.connect();
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await admin.query(`SET search_path TO "${schema}"`);
    const migrationsDir = join(process.cwd(), "persistence/migrations");
    for (const file of readdirSync(migrationsDir).filter((entry) => entry.endsWith(".sql")).sort()) {
      await admin.query(readFileSync(join(migrationsDir, file), "utf8"));
    }
  }, 30_000);

  afterAll(async () => {
    if (!admin) return;
    try {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await admin.end().catch(() => undefined);
    }
  }, 30_000);

  it("persists sessions, leads, results, tokens, and email events across repository instances", async () => {
    const first = new PostgresAssessmentRepository({ connectionString: databaseUrl, schema });
    const second = new PostgresAssessmentRepository({ connectionString: databaseUrl, schema });

    await first.saveSession({ ...session("assessment_pg_one"), answers: { business: { businessName: "Triangle Home Services" } } });
    expect((await second.findSession("assessment_pg_one"))?.answers.business?.businessName).toBe("Triangle Home Services");

    const savedLead = await first.saveLead(lead("lead_pg_one", "assessment_pg_one", "OWNER@example.com"));
    await first.associateLeadWithAssessment({
      id: "event_lead_pg_one_assessment_pg_one",
      leadId: savedLead.id,
      assessmentId: "assessment_pg_one",
      source: "assessment-results-gate",
      createdAt: now,
      updatedAt: now,
    });

    const duplicateLead = await Promise.all([
      second.saveLead(lead("lead_pg_duplicate_a", "assessment_pg_two", "owner@example.com")),
      second.saveLead(lead("lead_pg_duplicate_b", "assessment_pg_three", "OWNER@example.com")),
    ]);
    expect(new Set(duplicateLead.map((item) => item.id)).size).toBe(1);
    expect((await second.findLeadByEmail("OWNER@example.com"))?.assessmentDeliveryConsent.grantedAt).toBe(now);

    await second.saveSession(session("assessment_pg_two"));
    await second.saveSession(session("assessment_pg_three"));
    await Promise.all([
      second.associateLeadWithAssessment({
        id: "event_lead_pg_one_assessment_pg_two",
        leadId: savedLead.id,
        assessmentId: "assessment_pg_two",
        source: "assessment-results-gate",
        createdAt: now,
        updatedAt: now,
      }),
      second.associateLeadWithAssessment({
        id: "event_lead_pg_one_assessment_pg_three",
        leadId: savedLead.id,
        assessmentId: "assessment_pg_three",
        source: "assessment-results-gate",
        createdAt: now,
        updatedAt: now,
      }),
    ]);
    expect(await second.findLeadAssessments(savedLead.id)).toHaveLength(3);

    const generated = result("result_pg_one", "assessment_pg_one", savedLead.id);
    const [firstResult, secondResult] = await Promise.all([
      first.createResultOnce(generated),
      second.createResultOnce({ ...generated, id: "result_pg_duplicate" }),
    ]);
    expect(secondResult.id).toBe(firstResult.id);
    expect((await second.findResultByAssessmentId("assessment_pg_one"))?.id).toBe(firstResult.id);

    const access = await first.createResultAccess(firstResult, now);
    const tokens = await second.findResultAccessTokensForResult(firstResult.id);
    expect(JSON.stringify(tokens)).not.toContain(access.tokenValue);
    expect(validateResultAccessToken({ tokenValue: access.tokenValue, resultId: firstResult.id, tokens }).status).toBe("valid");
    expect(validateResultAccessToken({ tokenValue: access.tokenValue, resultId: "result_wrong", tokens }).status).toBe("invalid-token");

    await first.saveResultAccessToken({ ...tokens[0], status: "expired", expiresAt: "2026-07-19T12:01:00.000Z" });
    expect(
      validateResultAccessToken({
        tokenValue: access.tokenValue,
        resultId: firstResult.id,
        tokens: await second.findResultAccessTokensForResult(firstResult.id),
        now: "2026-07-19T12:02:00.000Z",
      }).status,
    ).toBe("expired-access");
    const rotated = await first.rotateResultAccessToken(firstResult, "2026-07-19T12:03:00.000Z");
    await first.revokeResultAccessToken(rotated.token.id, "2026-07-19T12:04:00.000Z");
    expect(
      validateResultAccessToken({
        tokenValue: rotated.tokenValue,
        resultId: firstResult.id,
        tokens: await second.findResultAccessTokensForResult(firstResult.id),
      }).status,
    ).toBe("revoked-access");

    const fresh = await first.createResultAccess(firstResult, "2026-07-19T12:05:00.000Z");
    const queued = await first.queueResultEmailOnce(emailJob(firstResult, fresh.token.id));
    const queuedAgain = await second.queueResultEmailOnce({ ...emailJob(firstResult, fresh.token.id), id: "event_other" });
    expect(queuedAgain.id).toBe(queued.id);
    expect((await second.findEmailJobByIdempotencyKey(`result-email:${firstResult.id}`))?.attemptCount).toBe(0);

    await expect(
      first.transaction(async (transaction) => {
        await transaction.saveSession(session("assessment_pg_rollback"));
        throw new AssessmentPersistenceError("Forced rollback.", "store-unavailable");
      }),
    ).rejects.toMatchObject({ code: "store-unavailable" });
    expect(await second.findSession("assessment_pg_rollback")).toBeNull();

    await admin.query("DELETE FROM assessment_sessions WHERE id = $1", ["assessment_pg_one"]);
    expect(await second.findResult(firstResult.id)).toBeNull();
    expect(await second.findEmailJobByIdempotencyKey(`result-email:${firstResult.id}`)).toBeNull();
  }, 60_000);
});
