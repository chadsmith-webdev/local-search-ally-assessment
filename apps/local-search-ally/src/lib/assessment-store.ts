import { createEntityId } from "@/domain/ids";
import type {
  PayPalCheckoutAttempt,
  PayPalWebhookEvent,
  ProductDeliveryEvent,
  ProductEntitlementRecord,
  Purchase,
} from "@/domain/commerce";
import type { LeadAssessmentAssociation } from "@/domain/lead-assessments";
import type { AssessmentLead } from "@/domain/leads";
import {
  type ProductAccessToken,
  type ProductEntitlement,
  createProductAccessTokenValue,
  hashProductAccessToken,
} from "@/domain/product-access";
import { type ResultAccessToken, createResultAccessTokenValue, hashResultAccessToken } from "@/domain/result-access";
import type { ResultEmailJob } from "@/domain/result-email";
import type { AssessmentSession } from "@/domain/assessment-session";
import type { SavedAssessmentResult } from "@/domain/results";
import type { FunnelEvent, FunnelEventName } from "@/domain/events";
import type { ResendWebhookEvent } from "@/domain/transactional-email";
import { addDaysIso, getBusinessPolicyConfig } from "@/domain/policies";
import {
  AssessmentPersistenceError,
  type AssessmentRepository,
  type AssessmentStoreSnapshot,
  normalizeLeadEmail,
  resolveAssessmentStoreAdapter,
} from "./assessment-repository";
import { createPostgresAssessmentRepository } from "./postgres-assessment-repository";

interface AssessmentStoreState {
  sessions: Map<string, AssessmentSession>;
  leads: Map<string, AssessmentLead>;
  leadIdsByEmail: Map<string, string>;
  leadAssessments: Map<string, LeadAssessmentAssociation>;
  leadAssessmentIdsByLeadId: Map<string, Set<string>>;
  results: Map<string, SavedAssessmentResult>;
  resultIdsByAssessmentId: Map<string, string>;
  resultAccessTokens: Map<string, ResultAccessToken>;
  resultAccessTokenIdsByResultId: Map<string, Set<string>>;
  activeTokenDigestIds: Map<string, string>;
  emailJobs: Map<string, ResultEmailJob>;
  emailJobsByIdempotencyKey: Map<string, string>;
  emailJobsByProviderMessageId: Map<string, string>;
  checkoutAttempts: Map<string, PayPalCheckoutAttempt>;
  checkoutAttemptIdsByIdempotencyKey: Map<string, string>;
  checkoutAttemptIdsByPayPalOrderId: Map<string, string>;
  purchases: Map<string, Purchase>;
  purchaseIdsByCheckoutAttemptId: Map<string, string>;
  purchaseIdsByPayPalOrderId: Map<string, string>;
  purchaseIdsByPayPalCaptureId: Map<string, string>;
  productEntitlements: Map<string, ProductEntitlementRecord>;
  productEntitlementIdsByPurchaseProduct: Map<string, string>;
  productAccessTokens: Map<string, ProductAccessToken>;
  productAccessTokenIdsByProductSlug: Map<string, Set<string>>;
  activeProductAccessTokenDigestIds: Map<string, string>;
  paypalWebhookEvents: Map<string, PayPalWebhookEvent>;
  resendWebhookEvents: Map<string, ResendWebhookEvent>;
  productDeliveryEvents: Map<string, ProductDeliveryEvent>;
  productDeliveryEventIdsByIdempotencyKey: Map<string, string>;
  productDeliveryEventIdsByProviderMessageId: Map<string, string>;
  events: FunnelEvent[];
  idempotencyKeys: Set<string>;
}

const globalStore = globalThis as typeof globalThis & {
  __localSearchAllyAssessmentStore?: AssessmentStoreState;
  __localSearchAllyAssessmentRepository?: AssessmentRepository;
  __localSearchAllyPostgresAssessmentRepository?: AssessmentRepository;
  __localSearchAllyAssessmentMemoryWarningShown?: boolean;
  __localSearchAllyAssessmentPostgresLogShown?: boolean;
};

