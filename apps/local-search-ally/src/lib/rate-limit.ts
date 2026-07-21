import { createHash } from "node:crypto";

interface RateLimitState {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitState>();

export interface RateLimitOptions {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}

export function hashRateLimitKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function checkRateLimit({ bucket, key, limit, windowMs, now = Date.now() }: RateLimitOptions) {
  const id = `${bucket}:${key}`;
  const existing = buckets.get(id);
  if (!existing || existing.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    buckets.set(id, next);
    return { allowed: true, remaining: Math.max(0, limit - next.count), resetAt: next.resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt };
}

export function rateLimitResponseMessage() {
  return "Too many attempts. Please wait a few minutes and try again.";
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
