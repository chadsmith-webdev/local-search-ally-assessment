import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AssessmentDisclaimerPage from "./assessment-disclaimer/page";
import PrivacyPage from "./privacy/page";
import ProductDisclaimerPage from "./product-disclaimer/page";
import RefundsPage from "./refunds/page";
import SupportPage from "./support/page";
import TermsPage from "./terms/page";
import { getBusinessPolicyConfig } from "@/domain/policies";

describe("public policy and disclosure pages", () => {
  it("exposes launch-blocking owner config instead of fabricating contacts", () => {
    const config = getBusinessPolicyConfig({});

    expect(config.missingLaunchConfig).toEqual([
      "legal business name",
      "support email",
      "privacy request email",
      "refund request email",
      "policy effective date",
    ]);
  });

  it("renders the approved policy routes", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();

    render(<TermsPage />);
    expect(screen.getByRole("heading", { name: "Terms of Use" })).toBeInTheDocument();

    render(<RefundsPage />);
    expect(screen.getByRole("heading", { name: "Refund Policy" })).toBeInTheDocument();
    expect(screen.getByText(/14 calendar days/i)).toBeInTheDocument();

    render(<SupportPage />);
    expect(screen.getByRole("heading", { name: "Support" })).toBeInTheDocument();
    expect(screen.getByText(/two business days/i)).toBeInTheDocument();

    render(<AssessmentDisclaimerPage />);
    expect(screen.getByRole("heading", { name: "Assessment Disclaimer" })).toBeInTheDocument();
    expect(screen.getByText(/not guaranteed recoverable revenue/i)).toBeInTheDocument();

    render(<ProductDisclaimerPage />);
    expect(screen.getByRole("heading", { name: "Product Disclaimer" })).toBeInTheDocument();
    expect(screen.getByText(/not legal or tax advice/i)).toBeInTheDocument();
  });
});
