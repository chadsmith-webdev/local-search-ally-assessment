import { z } from "zod/v4";

export const funnelEventNameSchema = z.enum([
  "assessment_review_completed",
  "email_capture_viewed",
  "email_capture_submitted",
  "email_capture_failed",
  "assessment_generation_started",
  "assessment_generation_completed",
  "assessment_generation_failed",
  "result_email_queued",
  "result_email_sent",
  "result_email_failed",
  "results_viewed",
  "low_ticket_offer_viewed",
  "low_ticket_offer_clicked",
  "checkout_started",
  "checkout_abandoned",
  "purchase_completed",
  "fulfillment_started",
  "fulfillment_completed",
  "fulfillment_failed",
]);

export const funnelEventSchema = z.object({
  id: z.string().min(1),
  name: funnelEventNameSchema,
  assessmentId: z.string().min(1).optional(),
  leadId: z.string().min(1).optional(),
  resultId: z.string().min(1).optional(),
  offerSlug: z.string().min(1).optional(),
  purchaseId: z.string().min(1).optional(),
  idempotencyKey: z.string().min(1),
  occurredAt: z.iso.datetime(),
});

export type FunnelEventName = z.infer<typeof funnelEventNameSchema>;
export type FunnelEvent = z.infer<typeof funnelEventSchema>;
