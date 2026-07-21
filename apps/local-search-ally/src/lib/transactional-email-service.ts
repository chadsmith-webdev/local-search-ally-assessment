import { createEntityId } from "@/domain/ids";
import { contractorReviewProofProduct } from "@/domain/products";
import type { ProductDeliveryEvent, ProductEntitlementRecord, Purchase } from "@/domain/commerce";
import type { AssessmentLead } from "@/domain/leads";
import type { ResultAccessCreation } from "./assessment-repository";
import type { ResultEmailJob } from "@/domain/result-email";
import type { SavedAssessmentResult } from "@/domain/results";
import type { AssessmentRepository } from "./assessment-repository";
import { getAssessmentRepository } from "./assessment-store";
import {
  assessmentResultEmailTemplateId,
  assessmentResultEmailTemplateVersion,
  productAccessEmailTemplateId,
  productAccessEmailTemplateVersion,
  renderAssessmentResultEmail,
  renderProductAccessEmail,
} from "./email-templates";
import { ResendEmailProvider, type TransactionalEmailProvider } from "./resend-email-provider";
import { getResendConfig } from "./resend-config";

const sentLike = new Set(["sent", "delivered", "delayed"]);
const terminalNoRetry = new Set(["bounced", "complained"]);

function safeMessage(value: string | undefined) {
  return value ? value.slice(0, 240) : undefined;
}

function safeCode(value: string | undefined) {
  return value ? value.slice(0, 120) : undefined;
}

function fullUrl(path: string, baseUrl = process.env.APP_BASE_URL) {
  if (!baseUrl) throw new Error("APP_BASE_URL is required to build secure email links.");
  return new URL(path, baseUrl).toString();
}

function resultDeliveryStatus(status: ResultEmailJob["status"]) {
  if (status === "development-unsent") return "queued" as const;
  if (status === "sending") return "queued" as const;
  return status;
}

function buildResultEmailData({
  lead,
  result,
  secureResultUrl,
}: {
  lead: AssessmentLead;
  result: SavedAssessmentResult;
  secureResultUrl: string;
}) {
  const diagnosisCategory = result.result.primaryDiagnosisCategory
    ? result.result.primaryDiagnosisCategory.replaceAll("-", " ")
    : "Primary diagnosis";
  return {
    recipientEmail: lead.email,
    firstName: lead.firstName,
    businessName: result.result.businessName,
    assessmentId: result.assessmentId,
    resultId: result.id,
    secureResultUrl,
    primaryDiagnosisTitle: diagnosisCategory.charAt(0).toUpperCase() + diagnosisCategory.slice(1),
    primaryDiagnosisSummary: result.result.primaryDiagnosis ?? result.result.headline,
    opportunityRange:
      result.result.status === "complete" ? result.result.opportunityEstimate.monthlyRevenueOpportunity : undefined,
    evidenceLevel: result.result.opportunityEstimate.evidenceLevel,
    confidence: result.result.opportunityEstimate.confidence,
  };
}

function providerOrDefault(provider?: TransactionalEmailProvider) {
  return provider ?? new ResendEmailProvider(getResendConfig());
}

async function sendSafely(provider: TransactionalEmailProvider | undefined, input: Parameters<TransactionalEmailProvider["send"]>[0]) {
  try {
    return await providerOrDefault(provider).send(input);
  } catch (error) {
    return {
      errorCode: error instanceof Error ? error.name : "email_provider_error",
      errorMessage: error instanceof Error ? error.message : "Resend email delivery failed.",
    };
  }
}

