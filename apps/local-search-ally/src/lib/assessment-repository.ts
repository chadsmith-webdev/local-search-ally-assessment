import type { AssessmentSession } from "@/domain/assessment-session";
import type {
  PayPalCheckoutAttempt,
  PayPalWebhookEvent,
  ProductDeliveryEvent,
  ProductEntitlementRecord,
  Purchase,
} from "@/domain/commerce";
import type { FunnelEvent, FunnelEventName } from "@/domain/events";
import type { LeadAssessmentAssociation } from "@/domain/lead-assessments";
import type { AssessmentLead } from "@/domain/leads";
import type { ProductAccessToken, ProductEntitlement } from "@/domain/product-access";
import type { ResultAccessToken } from "@/domain/result-access";
import type { ResultEmailJob } from "@/domain/result-email";
import type { SavedAssessmentResult } from "@/domain/results";

export type AssessmentStoreAdapter = "memory" | "postgres";

export interface ResultAccessCreation {
  token: ResultAccessToken;
  tokenValue: string;
}

export interface AssessmentStoreSnapshot {
  sessions: AssessmentSession[];
  leads: AssessmentLead[];
  leadAssessments: LeadAssessmentAssociation[];
  results: SavedAssessmentResult[];
  resultAccessTokens: ResultAccessToken[];
  emailJobs: ResultEmailJob[];
  events: FunnelEvent[];
  checkoutAttempts: PayPalCheckoutAttempt[];
  purchases: Purchase[];
  productEntitlements: ProductEntitlementRecord[];
  productAccessTokens: ProductAccessToken[];
  paypalWebhookEvents: PayPalWebhookEvent[];
  productDeliveryEvents: ProductDeliveryEvent[];
}

export interface AssessmentRepository {
  adapter: AssessmentStoreAdapter;
  developmentOnly: boolean;
  createSession(session: AssessmentSession): Promise<AssessmentSession>;
  saveSession(session: AssessmentSession): Promise<AssessmentSession>;
  findSession(id: string): Promise<AssessmentSession | null>;
  saveLead(lead: AssessmentLead): Promise<AssessmentLead>;
  findLead(id: string): Promise<AssessmentLead | null>;
  findLeadByEmail(email: string): Promise<AssessmentLead | null>;
  associateLeadWithAssessment(input: LeadAssessmentAssociation): Promise<LeadAssessmentAssociation>;
  findLeadAssessments(leadId: string): Promise<LeadAssessmentAssociation[]>;
  saveResult(result: SavedAssessmentResult): Promise<SavedAssessmentResult>;
  createResultOnce(result: SavedAssessmentResult): Promise<SavedAssessmentResult>;
  findResult(id: string): Promise<SavedAssessmentResult | null>;
  findResultByAssessmentId(assessmentId: string): Promise<SavedAssessmentResult | null>;
  saveResultAccessToken(token: ResultAccessToken): Promise<ResultAccessToken>;
  findResultAccessTokensForResult(resultId: string): Promise<ResultAccessToken[]>;
  createResultAccess(result: SavedAssessmentResult, now: string): Promise<ResultAccessCreation>;
  revokeResultAccessToken(tokenId: string, now: string): Promise<ResultAccessToken | null>;
  rotateResultAccessToken(result: SavedAssessmentResult, now: string): Promise<ResultAccessCreation>;
  saveEmailJob(job: ResultEmailJob): Promise<ResultEmailJob>;
  queueResultEmailOnce(job: ResultEmailJob): Promise<ResultEmailJob>;
  findEmailJobByIdempotencyKey(idempotencyKey: string): Promise<ResultEmailJob | null>;
  saveCheckoutAttempt(attempt: PayPalCheckoutAttempt): Promise<PayPalCheckoutAttempt>;
  createCheckoutAttemptOnce(attempt: PayPalCheckoutAttempt): Promise<PayPalCheckoutAttempt>;
  findCheckoutAttempt(id: string): Promise<PayPalCheckoutAttempt | null>;
  findCheckoutAttemptByPayPalOrderId(paypalOrderId: string): Promise<PayPalCheckoutAttempt | null>;
  findCheckoutAttemptByIdempotencyKey(idempotencyKey: string): Promise<PayPalCheckoutAttempt | null>;
  savePurchase(purchase: Purchase): Promise<Purchase>;
  createPurchaseOnce(purchase: Purchase): Promise<Purchase>;
  findPurchase(id: string): Promise<Purchase | null>;
  findPurchaseByCheckoutAttemptId(checkoutAttemptId: string): Promise<Purchase | null>;
  findPurchaseByPayPalOrderId(paypalOrderId: string): Promise<Purchase | null>;
  findPurchaseByPayPalCaptureId(paypalCaptureId: string): Promise<Purchase | null>;
  saveProductEntitlement(entitlement: ProductEntitlementRecord): Promise<ProductEntitlementRecord>;
  createProductEntitlementOnce(entitlement: ProductEntitlementRecord): Promise<ProductEntitlementRecord>;
  findProductEntitlement(id: string): Promise<ProductEntitlementRecord | null>;
  findProductEntitlementByPurchaseAndProduct(purchaseId: string, productSlug: string, productVersion: string): Promise<ProductEntitlementRecord | null>;
  findProductEntitlementsForProduct(productSlug: string): Promise<ProductEntitlement[]>;
  saveProductAccessToken(token: ProductAccessToken): Promise<ProductAccessToken>;
  findProductAccessTokensForProduct(productSlug: string): Promise<ProductAccessToken[]>;
  createProductAccess(entitlement: ProductEntitlementRecord, now: string): Promise<{ token: ProductAccessToken; tokenValue: string }>;
  savePayPalWebhookEvent(event: PayPalWebhookEvent): Promise<PayPalWebhookEvent>;
  createPayPalWebhookEventOnce(event: PayPalWebhookEvent): Promise<PayPalWebhookEvent>;
  findPayPalWebhookEvent(paypalEventId: string): Promise<PayPalWebhookEvent | null>;
  saveProductDeliveryEvent(event: ProductDeliveryEvent): Promise<ProductDeliveryEvent>;
  queueProductDeliveryEventOnce(event: ProductDeliveryEvent): Promise<ProductDeliveryEvent>;
  findProductDeliveryEventByIdempotencyKey(idempotencyKey: string): Promise<ProductDeliveryEvent | null>;
  recordEvent(input: {
    name: FunnelEventName;
    assessmentId?: string;
    leadId?: string;
    resultId?: string;
    offerSlug?: string | null;
    purchaseId?: string;
    idempotencyKey: string;
    occurredAt: string;
  }): Promise<FunnelEvent | null>;
  hasProcessed(idempotencyKey: string): Promise<boolean>;
  markProcessed(idempotencyKey: string): Promise<void>;
  transaction<T>(operation: (repository: AssessmentRepository) => Promise<T>): Promise<T>;
  snapshot(): AssessmentStoreSnapshot;
  reset(): void;
}

