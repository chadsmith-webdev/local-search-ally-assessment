import { Resend } from "resend";
import type { FunnelEventName } from "@/domain/events";
import { createEntityId } from "@/domain/ids";
import { resendWebhookEventTypeSchema, type TransactionalEmailStatus } from "@/domain/transactional-email";
import type { AssessmentRepository } from "./assessment-repository";
import { getAssessmentRepository } from "./assessment-store";
import { getResendConfig, getResendWebhookSecret } from "./resend-config";

interface ResendVerifiedEvent {
  id?: string;
  type?: string;
  data?: {
    email_id?: string;
    id?: string;
  };
}

type ResendWebhookVerifier = (input: {
  rawBody: string;
  headers: { id: string; timestamp: string; signature: string };
}) => ResendVerifiedEvent;

function headerValue(headers: Headers, primary: string, fallback: string) {
  return headers.get(primary) ?? headers.get(fallback);
}

function statusFor(eventType: string): TransactionalEmailStatus | null {
  switch (eventType) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.delivery_delayed":
      return "delayed";
    case "email.failed":
      return "failed";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    default:
      return null;
  }
}

function timestampPatch(status: TransactionalEmailStatus, now: string) {
  switch (status) {
    case "sent":
      return { sentAt: now };
    case "delivered":
      return { deliveredAt: now };
    case "delayed":
      return { delayedAt: now };
    case "failed":
      return { failedAt: now };
    case "bounced":
      return { bouncedAt: now };
    case "complained":
      return { complainedAt: now };
    default:
      return {};
  }
}

function statusRank(status: TransactionalEmailStatus) {
  switch (status) {
    case "queued":
    case "development-unsent":
      return 0;
    case "sending":
      return 1;
    case "sent":
      return 2;
    case "delayed":
      return 3;
    case "delivered":
      return 4;
    case "failed":
      return 5;
    case "bounced":
    case "complained":
      return 6;
  }
}

function mostAdvancedEmailStatus(current: TransactionalEmailStatus, incoming: TransactionalEmailStatus) {
  return statusRank(incoming) >= statusRank(current) ? incoming : current;
}

function resultEmailEventName(status: TransactionalEmailStatus): FunnelEventName {
  switch (status) {
    case "delivered":
      return "assessment_result_email_delivered";
    case "delayed":
      return "assessment_result_email_delayed";
    case "bounced":
      return "assessment_result_email_bounced";
    case "failed":
    case "complained":
      return "assessment_result_email_failed";
    default:
      return "assessment_result_email_sent";
  }
}

function productEmailEventName(status: TransactionalEmailStatus): FunnelEventName {
  switch (status) {
    case "delivered":
      return "product_access_email_delivered";
    case "delayed":
      return "product_access_email_delayed";
    case "bounced":
      return "product_access_email_bounced";
    case "failed":
    case "complained":
      return "product_access_email_failed";
    default:
      return "product_access_email_sent";
  }
}

function defaultVerifyResendWebhook({
  rawBody,
  headers,
}: {
  rawBody: string;
  headers: { id: string; timestamp: string; signature: string };
}) {
  return new Resend(getResendConfig().apiKey).webhooks.verify({
    payload: rawBody,
    headers,
    webhookSecret: getResendWebhookSecret(),
  }) as ResendVerifiedEvent;
}

