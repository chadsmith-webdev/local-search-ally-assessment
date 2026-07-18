import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod/v4";

export const resultAccessStatusSchema = z.enum(["active", "expired", "revoked"]);
export const resultAccessValidationStatusSchema = z.enum([
  "valid",
  "no-access",
  "invalid-token",
  "expired-access",
  "revoked-access",
]);

export const resultAccessTokenSchema = z.object({
  id: z.string().min(1),
  resultId: z.string().min(1),
  assessmentId: z.string().min(1),
  leadId: z.string().min(1),
  tokenDigest: z.string().length(64),
  status: resultAccessStatusSchema,
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().optional(),
  lastUsedAt: z.iso.datetime().optional(),
});

export type ResultAccessStatus = z.infer<typeof resultAccessStatusSchema>;
export type ResultAccessToken = z.infer<typeof resultAccessTokenSchema>;
export type ResultAccessValidationStatus = z.infer<typeof resultAccessValidationStatusSchema>;

export type ResultAccessValidationResult =
  | {
      status: "valid";
      token: ResultAccessToken;
    }
  | {
      status: Exclude<ResultAccessValidationStatus, "valid">;
      message: string;
    };

export function createResultAccessTokenValue() {
  return `rat_${randomBytes(32).toString("base64url")}`;
}

export function hashResultAccessToken(tokenValue: string) {
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

export function validateResultAccessToken({
  tokenValue,
  resultId,
  now = new Date().toISOString(),
  tokens,
}: {
  tokenValue: string | null | undefined;
  resultId: string;
  now?: string;
  tokens: ResultAccessToken[];
}): ResultAccessValidationResult {
  if (!tokenValue) {
    return {
      status: "no-access",
      message: "A secure results link is required to view this assessment.",
    };
  }

  const incomingDigest = hashResultAccessToken(tokenValue);
  const token = tokens.find((candidate) => candidate.resultId === resultId && digestMatches(candidate.tokenDigest, incomingDigest));

  if (!token) {
    return {
      status: "invalid-token",
      message: "This results link is invalid.",
    };
  }

  if (token.status === "revoked") {
    return {
      status: "revoked-access",
      message: "This results link has been revoked.",
    };
  }

  if (token.status === "expired" || isExpired(token.expiresAt, now)) {
    return {
      status: "expired-access",
      message: "This results link has expired.",
    };
  }

  return {
    status: "valid",
    token,
  };
}
