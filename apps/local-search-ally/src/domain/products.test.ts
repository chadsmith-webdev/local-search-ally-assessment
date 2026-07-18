import { describe, expect, it } from "vitest";
import {
  contractorReviewProofProduct,
  getDownloadableResources,
  getOrderedProductModules,
  getProductModule,
  getResourcesForModule,
  isProductReadyForPublicAccess,
} from "./products";
import { contractorReviewProofSystem, isOfferReadyForPublicCheckout } from "./offers";

describe("product registry", () => {
  it("defines the Contractor Review and Proof System product structure", () => {
    expect(contractorReviewProofProduct).toMatchObject({
      slug: "contractor-review-proof-system",
      name: "Contractor Review and Proof System",
      version: "1.0",
      status: "development",
      accessRoute: "/products/contractor-review-proof-system",
      deliveryEmailTemplateId: "contractor-review-proof-system-access",
    });
    expect(contractorReviewProofProduct.modules).toHaveLength(10);
    expect(contractorReviewProofProduct.resources).toHaveLength(12);
  });

  it("keeps modules in the approved implementation order", () => {
    expect(getOrderedProductModules(contractorReviewProofProduct).map((module) => module.title)).toEqual([
      "Start Here",
      "Build Your Review Process",
      "Customize Your Scripts",
      "Create Your Review Link",
      "Capture Better Project Proof",
      "Publish Reviews and Projects",
      "Respond to Reviews",
      "Track Your Activity",
      "Follow the 30-Day Plan",
      "Download Resources",
    ]);
  });

  it("maps every resource to an existing module", () => {
    const moduleIds = new Set(contractorReviewProofProduct.modules.map((module) => module.id));

    for (const resource of contractorReviewProofProduct.resources) {
      expect(moduleIds.has(resource.relatedModuleId)).toBe(true);
    }

    expect(getResourcesForModule(contractorReviewProofProduct, "track-activity").map((resource) => resource.id)).toEqual([
      "review-proof-tracker",
      "weekly-scorecard",
    ]);
  });

  it("does not expose incomplete resources as downloads", () => {
    expect(contractorReviewProofProduct.resources.every((resource) => resource.status === "draft")).toBe(true);
    expect(getDownloadableResources(contractorReviewProofProduct)).toEqual([]);
  });

  it("prevents public activation before product resources are complete", () => {
    expect(isProductReadyForPublicAccess(contractorReviewProofProduct)).toBe(false);
    expect(isOfferReadyForPublicCheckout(contractorReviewProofSystem)).toBe(false);
  });

  it("falls back to the first module when a module id is missing or unknown", () => {
    expect(getProductModule(contractorReviewProofProduct, undefined)?.id).toBe("start-here");
    expect(getProductModule(contractorReviewProofProduct, "missing-module")).toBeNull();
  });
});
