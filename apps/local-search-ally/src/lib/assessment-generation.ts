import { createEntityId } from "@/domain/ids";
import type { AssessmentLead } from "@/domain/leads";
import type { ResultEmailJob } from "@/domain/result-email";
import type { AssessmentSession } from "@/domain/assessment-session";
import { buildAssessmentInputFromAnswers, firstIncompleteStep } from "@/domain/assessment-session";
import type { SavedAssessmentResult } from "@/domain/results";
import { scoreAssessment } from "@/domain/scoring";
import { composeAssessmentOpenUI } from "@/openui/compose";
import { getAssessmentStore } from "./assessment-store";

export type GenerationResult =
  | {
      status: "completed";
      result: SavedAssessmentResult;
      resultUrl: string;
      tokenValue: string;
    }
  | {
      status: "failed";
      message: string;
    };

function resultUrlFor(resultId: string, tokenValue: string, origin?: string) {
  const path = `/results/${resultId}?token=${encodeURIComponent(tokenValue)}`;
  return origin ? new URL(path, origin).toString() : path;
}

function composeValidatedOpenUI(result: ReturnType<typeof scoreAssessment>) {
  const response = composeAssessmentOpenUI(result);
  const validation = validateServerSafeOpenUI(response);
  if (validation.ok) {
    return {
      response,
      rendererMode: "openui" as const,
    };
  }

  const corrected = attemptServerSafeOpenUICorrection(response);
  const correctedValidation = validateServerSafeOpenUI(corrected);
  if (correctedValidation.ok) {
    return {
      response: corrected,
      rendererMode: "openui" as const,
    };
  }

  return {
    response,
    rendererMode: "deterministic-fallback" as const,
    fallbackReason: correctedValidation.errors.join("; ") || "OpenUI validation failed.",
  };
}

function validateServerSafeOpenUI(response: string) {
  const errors: string[] = [];
  const trimmed = response.trim();
  if (!trimmed.startsWith("root = AssessmentResults(")) errors.push("Response must start with root = AssessmentResults(...).");
  if (trimmed.includes("OverallScore(")) errors.push("Response must not use OverallScore.");
  if (trimmed.includes("CategoryScore(")) errors.push("Response must not use CategoryScore.");
  if (trimmed.includes("CategoryScoreGrid(")) errors.push("Response must not use CategoryScoreGrid.");
  if (!trimmed.includes("EstimateConfidence(")) errors.push("Response must include EstimateConfidence.");
  if (!trimmed.includes("AssumptionList(")) errors.push("Response must include AssumptionList.");
  return { ok: errors.length === 0, errors };
}

function attemptServerSafeOpenUICorrection(response: string) {
  let corrected = response.trim();
  corrected = corrected.replace(/^```(?:openui|text)?\s*/i, "").replace(/```$/i, "").trim();
  if (!corrected.startsWith("root =") && corrected.includes("AssessmentResults(")) {
    const firstAssessment = corrected.indexOf("AssessmentResults(");
    corrected = `root = ${corrected.slice(firstAssessment)}`;
  }
  return corrected;
}

async function queueResultEmail({
  session,
  lead,
  result,
  secureResultUrl,
  now,
}: {
  session: AssessmentSession;
  lead: AssessmentLead;
  result: SavedAssessmentResult;
  secureResultUrl: string;
  now: string;
}) {
  const store = getAssessmentStore();
  const idempotencyKey = `result-email:${result.id}`;
  const existing = await store.findEmailJobByIdempotencyKey(idempotencyKey);
  if (existing) return existing;

  const job: ResultEmailJob = {
    id: createEntityId("event"),
    leadId: lead.id,
    assessmentId: session.id,
    resultId: result.id,
    recipientEmail: lead.email,
    secureResultUrl,
    resultCategory: result.result.primaryDiagnosisCategory,
    recommendedOfferSlug: result.result.recommendedOfferSlug,
    assessmentDeliveryConsent: lead.assessmentDeliveryConsent,
    marketingConsent: lead.marketingConsent,
    idempotencyKey,
    status: "development-unsent",
    createdAt: now,
    updatedAt: now,
  };

  await store.saveEmailJob(job);
  await store.recordEvent({
    name: "result_email_queued",
    assessmentId: session.id,
    leadId: lead.id,
    resultId: result.id,
    offerSlug: result.result.recommendedOfferSlug,
    idempotencyKey,
    occurredAt: now,
  });
  return job;
}

