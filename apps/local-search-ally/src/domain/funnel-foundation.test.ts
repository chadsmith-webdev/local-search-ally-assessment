import { describe, expect, it } from "vitest";
import { createAssessmentDeliveryConsent, createMarketingConsent } from "./consent";
import { calculateOpportunityEstimate } from "./opportunity";
import {
  contractorReviewProofSystem,
  getOfferBySlug,
  getOfferForDiagnosis,
  getOfferRecommendationForResult,
  getPublicResultsPageOffer,
  getOfferRecommendation,
  getPurchasableOfferForDiagnosis,
  isOfferReadyForPublicCheckout,
} from "./offers";
import { assessmentLeadSchema } from "./leads";
import { InMemoryIdempotencyStore, InMemoryRepository } from "@/lib/persistence";
import {
  eligibleOfferAssessmentResult,
  inactiveOfferAssessmentResult,
  ineligibleOfferAssessmentResult,
} from "@/fixtures/assessment-results";

describe("funnel foundation models", () => {
  it("keeps assessment delivery consent separate from marketing consent", () => {
    const grantedAt = "2026-07-18T12:00:00.000Z";
    const delivery = createAssessmentDeliveryConsent({ grantedAt, version: "v1" });
    const marketing = createMarketingConsent({ granted: false, version: "v1" });

    expect(delivery).toMatchObject({
      purpose: "assessment-delivery",
      granted: true,
      grantedAt,
      source: "assessment-contact-step",
      version: "v1",
    });
    expect(marketing).toMatchObject({
      purpose: "marketing",
      granted: false,
      source: "assessment-contact-step",
      version: "v1",
    });
    expect(marketing.grantedAt).toBeUndefined();
  });

  it("validates the minimal lead relationship to an assessment", () => {
    const lead = assessmentLeadSchema.parse({
      id: "lead_123",
      email: "owner@example.com",
      businessName: "Triangle Home Services",
      assessmentId: "assessment_123",
      contactSource: "assessment-results-gate",
      assessmentDeliveryConsent: createAssessmentDeliveryConsent({
        grantedAt: "2026-07-18T12:00:00.000Z",
      }),
      createdAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:00:00.000Z",
    });

    expect(lead.email).toBe("owner@example.com");
    expect(lead.marketingConsent).toBeUndefined();
  });

  it("calculates opportunity estimates deterministically from supplied inputs", () => {
    const estimate = calculateOpportunityEstimate({
      monthlyQualifiedLeads: { value: 20, unit: "calls", verification: "self-reported" },
      opportunityLossRate: { lowValue: 0.4, highValue: 0.6, unit: "rate", verification: "inferred" },
      bookingRate: { value: 0.5, unit: "rate", verification: "self-reported" },
      averageJobValue: { value: 1200, unit: "currency", verification: "self-reported" },
    });

    expect(estimate.evidenceLevel).toBe("potential-exposure");
    expect(estimate.confidence).toBe("low");
    expect(estimate.missedCalls).toEqual({ low: 8, high: 12 });
    expect(estimate.missedJobs).toEqual({ low: 4, high: 6 });
    expect(estimate.monthlyRevenueOpportunity).toEqual({ low: 4800, high: 7200 });
  });

  it("maps review and proof diagnoses to the Contractor Review and Proof System", () => {
    expect(getOfferBySlug("contractor-review-proof-system")).toMatchObject({
      name: "Contractor Review and Proof System",
      priceCents: 4700,
      currency: "USD",
      primaryCtaLabel: "Get the System for $47",
      productAccessRoute: "/products/contractor-review-proof-system",
      deliveryEmailTemplateId: "contractor-review-proof-system-access",
    });
    expect(getOfferForDiagnosis("reviews")?.slug).toBe("contractor-review-proof-system");
    expect(getOfferForDiagnosis("project-proof")?.slug).toBe("contractor-review-proof-system");
    expect(getOfferForDiagnosis("trust")?.slug).toBe("contractor-review-proof-system");
  });

  it("preserves the approved offer price and deliverables in the registry", () => {
    expect(contractorReviewProofSystem.priceCents).toBe(4700);
    expect(contractorReviewProofSystem.primaryCtaLabel).toBe("Get the System for $47");
    expect(contractorReviewProofSystem.includedDeliverables).toEqual([
      "Review-request workflow",
      "SMS and email scripts",
      "Direct review-link setup",
      "Job-site photo checklist",
      "Publishing templates",
      "Review-response templates",
      "Tracking spreadsheet",
      "30-day implementation plan",
    ]);
  });

  it("blocks the first offer when an exclusion diagnosis is present", () => {
    expect(
      getOfferRecommendation({
        primaryDiagnosisCategory: "reviews",
        supportingDiagnosisCategories: ["call-handling"],
      }),
    ).toBeNull();
    expect(getOfferForDiagnosis("business-info-accuracy")).toBeNull();
  });

  it("uses assessment-result diagnosis fields for offer eligibility", () => {
    expect(getOfferRecommendationForResult(eligibleOfferAssessmentResult)?.slug).toBe(
      "contractor-review-proof-system",
    );
    expect(getOfferRecommendationForResult(ineligibleOfferAssessmentResult)).toBeNull();
  });

  it("does not expose testing offers or planned resources as purchasable", () => {
    expect(contractorReviewProofSystem.status).toBe("testing");
    expect(contractorReviewProofSystem.checkoutPriceId).toBeUndefined();
    expect(contractorReviewProofSystem.resources.every((resource) => resource.status === "planned")).toBe(true);
    expect(isOfferReadyForPublicCheckout(contractorReviewProofSystem)).toBe(false);
    expect(getPurchasableOfferForDiagnosis("reviews")).toBeNull();
    expect(getPublicResultsPageOffer(inactiveOfferAssessmentResult)).toBeNull();
  });

  it("supports repository and idempotency abstractions without a production datastore", async () => {
    const repository = new InMemoryRepository<{ id: string; value: string }>();
    const idempotency = new InMemoryIdempotencyStore();

    await repository.save({ id: "record_123", value: "saved" });
    await idempotency.markProcessed("event_123");

    await expect(repository.findById("record_123")).resolves.toEqual({ id: "record_123", value: "saved" });
    await expect(idempotency.hasProcessed("event_123")).resolves.toBe(true);
    await expect(idempotency.hasProcessed("event_456")).resolves.toBe(false);
  });
});
