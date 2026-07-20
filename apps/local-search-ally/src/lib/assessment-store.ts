import { createEntityId } from "@/domain/ids";
import type { LeadAssessmentAssociation } from "@/domain/lead-assessments";
import type { AssessmentLead } from "@/domain/leads";
import { type ResultAccessToken, createResultAccessTokenValue, hashResultAccessToken } from "@/domain/result-access";
import type { ResultEmailJob } from "@/domain/result-email";
import type { AssessmentSession } from "@/domain/assessment-session";
import type { SavedAssessmentResult } from "@/domain/results";
import type { FunnelEvent, FunnelEventName } from "@/domain/events";
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
      state.emailJobs.set(job.id, job);
      state.emailJobsByIdempotencyKey.set(job.idempotencyKey, job.id);
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
    async recordEvent(input: {
      name: FunnelEventName;
      assessmentId?: string;
      leadId?: string;
      resultId?: string;
      offerSlug?: string | null;
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
