import { z } from "zod/v4";

export const consentPurposeSchema = z.enum(["assessment-delivery", "marketing"]);
export const consentSourceSchema = z.enum([
  "assessment-contact-step",
  "checkout",
  "manual-import",
  "email-preference-center",
]);

export const consentGrantSchema = z.object({
  purpose: consentPurposeSchema,
  granted: z.boolean(),
  grantedAt: z.iso.datetime().optional(),
  source: consentSourceSchema,
  version: z.string().min(1).optional(),
});

export type ConsentPurpose = z.infer<typeof consentPurposeSchema>;
export type ConsentSource = z.infer<typeof consentSourceSchema>;
export type ConsentGrant = z.infer<typeof consentGrantSchema>;

export function createAssessmentDeliveryConsent({
  grantedAt,
  version,
}: {
  grantedAt: string;
  version?: string;
}): ConsentGrant {
  return {
    purpose: "assessment-delivery",
    granted: true,
    grantedAt,
    source: "assessment-contact-step",
    version,
  };
}

export function createMarketingConsent({
  granted,
  grantedAt,
  source = "assessment-contact-step",
  version,
}: {
  granted: boolean;
  grantedAt?: string;
  source?: ConsentSource;
  version?: string;
}): ConsentGrant {
  return {
    purpose: "marketing",
    granted,
    grantedAt: granted ? grantedAt : undefined,
    source,
    version,
  };
}
