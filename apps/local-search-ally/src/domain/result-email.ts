import { z } from "zod/v4";
import { consentGrantSchema } from "./consent";
import {
  transactionalEmailProviderSchema,
  transactionalEmailStatusSchema,
  transactionalEmailTemplateIdSchema,
  transactionalEmailTemplateVersionSchema,
} from "./transactional-email";

export const resultEmailStatusSchema = transactionalEmailStatusSchema;

export const resultEmailJobSchema = z.object({
  id: z.string().min(1),
  leadId: z.string().min(1),
  assessmentId: z.string().min(1),
  resultId: z.string().min(1),
  recipientEmail: z.email(),
  resultUrlPath: z.string().min(1),
  resultAccessTokenId: z.string().min(1),
  resultCategory: z.string().min(1).nullable(),
  recommendedOfferSlug: z.string().min(1).nullable(),
  assessmentDeliveryConsent: consentGrantSchema,
  marketingConsent: consentGrantSchema.optional(),
  provider: transactionalEmailProviderSchema.optional(),
  templateId: transactionalEmailTemplateIdSchema.optional(),
  templateVersion: transactionalEmailTemplateVersionSchema.optional(),
  idempotencyKey: z.string().min(1),
  status: resultEmailStatusSchema,
  attemptCount: z.number().int().min(0).default(0),
  providerMessageId: z.string().min(1).optional(),
  lastAttemptedAt: z.iso.datetime().optional(),
  sentAt: z.iso.datetime().optional(),
  deliveredAt: z.iso.datetime().optional(),
  delayedAt: z.iso.datetime().optional(),
  failedAt: z.iso.datetime().optional(),
  bouncedAt: z.iso.datetime().optional(),
  complainedAt: z.iso.datetime().optional(),
  errorCode: z.string().min(1).max(120).optional(),
  errorMessage: z.string().min(1).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ResultEmailStatus = z.infer<typeof resultEmailStatusSchema>;
export type ResultEmailJob = z.infer<typeof resultEmailJobSchema>;
