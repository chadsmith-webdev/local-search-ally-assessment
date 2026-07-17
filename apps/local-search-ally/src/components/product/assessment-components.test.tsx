import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeterministicAssessmentFallback, ConsultationCTA, QuickWin } from "./assessment-components";
import { highRiskAssessmentResult, sampleAssessmentResult } from "@/fixtures/assessment-results";

describe("assessment product components", () => {
  it("renders a complete deterministic fallback with accessible headings", () => {
    render(<DeterministicAssessmentFallback result={sampleAssessmentResult} />);

    expect(screen.getByRole("heading", { name: sampleAssessmentResult.businessName })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Primary diagnosis" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continue/i })).toHaveAttribute("href", "/consultation");
  });

  it("renders incomplete state without a primary diagnosis", () => {
    render(<DeterministicAssessmentFallback result={highRiskAssessmentResult} />);

    expect(screen.getByRole("heading", { name: "More source data is needed" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Primary diagnosis" })).not.toBeInTheDocument();
  });

  it("resolves CTA action identifiers to internal routes only", () => {
    render(
      <ConsultationCTA
        actionId="request-assessment-review"
        label="Request review"
        summary="Review the source data before using this assessment."
      />,
    );

    expect(screen.getByRole("link", { name: /Continue/i })).toHaveAttribute("href", "/assessment-review");
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
