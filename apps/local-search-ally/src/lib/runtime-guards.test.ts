import { describe, expect, it } from "vitest";
import {
  developmentFixturesEnabled,
  developmentProductAccessEnabled,
  sandboxCheckoutPreviewEnabled,
} from "./runtime-guards";

describe("launch runtime guards", () => {
  it("disables development fixtures and development product access in production by default", () => {
    expect(developmentFixturesEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(developmentProductAccessEnabled({ NODE_ENV: "production" })).toBe(false);
  });

  it("requires an explicit production flag for sandbox checkout preview", () => {
    expect(sandboxCheckoutPreviewEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(sandboxCheckoutPreviewEnabled({ NODE_ENV: "production", ENABLE_SANDBOX_CHECKOUT_PREVIEW: "true" })).toBe(true);
  });
});
