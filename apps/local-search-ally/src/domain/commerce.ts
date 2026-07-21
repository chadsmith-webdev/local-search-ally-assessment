import { z } from "zod/v4";
import { approvedOfferSlugSchema } from "./offers";
import { productSlugSchema } from "./products";
import {
  transactionalEmailProviderSchema,
  transactionalEmailStatusSchema,
  transactionalEmailTemplateIdSchema,
  transactionalEmailTemplateVersionSchema,
} from "./transactional-email";

export const paypalEnvironmentSchema = z.enum(["sandbox"]);
export const checkoutAttemptStatusSchema = z.enum([
  "created",
  "approval-pending",
  "approved",
  "capture-pending",
  "completed",
  "declined",
  "voided",
  "cancelled",
  "expired",
  "failed",
]);
export const paymentProviderSchema = z.enum(["paypal"]);
export const purchasePaymentStatusSchema = z.enum([
  "pending",
  "paid",
  "denied",
  "failed",
  "refunded",
  "partially-refunded",
  "reversed",
]);
export const purchaseFulfillmentStatusSchema = z.enum(["pending", "fulfilled", "failed", "revoked"]);
export const productEntitlementStatusSchema = z.enum(["active", "revoked", "refunded", "expired"]);
export const paypalWebhookProcessingStatusSchema = z.enum(["received", "processed", "rejected", "failed", "ignored"]);
export const productDeliveryStatusSchema = transactionalEmailStatusSchema;

export const paypalCheckoutAttemptSchema = z.object({
  id: z.string().min(1),
  assessmentId: z.string().min(1),
  resultId: z.string().min(1),
  leadId: z.string().min(1),
  offerSlug: approvedOfferSlugSchema,
  productSlug: productSlugSchema,
  productVersion: z.string().min(1),
  expectedAmountCents: z.number().int().nonnegative(),
  expectedCurrency: z.literal("USD"),
  paypalOrderId: z.string().min(1).optional(),
  idempotencyKey: z.string().min(1),
  status: checkoutAttemptStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().optional(),
  failureReason: z.string().min(1).optional(),
});

export const purchaseSchema = z.object({
  id: z.string().min(1),
  checkoutAttemptId: z.string().min(1),
  assessmentId: z.string().min(1),
  resultId: z.string().min(1),
  leadId: z.string().min(1),
  offerSlug: approvedOfferSlugSchema,
  productSlug: productSlugSchema,
  productVersion: z.string().min(1),
  paymentProvider: paymentProviderSchema,
  paypalOrderId: z.string().min(1),
  paypalCaptureId: z.string().min(1),
  paypalPayerId: z.string().min(1).optional(),
  expectedAmountCents: z.number().int().nonnegative(),
  capturedAmountCents: z.number().int().nonnegative(),
  currency: z.literal("USD"),
  paymentStatus: purchasePaymentStatusSchema,
  fulfillmentStatus: purchaseFulfillmentStatusSchema,
  purchaserEmail: z.email().optional(),
  createdAt: z.iso.datetime(),
  paidAt: z.iso.datetime().optional(),
  updatedAt: z.iso.datetime(),
  revokedAt: z.iso.datetime().optional(),
  refundedAt: z.iso.datetime().optional(),
});

export const productEntitlementRecordSchema = z.object({
  id: z.string().min(1),
  purchaseId: z.string().min(1),
  leadId: z.string().min(1),
  productSlug: productSlugSchema,
  productVersion: z.string().min(1),
  status: productEntitlementStatusSchema,
  grantedAt: z.iso.datetime(),
  lastAccessedAt: z.iso.datetime().optional(),
  revokedAt: z.iso.datetime().optional(),
  revocationReason: z.string().min(1).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const paypalWebhookEventSchema = z.object({
  id: z.string().min(1),
  paypalEventId: z.string().min(1),
  eventType: z.string().min(1),
  environment: paypalEnvironmentSchema,
  processingStatus: paypalWebhookProcessingStatusSchema,
  attemptCount: z.number().int().nonnegative(),
  firstReceivedAt: z.iso.datetime(),
  lastAttemptedAt: z.iso.datetime().optional(),
  processedAt: z.iso.datetime().optional(),
  failureReason: z.string().min(1).optional(),
});

export const productDeliveryEventSchema = z.object({
  id: z.string().min(1),
  entitlementId: z.string().min(1),
  purchaseId: z.string().min(1),
  leadId: z.string().min(1),
  productSlug: productSlugSchema,
  recipientEmail: z.email(),
  provider: transactionalEmailProviderSchema.optional(),
  templateId: transactionalEmailTemplateIdSchema.optional(),
  templateVersion: transactionalEmailTemplateVersionSchema.optional(),
  status: productDeliveryStatusSchema,
  idempotencyKey: z.string().min(1),
  attemptCount: z.number().int().nonnegative(),
  providerMessageId: z.string().min(1).optional(),
  lastAttemptedAt: z.iso.datetime().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  sentAt: z.iso.datetime().optional(),
  deliveredAt: z.iso.datetime().optional(),
  delayedAt: z.iso.datetime().optional(),
  failedAt: z.iso.datetime().optional(),
  bouncedAt: z.iso.datetime().optional(),
  complainedAt: z.iso.datetime().optional(),
  errorCode: z.string().min(1).max(120).optional(),
  errorMessage: z.string().min(1).optional(),
});

export type PayPalEnvironment = z.infer<typeof paypalEnvironmentSchema>;
export type CheckoutAttemptStatus = z.infer<typeof checkoutAttemptStatusSchema>;
export type PurchasePaymentStatus = z.infer<typeof purchasePaymentStatusSchema>;
export type PurchaseFulfillmentStatus = z.infer<typeof purchaseFulfillmentStatusSchema>;
export type ProductEntitlementStatus = z.infer<typeof productEntitlementStatusSchema>;
export type PayPalCheckoutAttempt = z.infer<typeof paypalCheckoutAttemptSchema>;
export type Purchase = z.infer<typeof purchaseSchema>;
export type ProductEntitlementRecord = z.infer<typeof productEntitlementRecordSchema>;
export type PayPalWebhookEvent = z.infer<typeof paypalWebhookEventSchema>;
export type ProductDeliveryEvent = z.infer<typeof productDeliveryEventSchema>;
