import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ContractorReviewProofCheckoutPage from "./page";
import { PayPalSandboxCheckout } from "./PayPalSandboxCheckout";

describe("sandbox checkout route launch guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not expose sandbox checkout in production without the explicit preview flag", async () => {
    vi.stubEnv("NODE_ENV", "production");

    render(await ContractorReviewProofCheckoutPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Checkout unavailable" })).toBeInTheDocument();
    expect(screen.queryByText("Sandbox checkout")).not.toBeInTheDocument();
  });

  it("renders checkout policy acknowledgement as unselected", () => {
    render(<PayPalSandboxCheckout resultId="result_test" tokenValue="rat_test" publicClientId="paypal-client" />);

    expect(screen.getByRole("checkbox", { name: /i agree to the terms/i })).not.toBeChecked();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Refund Policy" })).toHaveAttribute("href", "/refunds");
    expect(screen.getByRole("link", { name: "Product Disclaimer" })).toHaveAttribute("href", "/product-disclaimer");
  });
});
