import { describe, expect, it } from "vitest";
import {
  createProductAccessTokenValue,
  developmentProductAccessToken,
  developmentProductEntitlements,
  expiredDevelopmentProductAccessToken,
  validateDevelopmentProductAccess,
} from "./product-access";
import { contractorReviewProofProduct } from "./products";
import {
  createProductProgress,
  getProductCompletionPercent,
  markProductModuleComplete,
  setLastActiveProductModule,
} from "./product-progress";

describe("product access and progress", () => {
  it("validates the development access fixture without creating fake purchase state", () => {
    const result = validateDevelopmentProductAccess(developmentProductAccessToken);

    expect(result.status).toBe("valid");
    if (result.status !== "valid") throw new Error("Expected valid development access.");
    expect(result.entitlement.source).toBe("development-fixture");
    expect(result.entitlement.purchaseId).toBeNull();
  });

  it("rejects missing, invalid, and expired access tokens", () => {
    expect(validateDevelopmentProductAccess(null).status).toBe("no-access");
    expect(validateDevelopmentProductAccess("pat_not_a_real_token").status).toBe("invalid-token");
    expect(validateDevelopmentProductAccess(expiredDevelopmentProductAccessToken).status).toBe("expired-access");
  });

  it("creates non-predictable token values", () => {
    const token = createProductAccessTokenValue();

    expect(token.startsWith("pat_")).toBe(true);
    expect(token.length).toBeGreaterThan(40);
    expect(token).not.toBe(createProductAccessTokenValue());
  });

  it("tracks product progress without accounts", () => {
    const entitlement = developmentProductEntitlements[0];
    const initial = createProductProgress({
      product: contractorReviewProofProduct,
      leadId: entitlement.leadId,
      now: "2026-07-18T13:00:00.000Z",
    });
    const active = setLastActiveProductModule({
      product: contractorReviewProofProduct,
      progress: initial,
      moduleId: "build-review-process",
      now: "2026-07-18T13:05:00.000Z",
    });
    const completed = markProductModuleComplete({
      product: contractorReviewProofProduct,
      progress: active,
      moduleId: "build-review-process",
      now: "2026-07-18T13:10:00.000Z",
    });

    expect(completed.lastActiveModuleId).toBe("build-review-process");
    expect(completed.completedModuleIds).toEqual(["build-review-process"]);
    expect(getProductCompletionPercent(contractorReviewProofProduct, completed)).toBe(10);
  });

  it("rejects progress updates for unknown modules", () => {
    const progress = createProductProgress({
      product: contractorReviewProofProduct,
      leadId: "lead_dev_product_access",
      now: "2026-07-18T13:00:00.000Z",
    });

    expect(() =>
      markProductModuleComplete({
        product: contractorReviewProofProduct,
        progress,
        moduleId: "missing-module",
      }),
    ).toThrow("Unknown product module");
  });
});
