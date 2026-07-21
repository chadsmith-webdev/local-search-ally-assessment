import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ContractorReviewProofCheckoutPage from "./page";

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
});