export async function processResendWebhook({
  rawBody,
  headers,
  repository = getAssessmentRepository(),
  now = new Date().toISOString(),
  verifyEvent = defaultVerifyResendWebhook,
}: {
  rawBody: string;
  headers: Headers;
  repository?: AssessmentRepository;
  now?: string;
  verifyEvent?: ResendWebhookVerifier;
}) {
  const id = headerValue(headers, "webhook-id", "svix-id");
  const timestamp = headerValue(headers, "webhook-timestamp", "svix-timestamp");
  const signature = headerValue(headers, "webhook-signature", "svix-signature");

  if (!id || !timestamp || !signature) {
    await repository.recordEvent({
      name: "resend_webhook_rejected",
      idempotencyKey: `resend-webhook-rejected:${id ?? "missing"}:headers`,
      occurredAt: now,
    });
    throw new Error("Resend webhook is missing required signature headers.");
  }

  let event: ResendVerifiedEvent;
  try {
    event = verifyEvent({ rawBody, headers: { id, timestamp, signature } });
  } catch {
    await repository.createResendWebhookEventOnce({
      id: createEntityId("event"),
      resendEventId: id,
      eventType: "email.failed",
      processingStatus: "rejected",
      attemptCount: 1,
      firstReceivedAt: now,
      lastAttemptedAt: now,
      errorCode: "invalid_signature",
      errorMessage: "Resend webhook signature verification failed.",
    });
    await repository.recordEvent({
      name: "resend_webhook_rejected",
      idempotencyKey: `resend-webhook-rejected:${id}`,
      occurredAt: now,
    });
    throw new Error("Resend webhook signature verification failed.");
  }

  const eventType = resendWebhookEventTypeSchema.safeParse(event.type);
  const emailId = event.data?.email_id ?? event.data?.id;
  const deliveryStatus = eventType.success ? statusFor(eventType.data) : null;
  if (!eventType.success || !deliveryStatus) throw new Error("Unsupported Resend webhook event type.");

  const webhookEvent = await repository.createResendWebhookEventOnce({
    id: createEntityId("event"),
    resendEventId: event.id ?? id,
    providerEmailId: emailId,
    eventType: eventType.data,
    processingStatus: "received",
    attemptCount: 1,
    firstReceivedAt: now,
    lastAttemptedAt: now,
  });

  if (webhookEvent.processingStatus === "processed") return { status: "processed" as const };

  await repository.recordEvent({
    name: "resend_webhook_received",
    idempotencyKey: `resend-webhook-received:${webhookEvent.resendEventId}`,
    occurredAt: now,
  });

  if (!emailId) {
    await repository.saveResendWebhookEvent({ ...webhookEvent, processingStatus: "ignored", processedAt: now, lastAttemptedAt: now });
    return { status: "ignored" as const };
  }

  const resultJob = await repository.findEmailJobByProviderMessageId(emailId);
  const productJob = resultJob ? null : await repository.findProductDeliveryEventByProviderMessageId(emailId);

  if (resultJob) {
    const updated = await repository.saveEmailJob({
      ...resultJob,
      status: mostAdvancedEmailStatus(resultJob.status, deliveryStatus),
      ...timestampPatch(deliveryStatus, now),
      updatedAt: now,
    });
    const result = await repository.findResult(updated.resultId);
    if (result) {
      await repository.saveResult({
        ...result,
        resultEmailDeliveryStatus: updated.status === "sending" || updated.status === "development-unsent" ? "queued" : updated.status,
        updatedAt: now,
      });
    }
    await repository.recordEvent({
      name: resultEmailEventName(deliveryStatus),
      assessmentId: updated.assessmentId,
      leadId: updated.leadId,
      resultId: updated.resultId,
      offerSlug: updated.recommendedOfferSlug,
      idempotencyKey: `assessment-result-email-${deliveryStatus}:${updated.id}`,
      occurredAt: now,
    });
  } else if (productJob) {
    const updated = await repository.saveProductDeliveryEvent({
      ...productJob,
      status: mostAdvancedEmailStatus(productJob.status, deliveryStatus),
      ...timestampPatch(deliveryStatus, now),
      updatedAt: now,
    });
    await repository.recordEvent({
      name: productEmailEventName(deliveryStatus),
      leadId: updated.leadId,
      purchaseId: updated.purchaseId,
      idempotencyKey: `product-access-email-${deliveryStatus}:${updated.id}`,
      occurredAt: now,
    });
  } else {
    await repository.saveResendWebhookEvent({ ...webhookEvent, processingStatus: "ignored", processedAt: now, lastAttemptedAt: now });
    return { status: "ignored" as const };
  }

  await repository.saveResendWebhookEvent({ ...webhookEvent, processingStatus: "processed", processedAt: now, lastAttemptedAt: now });
  await repository.recordEvent({
    name: "resend_webhook_processed",
    idempotencyKey: `resend-webhook-processed:${webhookEvent.resendEventId}`,
    occurredAt: now,
  });
  return { status: "processed" as const };
}
