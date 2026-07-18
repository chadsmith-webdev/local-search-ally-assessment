import { createEntityId } from "@/domain/ids";
import type { AssessmentLead } from "@/domain/leads";
import { type ResultAccessToken, createResultAccessTokenValue, hashResultAccessToken } from "@/domain/result-access";
import type { ResultEmailJob } from "@/domain/result-email";
import type { AssessmentSession } from "@/domain/assessment-session";
import type { SavedAssessmentResult } from "@/domain/results";
import type { FunnelEvent, FunnelEventName } from "@/domain/events";

interface AssessmentStoreState {
  sessions: Map<string, AssessmentSession>;
  leads: Map<string, AssessmentLead>;
  leadIdsByEmail: Map<string, string>;
  results: Map<string, SavedAssessmentResult>;
  resultAccessTokens: Map<string, ResultAccessToken>;
  resultAccessTokenValuesById: Map<string, string>;
  emailJobs: Map<string, ResultEmailJob>;
  emailJobsByIdempotencyKey: Map<string, string>;
  events: FunnelEvent[];
  idempotencyKeys: Set<string>;
}

const globalStore = globalThis as typeof globalThis & {
  __localSearchAllyAssessmentStore?: AssessmentStoreState;
};

function createState(): AssessmentStoreState {
  return {
    sessions: new Map(),
    leads: new Map(),
    leadIdsByEmail: new Map(),
    results: new Map(),
    resultAccessTokens: new Map(),
    resultAccessTokenValuesById: new Map(),
    emailJobs: new Map(),
    emailJobsByIdempotencyKey: new Map(),
    events: [],
    idempotencyKeys: new Set(),
  };
}

export function getAssessmentStore() {
  globalStore.__localSearchAllyAssessmentStore ??= createState();
  const state = globalStore.__localSearchAllyAssessmentStore;

  return {
    developmentOnly: true,
    async saveSession(session: AssessmentSession) {
      state.sessions.set(session.id, session);
      return session;
    },
    async findSession(id: string) {
      return state.sessions.get(id) ?? null;
    },
    async saveLead(lead: AssessmentLead) {
      state.leads.set(lead.id, lead);
      state.leadIdsByEmail.set(lead.email.toLowerCase(), lead.id);
      return lead;
    },
    async findLead(id: string) {
      return state.leads.get(id) ?? null;
    },
    async findLeadByEmail(email: string) {
      const id = state.leadIdsByEmail.get(email.toLowerCase());
      return id ? state.leads.get(id) ?? null : null;
    },
    async saveResult(result: SavedAssessmentResult) {
      state.results.set(result.id, result);
      return result;
    },
    async findResult(id: string) {
      return state.results.get(id) ?? null;
    },
    async saveResultAccessToken(token: ResultAccessToken, tokenValue: string) {
      state.resultAccessTokens.set(token.id, token);
      state.resultAccessTokenValuesById.set(token.id, tokenValue);
      return token;
    },
    async findResultAccessTokensForResult(resultId: string) {
      return [...state.resultAccessTokens.values()].filter((token) => token.resultId === resultId);
    },
    async createResultAccess(result: SavedAssessmentResult, now: string) {
      if (result.accessTokenId) {
        const existing = state.resultAccessTokens.get(result.accessTokenId);
        const existingValue = state.resultAccessTokenValuesById.get(result.accessTokenId);
        if (existing && existingValue) return { token: existing, tokenValue: existingValue };
      }

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
      await this.saveResultAccessToken(token, tokenValue);
      return { token, tokenValue };
    },
    async saveEmailJob(job: ResultEmailJob) {
      state.emailJobs.set(job.id, job);
      state.emailJobsByIdempotencyKey.set(job.idempotencyKey, job.id);
      return job;
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
    snapshot() {
      return {
        sessions: [...state.sessions.values()],
        leads: [...state.leads.values()],
        results: [...state.results.values()],
        resultAccessTokens: [...state.resultAccessTokens.values()],
        emailJobs: [...state.emailJobs.values()],
        events: [...state.events],
      };
    },
    reset() {
      globalStore.__localSearchAllyAssessmentStore = createState();
    },
  };
}
