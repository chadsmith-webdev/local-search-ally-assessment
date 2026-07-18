import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeterministicAssessmentFallback, LowTicketOfferCTA, QuickWin } from "./assessment-components";
import {
  highRiskAssessmentResult,
  inactiveOfferAssessmentResult,
  sampleAssessmentResult,
} from "@/fixtures/assessment-results";
import { contractorReviewProofSystem } from "@/domain/offers";

describe("assessment product components", () => {
  it("renders a complete deterministic fallback with opportunity first", () => {
    render(<DeterministicAssessmentFallback result={sampleAssessmentResult} />);

    expect(screen.getByRole("heading", { name: sampleAssessmentResult.businessName })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Estimated Monthly Revenue Opportunity" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Review assumptions/i })).toHaveAttribute("href", "#assumptions");
    expect(screen.getByRole("heading", { name: "Primary diagnosis" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Continue/i })).not.toBeInTheDocument();
  });

  it("does not render overall or category scores in customer-facing results", () => {
    render(<DeterministicAssessmentFallback result={sampleAssessmentResult} />);

    expect(screen.queryByText("Supporting visibility score")).not.toBeInTheDocument();
    expect(screen.queryByText("Overall score")).not.toBeInTheDocument();
    expect(screen.queryByText("Visibility score detail")).not.toBeInTheDocument();
    expect(screen.queryByText(`${sampleAssessmentResult.overallScore}/100`)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Google profile" })).not.toBeInTheDocument();
  });

  it("renders incomplete state without a primary diagnosis", () => {
    render(<DeterministicAssessmentFallback result={highRiskAssessmentResult} />);

    expect(screen.getByRole("heading", { name: "More source data is needed" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Primary diagnosis" })).not.toBeInTheDocument();
  });

  it("renders low-ticket offer facts from the offer registry", () => {
    render(
      <LowTicketOfferCTA
        offer={contractorReviewProofSystem}
        diagnosisConnection="The assessment found weak recent proof and inconsistent review activity."
        checkoutHref="/checkout/contractor-review-proof-system"
      />,
    );

    expect(screen.getByText("Contractor Review and Proof System")).toBeInTheDocument();
    expect(screen.getByText("$47")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Get the System for \$47/i })).toHaveAttribute(
      "href",
      "/checkout/contractor-review-proof-system",
    );
    expect(screen.getByText("Review-request workflow")).toBeInTheDocument();
    expect(screen.getByText("30-day implementation plan")).toBeInTheDocument();
  });

  it("does not expose the testing offer in deterministic results before checkout and fulfillment are ready", () => {
    render(<DeterministicAssessmentFallback result={inactiveOfferAssessmentResult} />);

    expect(screen.queryByText("Contractor Review and Proof System")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Get the System for \$47/i })).not.toBeInTheDocument();
  });

  it("communicates quick-win completion without relying on color only", () => {
    render(
      <QuickWin
        title="Refresh proof"
        checklistLabel="Add one recent review theme"
        impact="This can support trust before the call."
        completed={false}
      />,
    );

    expect(screen.getByText("Add one recent review theme")).toBeInTheDocument();
  });
});
