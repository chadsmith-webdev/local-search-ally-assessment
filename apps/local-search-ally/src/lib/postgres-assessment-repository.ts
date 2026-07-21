import pg from "pg";
import { assessmentSessionSchema, type AssessmentSession } from "@/domain/assessment-session";
import {
  paypalCheckoutAttemptSchema,
  paypalWebhookEventSchema,
  productDeliveryEventSchema,
  productEntitlementRecordSchema,
  purchaseSchema,
  type PayPalCheckoutAttempt,
  type PayPalWebhookEvent,
  type ProductDeliveryEvent,
  type ProductEntitlementRecord,
  type Purchase,
} from "@/domain/commerce";
import { funnelEventSchema, type FunnelEvent, type FunnelEventName } from "@/domain/events";
import {
  leadAssessmentAssociationSchema,
  type LeadAssessmentAssociation,
} from "@/domain/lead-assessments";
import { assessmentLeadSchema, type AssessmentLead } from "@/domain/leads";
import {
  type ProductAccessToken,
  type ProductEntitlement,
  createProductAccessTokenValue,
  hashProductAccessToken,
  productAccessTokenSchema,
} from "@/domain/product-access";
import {
  type ResultAccessToken,
  createResultAccessTokenValue,
  hashResultAccessToken,
  resultAccessTokenSchema,
} from "@/domain/result-access";
import { resultEmailJobSchema, type ResultEmailJob } from "@/domain/result-email";
import { savedAssessmentResultSchema, type SavedAssessmentResult } from "@/domain/results";
import { resendWebhookEventSchema, type ResendWebhookEvent } from "@/domain/transactional-email";
import { createEntityId } from "@/domain/ids";
import {
  AssessmentPersistenceError,
  type AssessmentRepository,
  type AssessmentStoreSnapshot,
  normalizeLeadEmail,
} from "./assessment-repository";

const { Pool } = pg;

type Queryable = pg.Pool | pg.PoolClient;

interface PostgresRepositoryOptions {
  connectionString?: string;
  pool?: pg.Pool;
  client?: pg.PoolClient;
  schema?: string;
  inTransaction?: boolean;
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return undefined;
}

function optionalIso(value: unknown) {
  return value ? iso(value) : undefined;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function jsonValue(value: unknown) {
  return typeof value === "string" ? JSON.parse(value) : value;
}

function parsePersisted<T>(label: string, parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    throw new AssessmentPersistenceError(
      `Persisted ${label} data is malformed or no longer matches the domain schema.`,
      "migration-mismatch",
    );
  }
}

function schemaOptions(schema?: string) {
  if (!schema) return undefined;
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new AssessmentPersistenceError("DATABASE_SCHEMA contains unsupported characters.", "store-unavailable");
  }
  return `-c search_path=${schema}`;
}

function createPool(connectionString: string, schema?: string) {
  return new Pool({
    connectionString,
    ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
    options: schemaOptions(schema),
  });
}

function mapSession(row: Record<string, unknown>): AssessmentSession {
  return parsePersisted("assessment session", () =>
    assessmentSessionSchema.parse({
      id: row.id,
      status: row.status,
      currentStep: row.current_step,
      answers: jsonValue(row.answers_json),
      leadId: optionalString(row.lead_id),
      resultId: optionalString(row.result_id),
      generationError: optionalString(row.generation_error),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
      completedAt: optionalIso(row.completed_at),
    }),
  );
}

function mapLead(row: Record<string, unknown>): AssessmentLead {
  return parsePersisted("lead", () =>
    assessmentLeadSchema.parse({
      id: row.id,
      email: row.normalized_email,
      firstName: optionalString(row.first_name),
      businessName: optionalString(row.business_name),
      assessmentId: row.primary_assessment_id,
      contactSource: row.contact_source,
      resultCategory: optionalString(row.result_category),
      recommendedOfferSlug: optionalString(row.recommended_offer_slug),
      assessmentDeliveryConsent: jsonValue(row.assessment_delivery_consent_json),
      marketingConsent: row.marketing_consent_json ? jsonValue(row.marketing_consent_json) : undefined,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    }),
  );
}

function mapLeadAssessment(row: Record<string, unknown>): LeadAssessmentAssociation {
  return parsePersisted("lead assessment association", () =>
    leadAssessmentAssociationSchema.parse({
      id: row.id,
      leadId: row.lead_id,
      assessmentId: row.assessment_id,
      source: row.source,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    }),
  );
}

function mapResult(row: Record<string, unknown>): SavedAssessmentResult {
  return parsePersisted("assessment result", () =>
    savedAssessmentResultSchema.parse({
      id: row.id,
      assessmentId: row.assessment_id,
      leadId: row.lead_id,
      result: jsonValue(row.normalized_result_json),
      openUIResponse: optionalString(row.openui_response),
      rendererMode: row.renderer_mode,
      fallbackReason: optionalString(row.fallback_reason),
      accessTokenId: optionalString(row.access_token_id),
      resultEmailDeliveryStatus: row.result_email_delivery_status,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    }),
  );
}

function mapAccessToken(row: Record<string, unknown>): ResultAccessToken {
  return parsePersisted("result access token", () =>
    resultAccessTokenSchema.parse({
      id: row.id,
      resultId: row.result_id,
      assessmentId: row.assessment_id,
      leadId: row.lead_id,
      tokenDigest: row.token_digest,
      status: row.status,
      createdAt: iso(row.created_at),
      expiresAt: optionalIso(row.expires_at),
      lastUsedAt: optionalIso(row.last_used_at),
    }),
  );
}

