import { z } from "zod/v4";
import { diagnosisCategorySchema } from "./offers";

export const paymentProviderSchema = z.enum(["stripe", "manual"]);
export const offerSourceSchema = z.enum(["assessment-result", "offer-page", "email-follow-up"]);
export const purchaseStatusSchema = z.enum([
  "checkout-created",
  "checkout-abandoned",
  "paid",
  "payment-failed",
  "refunded",
  "fulfillment-pending",
  "fulfilled",
  "fulfillment-failed",
]);

export const purchaseSchema = z.object({
  id: z.string().min(1),
  leadId: z.string().min(1),
  assessmentId: z.string().min(1),
  resultId: z.string().min(1),
  offerSlug: z.string().min(1),
  offerVersion: z.string().min(1),
  offerSource: offerSourceSchema,
  diagnosisCategory: diagnosisCategorySchema,
  provider: paymentProviderSchema,
  providerCheckoutSessionId: z.string().min(1).optional(),
  providerCustomerId: z.string().min(1).optional(),
  providerPaymentId: z.string().min(1).optional(),
  status: purchaseStatusSchema,
  amount: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  idempotencyKey: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type PaymentProvider = z.infer<typeof paymentProviderSchema>;
export type OfferSource = z.infer<typeof offerSourceSchema>;
export type PurchaseStatus = z.infer<typeof purchaseStatusSchema>;
export type Purchase = z.infer<typeof purchaseSchema>;

export interface CheckoutSessionRequest {
  offerSlug: string;
  assessmentId: string;
  resultId: string;
  leadId: string;
  offerSource: OfferSource;
  diagnosisCategory: z.infer<typeof diagnosisCategorySchema>;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}

export interface CheckoutSessionResult {
  provider: PaymentProvider;
  checkoutSessionId: string;
  checkoutUrl: string;
  purchaseId: string;
}

export interface PaymentProviderAdapter {
  createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResult>;
}