export async function queueResultEmailEvent({
  repository,
  sessionId,
  lead,
  result,
  access,
  now,
}: {
  repository: AssessmentRepository;
  sessionId: string;
  lead: AssessmentLead;
  result: SavedAssessmentResult;
  access: ResultAccessCreation;
  now: string;
}) {
  const idempotencyKey = `result-email:${result.id}`;
  const job: ResultEmailJob = {
    id: createEntityId("event"),
    leadId: lead.id,
    assessmentId: sessionId,
    resultId: result.id,
    recipientEmail: lead.email,
    resultUrlPath: `/results/${result.id}`,
    resultAccessTokenId: access.token.id,
    resultCategory: result.result.primaryDiagnosisCategory,
    recommendedOfferSlug: result.result.recommendedOfferSlug,
    assessmentDeliveryConsent: lead.assessmentDeliveryConsent,
    marketingConsent: lead.marketingConsent,
    provider: "resend",
    templateId: assessmentResultEmailTemplateId,
    templateVersion: assessmentResultEmailTemplateVersion,
    idempotencyKey,
    status: "queued",
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const queued = await repository.queueResultEmailOnce(job);
  await repository.recordEvent({
    name: "assessment_result_email_queued",
    assessmentId: sessionId,
    leadId: lead.id,
    resultId: result.id,
    offerSlug: result.result.recommendedOfferSlug,
    idempotencyKey,
    occurredAt: now,
  });
  return queued;
}

export async function sendAssessmentResultEmail({
  resultId,
  access,
  repository = getAssessmentRepository(),
  provider,
  now = new Date().toISOString(),
}: {
  resultId: string;
  access?: ResultAccessCreation;
  repository?: AssessmentRepository;
  provider?: TransactionalEmailProvider;
  now?: string;
}) {
  const result = await repository.findResult(resultId);
  if (!result) throw new Error("Assessment result was not found for email delivery.");
  const lead = await repository.findLead(result.leadId);
  if (!lead) throw new Error("Assessment lead was not found for email delivery.");
  const usableAccess = access ?? (await repository.createResultAccess(result, now));
  const queued = await queueResultEmailEvent({
    repository,
    sessionId: result.assessmentId,
    lead,
    result,
    access: usableAccess,
    now,
  });

  if (sentLike.has(queued.status) || terminalNoRetry.has(queued.status)) return queued;

  const sending = await repository.saveEmailJob({
    ...queued,
    provider: "resend",
    templateId: assessmentResultEmailTemplateId,
    templateVersion: assessmentResultEmailTemplateVersion,
    resultAccessTokenId: usableAccess.token.id,
    status: "sending",
    attemptCount: queued.attemptCount + 1,
    lastAttemptedAt: now,
    updatedAt: now,
    errorCode: undefined,
    errorMessage: undefined,
  });

  const response = await (async () => {
    try {
      const rendered = renderAssessmentResultEmail(
        buildResultEmailData({
          lead,
          result,
          secureResultUrl: fullUrl(`/results/${result.id}?token=${encodeURIComponent(usableAccess.tokenValue)}`),
        }),
      );
      return await sendSafely(provider, {
        to: lead.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        idempotencyKey: `assessment-result/${result.id}/${assessmentResultEmailTemplateVersion}`,
        tags: [
          { name: "template", value: assessmentResultEmailTemplateId },
          { name: "result_id", value: result.id },
        ],
      });
    } catch (error) {
      return {
        errorCode: error instanceof Error ? error.name : "email_render_error",
        errorMessage: error instanceof Error ? error.message : "Assessment result email rendering failed.",
      };
    }
  })();

  if (response.providerMessageId) {
    const sent = await repository.saveEmailJob({
      ...sending,
      status: "sent",
      providerMessageId: response.providerMessageId,
      sentAt: now,
      updatedAt: now,
    });
    await repository.saveResult({ ...result, resultEmailDeliveryStatus: "sent", updatedAt: now });
    await repository.recordEvent({
      name: "assessment_result_email_sent",
      assessmentId: result.assessmentId,
      leadId: lead.id,
      resultId: result.id,
      offerSlug: result.result.recommendedOfferSlug,
      idempotencyKey: `assessment-result-email-sent:${sent.id}`,
      occurredAt: now,
    });
    return sent;
  }

  const failed = await repository.saveEmailJob({
    ...sending,
    status: "failed",
    failedAt: now,
    errorCode: safeCode(response.errorCode),
    errorMessage: safeMessage(response.errorMessage) ?? "Resend email delivery failed.",
    updatedAt: now,
  });
  await repository.saveResult({ ...result, resultEmailDeliveryStatus: "failed", updatedAt: now });
  await repository.recordEvent({
    name: "assessment_result_email_failed",
    assessmentId: result.assessmentId,
    leadId: lead.id,
    resultId: result.id,
    offerSlug: result.result.recommendedOfferSlug,
    idempotencyKey: `assessment-result-email-failed:${failed.id}:${failed.attemptCount}`,
    occurredAt: now,
  });
  return failed;
}

export async function queueProductDeliveryEvent({
  repository,
  purchase,
  entitlement,
  lead,
  now,
}: {
  repository: AssessmentRepository;
  purchase: Purchase;
  entitlement: ProductEntitlementRecord;
  lead: AssessmentLead;
  now: string;
}) {
  const event: ProductDeliveryEvent = {
    id: createEntityId("event"),
    entitlementId: entitlement.id,
    purchaseId: purchase.id,
    leadId: purchase.leadId,
    productSlug: purchase.productSlug,
    recipientEmail: lead.email,
    provider: "resend",
    templateId: productAccessEmailTemplateId,
    templateVersion: productAccessEmailTemplateVersion,
    status: "queued",
    idempotencyKey: `product-delivery:${purchase.id}:${entitlement.id}`,
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const queued = await repository.queueProductDeliveryEventOnce(event);
  await repository.recordEvent({
    name: "product_access_email_queued",
    assessmentId: purchase.assessmentId,
    leadId: purchase.leadId,
    resultId: purchase.resultId,
    offerSlug: purchase.offerSlug,
    purchaseId: purchase.id,
    idempotencyKey: `product-access-email-queued:${queued.id}`,
    occurredAt: now,
  });
  return queued;
}

export async function sendProductAccessEmail({
  purchaseId,
  entitlement,
  repository = getAssessmentRepository(),
  provider,
  now = new Date().toISOString(),
}: {
  purchaseId: string;
  entitlement?: ProductEntitlementRecord;
  repository?: AssessmentRepository;
  provider?: TransactionalEmailProvider;
  now?: string;
}) {
  const purchase = await repository.findPurchase(purchaseId);
  if (!purchase || purchase.paymentStatus !== "paid") throw new Error("A paid purchase is required for product email delivery.");
  const activeEntitlement =
    entitlement ??
    (await repository.findProductEntitlementByPurchaseAndProduct(
      purchase.id,
      purchase.productSlug,
      purchase.productVersion,
    ));
  if (!activeEntitlement || activeEntitlement.status !== "active") {
    throw new Error("An active product entitlement is required for product email delivery.");
  }
  const lead = await repository.findLead(purchase.leadId);
  if (!lead) throw new Error("Purchase lead was not found for product email delivery.");
  const queued = await queueProductDeliveryEvent({ repository, purchase, entitlement: activeEntitlement, lead, now });
  if (sentLike.has(queued.status) || terminalNoRetry.has(queued.status)) return queued;

  const access = await repository.createProductAccess(activeEntitlement, now);
  const sending = await repository.saveProductDeliveryEvent({
    ...queued,
    provider: "resend",
    templateId: productAccessEmailTemplateId,
    templateVersion: productAccessEmailTemplateVersion,
    status: "sending",
    attemptCount: queued.attemptCount + 1,
    lastAttemptedAt: now,
    updatedAt: now,
    errorCode: undefined,
    errorMessage: undefined,
  });
  const response = await (async () => {
    try {
      const rendered = renderProductAccessEmail({
        recipientEmail: lead.email,
        firstName: lead.firstName,
        purchaseId: purchase.id,
        entitlementId: activeEntitlement.id,
        productName: contractorReviewProofProduct.name,
        productVersion: contractorReviewProofProduct.version,
        amountPaidCents: 4700,
        currency: "USD",
        secureProductUrl: fullUrl(
          `/products/contractor-review-proof-system?token=${encodeURIComponent(access.tokenValue)}`,
        ),
      });
      return await sendSafely(provider, {
        to: lead.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        idempotencyKey: `product-access/${activeEntitlement.id}/${productAccessEmailTemplateVersion}`,
        tags: [
          { name: "template", value: productAccessEmailTemplateId },
          { name: "purchase_id", value: purchase.id },
        ],
      });
    } catch (error) {
      return {
        errorCode: error instanceof Error ? error.name : "email_render_error",
        errorMessage: error instanceof Error ? error.message : "Product access email rendering failed.",
      };
    }
  })();

  if (response.providerMessageId) {
    const sent = await repository.saveProductDeliveryEvent({
      ...sending,
      status: "sent",
      providerMessageId: response.providerMessageId,
      sentAt: now,
      updatedAt: now,
    });
    await repository.recordEvent({
      name: "product_access_email_sent",
      assessmentId: purchase.assessmentId,
      leadId: purchase.leadId,
      resultId: purchase.resultId,
      offerSlug: purchase.offerSlug,
      purchaseId: purchase.id,
      idempotencyKey: `product-access-email-sent:${sent.id}`,
      occurredAt: now,
    });
    return sent;
  }

  const failed = await repository.saveProductDeliveryEvent({
    ...sending,
    status: "failed",
    failedAt: now,
    errorCode: safeCode(response.errorCode),
    errorMessage: safeMessage(response.errorMessage) ?? "Resend product access email delivery failed.",
    updatedAt: now,
  });
  await repository.recordEvent({
    name: "product_access_email_failed",
    assessmentId: purchase.assessmentId,
    leadId: purchase.leadId,
    resultId: purchase.resultId,
    offerSlug: purchase.offerSlug,
    purchaseId: purchase.id,
    idempotencyKey: `product-access-email-failed:${failed.id}:${failed.attemptCount}`,
    occurredAt: now,
  });
  return failed;
}
