import { describe, expect, it } from "vitest";
import { renderAssessmentResultEmail, renderProductAccessEmail } from "./email-templates";

describe("transactional email templates", () => {
  it("renders assessment result delivery without scores, marketing, or pilot content", () => {
    const email = renderAssessmentResultEmail({
      recipientEmail: "owner@example.com",
      firstName: "Taylor",
      businessName: "Triangle Home Services",
      assessmentId: "assessment_email",
      resultId: "result_email",
      secureResultUrl: "https://assessment.example/results/result_email?token=rat_secure",
      primaryDiagnosisTitle: "Reviews and reputation",
      primaryDiagnosisSummary: "Recent review proof is too thin for the jobs you want to win.",
      opportunityRange: { low: 4800, high: 7200, currency: "USD" },
      evidenceLevel: "estimated",
      confidence: "medium",
    });

    expect(email.subject).toBe("Your Local Search Opportunity Assessment Is Ready");
    expect(email.html).toContain("Triangle Home Services");
    expect(email.text).toContain("$4,800-$7,200");
    expect(email.text).toContain("https://assessment.example/results/result_email?token=rat_secure");
    expect(`${email.html}\n${email.text}`).not.toMatch(/overall score|category score|pilot program|buy now/i);
  });

  it("renders product access with the approved product name and $47.00 USD price", () => {
    const email = renderProductAccessEmail({
      recipientEmail: "owner@example.com",
      firstName: "Taylor",
      purchaseId: "purchase_email",
      entitlementId: "entitlement_email",
      productName: "Contractor Review and Proof System",
      productVersion: "1.0",
      amountPaidCents: 4700,
      currency: "USD",
      secureProductUrl: "https://assessment.example/products/contractor-review-proof-system?token=pat_secure",
    });

    expect(email.subject).toBe("Your Contractor Review and Proof System Is Ready");
    expect(email.html).toContain("Contractor Review and Proof System");
    expect(email.text).toContain("$47.00 USD");
    expect(email.text).toContain("https://assessment.example/products/contractor-review-proof-system?token=pat_secure");
    expect(`${email.html}\n${email.text}`).not.toMatch(/pilot program|marketing/i);
  });
});