export class AssessmentPersistenceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "store-unavailable"
      | "duplicate-key"
      | "session-conflict"
      | "lead-association-conflict"
      | "result-conflict"
      | "token-conflict"
      | "email-event-conflict"
      | "commerce-conflict"
      | "migration-mismatch"
      | "production-memory-disabled",
  ) {
    super(message);
    this.name = "AssessmentPersistenceError";
  }
}

export function normalizeLeadEmail(email: string) {
  return email.trim().toLowerCase();
}

export function resolveAssessmentStoreAdapter({
  adapter = process.env.ASSESSMENT_STORE_ADAPTER,
  nodeEnv = process.env.NODE_ENV,
}: {
  adapter?: string;
  nodeEnv?: string;
} = {}): AssessmentStoreAdapter {
  const resolved = adapter?.trim() || (nodeEnv === "test" ? "memory" : "");
  if (!resolved) {
    throw new AssessmentPersistenceError(
      "ASSESSMENT_STORE_ADAPTER must be configured. Use memory for isolated tests or postgres for persistent storage.",
      "production-memory-disabled",
    );
  }
  if (resolved !== "memory" && resolved !== "postgres") {
    throw new AssessmentPersistenceError(`Unsupported ASSESSMENT_STORE_ADAPTER value: ${resolved}.`, "store-unavailable");
  }
  if (nodeEnv === "production" && resolved === "memory") {
    throw new AssessmentPersistenceError(
      "The memory assessment store is development-only and cannot be used in production.",
      "production-memory-disabled",
    );
  }
  if (nodeEnv === "production" && resolved !== "postgres") {
    throw new AssessmentPersistenceError("Production assessment persistence must use the postgres adapter.", "store-unavailable");
  }
  return resolved;
}