function mapEmailJob(row: Record<string, unknown>): ResultEmailJob {
  return parsePersisted("result email event", () =>
    resultEmailJobSchema.parse({
      id: row.id,
      leadId: row.lead_id,
      assessmentId: row.assessment_id,
      resultId: row.result_id,
      recipientEmail: row.recipient_email,
      resultUrlPath: row.result_url_path,
      resultAccessTokenId: row.result_access_token_id,
      resultCategory: nullableString(row.result_category),
      recommendedOfferSlug: nullableString(row.recommended_offer_slug),
      assessmentDeliveryConsent: jsonValue(row.assessment_delivery_consent_json),
      marketingConsent: row.marketing_consent_json ? jsonValue(row.marketing_consent_json) : undefined,
      idempotencyKey: row.idempotency_key,
      status: row.status,
      attemptCount: row.attempt_count,
      provider: optionalString(row.provider),
      templateId: optionalString(row.template_id),
      templateVersion: optionalString(row.template_version),
      providerMessageId: optionalString(row.provider_message_id),
      lastAttemptedAt: optionalIso(row.last_attempted_at),
      sentAt: optionalIso(row.sent_at),
      deliveredAt: optionalIso(row.delivered_at),
      delayedAt: optionalIso(row.delayed_at),
      failedAt: optionalIso(row.failed_at),
      bouncedAt: optionalIso(row.bounced_at),
      complainedAt: optionalIso(row.complained_at),
      errorCode: optionalString(row.error_code),
      errorMessage: optionalString(row.error_message),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    }),
  );
}

function mapEvent(row: Record<string, unknown>): FunnelEvent {
  return parsePersisted("funnel event", () =>
    funnelEventSchema.parse({
      id: row.id,
      name: row.name,
      assessmentId: optionalString(row.assessment_id),
      leadId: optionalString(row.lead_id),
      resultId: optionalString(row.result_id),
      offerSlug: optionalString(row.offer_slug),
      purchaseId: optionalString(row.purchase_id),
      idempotencyKey: row.idempotency_key,
      occurredAt: iso(row.occurred_at),
    }),
  );
}

function mapCheckoutAttempt(row: Record<string, unknown>): PayPalCheckoutAttempt {
  return parsePersisted("checkout attempt", () =>
    paypalCheckoutAttemptSchema.parse({
      id: row.id,
      assessmentId: row.assessment_id,
      resultId: row.result_id,
      leadId: row.lead_id,
      offerSlug: row.offer_slug,
      productSlug: row.product_slug,
      productVersion: row.product_version,
      expectedAmountCents: row.expected_amount_cents,
      expectedCurrency: row.expected_currency,
      paypalOrderId: optionalString(row.paypal_order_id),
      idempotencyKey: row.idempotency_key,
      status: row.status,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
      expiresAt: optionalIso(row.expires_at),
      failureReason: optionalString(row.failure_reason),
    }),
  );
}

function mapPurchase(row: Record<string, unknown>): Purchase {
  return parsePersisted("purchase", () =>
    purchaseSchema.parse({
      id: row.id,
      checkoutAttemptId: row.checkout_attempt_id,
      assessmentId: row.assessment_id,
      resultId: row.result_id,
      leadId: row.lead_id,
      offerSlug: row.offer_slug,
      productSlug: row.product_slug,
      productVersion: row.product_version,
      paymentProvider: row.payment_provider,
      paypalOrderId: row.paypal_order_id,
      paypalCaptureId: row.paypal_capture_id,
      paypalPayerId: optionalString(row.paypal_payer_id),
      expectedAmountCents: row.expected_amount_cents,
      capturedAmountCents: row.captured_amount_cents,
      currency: row.currency,
      paymentStatus: row.payment_status,
      fulfillmentStatus: row.fulfillment_status,
      purchaserEmail: optionalString(row.purchaser_email),
      createdAt: iso(row.created_at),
      paidAt: optionalIso(row.paid_at),
      updatedAt: iso(row.updated_at),
      revokedAt: optionalIso(row.revoked_at),
      refundedAt: optionalIso(row.refunded_at),
    }),
  );
}

function mapProductEntitlementRecord(row: Record<string, unknown>): ProductEntitlementRecord {
  return parsePersisted("product entitlement", () =>
    productEntitlementRecordSchema.parse({
      id: row.id,
      purchaseId: row.purchase_id,
      leadId: row.lead_id,
      productSlug: row.product_slug,
      productVersion: row.product_version,
      status: row.status,
      grantedAt: iso(row.granted_at),
      lastAccessedAt: optionalIso(row.last_accessed_at),
      revokedAt: optionalIso(row.revoked_at),
      revocationReason: optionalString(row.revocation_reason),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    }),
  );
}

function mapProductAccessToken(row: Record<string, unknown>): ProductAccessToken {
  return parsePersisted("product access token", () =>
    productAccessTokenSchema.parse({
      id: row.id,
      productSlug: row.product_slug,
      entitlementId: row.entitlement_id,
      tokenDigest: row.token_digest,
      status: row.status,
      createdAt: iso(row.created_at),
      expiresAt: optionalIso(row.expires_at),
      lastUsedAt: optionalIso(row.last_used_at),
    }),
  );
}

function mapPayPalWebhookEvent(row: Record<string, unknown>): PayPalWebhookEvent {
  return parsePersisted("PayPal webhook event", () =>
    paypalWebhookEventSchema.parse({
      id: row.id,
      paypalEventId: row.paypal_event_id,
      eventType: row.event_type,
      environment: row.environment,
      processingStatus: row.processing_status,
      attemptCount: row.attempt_count,
      firstReceivedAt: iso(row.first_received_at),
      lastAttemptedAt: optionalIso(row.last_attempted_at),
      processedAt: optionalIso(row.processed_at),
      failureReason: optionalString(row.failure_reason),
    }),
  );
}

function mapResendWebhookEvent(row: Record<string, unknown>): ResendWebhookEvent {
  return parsePersisted("Resend webhook event", () =>
    resendWebhookEventSchema.parse({
      id: row.id,
      resendEventId: row.resend_event_id,
      providerEmailId: optionalString(row.provider_email_id),
      eventType: row.event_type,
      processingStatus: row.processing_status,
      attemptCount: row.attempt_count,
      firstReceivedAt: iso(row.first_received_at),
      lastAttemptedAt: optionalIso(row.last_attempted_at),
      processedAt: optionalIso(row.processed_at),
      errorCode: optionalString(row.error_code),
      errorMessage: optionalString(row.error_message),
    }),
  );
}

