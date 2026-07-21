import { z } from "zod/v4";

export const transactionalEmailProviderSchema = z.enum(["resend", "development"]);
export const transactionalEmailStatusSchema = z.enum([
  "queued",
  "sending",
  "sent",
  "delivered",
  "delayed",
  "failed",
  "bounced",
  "complained",
  "development-unsent",
]);

export const transactionalEmailTemplateIdSchema = z.enum([
  "assessment-results",
  "contractor-review-proof-system-access",
]);

export const transactionalEmailTemplateVersionSchema = z.enum(["v1"]);

export const resendWebhookEventTypeSchema = z.enum([
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.failed",
  "email.bounced",
  "email.complained",
]);

export const resendWebhookProcessingStatusSchema = z.enum(["received", "processed", "rejected", "failed", "ignored"]);

export const resendWebhookEventSchema = z.object({
  id: z.string().min(1),
  resendEventId: z.string().min(1),
  providerEmailId: z.string().min(1).optional(),
  eventType: resendWebhookEventTypeSchema,
  processingStatus: resendWebhookProcessingStatusSchema,
  attemptCount: z.number().int().nonnegative(),
  firstReceivedAt: z.iso.datetime(),
  lastAttemptedAt: z.iso.datetime().optional(),
  processedAt: z.iso.datetime().optional(),
  errorCode: z.string().min(1).max(120).optional(),
  errorMessage: z.string().min(1).max(240).optional(),
});

export type TransactionalEmailProvider = z.infer<typeof transactionalEmailProviderSchema>;
export type TransactionalEmailStatus = z.infer<typeof transactionalEmailStatusSchema>;
export type TransactionalEmailTemplateId = z.infer<typeof transactionalEmailTemplateIdSchema>;
export type TransactionalEmailTemplateVersion = z.infer<typeof transactionalEmailTemplateVersionSchema>;
export type ResendWebhookEventType = z.infer<typeof resendWebhookEventTypeSchema>;
export type ResendWebhookProcessingStatus = z.infer<typeof resendWebhookProcessingStatusSchema>;
export type ResendWebhookEvent = z.infer<typeof resendWebhookEventSchema>;
