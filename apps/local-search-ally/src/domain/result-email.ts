import { z } from "zod/v4";
import { consentGrantSchema } from "./consent";

export const resultEmailStatusSchema = z.enum(["queued", "sent", "failed", "development-unsent"]);

export const resultEmailJobSchema = z.object({
  id: z.string().min(1),
  leadId: z.string().min(1),
  assessmentId: z.string().min(1),
  resultId: z.string().min(1),
  recipientEmail: z.email(),
  secureResultUrl: z.string().min(1),
  resultCategory: z.string().min(1).nullable(),
  recommendedOfferSlug: z.string().min(1).nullable(),
  assessmentDeliveryConsent: consentGrantSchema,
  marketingConsent: consentGrantSchema.optional(),
  idempotencyKey: z.string().min(1),
  status: resultEmailStatusSchema,
  providerMessageId: z.string().min(1).optional(),
  errorMessage: z.string().min(1).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ResultEmailStatus = z.infer<typeof resultEmailStatusSchema>;
export type ResultEmailJob = z.infer<typeof resultEmailJobSchema>;