function createState(): AssessmentStoreState {
  return {
    sessions: new Map(),
    leads: new Map(),
    leadIdsByEmail: new Map(),
    leadAssessments: new Map(),
    leadAssessmentIdsByLeadId: new Map(),
    results: new Map(),
    resultIdsByAssessmentId: new Map(),
    resultAccessTokens: new Map(),
    resultAccessTokenIdsByResultId: new Map(),
    activeTokenDigestIds: new Map(),
    emailJobs: new Map(),
    emailJobsByIdempotencyKey: new Map(),
    emailJobsByProviderMessageId: new Map(),
    checkoutAttempts: new Map(),
    checkoutAttemptIdsByIdempotencyKey: new Map(),
    checkoutAttemptIdsByPayPalOrderId: new Map(),
    purchases: new Map(),
    purchaseIdsByCheckoutAttemptId: new Map(),
    purchaseIdsByPayPalOrderId: new Map(),
    purchaseIdsByPayPalCaptureId: new Map(),
    productEntitlements: new Map(),
    productEntitlementIdsByPurchaseProduct: new Map(),
    productAccessTokens: new Map(),
    productAccessTokenIdsByProductSlug: new Map(),
    activeProductAccessTokenDigestIds: new Map(),
    paypalWebhookEvents: new Map(),
    resendWebhookEvents: new Map(),
    productDeliveryEvents: new Map(),
    productDeliveryEventIdsByIdempotencyKey: new Map(),
    productDeliveryEventIdsByProviderMessageId: new Map(),
    events: [],
    idempotencyKeys: new Set(),
  };
}

function cloneState(state: AssessmentStoreState): AssessmentStoreState {
  return {
    sessions: new Map(state.sessions),
    leads: new Map(state.leads),
    leadIdsByEmail: new Map(state.leadIdsByEmail),
    leadAssessments: new Map(state.leadAssessments),
    leadAssessmentIdsByLeadId: new Map([...state.leadAssessmentIdsByLeadId].map(([key, values]) => [key, new Set(values)])),
    results: new Map(state.results),
    resultIdsByAssessmentId: new Map(state.resultIdsByAssessmentId),
    resultAccessTokens: new Map(state.resultAccessTokens),
    resultAccessTokenIdsByResultId: new Map([...state.resultAccessTokenIdsByResultId].map(([key, values]) => [key, new Set(values)])),
    activeTokenDigestIds: new Map(state.activeTokenDigestIds),
    emailJobs: new Map(state.emailJobs),
    emailJobsByIdempotencyKey: new Map(state.emailJobsByIdempotencyKey),
    emailJobsByProviderMessageId: new Map(state.emailJobsByProviderMessageId),
    checkoutAttempts: new Map(state.checkoutAttempts),
    checkoutAttemptIdsByIdempotencyKey: new Map(state.checkoutAttemptIdsByIdempotencyKey),
    checkoutAttemptIdsByPayPalOrderId: new Map(state.checkoutAttemptIdsByPayPalOrderId),
    purchases: new Map(state.purchases),
    purchaseIdsByCheckoutAttemptId: new Map(state.purchaseIdsByCheckoutAttemptId),
    purchaseIdsByPayPalOrderId: new Map(state.purchaseIdsByPayPalOrderId),
    purchaseIdsByPayPalCaptureId: new Map(state.purchaseIdsByPayPalCaptureId),
    productEntitlements: new Map(state.productEntitlements),
    productEntitlementIdsByPurchaseProduct: new Map(state.productEntitlementIdsByPurchaseProduct),
    productAccessTokens: new Map(state.productAccessTokens),
    productAccessTokenIdsByProductSlug: new Map([...state.productAccessTokenIdsByProductSlug].map(([key, values]) => [key, new Set(values)])),
    activeProductAccessTokenDigestIds: new Map(state.activeProductAccessTokenDigestIds),
    paypalWebhookEvents: new Map(state.paypalWebhookEvents),
    resendWebhookEvents: new Map(state.resendWebhookEvents),
    productDeliveryEvents: new Map(state.productDeliveryEvents),
    productDeliveryEventIdsByIdempotencyKey: new Map(state.productDeliveryEventIdsByIdempotencyKey),
    productDeliveryEventIdsByProviderMessageId: new Map(state.productDeliveryEventIdsByProviderMessageId),
    events: [...state.events],
    idempotencyKeys: new Set(state.idempotencyKeys),
  };
}

