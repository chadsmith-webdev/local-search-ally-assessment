import { z } from "zod/v4";

export const policyVersion = "policy-v1" as const;
export const disclosureVersion = "disclosure-v1" as const;
export const refundRequestStatuses = ["requested", "under-review", "approved", "denied", "processed"] as const;
export const entitlementRevocationStatuses = ["not-revoked", "revoked"] as const;
export const deletionRequestStatuses = ["requested", "under-review", "approved", "denied", "completed"] as const;

const businessPolicyEnvSchema = z.object({
  BUSINESS_LEGAL_NAME: z.string().min(1).optional(),
  BUSINESS_PUBLIC_NAME: z.string().min(1).optional(),
  BUSINESS_SUPPORT_EMAIL: z.email().optional(),
  BUSINESS_PRIVACY_EMAIL: z.email().optional(),
  BUSINESS_REFUND_EMAIL: z.email().optional(),
  BUSINESS_MAILING_ADDRESS: z.string().min(1).optional(),
  POLICY_EFFECTIVE_DATE: z.iso.date().optional(),
  POLICY_VERSION: z.string().min(1).optional(),
});

export function getBusinessPolicyConfig(env = process.env) {
  const parsed = businessPolicyEnvSchema.parse({
    BUSINESS_LEGAL_NAME: env.BUSINESS_LEGAL_NAME || undefined,
    BUSINESS_PUBLIC_NAME: env.BUSINESS_PUBLIC_NAME || undefined,
    BUSINESS_SUPPORT_EMAIL: env.BUSINESS_SUPPORT_EMAIL || undefined,
    BUSINESS_PRIVACY_EMAIL: env.BUSINESS_PRIVACY_EMAIL || undefined,
    BUSINESS_REFUND_EMAIL: env.BUSINESS_REFUND_EMAIL || undefined,
    BUSINESS_MAILING_ADDRESS: env.BUSINESS_MAILING_ADDRESS || undefined,
    POLICY_EFFECTIVE_DATE: env.POLICY_EFFECTIVE_DATE || undefined,
    POLICY_VERSION: env.POLICY_VERSION || undefined,
  });
  const config = {
    legalBusinessName: parsed.BUSINESS_LEGAL_NAME,
    publicBusinessName: parsed.BUSINESS_PUBLIC_NAME ?? "Local Search Ally",
    supportEmail: parsed.BUSINESS_SUPPORT_EMAIL,
    privacyEmail: parsed.BUSINESS_PRIVACY_EMAIL,
    refundEmail: parsed.BUSINESS_REFUND_EMAIL,
    mailingAddress: parsed.BUSINESS_MAILING_ADDRESS,
    effectiveDate: parsed.POLICY_EFFECTIVE_DATE,
    policyVersion: parsed.POLICY_VERSION ?? policyVersion,
    disclosureVersion,
    refundPeriodDays: 14,
    supportResponseTarget: "Responses are generally provided within two business days.",
    productAccessPolicy:
      "Purchase grants ongoing access to Version 1 of the Contractor Review and Proof System. Future major versions are not automatically included unless expressly stated.",
    secureLinkExpirationDays: 30,
    assessmentRetention: "Unpurchased assessment and lead data may be retained for up to 24 months after last activity.",
    operationalEventRetention: "Operational and webhook event records are generally retained for up to 12 months unless needed for investigation.",
    transactionRecordRetention:
      "Purchase and accounting records are retained as required for accounting, disputes, fraud prevention, tax, and applicable obligations.",
  };
  const missingLaunchConfig = [
    ["legal business name", config.legalBusinessName],
    ["support email", config.supportEmail],
    ["privacy request email", config.privacyEmail],
    ["refund request email", config.refundEmail],
    ["policy effective date", config.effectiveDate],
  ]
    .filter(([, value]) => !value)
    .map(([label]) => label);

  return { ...config, missingLaunchConfig };
}

export function addDaysIso(startIso: string, days: number) {
  return new Date(Date.parse(startIso) + days * 24 * 60 * 60 * 1000).toISOString();
}

export type BusinessPolicyConfig = ReturnType<typeof getBusinessPolicyConfig>;
