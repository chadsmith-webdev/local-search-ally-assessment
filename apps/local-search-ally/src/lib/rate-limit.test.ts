import { describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimitsForTests } from "./rate-limit";

describe("rate limiting", () => {
  it("allows configured retries and then fails closed until the window resets", () => {
    resetRateLimitsForTests();

    expect(checkRateLimit({ bucket: "test", key: "resource", limit: 2, windowMs: 1000, now: 100 }).allowed).toBe(true);
    expect(checkRateLimit({ bucket: "test", key: "resource", limit: 2, windowMs: 1000, now: 200 }).allowed).toBe(true);
    expect(checkRateLimit({ bucket: "test", key: "resource", limit: 2, windowMs: 1000, now: 300 }).allowed).toBe(false);
    expect(checkRateLimit({ bucket: "test", key: "resource", limit: 2, windowMs: 1000, now: 1200 }).allowed).toBe(true);
  });
});