function copyStateInto(target: AssessmentStoreState, source: AssessmentStoreState) {
  target.sessions = source.sessions;
  target.leads = source.leads;
  target.leadIdsByEmail = source.leadIdsByEmail;
  target.leadAssessments = source.leadAssessments;
  target.leadAssessmentIdsByLeadId = source.leadAssessmentIdsByLeadId;
  target.results = source.results;
  target.resultIdsByAssessmentId = source.resultIdsByAssessmentId;
  target.resultAccessTokens = source.resultAccessTokens;
  target.resultAccessTokenIdsByResultId = source.resultAccessTokenIdsByResultId;
  target.activeTokenDigestIds = source.activeTokenDigestIds;
  target.emailJobs = source.emailJobs;
  target.emailJobsByIdempotencyKey = source.emailJobsByIdempotencyKey;
  target.emailJobsByProviderMessageId = source.emailJobsByProviderMessageId;
  target.checkoutAttempts = source.checkoutAttempts;
  target.checkoutAttemptIdsByIdempotencyKey = source.checkoutAttemptIdsByIdempotencyKey;
  target.checkoutAttemptIdsByPayPalOrderId = source.checkoutAttemptIdsByPayPalOrderId;
  target.purchases = source.purchases;
  target.purchaseIdsByCheckoutAttemptId = source.purchaseIdsByCheckoutAttemptId;
  target.purchaseIdsByPayPalOrderId = source.purchaseIdsByPayPalOrderId;
  target.purchaseIdsByPayPalCaptureId = source.purchaseIdsByPayPalCaptureId;
  target.productEntitlements = source.productEntitlements;
  target.productEntitlementIdsByPurchaseProduct = source.productEntitlementIdsByPurchaseProduct;
  target.productAccessTokens = source.productAccessTokens;
  target.productAccessTokenIdsByProductSlug = source.productAccessTokenIdsByProductSlug;
  target.activeProductAccessTokenDigestIds = source.activeProductAccessTokenDigestIds;
  target.paypalWebhookEvents = source.paypalWebhookEvents;
  target.resendWebhookEvents = source.resendWebhookEvents;
  target.productDeliveryEvents = source.productDeliveryEvents;
  target.productDeliveryEventIdsByIdempotencyKey = source.productDeliveryEventIdsByIdempotencyKey;
  target.productDeliveryEventIdsByProviderMessageId = source.productDeliveryEventIdsByProviderMessageId;
  target.events = source.events;
  target.idempotencyKeys = source.idempotencyKeys;
}

function leadAssessmentKey(leadId: string, assessmentId: string) {
  return `${leadId}:${assessmentId}`;
}

function indexResultAccessToken(state: AssessmentStoreState, token: ResultAccessToken) {
  const resultTokenIds = state.resultAccessTokenIdsByResultId.get(token.resultId) ?? new Set<string>();
  resultTokenIds.add(token.id);
  state.resultAccessTokenIdsByResultId.set(token.resultId, resultTokenIds);
  if (token.status === "active") state.activeTokenDigestIds.set(token.tokenDigest, token.id);
}

function removeActiveTokenDigest(state: AssessmentStoreState, token: ResultAccessToken) {
  const activeId = state.activeTokenDigestIds.get(token.tokenDigest);
  if (activeId === token.id) state.activeTokenDigestIds.delete(token.tokenDigest);
}

function productEntitlementKey(purchaseId: string, productSlug: string, productVersion: string) {
  return `${purchaseId}:${productSlug}:${productVersion}`;
}

function indexProductAccessToken(state: AssessmentStoreState, token: ProductAccessToken) {
  const tokenIds = state.productAccessTokenIdsByProductSlug.get(token.productSlug) ?? new Set<string>();
  tokenIds.add(token.id);
  state.productAccessTokenIdsByProductSlug.set(token.productSlug, tokenIds);
  if (token.status === "active") state.activeProductAccessTokenDigestIds.set(token.tokenDigest, token.id);
}