export async function generateAssessmentResult({
  assessmentId,
  origin,
  now = new Date().toISOString(),
}: {
  assessmentId: string;
  origin?: string;
  now?: string;
}): Promise<GenerationResult> {
  const store = getAssessmentStore();
  const session = await store.findSession(assessmentId);

  if (!session) {
    return { status: "failed", message: "Assessment session not found." };
  }

  if (session.status === "completed" && session.resultId) {
    const existingResult = await store.findResult(session.resultId);
    if (!existingResult) return { status: "failed", message: "Saved result is unavailable." };
    const access = await store.createResultAccess(existingResult, now);
    return {
      status: "completed",
      result: existingResult,
      tokenValue: access.tokenValue,
      resultUrl: resultUrlFor(existingResult.id, access.tokenValue, origin),
    };
  }

  const incompleteStep = firstIncompleteStep(session.answers);
  if (incompleteStep) {
    return { status: "failed", message: `Required ${incompleteStep} answers are missing.` };
  }

  if (!session.leadId) {
    return { status: "failed", message: "Email capture is required before generation." };
  }

  const lead = await store.findLead(session.leadId);
  if (!lead) {
    return { status: "failed", message: "The assessment lead could not be loaded." };
  }

  await store.recordEvent({
    name: "assessment_generation_started",
    assessmentId,
    leadId: lead.id,
    idempotencyKey: `generation-started:${assessmentId}`,
    occurredAt: now,
  });
  await store.saveSession({
    ...session,
    status: "generating",
    currentStep: "generating",
    updatedAt: now,
  });

  try {
    const input = buildAssessmentInputFromAnswers(session.answers);
    const scoredResult = scoreAssessment(input);
    const { response, rendererMode, fallbackReason } = composeValidatedOpenUI(scoredResult);
    const resultId = session.resultId ?? createEntityId("result");
    const savedResult: SavedAssessmentResult = {
      id: resultId,
      assessmentId,
      leadId: lead.id,
      result: scoredResult,
      openUIResponse: rendererMode === "openui" ? response : undefined,
      rendererMode,
      fallbackReason,
      resultEmailDeliveryStatus: "queued",
      createdAt: now,
      updatedAt: now,
    };

    await store.saveResult(savedResult);
    const access = await store.createResultAccess(savedResult, now);
    const resultUrl = resultUrlFor(savedResult.id, access.tokenValue, origin);
    await queueResultEmail({ session, lead, result: savedResult, secureResultUrl: resultUrl, now });
    if (rendererMode === "deterministic-fallback") {
      await store.recordEvent({
        name: "deterministic_fallback_used",
        assessmentId,
        leadId: lead.id,
        resultId: savedResult.id,
        idempotencyKey: `deterministic-fallback:${savedResult.id}`,
        occurredAt: now,
      });
    }
    await store.recordEvent({
      name: "result_access_created",
      assessmentId,
      leadId: lead.id,
      resultId: savedResult.id,
      idempotencyKey: `result-access:${savedResult.id}`,
      occurredAt: now,
    });
    await store.recordEvent({
      name: "assessment_generation_completed",
      assessmentId,
      leadId: lead.id,
      resultId: savedResult.id,
      offerSlug: scoredResult.recommendedOfferSlug,
      idempotencyKey: `generation-completed:${assessmentId}`,
      occurredAt: now,
    });
    await store.saveSession({
      ...session,
      status: "completed",
      currentStep: "completed",
      leadId: lead.id,
      resultId: savedResult.id,
      updatedAt: now,
      completedAt: now,
      generationError: undefined,
    });

    return {
      status: "completed",
      result: savedResult,
      tokenValue: access.tokenValue,
      resultUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assessment generation failed.";
    await store.recordEvent({
      name: "assessment_generation_failed",
      assessmentId,
      leadId: lead.id,
      idempotencyKey: `generation-failed:${assessmentId}:${message}`,
      occurredAt: now,
    });
    await store.saveSession({
      ...session,
      status: "generation-failed",
      currentStep: "generating",
      leadId: lead.id,
      updatedAt: now,
      generationError: message,
    });
    return { status: "failed", message };
  }
}
