import { createEntityId } from "@/domain/ids";
import type { AssessmentRepository } from "./assessment-repository";
import { getAssessmentRepository } from "./assessment-store";
import type { PayPalClient, PayPalOrder } from "./paypal-client";
import { fulfillCapturedPayPalOrder } from "./paypal-commerce";
import { getPayPalConfig } from "./paypal-config";

export interface PayPalWebhookPayload {
  id?: string;
  event_type?: string;
  resource?: Record<string, unknown>;
}

function resourceOrderId(payload: PayPalWebhookPayload) {
  const resource = payload.resource;
  if (!resource) return null;
  if (typeof resource.id === "string" && String(payload.event_type).startsWith("CHECKOUT.ORDER.")) return resource.id;
  if (typeof resource.supplementary_data === "object" && resource.supplementary_data) {
    const related = (resource.supplementary_data as { related_ids?: { order_id?: string } }).related_ids;
    if (related?.order_id) return related.order_id;
  }
  if (typeof resource.invoice_id === "string") return resource.invoice_id;
  return null;
}

export async function processPayPalWebhook({
  payload,
  headers,
  paypal,
  repository = getAssessmentRepository(),
  now = new Date().toISOString(),
}: {
  payload: PayPalWebhookPayload;
  headers: Headers;
  paypal: PayPalClient;
  repository?: AssessmentRepository;
  now?: string;
}) {
  const config = getPayPalConfig();
  const eventId = payload.id;
  const eventType = payload.event_type;
  if (!eventId || !eventType) throw new Error("PayPal webhook payload is missing an event ID or type.");

  const required = {
    transmissionId: headers.get("paypal-transmission-id"),
    transmissionTime: headers.get("paypal-transmission-time"),
    certUrl: headers.get("paypal-cert-url"),
    authAlgo: headers.get("paypal-auth-algo"),
    transmissionSig: headers.get("paypal-transmission-sig"),
  };
  if (Object.values(required).some((value) => !value)) {
    await repository.recordEvent({
      name: "paypal_webhook_rejected",
      idempotencyKey: `paypal-webhook-rejected:${eventId}:missing-headers`,
      occurredAt: now,
    });
    throw new Error("PayPal webhook is missing required signature headers.");
  }

  const verification = await paypal.verifyWebhookSignature({
    transmissionId: required.transmissionId!,
    transmissionTime: required.transmissionTime!,
    certUrl: required.certUrl!,
    authAlgo: required.authAlgo!,
    transmissionSig: required.transmissionSig!,
    webhookEvent: payload,
  });
  if (verification !== "SUCCESS") {
    await repository.createPayPalWebhookEventOnce({
      id: createEntityId("event"),
      paypalEventId: eventId,
      eventType,
      environment: config.environment,
      processingStatus: "rejected",
      attemptCount: 1,
      firstReceivedAt: now,
      lastAttemptedAt: now,
      failureReason: "Webhook signature verification failed.",
    });
    await repository.recordEvent({
      name: "paypal_webhook_rejected",
      idempotencyKey: `paypal-webhook-rejected:${eventId}`,
      occurredAt: now,
    });
    throw new Error("PayPal webhook signature verification failed.");
  }

  const webhookEvent = await repository.createPayPalWebhookEventOnce({
    id: createEntityId("event"),
    paypalEventId: eventId,
    eventType,
    environment: config.environment,
    processingStatus: "received",
    attemptCount: 1,
    firstReceivedAt: now,
    lastAttemptedAt: now,
  });

  if (webhookEvent.processingStatus === "processed") {
    return { status: "processed" as const };
  }

  await repository.recordEvent({
    name: "paypal_webhook_received",
    idempotencyKey: `paypal-webhook-received:${eventId}`,
    occurredAt: now,
  });

  const orderId = resourceOrderId(payload);
  if (!orderId) {
    await repository.savePayPalWebhookEvent({ ...webhookEvent, processingStatus: "ignored", processedAt: now, lastAttemptedAt: now });
    return { status: "ignored" as const };
  }

  try {
    if (eventType === "CHECKOUT.ORDER.APPROVED") {
      const attempt = await repository.findCheckoutAttemptByPayPalOrderId(orderId);
      if (attempt) await repository.saveCheckoutAttempt({ ...attempt, status: "approved", updatedAt: now });
      await repository.savePayPalWebhookEvent({ ...webhookEvent, processingStatus: "processed", processedAt: now, lastAttemptedAt: now });
      return { status: "approved" as const };
    }

    if (eventType === "CHECKOUT.ORDER.DECLINED" || eventType === "CHECKOUT.ORDER.VOIDED") {
      const attempt = await repository.findCheckoutAttemptByPayPalOrderId(orderId);
      if (attempt) {
        await repository.saveCheckoutAttempt({
          ...attempt,
          status: eventType === "CHECKOUT.ORDER.DECLINED" ? "declined" : "voided",
          updatedAt: now,
        });
      }
      await repository.savePayPalWebhookEvent({ ...webhookEvent, processingStatus: "processed", processedAt: now, lastAttemptedAt: now });
      return { status: "processed" as const };
    }

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const order = await paypal.getOrder(orderId);
      await fulfillCapturedPayPalOrder({
        order: order as PayPalOrder,
        repository,
        now,
        webhookEventId: eventId,
      });
      await repository.recordEvent({
        name: "paypal_webhook_processed",
        idempotencyKey: `paypal-webhook-processed:${eventId}`,
        occurredAt: now,
      });
      return { status: "fulfilled" as const };
    }

    if (eventType === "PAYMENT.CAPTURE.PENDING" || eventType === "PAYMENT.CAPTURE.DENIED") {
      const attempt = await repository.findCheckoutAttemptByPayPalOrderId(orderId);
      if (attempt) {
        await repository.saveCheckoutAttempt({
          ...attempt,
          status: eventType === "PAYMENT.CAPTURE.PENDING" ? "capture-pending" : "declined",
          updatedAt: now,
        });
      }
      await repository.savePayPalWebhookEvent({ ...webhookEvent, processingStatus: "processed", processedAt: now, lastAttemptedAt: now });
      return { status: "processed" as const };
    }

    if (eventType === "PAYMENT.CAPTURE.REFUNDED" || eventType === "PAYMENT.CAPTURE.REVERSED") {
      await repository.savePayPalWebhookEvent({ ...webhookEvent, processingStatus: "processed", processedAt: now, lastAttemptedAt: now });
      return { status: "recorded" as const };
    }

    await repository.savePayPalWebhookEvent({ ...webhookEvent, processingStatus: "ignored", processedAt: now, lastAttemptedAt: now });
    return { status: "ignored" as const };
  } catch (error) {
    await repository.savePayPalWebhookEvent({
      ...webhookEvent,
      processingStatus: "failed",
      lastAttemptedAt: now,
      failureReason: error instanceof Error ? error.message.slice(0, 240) : "Webhook processing failed.",
    });
    await repository.recordEvent({
      name: "paypal_webhook_failed",
      idempotencyKey: `paypal-webhook-failed:${eventId}:${now}`,
      occurredAt: now,
    });
    throw error;
  }
}