function createMemoryAssessmentRepositoryFromState(state: AssessmentStoreState): AssessmentRepository {
  const repository: AssessmentRepository = {
    adapter: "memory",
    developmentOnly: true,
    async createSession(session) {
      return this.saveSession(session);
    },
    async saveSession(session: AssessmentSession) {
      state.sessions.set(session.id, session);
      return session;
    },
    async findSession(id: string) {
      return state.sessions.get(id) ?? null;
    },
    async saveLead(lead: AssessmentLead) {
      const normalizedEmail = normalizeLeadEmail(lead.email);
      const existingId = state.leadIdsByEmail.get(normalizedEmail);
      if (existingId && existingId !== lead.id) {
        throw new AssessmentPersistenceError(`Lead email already exists: ${normalizedEmail}.`, "duplicate-key");
      }
      const normalizedLead = { ...lead, email: normalizedEmail };
      state.leads.set(normalizedLead.id, normalizedLead);
      state.leadIdsByEmail.set(normalizedEmail, normalizedLead.id);
      return normalizedLead;
    },
    async findLead(id: string) {
      return state.leads.get(id) ?? null;
    },
    async findLeadByEmail(email: string) {
      const id = state.leadIdsByEmail.get(normalizeLeadEmail(email));
      return id ? state.leads.get(id) ?? null : null;
    },
    async associateLeadWithAssessment(input: LeadAssessmentAssociation) {
      const key = leadAssessmentKey(input.leadId, input.assessmentId);
      const existing = state.leadAssessments.get(key);
      if (existing) return existing;
      state.leadAssessments.set(key, input);
      const leadAssessmentIds = state.leadAssessmentIdsByLeadId.get(input.leadId) ?? new Set<string>();
      leadAssessmentIds.add(key);
      state.leadAssessmentIdsByLeadId.set(input.leadId, leadAssessmentIds);
      return input;
    },
    async findLeadAssessments(leadId: string) {
      const ids = state.leadAssessmentIdsByLeadId.get(leadId) ?? new Set<string>();
      return [...ids].map((id) => state.leadAssessments.get(id)).filter((record): record is LeadAssessmentAssociation => Boolean(record));
    },
    async saveResult(result: SavedAssessmentResult) {
      const existingId = state.resultIdsByAssessmentId.get(result.assessmentId);
      if (existingId && existingId !== result.id) {
        throw new AssessmentPersistenceError(`A result already exists for assessment ${result.assessmentId}.`, "result-conflict");
      }
      state.results.set(result.id, result);
      state.resultIdsByAssessmentId.set(result.assessmentId, result.id);
      return result;
    },
    async createResultOnce(result: SavedAssessmentResult) {
      const existing = await this.findResultByAssessmentId(result.assessmentId);
      if (existing) return existing;
      return this.saveResult(result);
    },
    async findResult(id: string) {
      return state.results.get(id) ?? null;
    },
    async findResultByAssessmentId(assessmentId: string) {
      const id = state.resultIdsByAssessmentId.get(assessmentId);
      return id ? state.results.get(id) ?? null : null;
    },
    async saveResultAccessToken(token: ResultAccessToken) {
      const existingActiveId = token.status === "active" ? state.activeTokenDigestIds.get(token.tokenDigest) : undefined;
      if (existingActiveId && existingActiveId !== token.id) {
        throw new AssessmentPersistenceError("An active result-access token with this digest already exists.", "token-conflict");
      }
      const prior = state.resultAccessTokens.get(token.id);
      if (prior && prior.status === "active" && token.status !== "active") removeActiveTokenDigest(state, prior);
      state.resultAccessTokens.set(token.id, token);
      indexResultAccessToken(state, token);
      return token;
    },
    async findResultAccessTokensForResult(resultId: string) {
      const ids = state.resultAccessTokenIdsByResultId.get(resultId) ?? new Set<string>();
      return [...ids].map((id) => state.resultAccessTokens.get(id)).filter((token): token is ResultAccessToken => Boolean(token));
    },
    async createResultAccess(result: SavedAssessmentResult, now: string) {
      const tokenValue = createResultAccessTokenValue();
      const token: ResultAccessToken = {
        id: createEntityId("access"),
        resultId: result.id,
        assessmentId: result.assessmentId,
        leadId: result.leadId,
        tokenDigest: hashResultAccessToken(tokenValue),
        status: "active",
        createdAt: now,
        expiresAt: addDaysIso(now, getBusinessPolicyConfig().secureLinkExpirationDays),
      };
      await this.saveResultAccessToken(token);
      const existingResult = state.results.get(result.id);
      if (existingResult && !existingResult.accessTokenId) {
        await this.saveResult({
          ...existingResult,
          accessTokenId: token.id,
          updatedAt: now,
        });
      }
      return { token, tokenValue };
    },
    async revokeResultAccessToken(tokenId: string, now: string) {
      const token = state.resultAccessTokens.get(tokenId);
      if (!token) return null;
      const revoked = { ...token, status: "revoked" as const, lastUsedAt: now };
      await this.saveResultAccessToken(revoked);
      return revoked;
    },
    async rotateResultAccessToken(result: SavedAssessmentResult, now: string) {
      const existingTokens = await this.findResultAccessTokensForResult(result.id);
      await Promise.all(
        existingTokens
          .filter((token) => token.status === "active")
          .map((token) => this.revokeResultAccessToken(token.id, now)),
      );
      return this.createResultAccess(result, now);
    },
    async saveEmailJob(job: ResultEmailJob) {
      const existingId = state.emailJobsByIdempotencyKey.get(job.idempotencyKey);
      if (existingId && existingId !== job.id) {
        throw new AssessmentPersistenceError(`Result email idempotency key already exists: ${job.idempotencyKey}.`, "email-event-conflict");
      }
      const existingProviderId = job.providerMessageId ? state.emailJobsByProviderMessageId.get(job.providerMessageId) : undefined;
      if (existingProviderId && existingProviderId !== job.id) {
        throw new AssessmentPersistenceError("Result email provider message ID already exists.", "email-event-conflict");
      }
      state.emailJobs.set(job.id, job);
      state.emailJobsByIdempotencyKey.set(job.idempotencyKey, job.id);
      if (job.providerMessageId) state.emailJobsByProviderMessageId.set(job.providerMessageId, job.id);
      return job;
    },
    async queueResultEmailOnce(job: ResultEmailJob) {
      const existing = await this.findEmailJobByIdempotencyKey(job.idempotencyKey);
      if (existing) return existing;
      return this.saveEmailJob(job);
    },
    async findEmailJobByIdempotencyKey(idempotencyKey: string) {
      const id = state.emailJobsByIdempotencyKey.get(idempotencyKey);
      return id ? state.emailJobs.get(id) ?? null : null;
    },
    async findEmailJobByProviderMessageId(providerMessageId: string) {
      const id = state.emailJobsByProviderMessageId.get(providerMessageId);
      return id ? state.emailJobs.get(id) ?? null : null;
    },
    async saveCheckoutAttempt(attempt: PayPalCheckoutAttempt) {
      const existingOrderId = attempt.paypalOrderId ? state.checkoutAttemptIdsByPayPalOrderId.get(attempt.paypalOrderId) : undefined;
      if (existingOrderId && existingOrderId !== attempt.id) {
        throw new AssessmentPersistenceError("PayPal order already belongs to another checkout attempt.", "commerce-conflict");
      }
      const existingIdempotencyId = state.checkoutAttemptIdsByIdempotencyKey.get(attempt.idempotencyKey);
      if (existingIdempotencyId && existingIdempotencyId !== attempt.id) {
        throw new AssessmentPersistenceError("Checkout idempotency key already exists.", "commerce-conflict");
      }
      state.checkoutAttempts.set(attempt.id, attempt);
      state.checkoutAttemptIdsByIdempotencyKey.set(attempt.idempotencyKey, attempt.id);
      if (attempt.paypalOrderId) state.checkoutAttemptIdsByPayPalOrderId.set(attempt.paypalOrderId, attempt.id);
      return attempt;
    },
    async createCheckoutAttemptOnce(attempt: PayPalCheckoutAttempt) {
      const existing = await this.findCheckoutAttemptByIdempotencyKey(attempt.idempotencyKey);
      if (existing) return existing;
      return this.saveCheckoutAttempt(attempt);
    },
    async findCheckoutAttempt(id: string) {
      return state.checkoutAttempts.get(id) ?? null;
    },
    async findCheckoutAttemptByPayPalOrderId(paypalOrderId: string) {
      const id = state.checkoutAttemptIdsByPayPalOrderId.get(paypalOrderId);
      return id ? state.checkoutAttempts.get(id) ?? null : null;
    },
    async findCheckoutAttemptByIdempotencyKey(idempotencyKey: string) {
      const id = state.checkoutAttemptIdsByIdempotencyKey.get(idempotencyKey);
      return id ? state.checkoutAttempts.get(id) ?? null : null;
    },
    async savePurchase(purchase: Purchase) {
      const checkoutId = state.purchaseIdsByCheckoutAttemptId.get(purchase.checkoutAttemptId);
      if (checkoutId && checkoutId !== purchase.id) throw new AssessmentPersistenceError("Checkout attempt already has a purchase.", "commerce-conflict");
      const orderId = state.purchaseIdsByPayPalOrderId.get(purchase.paypalOrderId);
      if (orderId && orderId !== purchase.id) throw new AssessmentPersistenceError("PayPal order already has a purchase.", "commerce-conflict");
      const captureId = state.purchaseIdsByPayPalCaptureId.get(purchase.paypalCaptureId);
      if (captureId && captureId !== purchase.id) throw new AssessmentPersistenceError("PayPal capture already has a purchase.", "commerce-conflict");
      state.purchases.set(purchase.id, purchase);
      state.purchaseIdsByCheckoutAttemptId.set(purchase.checkoutAttemptId, purchase.id);
      state.purchaseIdsByPayPalOrderId.set(purchase.paypalOrderId, purchase.id);
      state.purchaseIdsByPayPalCaptureId.set(purchase.paypalCaptureId, purchase.id);
      return purchase;
    },
    async createPurchaseOnce(purchase: Purchase) {
      const existing = await this.findPurchaseByPayPalOrderId(purchase.paypalOrderId);
      if (existing) return existing;
      return this.savePurchase(purchase);
    },
    async findPurchase(id: string) {
      return state.purchases.get(id) ?? null;
    },
    async findPurchaseByCheckoutAttemptId(checkoutAttemptId: string) {
      const id = state.purchaseIdsByCheckoutAttemptId.get(checkoutAttemptId);
      return id ? state.purchases.get(id) ?? null : null;
    },
    async findPurchaseByPayPalOrderId(paypalOrderId: string) {
      const id = state.purchaseIdsByPayPalOrderId.get(paypalOrderId);
      return id ? state.purchases.get(id) ?? null : null;
    },
    async findPurchaseByPayPalCaptureId(paypalCaptureId: string) {
      const id = state.purchaseIdsByPayPalCaptureId.get(paypalCaptureId);
      return id ? state.purchases.get(id) ?? null : null;
    },
    async saveProductEntitlement(entitlement: ProductEntitlementRecord) {
      const key = productEntitlementKey(entitlement.purchaseId, entitlement.productSlug, entitlement.productVersion);
      const existingId = state.productEntitlementIdsByPurchaseProduct.get(key);
      if (existingId && existingId !== entitlement.id) {
        throw new AssessmentPersistenceError("Purchase already has this product entitlement.", "commerce-conflict");
      }
      state.productEntitlements.set(entitlement.id, entitlement);
      state.productEntitlementIdsByPurchaseProduct.set(key, entitlement.id);
      return entitlement;
    },
    async createProductEntitlementOnce(entitlement: ProductEntitlementRecord) {
      const existing = await this.findProductEntitlementByPurchaseAndProduct(
        entitlement.purchaseId,
        entitlement.productSlug,
        entitlement.productVersion,
      );
      if (existing) return existing;
      return this.saveProductEntitlement(entitlement);
    },
    async findProductEntitlement(id: string) {
      return state.productEntitlements.get(id) ?? null;
    },
    async findProductEntitlementByPurchaseAndProduct(purchaseId: string, productSlug: string, productVersion: string) {
      const id = state.productEntitlementIdsByPurchaseProduct.get(productEntitlementKey(purchaseId, productSlug, productVersion));
      return id ? state.productEntitlements.get(id) ?? null : null;
    },
    async findProductEntitlementsForProduct(productSlug: string) {
      return [...state.productEntitlements.values()]
        .filter((entitlement) => entitlement.productSlug === productSlug)
        .map((entitlement): ProductEntitlement => ({
          id: entitlement.id,
          productSlug: entitlement.productSlug,
          productVersion: entitlement.productVersion,
          leadId: entitlement.leadId,
          purchaseId: entitlement.purchaseId,
          source: "verified-purchase",
          status: entitlement.status,
          grantedAt: entitlement.grantedAt,
          revokedAt: entitlement.revokedAt,
          lastAccessedAt: entitlement.lastAccessedAt,
        }));
    },
    async saveProductAccessToken(token: ProductAccessToken) {
      const existingId = token.status === "active" ? state.activeProductAccessTokenDigestIds.get(token.tokenDigest) : undefined;
      if (existingId && existingId !== token.id) {
        throw new AssessmentPersistenceError("An active product-access token with this digest already exists.", "token-conflict");
      }
      state.productAccessTokens.set(token.id, token);
      indexProductAccessToken(state, token);
      return token;
    },
    async findProductAccessTokensForProduct(productSlug: string) {
      const ids = state.productAccessTokenIdsByProductSlug.get(productSlug) ?? new Set<string>();
      return [...ids].map((id) => state.productAccessTokens.get(id)).filter((token): token is ProductAccessToken => Boolean(token));
    },
    async createProductAccess(entitlement: ProductEntitlementRecord, now: string) {
      const tokenValue = createProductAccessTokenValue();
      const token: ProductAccessToken = {
        id: createEntityId("access"),
        productSlug: entitlement.productSlug,
        entitlementId: entitlement.id,
        tokenDigest: hashProductAccessToken(tokenValue),
        status: "active",
        createdAt: now,
        expiresAt: addDaysIso(now, getBusinessPolicyConfig().secureLinkExpirationDays),
      };
      await this.saveProductAccessToken(token);
      return { token, tokenValue };
    },
    async savePayPalWebhookEvent(event: PayPalWebhookEvent) {
      state.paypalWebhookEvents.set(event.paypalEventId, event);
      return event;
    },
    async createPayPalWebhookEventOnce(event: PayPalWebhookEvent) {
      const existing = await this.findPayPalWebhookEvent(event.paypalEventId);
      if (existing) {
        const updated = { ...existing, attemptCount: existing.attemptCount + 1, lastAttemptedAt: event.lastAttemptedAt ?? event.firstReceivedAt };
        state.paypalWebhookEvents.set(updated.paypalEventId, updated);
        return updated;
      }
      return this.savePayPalWebhookEvent(event);
    },
    async findPayPalWebhookEvent(paypalEventId: string) {
      return state.paypalWebhookEvents.get(paypalEventId) ?? null;
    },
    async saveResendWebhookEvent(event: ResendWebhookEvent) {
      state.resendWebhookEvents.set(event.resendEventId, event);
      return event;
    },
    async createResendWebhookEventOnce(event: ResendWebhookEvent) {
      const existing = await this.findResendWebhookEvent(event.resendEventId);
      if (existing) {
        const updated = {
          ...existing,
          attemptCount: existing.attemptCount + 1,
          lastAttemptedAt: event.lastAttemptedAt ?? event.firstReceivedAt,
        };
        state.resendWebhookEvents.set(updated.resendEventId, updated);
        return updated;
      }
      return this.saveResendWebhookEvent(event);
    },
    async findResendWebhookEvent(resendEventId: string) {
      return state.resendWebhookEvents.get(resendEventId) ?? null;
    },
    async saveProductDeliveryEvent(event: ProductDeliveryEvent) {
      const existingId = state.productDeliveryEventIdsByIdempotencyKey.get(event.idempotencyKey);
      if (existingId && existingId !== event.id) throw new AssessmentPersistenceError("Product delivery event already exists.", "commerce-conflict");
      const existingProviderId = event.providerMessageId ? state.productDeliveryEventIdsByProviderMessageId.get(event.providerMessageId) : undefined;
      if (existingProviderId && existingProviderId !== event.id) {
        throw new AssessmentPersistenceError("Product delivery provider message ID already exists.", "commerce-conflict");
      }
      state.productDeliveryEvents.set(event.id, event);
      state.productDeliveryEventIdsByIdempotencyKey.set(event.idempotencyKey, event.id);
      if (event.providerMessageId) state.productDeliveryEventIdsByProviderMessageId.set(event.providerMessageId, event.id);
      return event;
    },
    async queueProductDeliveryEventOnce(event: ProductDeliveryEvent) {
      const existing = await this.findProductDeliveryEventByIdempotencyKey(event.idempotencyKey);
      if (existing) return existing;
      return this.saveProductDeliveryEvent(event);
    },
    async findProductDeliveryEventByIdempotencyKey(idempotencyKey: string) {
      const id = state.productDeliveryEventIdsByIdempotencyKey.get(idempotencyKey);
      return id ? state.productDeliveryEvents.get(id) ?? null : null;
    },
    async findProductDeliveryEventByProviderMessageId(providerMessageId: string) {
      const id = state.productDeliveryEventIdsByProviderMessageId.get(providerMessageId);
      return id ? state.productDeliveryEvents.get(id) ?? null : null;
    },
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
      if (state.idempotencyKeys.has(input.idempotencyKey)) return null;
      state.idempotencyKeys.add(input.idempotencyKey);
      const event: FunnelEvent = {
        id: createEntityId("event"),
        name: input.name,
        assessmentId: input.assessmentId,
        leadId: input.leadId,
        resultId: input.resultId,
        offerSlug: input.offerSlug ?? undefined,
        purchaseId: input.purchaseId,
        idempotencyKey: input.idempotencyKey,
        occurredAt: input.occurredAt,
      };
      state.events.push(event);
      return event;
    },
    async hasProcessed(idempotencyKey: string) {
      return state.idempotencyKeys.has(idempotencyKey);
    },
    async markProcessed(idempotencyKey: string) {
      state.idempotencyKeys.add(idempotencyKey);
    },
    async transaction<T>(operation: (repository: AssessmentRepository) => Promise<T>) {
      const before = cloneState(state);
      try {
        return await operation(this);
      } catch (error) {
        copyStateInto(state, before);
        throw error;
      }
    },
    snapshot(): AssessmentStoreSnapshot {
      return {
        sessions: [...state.sessions.values()],
        leads: [...state.leads.values()],
        leadAssessments: [...state.leadAssessments.values()],
        results: [...state.results.values()],
        resultAccessTokens: [...state.resultAccessTokens.values()],
        emailJobs: [...state.emailJobs.values()],
        events: [...state.events],
        checkoutAttempts: [...state.checkoutAttempts.values()],
        purchases: [...state.purchases.values()],
        productEntitlements: [...state.productEntitlements.values()],
        productAccessTokens: [...state.productAccessTokens.values()],
        paypalWebhookEvents: [...state.paypalWebhookEvents.values()],
        resendWebhookEvents: [...state.resendWebhookEvents.values()],
        productDeliveryEvents: [...state.productDeliveryEvents.values()],
      };
    },
    reset() {
      copyStateInto(state, createState());
    },
  };

  return repository;
}

