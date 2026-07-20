import pg from "pg";
import { assessmentSessionSchema, type AssessmentSession } from "@/domain/assessment-session";
import { funnelEventSchema, type FunnelEvent, type FunnelEventName } from "@/domain/events";
import {
  leadAssessmentAssociationSchema,
  type LeadAssessmentAssociation,
} from "@/domain/lead-assessments";
import { assessmentLeadSchema, type AssessmentLead } from "@/domain/leads";
import {
  type ResultAccessToken,
  createResultAccessTokenValue,
  hashResultAccessToken,
  resultAccessTokenSchema,
} from "@/domain/result-access";
import { resultEmailJobSchema, type ResultEmailJob } from "@/domain/result-email";
import { savedAssessmentResultSchema, type SavedAssessmentResult } from "@/domain/results";
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
      providerMessageId: optionalString(row.provider_message_id),
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
          idempotency_key, status, attempt_count, provider_message_id, error_message, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          attempt_count = EXCLUDED.attempt_count,
          provider_message_id = EXCLUDED.provider_message_id,
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
        parsed.idempotencyKey,
        parsed.status,
        parsed.attemptCount,
        parsed.providerMessageId ?? null,
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
          idempotency_key, status, attempt_count, provider_message_id, error_message, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14, $15, $16, $17, $18)
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
        parsed.idempotencyKey,
        parsed.status,
        parsed.attemptCount,
        parsed.providerMessageId ?? null,
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

  async recordEvent(input: {
    name: FunnelEventName;
    assessmentId?: string;
    leadId?: string;
    resultId?: string;
    offerSlug?: string | null;
    idempotencyKey: string;
    occurredAt: string;
  }) {
    const saved = await this.query(
      `
        INSERT INTO funnel_events (
          id, name, assessment_id, lead_id, result_id, offer_slug, idempotency_key, occurred_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