function mapProductDeliveryEvent(row: Record<string, unknown>): ProductDeliveryEvent {
  return parsePersisted("product delivery event", () =>
    productDeliveryEventSchema.parse({
      id: row.id,
      entitlementId: row.entitlement_id,
      purchaseId: row.purchase_id,
      leadId: row.lead_id,
      productSlug: row.product_slug,
      recipientEmail: row.recipient_email,
      provider: optionalString(row.provider),
      templateId: optionalString(row.template_id),
      templateVersion: optionalString(row.template_version),
      status: row.status,
      idempotencyKey: row.idempotency_key,
      attemptCount: row.attempt_count,
      providerMessageId: optionalString(row.provider_message_id),
      lastAttemptedAt: optionalIso(row.last_attempted_at),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
      sentAt: optionalIso(row.sent_at),
      deliveredAt: optionalIso(row.delivered_at),
      delayedAt: optionalIso(row.delayed_at),
      failedAt: optionalIso(row.failed_at),
      bouncedAt: optionalIso(row.bounced_at),
      complainedAt: optionalIso(row.complained_at),
      errorCode: optionalString(row.error_code),
      errorMessage: optionalString(row.error_message),
    }),
  );
}

function toProductEntitlement(record: ProductEntitlementRecord): ProductEntitlement {
  return {
    id: record.id,
    productSlug: record.productSlug,
    productVersion: record.productVersion,
    leadId: record.leadId,
    purchaseId: record.purchaseId,
    source: "verified-purchase",
    status: record.status,
    grantedAt: record.grantedAt,
    revokedAt: record.revokedAt,
    lastAccessedAt: record.lastAccessedAt,
  };
}

function mergeLead(existing: AssessmentLead, incoming: AssessmentLead): AssessmentLead {
  const incomingMarketingGranted = incoming.marketingConsent?.granted === true;
  return {
    ...existing,
    firstName: incoming.firstName || existing.firstName,
    businessName: incoming.businessName || existing.businessName,
    resultCategory: incoming.resultCategory ?? existing.resultCategory,
    recommendedOfferSlug: incoming.recommendedOfferSlug ?? existing.recommendedOfferSlug,
    marketingConsent: incomingMarketingGranted ? incoming.marketingConsent : existing.marketingConsent ?? incoming.marketingConsent,
    updatedAt: incoming.updatedAt,
  };
}

function dbError(error: unknown, fallbackCode: AssessmentPersistenceError["code"] = "store-unavailable") {
  if (error instanceof AssessmentPersistenceError) return error;
  const maybe = error as { code?: string; message?: string };
  if (maybe.code === "23505") {
    return new AssessmentPersistenceError("A unique persistence constraint was violated.", "duplicate-key");
  }
  if (maybe.code === "23503") {
    return new AssessmentPersistenceError("A persistence relationship is missing or invalid.", "store-unavailable");
  }
  if (maybe.code === "23514") {
    return new AssessmentPersistenceError("Persisted data failed a database status or consent constraint.", "migration-mismatch");
  }
  return new AssessmentPersistenceError(maybe.message ?? "The assessment store is unavailable.", fallbackCode);
}

export class PostgresAssessmentRepository implements AssessmentRepository {
  readonly adapter = "postgres" as const;
  readonly developmentOnly = false;
  private readonly pool?: pg.Pool;
  private readonly client?: pg.PoolClient;
  private readonly inTransaction: boolean;

  constructor(options: PostgresRepositoryOptions) {
    if (!options.pool && !options.client && !options.connectionString) {
      throw new AssessmentPersistenceError("DATABASE_URL is required for the postgres assessment store.", "store-unavailable");
    }
    this.pool = options.pool ?? (options.client ? undefined : createPool(options.connectionString!, options.schema));
    this.client = options.client;
    this.inTransaction = options.inTransaction ?? Boolean(options.client);
  }

  private get db(): Queryable {
    return this.client ?? this.pool!;
  }