export function createMemoryAssessmentRepository(seedState = createState()) {
  return createMemoryAssessmentRepositoryFromState(seedState);
}

export function getAssessmentRepository(): AssessmentRepository {
  const adapter = resolveAssessmentStoreAdapter();
  if (adapter === "postgres") {
    if (!process.env.DATABASE_URL) {
      throw new AssessmentPersistenceError("DATABASE_URL is required for the postgres assessment store.", "store-unavailable");
    }
    if (!globalStore.__localSearchAllyAssessmentPostgresLogShown) {
      console.info("Local Search Ally assessment persistence adapter: postgres.");
      globalStore.__localSearchAllyAssessmentPostgresLogShown = true;
    }
    globalStore.__localSearchAllyPostgresAssessmentRepository ??= createPostgresAssessmentRepository();
    return globalStore.__localSearchAllyPostgresAssessmentRepository;
  }

  if (process.env.NODE_ENV === "development" && !globalStore.__localSearchAllyAssessmentMemoryWarningShown) {
    console.warn("Local Search Ally assessment persistence is using the development-only memory adapter.");
    globalStore.__localSearchAllyAssessmentMemoryWarningShown = true;
  }

  globalStore.__localSearchAllyAssessmentStore ??= createState();
  globalStore.__localSearchAllyAssessmentRepository ??= createMemoryAssessmentRepositoryFromState(
    globalStore.__localSearchAllyAssessmentStore,
  );
  return globalStore.__localSearchAllyAssessmentRepository;
}

export const getAssessmentStore = getAssessmentRepository;
