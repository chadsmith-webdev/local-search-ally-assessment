import { z } from "zod/v4";
import { consentGrantSchema } from "./consent";
import { diagnosisCategorySchema } from "./offers";

export const assessmentLeadSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  firstName: z.string().min(1).optional(),
  businessName: z.string().min(1).optional(),
  assessmentId: z.string().min(1),
  contactSource: z.enum(["assessment-results-gate"]),
  resultCategory: diagnosisCategorySchema.optional(),
  recommendedOfferSlug: z.string().min(1).optional(),
  assessmentDeliveryConsent: consentGrantSchema,
  marketingConsent: consentGrantSchema.optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type AssessmentLead = z.infer<typeof assessmentLeadSchema>;