  private async query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values: unknown[] = []) {
    try {
      return await this.db.query<T>(text, values);
    } catch (error) {
      throw dbError(error);
    }
  }

  async createSession(session: AssessmentSession) {
    return this.saveSession(session);
  }

  async saveSession(session: AssessmentSession) {
    const parsed = assessmentSessionSchema.parse(session);
    const result = await this.query(
      `
        INSERT INTO assessment_sessions (
          id, status, current_step, answers_json, lead_id, result_id, generation_error, created_at, updated_at, completed_at
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          current_step = EXCLUDED.current_step,
          answers_json = EXCLUDED.answers_json,
          lead_id = EXCLUDED.lead_id,
          result_id = EXCLUDED.result_id,
          generation_error = EXCLUDED.generation_error,
          updated_at = EXCLUDED.updated_at,
          completed_at = EXCLUDED.completed_at
        RETURNING *
      `,
      [
        parsed.id,
        parsed.status,
        parsed.currentStep,
        JSON.stringify(parsed.answers),
        parsed.leadId ?? null,
        parsed.resultId ?? null,
        parsed.generationError ?? null,
        parsed.createdAt,
        parsed.updatedAt,
        parsed.completedAt ?? null,
      ],
    );
    return mapSession(result.rows[0]);
  }

  async findSession(id: string) {
    const result = await this.query("SELECT * FROM assessment_sessions WHERE id = $1", [id]);
    return result.rows[0] ? mapSession(result.rows[0]) : null;
  }

  async saveLead(lead: AssessmentLead) {
    const parsed = assessmentLeadSchema.parse({ ...lead, email: normalizeLeadEmail(lead.email) });
    const inserted = await this.query(
      `
        INSERT INTO leads (
          id, normalized_email, first_name, business_name, primary_assessment_id, contact_source,
          result_category, recommended_offer_slug, assessment_delivery_consent_json, marketing_consent_json,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12)
        ON CONFLICT (normalized_email) DO NOTHING
        RETURNING *
      `,
      [
        parsed.id,
        parsed.email,
        parsed.firstName ?? null,
        parsed.businessName ?? null,
        parsed.assessmentId,
        parsed.contactSource,
        parsed.resultCategory ?? null,
        parsed.recommendedOfferSlug ?? null,
        JSON.stringify(parsed.assessmentDeliveryConsent),
        parsed.marketingConsent ? JSON.stringify(parsed.marketingConsent) : null,
        parsed.createdAt,
        parsed.updatedAt,
      ],
    );
    if (inserted.rows[0]) return mapLead(inserted.rows[0]);

    const existing = await this.findLeadByEmail(parsed.email);
    if (!existing) throw new AssessmentPersistenceError("Lead email conflict could not be resolved.", "duplicate-key");
    const merged = mergeLead(existing, parsed);
    const updated = await this.query(
      `
        UPDATE leads SET
          first_name = $2,
          business_name = $3,
          result_category = $4,
          recommended_offer_slug = $5,
          marketing_consent_json = $6::jsonb,
          updated_at = $7
        WHERE id = $1
        RETURNING *
      `,
      [
        merged.id,
        merged.firstName ?? null,
        merged.businessName ?? null,
        merged.resultCategory ?? null,
        merged.recommendedOfferSlug ?? null,
        merged.marketingConsent ? JSON.stringify(merged.marketingConsent) : null,
        merged.updatedAt,
      ],
    );
    return mapLead(updated.rows[0]);
  }

  async findLead(id: string) {
    const result = await this.query("SELECT * FROM leads WHERE id = $1", [id]);
    return result.rows[0] ? mapLead(result.rows[0]) : null;
  }

  async findLeadByEmail(email: string) {
    const result = await this.query("SELECT * FROM leads WHERE normalized_email = $1", [normalizeLeadEmail(email)]);
    return result.rows[0] ? mapLead(result.rows[0]) : null;
  }

  async associateLeadWithAssessment(input: LeadAssessmentAssociation) {
    const parsed = leadAssessmentAssociationSchema.parse(input);
    const result = await this.query(
      `
        INSERT INTO lead_assessments (id, lead_id, assessment_id, source, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (lead_id, assessment_id) DO UPDATE SET updated_at = EXCLUDED.updated_at
        RETURNING *
      `,
      [parsed.id, parsed.leadId, parsed.assessmentId, parsed.source, parsed.createdAt, parsed.updatedAt],
    );
    return mapLeadAssessment(result.rows[0]);
  }

  async findLeadAssessments(leadId: string) {
    const result = await this.query("SELECT * FROM lead_assessments WHERE lead_id = $1 ORDER BY created_at ASC", [leadId]);
    return result.rows.map(mapLeadAssessment);
  }

  async saveResult(result: SavedAssessmentResult) {
    const parsed = savedAssessmentResultSchema.parse(result);
    const saved = await this.query(
      `
        INSERT INTO assessment_results (
          id, assessment_id, lead_id, normalized_result_json, openui_response, renderer_mode, fallback_reason,
          access_token_id, result_email_delivery_status, recommended_offer_slug, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          normalized_result_json = EXCLUDED.normalized_result_json,
          openui_response = EXCLUDED.openui_response,
          renderer_mode = EXCLUDED.renderer_mode,
          fallback_reason = EXCLUDED.fallback_reason,
          access_token_id = EXCLUDED.access_token_id,
          result_email_delivery_status = EXCLUDED.result_email_delivery_status,
          recommended_offer_slug = EXCLUDED.recommended_offer_slug,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `,
      [
        parsed.id,
        parsed.assessmentId,
        parsed.leadId,
        JSON.stringify(parsed.result),
        parsed.openUIResponse ?? null,
        parsed.rendererMode,
        parsed.fallbackReason ?? null,
        parsed.accessTokenId ?? null,
        parsed.resultEmailDeliveryStatus,
        parsed.result.recommendedOfferSlug ?? null,
        parsed.createdAt,
        parsed.updatedAt,
      ],
    );
    return mapResult(saved.rows[0]);
  }

  async createResultOnce(result: SavedAssessmentResult) {
    const parsed = savedAssessmentResultSchema.parse(result);
    const saved = await this.query(
      `
        INSERT INTO assessment_results (
          id, assessment_id, lead_id, normalized_result_json, openui_response, renderer_mode, fallback_reason,
          access_token_id, result_email_delivery_status, recommended_offer_slug, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (assessment_id) DO NOTHING
        RETURNING *
      `,
      [
        parsed.id,
        parsed.assessmentId,
        parsed.leadId,
        JSON.stringify(parsed.result),
        parsed.openUIResponse ?? null,
        parsed.rendererMode,
        parsed.fallbackReason ?? null,
        parsed.accessTokenId ?? null,
        parsed.resultEmailDeliveryStatus,
        parsed.result.recommendedOfferSlug ?? null,
        parsed.createdAt,
        parsed.updatedAt,
      ],
    );
    if (saved.rows[0]) return mapResult(saved.rows[0]);
    const existing = await this.findResultByAssessmentId(parsed.assessmentId);
    if (!existing) throw new AssessmentPersistenceError("Result conflict could not be resolved.", "result-conflict");
    return existing;
  }

  async findResult(id: string) {
    const result = await this.query("SELECT * FROM assessment_results WHERE id = $1", [id]);
    return result.rows[0] ? mapResult(result.rows[0]) : null;
  }

  async findResultByAssessmentId(assessmentId: string) {
    const result = await this.query("SELECT * FROM assessment_results WHERE assessment_id = $1", [assessmentId]);
    return result.rows[0] ? mapResult(result.rows[0]) : null;
  }

  async saveResultAccessToken(token: ResultAccessToken) {
    const parsed = resultAccessTokenSchema.parse(token);
    const saved = await this.query(
      `
        INSERT INTO result_access_tokens (
          id, result_id, assessment_id, lead_id, token_digest, status, created_at, expires_at, last_used_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          expires_at = EXCLUDED.expires_at,
          last_used_at = EXCLUDED.last_used_at
        RETURNING *
      `,
      [
        parsed.id,
        parsed.resultId,
        parsed.assessmentId,
        parsed.leadId,
        parsed.tokenDigest,
        parsed.status,
        parsed.createdAt,
        parsed.expiresAt ?? null,
        parsed.lastUsedAt ?? null,
      ],
    );
    return mapAccessToken(saved.rows[0]);
  }

  async findResultAccessTokensForResult(resultId: string) {
    const result = await this.query("SELECT * FROM result_access_tokens WHERE result_id = $1 ORDER BY created_at ASC", [resultId]);
    return result.rows.map(mapAccessToken);
  }

  async createResultAccess(result: SavedAssessmentResult, now: string) {
    const tokenValue = createResultAccessTokenValue();
    const token = await this.saveResultAccessToken({
      id: createEntityId("access"),
      resultId: result.id,
      assessmentId: result.assessmentId,
      leadId: result.leadId,
      tokenDigest: hashResultAccessToken(tokenValue),
      status: "active",
      createdAt: now,
    });
    await this.query(
      "UPDATE assessment_results SET access_token_id = COALESCE(access_token_id, $2), updated_at = $3 WHERE id = $1",
      [result.id, token.id, now],
    );
    return { token, tokenValue };
  }

  async revokeResultAccessToken(tokenId: string, now: string) {
    const result = await this.query(
      "UPDATE result_access_tokens SET status = 'revoked', last_used_at = $2 WHERE id = $1 RETURNING *",
      [tokenId, now],
    );
    return result.rows[0] ? mapAccessToken(result.rows[0]) : null;
  }

  async rotateResultAccessToken(result: SavedAssessmentResult, now: string) {
    return this.transaction(async (transaction) => {
      const tokens = await transaction.findResultAccessTokensForResult(result.id);
      await Promise.all(tokens.filter((token) => token.status === "active").map((token) => transaction.revokeResultAccessToken(token.id, now)));
      return transaction.createResultAccess(result, now);
    });
  }

  async saveEmailJob(job: ResultEmailJob) {
    const parsed = resultEmailJobSchema.parse(job);
    const saved = await this.query(
      `
        INSERT INTO result_email_events (
          id, lead_id, assessment_id, result_id, recipient_email, result_url_path, result_access_token_id,
          result_category, recommended_offer_slug, assessment_delivery_consent_json, marketing_consent_json,
          provider, template_id, template_version, idempotency_key, status, attempt_count, provider_message_id,
          last_attempted_at, sent_at, delivered_at, delayed_at, failed_at, bounced_at, complained_at,
          error_code, error_message, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
        )
        ON CONFLICT (id) DO UPDATE SET
          provider = EXCLUDED.provider,
          template_id = EXCLUDED.template_id,
          template_version = EXCLUDED.template_version,
          status = EXCLUDED.status,
          attempt_count = EXCLUDED.attempt_count,
          provider_message_id = EXCLUDED.provider_message_id,
          last_attempted_at = EXCLUDED.last_attempted_at,
          sent_at = EXCLUDED.sent_at,
          delivered_at = EXCLUDED.delivered_at,
          delayed_at = EXCLUDED.delayed_at,
          failed_at = EXCLUDED.failed_at,
          bounced_at = EXCLUDED.bounced_at,
          complained_at = EXCLUDED.complained_at,
          error_code = EXCLUDED.error_code,
          error_message = EXCLUDED.error_message,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `,
      [
        parsed.id,
        parsed.leadId,
        parsed.assessmentId,
        parsed.resultId,
        parsed.recipientEmail,
        parsed.resultUrlPath,
        parsed.resultAccessTokenId,
        parsed.resultCategory,
        parsed.recommendedOfferSlug,
        JSON.stringify(parsed.assessmentDeliveryConsent),
        parsed.marketingConsent ? JSON.stringify(parsed.marketingConsent) : null,
        parsed.provider ?? null,
        parsed.templateId ?? null,
        parsed.templateVersion ?? null,
        parsed.idempotencyKey,
        parsed.status,
        parsed.attemptCount,
        parsed.providerMessageId ?? null,
        parsed.lastAttemptedAt ?? null,
        parsed.sentAt ?? null,
        parsed.deliveredAt ?? null,
        parsed.delayedAt ?? null,
        parsed.failedAt ?? null,
        parsed.bouncedAt ?? null,
        parsed.complainedAt ?? null,
        parsed.errorCode ?? null,
        parsed.errorMessage ?? null,
        parsed.createdAt,
        parsed.updatedAt,
      ],
    );
    return mapEmailJob(saved.rows[0]);
  }

  async queueResultEmailOnce(job: ResultEmailJob) {
    const parsed = resultEmailJobSchema.parse(job);
    const saved = await this.query(
      `
        INSERT INTO result_email_events (
          id, lead_id, assessment_id, result_id, recipient_email, result_url_path, result_access_token_id,
          result_category, recommended_offer_slug, assessment_delivery_consent_json, marketing_consent_json,
          provider, template_id, template_version, idempotency_key, status, attempt_count, provider_message_id,
          last_attempted_at, sent_at, delivered_at, delayed_at, failed_at, bounced_at, complained_at,
          error_code, error_message, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING *
      `,
      [
        parsed.id,
        parsed.leadId,
        parsed.assessmentId,
        parsed.resultId,
        parsed.recipientEmail,
        parsed.resultUrlPath,
        parsed.resultAccessTokenId,
        parsed.resultCategory,
        parsed.recommendedOfferSlug,
        JSON.stringify(parsed.assessmentDeliveryConsent),
        parsed.marketingConsent ? JSON.stringify(parsed.marketingConsent) : null,
        parsed.provider ?? null,
        parsed.templateId ?? null,
        parsed.templateVersion ?? null,
        parsed.idempotencyKey,
        parsed.status,
        parsed.attemptCount,
        parsed.providerMessageId ?? null,
        parsed.lastAttemptedAt ?? null,
        parsed.sentAt ?? null,
        parsed.deliveredAt ?? null,
        parsed.delayedAt ?? null,
        parsed.failedAt ?? null,
        parsed.bouncedAt ?? null,
        parsed.complainedAt ?? null,
        parsed.errorCode ?? null,
        parsed.errorMessage ?? null,
        parsed.createdAt,
        parsed.updatedAt,
      ],
    );
    if (saved.rows[0]) return mapEmailJob(saved.rows[0]);
    const existing = await this.findEmailJobByIdempotencyKey(parsed.idempotencyKey);
    if (!existing) throw new AssessmentPersistenceError("Result email conflict could not be resolved.", "email-event-conflict");
    return existing;
  }

  async findEmailJobByIdempotencyKey(idempotencyKey: string) {
    const result = await this.query("SELECT * FROM result_email_events WHERE idempotency_key = $1", [idempotencyKey]);
    return result.rows[0] ? mapEmailJob(result.rows[0]) : null;
  }

  async findEmailJobByProviderMessageId(providerMessageId: string) {
    const result = await this.query("SELECT * FROM result_email_events WHERE provider_message_id = $1", [providerMessageId]);
    return result.rows[0] ? mapEmailJob(result.rows[0]) : null;
  }

  async saveCheckoutAttempt(attempt: PayPalCheckoutAttempt) {
    const parsed = paypalCheckoutAttemptSchema.parse(attempt);
    const result = await this.query(
      `
        INSERT INTO paypal_checkout_attempts (
          id, assessment_id, result_id, lead_id, offer_slug, product_slug, product_version,
          expected_amount_cents, expected_currency, paypal_order_id, idempotency_key, status,
          created_at, updated_at, expires_at, failure_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          paypal_order_id = EXCLUDED.paypal_order_id,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at,
          expires_at = EXCLUDED.expires_at,
          failure_reason = EXCLUDED.failure_reason
        RETURNING *
      `,
      [
        parsed.id,
        parsed.assessmentId,
        parsed.resultId,
        parsed.leadId,
        parsed.offerSlug,
        parsed.productSlug,
        parsed.productVersion,
        parsed.expectedAmountCents,
        parsed.expectedCurrency,
        parsed.paypalOrderId ?? null,
        parsed.idempotencyKey,
        parsed.status,
        parsed.createdAt,
        parsed.updatedAt,
        parsed.expiresAt ?? null,
        parsed.failureReason ?? null,
      ],
    );
    return mapCheckoutAttempt(result.rows[0]);
  }

  async createCheckoutAttemptOnce(attempt: PayPalCheckoutAttempt) {
    const existing = await this.findCheckoutAttemptByIdempotencyKey(attempt.idempotencyKey);
    if (existing) return existing;
    return this.saveCheckoutAttempt(attempt);
  }

  async findCheckoutAttempt(id: string) {
    const result = await this.query("SELECT * FROM paypal_checkout_attempts WHERE id = $1", [id]);
    return result.rows[0] ? mapCheckoutAttempt(result.rows[0]) : null;
  }

  async findCheckoutAttemptByPayPalOrderId(paypalOrderId: string) {
    const result = await this.query("SELECT * FROM paypal_checkout_attempts WHERE paypal_order_id = $1", [paypalOrderId]);
    return result.rows[0] ? mapCheckoutAttempt(result.rows[0]) : null;
  }

  async findCheckoutAttemptByIdempotencyKey(idempotencyKey: string) {
    const result = await this.query("SELECT * FROM paypal_checkout_attempts WHERE idempotency_key = $1", [idempotencyKey]);
    return result.rows[0] ? mapCheckoutAttempt(result.rows[0]) : null;
  }

  async savePurchase(purchase: Purchase) {
    const parsed = purchaseSchema.parse(purchase);
    const result = await this.query(
      `
        INSERT INTO purchases (
          id, checkout_attempt_id, assessment_id, result_id, lead_id, offer_slug, product_slug, product_version,
          payment_provider, paypal_order_id, paypal_capture_id, paypal_payer_id, expected_amount_cents,
          captured_amount_cents, currency, payment_status, fulfillment_status, purchaser_email,
          created_at, paid_at, updated_at, revoked_at, refunded_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (paypal_order_id) DO UPDATE SET
          paypal_capture_id = EXCLUDED.paypal_capture_id,
          payment_status = EXCLUDED.payment_status,
          fulfillment_status = EXCLUDED.fulfillment_status,
          paid_at = EXCLUDED.paid_at,
          updated_at = EXCLUDED.updated_at,
          refunded_at = EXCLUDED.refunded_at
        RETURNING *
      `,
      [
        parsed.id,
        parsed.checkoutAttemptId,
        parsed.assessmentId,
        parsed.resultId,
        parsed.leadId,
        parsed.offerSlug,
        parsed.productSlug,
        parsed.productVersion,
        parsed.paymentProvider,
        parsed.paypalOrderId,
        parsed.paypalCaptureId,
        parsed.paypalPayerId ?? null,
        parsed.expectedAmountCents,
        parsed.capturedAmountCents,
        parsed.currency,
        parsed.paymentStatus,
        parsed.fulfillmentStatus,
        parsed.purchaserEmail ?? null,
        parsed.createdAt,
        parsed.paidAt ?? null,
        parsed.updatedAt,
        parsed.revokedAt ?? null,
        parsed.refundedAt ?? null,
      ],
    );
    return mapPurchase(result.rows[0]);
  }

  async createPurchaseOnce(purchase: Purchase) {
    const existing = await this.findPurchaseByPayPalOrderId(purchase.paypalOrderId);
    if (existing) return existing;
    return this.savePurchase(purchase);
  }

  async findPurchase(id: string) {
    const result = await this.query("SELECT * FROM purchases WHERE id = $1", [id]);
    return result.rows[0] ? mapPurchase(result.rows[0]) : null;
  }

  async findPurchaseByCheckoutAttemptId(checkoutAttemptId: string) {
    const result = await this.query("SELECT * FROM purchases WHERE checkout_attempt_id = $1", [checkoutAttemptId]);
    return result.rows[0] ? mapPurchase(result.rows[0]) : null;
  }

  async findPurchaseByPayPalOrderId(paypalOrderId: string) {
    const result = await this.query("SELECT * FROM purchases WHERE paypal_order_id = $1", [paypalOrderId]);
    return result.rows[0] ? mapPurchase(result.rows[0]) : null;
  }

  async findPurchaseByPayPalCaptureId(paypalCaptureId: string) {
    const result = await this.query("SELECT * FROM purchases WHERE paypal_capture_id = $1", [paypalCaptureId]);
    return result.rows[0] ? mapPurchase(result.rows[0]) : null;
  }

  async saveProductEntitlement(entitlement: ProductEntitlementRecord) {
    const parsed = productEntitlementRecordSchema.parse(entitlement);
    const result = await this.query(
      `
        INSERT INTO product_entitlements (
          id, purchase_id, lead_id, product_slug, product_version, status, granted_at, last_accessed_at,
          revoked_at, revocation_reason, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (purchase_id, product_slug, product_version) DO UPDATE SET
          status = EXCLUDED.status,
          last_accessed_at = EXCLUDED.last_accessed_at,
          revoked_at = EXCLUDED.revoked_at,
          revocation_reason = EXCLUDED.revocation_reason,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `,
      [
        parsed.id,
        parsed.purchaseId,
        parsed.leadId,
        parsed.productSlug,
        parsed.productVersion,
        parsed.status,
        parsed.grantedAt,
        parsed.lastAccessedAt ?? null,
        parsed.revokedAt ?? null,
        parsed.revocationReason ?? null,
        parsed.createdAt,
        parsed.updatedAt,
      ],
    );
    return mapProductEntitlementRecord(result.rows[0]);
  }

  async createProductEntitlementOnce(entitlement: ProductEntitlementRecord) {
    const existing = await this.findProductEntitlementByPurchaseAndProduct(
      entitlement.purchaseId,
      entitlement.productSlug,
      entitlement.productVersion,
    );
    if (existing) return existing;
    return this.saveProductEntitlement(entitlement);
  }

  async findProductEntitlement(id: string) {
    const result = await this.query("SELECT * FROM product_entitlements WHERE id = $1", [id]);
    return result.rows[0] ? mapProductEntitlementRecord(result.rows[0]) : null;
  }

  async findProductEntitlementByPurchaseAndProduct(purchaseId: string, productSlug: string, productVersion: string) {
    const result = await this.query(
      "SELECT * FROM product_entitlements WHERE purchase_id = $1 AND product_slug = $2 AND product_version = $3",
      [purchaseId, productSlug, productVersion],
    );
    return result.rows[0] ? mapProductEntitlementRecord(result.rows[0]) : null;
  }

  async findProductEntitlementsForProduct(productSlug: string) {
    const result = await this.query("SELECT * FROM product_entitlements WHERE product_slug = $1", [productSlug]);
    return result.rows.map((row) => toProductEntitlement(mapProductEntitlementRecord(row)));
  }

  async saveProductAccessToken(token: ProductAccessToken) {
    const parsed = productAccessTokenSchema.parse(token);
    const result = await this.query(
      `
        INSERT INTO product_access_tokens (
          id, product_slug, entitlement_id, token_digest, status, created_at, expires_at, last_used_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          expires_at = EXCLUDED.expires_at,
          last_used_at = EXCLUDED.last_used_at
        RETURNING *
      `,
      [
        parsed.id,
        parsed.productSlug,
        parsed.entitlementId,
        parsed.tokenDigest,
        parsed.status,
        parsed.createdAt,
        parsed.expiresAt ?? null,
        parsed.lastUsedAt ?? null,
      ],
    );
    return mapProductAccessToken(result.rows[0]);
  }

  async findProductAccessTokensForProduct(productSlug: string) {
    const result = await this.query("SELECT * FROM product_access_tokens WHERE product_slug = $1 ORDER BY created_at ASC", [productSlug]);
    return result.rows.map(mapProductAccessToken);
  }

  async createProductAccess(entitlement: ProductEntitlementRecord, now: string) {
    const tokenValue = createProductAccessTokenValue();
    const token = await this.saveProductAccessToken({
      id: createEntityId("access"),
      productSlug: entitlement.productSlug,
      entitlementId: entitlement.id,
      tokenDigest: hashProductAccessToken(tokenValue),
      status: "active",
      createdAt: now,
    });
    return { token, tokenValue };
  }

  async savePayPalWebhookEvent(event: PayPalWebhookEvent) {
    const parsed = paypalWebhookEventSchema.parse(event);
    const result = await this.query(
      `
        INSERT INTO paypal_webhook_events (
          id, paypal_event_id, event_type, environment, processing_status, attempt_count,
          first_received_at, last_attempted_at, processed_at, failure_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (paypal_event_id) DO UPDATE SET
          processing_status = EXCLUDED.processing_status,
          attempt_count = EXCLUDED.attempt_count,
          last_attempted_at = EXCLUDED.last_attempted_at,
          processed_at = EXCLUDED.processed_at,
          failure_reason = EXCLUDED.failure_reason
        RETURNING *
      `,
      [
        parsed.id,
        parsed.paypalEventId,
        parsed.eventType,
        parsed.environment,
        parsed.processingStatus,
        parsed.attemptCount,
        parsed.firstReceivedAt,
        parsed.lastAttemptedAt ?? null,
        parsed.processedAt ?? null,
        parsed.failureReason ?? null,
      ],
    );
    return mapPayPalWebhookEvent(result.rows[0]);
  }

  async createPayPalWebhookEventOnce(event: PayPalWebhookEvent) {
    const existing = await this.findPayPalWebhookEvent(event.paypalEventId);
    if (existing) {
      return this.savePayPalWebhookEvent({
        ...existing,
        attemptCount: existing.attemptCount + 1,
        lastAttemptedAt: event.lastAttemptedAt ?? event.firstReceivedAt,
      });
    }
    return this.savePayPalWebhookEvent(event);
  }

  async findPayPalWebhookEvent(paypalEventId: string) {
    const result = await this.query("SELECT * FROM paypal_webhook_events WHERE paypal_event_id = $1", [paypalEventId]);
    return result.rows[0] ? mapPayPalWebhookEvent(result.rows[0]) : null;
  }

  async saveResendWebhookEvent(event: ResendWebhookEvent) {
    const parsed = resendWebhookEventSchema.parse(event);
    const result = await this.query(
      `
        INSERT INTO resend_webhook_events (
          id, resend_event_id, provider_email_id, event_type, processing_status, attempt_count,
          first_received_at, last_attempted_at, processed_at, error_code, error_message
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (resend_event_id) DO UPDATE SET
          provider_email_id = EXCLUDED.provider_email_id,
          processing_status = EXCLUDED.processing_status,
          attempt_count = EXCLUDED.attempt_count,
          last_attempted_at = EXCLUDED.last_attempted_at,
          processed_at = EXCLUDED.processed_at,
          error_code = EXCLUDED.error_code,
          error_message = EXCLUDED.error_message
        RETURNING *
      `,
      [
        parsed.id,
        parsed.resendEventId,
        parsed.providerEmailId ?? null,
        parsed.eventType,
        parsed.processingStatus,
        parsed.attemptCount,
        parsed.firstReceivedAt,
        parsed.lastAttemptedAt ?? null,
        parsed.processedAt ?? null,
        parsed.errorCode ?? null,
        parsed.errorMessage ?? null,
      ],
    );
    return mapResendWebhookEvent(result.rows[0]);
  }

  async createResendWebhookEventOnce(event: ResendWebhookEvent) {
    const existing = await this.findResendWebhookEvent(event.resendEventId);
    if (existing) {
      return this.saveResendWebhookEvent({
        ...existing,
        attemptCount: existing.attemptCount + 1,
        lastAttemptedAt: event.lastAttemptedAt ?? event.firstReceivedAt,
      });
    }
    return this.saveResendWebhookEvent(event);
  }

  async findResendWebhookEvent(resendEventId: string) {
    const result = await this.query("SELECT * FROM resend_webhook_events WHERE resend_event_id = $1", [resendEventId]);
    return result.rows[0] ? mapResendWebhookEvent(result.rows[0]) : null;
  }

  async saveProductDeliveryEvent(event: ProductDeliveryEvent) {
    const parsed = productDeliveryEventSchema.parse(event);
    const result = await this.query(
      `
        INSERT INTO product_delivery_events (
          id, entitlement_id, purchase_id, lead_id, product_slug, recipient_email, provider, template_id,
          template_version, status, idempotency_key, attempt_count, provider_message_id, last_attempted_at,
          created_at, updated_at, sent_at, delivered_at, delayed_at, failed_at, bounced_at, complained_at,
          error_code, error_message
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        )
        ON CONFLICT (id) DO UPDATE SET
          provider = EXCLUDED.provider,
          template_id = EXCLUDED.template_id,
          template_version = EXCLUDED.template_version,
          status = EXCLUDED.status,
          attempt_count = EXCLUDED.attempt_count,
          provider_message_id = EXCLUDED.provider_message_id,
          last_attempted_at = EXCLUDED.last_attempted_at,
          updated_at = EXCLUDED.updated_at,
          sent_at = EXCLUDED.sent_at,
          delivered_at = EXCLUDED.delivered_at,
          delayed_at = EXCLUDED.delayed_at,
          failed_at = EXCLUDED.failed_at,
          bounced_at = EXCLUDED.bounced_at,
          complained_at = EXCLUDED.complained_at,
          error_code = EXCLUDED.error_code,
          error_message = EXCLUDED.error_message
        RETURNING *
      `,
      [
        parsed.id,
        parsed.entitlementId,
        parsed.purchaseId,
        parsed.leadId,
        parsed.productSlug,
        parsed.recipientEmail,
        parsed.provider ?? null,
        parsed.templateId ?? null,
        parsed.templateVersion ?? null,
        parsed.status,
        parsed.idempotencyKey,
        parsed.attemptCount,
        parsed.providerMessageId ?? null,
        parsed.lastAttemptedAt ?? null,
        parsed.createdAt,
        parsed.updatedAt,
        parsed.sentAt ?? null,
        parsed.deliveredAt ?? null,
        parsed.delayedAt ?? null,
        parsed.failedAt ?? null,
        parsed.bouncedAt ?? null,
        parsed.complainedAt ?? null,
        parsed.errorCode ?? null,
        parsed.errorMessage ?? null,
      ],
    );
    return mapProductDeliveryEvent(result.rows[0]);
  }

  async queueProductDeliveryEventOnce(event: ProductDeliveryEvent) {
    const existing = await this.findProductDeliveryEventByIdempotencyKey(event.idempotencyKey);
    if (existing) return existing;
    return this.saveProductDeliveryEvent(event);
  }

  async findProductDeliveryEventByIdempotencyKey(idempotencyKey: string) {
    const result = await this.query("SELECT * FROM product_delivery_events WHERE idempotency_key = $1", [idempotencyKey]);
    return result.rows[0] ? mapProductDeliveryEvent(result.rows[0]) : null;
  }

  async findProductDeliveryEventByProviderMessageId(providerMessageId: string) {
    const result = await this.query("SELECT * FROM product_delivery_events WHERE provider_message_id = $1", [providerMessageId]);
    return result.rows[0] ? mapProductDeliveryEvent(result.rows[0]) : null;
  }

  async recordEvent(input: {
    name: FunnelEventName;
    assessmentId?: string;
    leadId?: string;
    resultId?: string;
    offerSlug?: string | null;
    purchaseId?: string;
    idempotencyKey: string;
    occurredAt: string;
  }) {
    const saved = await this.query(
      `
        INSERT INTO funnel_events (
          id, name, assessment_id, lead_id, result_id, offer_slug, purchase_id, idempotency_key, occurred_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING *
      `,
      [
        createEntityId("event"),
        input.name,
        input.assessmentId ?? null,
        input.leadId ?? null,
        input.resultId ?? null,
        input.offerSlug ?? null,
        input.purchaseId ?? null,
        input.idempotencyKey,
        input.occurredAt,
      ],
    );
    return saved.rows[0] ? mapEvent(saved.rows[0]) : null;
  }

  async hasProcessed(idempotencyKey: string) {
    const result = await this.query(
      "SELECT 1 FROM funnel_events WHERE idempotency_key = $1 UNION SELECT 1 FROM result_email_events WHERE idempotency_key = $1 LIMIT 1",
      [idempotencyKey],
    );
    return Boolean(result.rows[0]);
  }

  async markProcessed(idempotencyKey: string) {
    await this.recordEvent({
      name: "assessment_resumed",
      idempotencyKey,
      occurredAt: new Date().toISOString(),
    });
  }

  async transaction<T>(operation: (repository: AssessmentRepository) => Promise<T>): Promise<T> {
    if (this.inTransaction) return operation(this);
    const client = await this.pool!.connect();
    try {
      await client.query("BEGIN");
      const transactionRepository = new PostgresAssessmentRepository({
        client,
        inTransaction: true,
      });
      const value = await operation(transactionRepository);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw dbError(error);
    } finally {
      client.release();
    }
  }

  snapshot(): AssessmentStoreSnapshot {
    throw new AssessmentPersistenceError("Postgres snapshots are not available through the production repository.", "store-unavailable");
  }

  reset(): void {
    throw new AssessmentPersistenceError("Postgres reset is disabled outside isolated test setup.", "store-unavailable");
  }
}

export function createPostgresAssessmentRepository({
  connectionString = process.env.DATABASE_URL,
  schema = process.env.DATABASE_SCHEMA,
}: {
  connectionString?: string;
  schema?: string;
} = {}) {
  if (!connectionString) {
    throw new AssessmentPersistenceError("DATABASE_URL is required for the postgres assessment store.", "store-unavailable");
  }
  return new PostgresAssessmentRepository({ connectionString, schema });
}
