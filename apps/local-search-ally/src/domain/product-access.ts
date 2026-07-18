import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod/v4";
import { productSlugSchema } from "./products";

export const productAccessStatusSchema = z.enum(["active", "expired", "revoked"]);
export const productEntitlementSourceSchema = z.enum(["verified-purchase", "development-fixture"]);
export const productAccessValidationStatusSchema = z.enum([
  "valid",
  "no-access",
  "invalid-token",
  "expired-access",
  "revoked-access",
]);

export const productEntitlementSchema = z.object({
  id: z.string().min(1),
  productSlug: productSlugSchema,
  productVersion: z.string().min(1),
  leadId: z.string().min(1),
  purchaseId: z.string().min(1).nullable(),
  source: productEntitlementSourceSchema,
  status: productAccessStatusSchema,
  grantedAt: z.iso.datetime(),
  revokedAt: z.iso.datetime().optional(),
  expiresAt: z.iso.datetime().optional(),
  lastAccessedAt: z.iso.datetime().optional(),
});

export const productAccessTokenSchema = z.object({
  id: z.string().min(1),
  productSlug: productSlugSchema,
  entitlementId: z.string().min(1),
  tokenDigest: z.string().length(64),
  status: productAccessStatusSchema,
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().optional(),
  lastUsedAt: z.iso.datetime().optional(),
});

export const productAccessSchema = z.object({
  id: z.string().min(1),
  purchaseId: z.string().min(1).nullable(),
  leadId: z.string().min(1),
  offerSlug: z.string().min(1),
  productSlug: productSlugSchema,
  productVersion: z.string().min(1),
  productAccessRoute: z.string().min(1),
  accessTokenId: z.string().min(1),
  status: productAccessStatusSchema,
  grantedAt: z.iso.datetime(),
  revokedAt: z.iso.datetime().optional(),
  expiresAt: z.iso.datetime().optional(),
  lastAccessedAt: z.iso.datetime().optional(),
});

export type ProductAccessStatus = z.infer<typeof productAccessStatusSchema>;
export type ProductEntitlementSource = z.infer<typeof productEntitlementSourceSchema>;
export type ProductAccessValidationStatus = z.infer<typeof productAccessValidationStatusSchema>;
export type ProductEntitlement = z.infer<typeof productEntitlementSchema>;
export type ProductAccessToken = z.infer<typeof productAccessTokenSchema>;
export type ProductAccess = z.infer<typeof productAccessSchema>;

export type ProductAccessValidationResult =
  | {
      status: "valid";
      entitlement: ProductEntitlement;
      token: ProductAccessToken;
    }
  | {
      status: Exclude<ProductAccessValidationStatus, "valid">;
      message: string;
    };

export interface ProductAccessValidationInput {
  tokenValue: string | null | undefined;
  productSlug: z.infer<typeof productSlugSchema>;
  now?: string;
  entitlements: ProductEntitlement[];
  tokens: ProductAccessToken[];
}

export function createProductAccessTokenValue() {
  return `pat_${randomBytes(32).toString("base64url")}`;
}

export function hashProductAccessToken(tokenValue: string) {
  return createHash("sha256").update(tokenValue).digest("hex");
}

function digestMatches(a: string, b: string) {
  const aBuffer = Buffer.from(a, "hex");
  const bBuffer = Buffer.from(b, "hex");
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

function isExpired(expiresAt: string | undefined, now: string) {
  return Boolean(expiresAt && Date.parse(expiresAt) <= Date.parse(now));
}

export function validateProductAccessToken({
  tokenValue,
  productSlug,
  now = new Date().toISOString(),
  entitlements,
  tokens,
}: ProductAccessValidationInput): ProductAccessValidationResult {
  if (!tokenValue) {
    return {
      status: "no-access",
      message: "A secure product-access link is required to view this product.",
    };
  }

  const incomingDigest = hashProductAccessToken(tokenValue);
  const token = tokens.find((candidate) => candidate.productSlug === productSlug && digestMatches(candidate.tokenDigest, incomingDigest));

  if (!token) {
    return {
      status: "invalid-token",
      message: "This product-access link is invalid.",
    };
  }

  const entitlement = entitlements.find(
    (candidate) => candidate.id === token.entitlementId && candidate.productSlug === productSlug,
  );

  if (!entitlement) {
    return {
      status: "invalid-token",
      message: "This product-access link is not connected to a valid entitlement.",
    };
  }

  if (token.status === "revoked" || entitlement.status === "revoked") {
    return {
      status: "revoked-access",
      message: "This product access has been revoked.",
    };
  }

  if (token.status === "expired" || entitlement.status === "expired" || isExpired(token.expiresAt, now) || isExpired(entitlement.expiresAt, now)) {
    return {
      status: "expired-access",
      message: "This product-access link has expired.",
    };
  }

  return {
    status: "valid",
    entitlement,
    token,
  };
}

export const developmentProductAccessToken =
  "dev_pat_c6f18c3eb6714a3c9b8177d8b64e87e2a496b964a2d74e0aa02c47b6f4db2a34";
export const expiredDevelopmentProductAccessToken =
  "dev_pat_6e90d5f163154d2fa36544827d8ac1449f2235db55ae4fc08a20ac40533f7c71";

export const developmentProductEntitlements = productEntitlementSchema.array().parse([
  {
    id: "entitlement_dev_review_proof_system",
    productSlug: "contractor-review-proof-system",
    productVersion: "1.0",
    leadId: "lead_dev_product_access",
    purchaseId: null,
    source: "development-fixture",
    status: "active",
    grantedAt: "2026-07-18T12:00:00.000Z",
  },
  {
    id: "entitlement_dev_expired_review_proof_system",
    productSlug: "contractor-review-proof-system",
    productVersion: "1.0",
    leadId: "lead_dev_expired_product_access",
    purchaseId: null,
    source: "development-fixture",
    status: "expired",
    grantedAt: "2026-07-18T12:00:00.000Z",
    expiresAt: "2026-07-18T12:30:00.000Z",
  },
]);

export const developmentProductAccessTokens = productAccessTokenSchema.array().parse([
  {
    id: "access_token_dev_review_proof_system",
    productSlug: "contractor-review-proof-system",
    entitlementId: "entitlement_dev_review_proof_system",
    tokenDigest: hashProductAccessToken(developmentProductAccessToken),
    status: "active",
    createdAt: "2026-07-18T12:00:00.000Z",
  },
  {
    id: "access_token_dev_expired_review_proof_system",
    productSlug: "contractor-review-proof-system",
    entitlementId: "entitlement_dev_expired_review_proof_system",
    tokenDigest: hashProductAccessToken(expiredDevelopmentProductAccessToken),
    status: "expired",
    createdAt: "2026-07-18T12:00:00.000Z",
    expiresAt: "2026-07-18T12:30:00.000Z",
  },
]);

export function validateDevelopmentProductAccess(tokenValue: string | null | undefined) {
  return validateProductAccessToken({
    tokenValue,
    productSlug: "contractor-review-proof-system",
    now: "2026-07-18T13:00:00.000Z",
    entitlements: developmentProductEntitlements,
    tokens: developmentProductAccessTokens,
  });
}
