import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ContractorReviewProofSystemPage from "./page";
import {
  developmentProductAccessToken,
  expiredDevelopmentProductAccessToken,
} from "@/domain/product-access";

function pageWithParams(params: Record<string, string | undefined>) {
  return ContractorReviewProofSystemPage({
    searchParams: Promise.resolve(params),
  });
}

describe("Contractor Review and Proof System route", () => {
  it("blocks public access without a token", async () => {
    render(await pageWithParams({}));

    expect(screen.getByRole("heading", { name: "Product access required" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Product modules" })).not.toBeInTheDocument();
  });

  it("shows invalid-token and expired-access states", async () => {
    const invalid = render(await pageWithParams({ token: "pat_invalid" }));
    expect(screen.getByRole("heading", { name: "Invalid product-access link" })).toBeInTheDocument();
    invalid.unmount();

    render(await pageWithParams({ token: expiredDevelopmentProductAccessToken }));
    expect(screen.getByRole("heading", { name: "Product access expired" })).toBeInTheDocument();
  });

  it("renders the protected dashboard with accessible product navigation", async () => {
    render(await pageWithParams({ token: developmentProductAccessToken, module: "track-activity" }));

    expect(screen.getByRole("heading", { name: "Contractor Review and Proof System" })).toBeInTheDocument();
    expect(screen.getByText("Development access fixture")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Track Your Activity" })).toBeInTheDocument();

    const navigation = screen.getByRole("navigation", { name: "Product modules" });
    expect(within(navigation).getAllByRole("link")).toHaveLength(10);
    expect(within(navigation).getByRole("link", { name: /Track Your Activity/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("exposes completed resource downloads only inside valid development access", async () => {
    render(await pageWithParams({ token: developmentProductAccessToken, module: "downloads" }));

    const downloadLinks = screen.getAllByRole("link", { name: /^Download$/i });
    expect(downloadLinks).toHaveLength(12);
    expect(downloadLinks[0]).toHaveAttribute(
      "href",
      expect.stringContaining(`/products/contractor-review-proof-system/resources/`),
    );
    expect(screen.queryByText("Unavailable")).not.toBeInTheDocument();
  });

  it("supports URL-based development progress for marking a module complete", async () => {
    render(
      await pageWithParams({
        token: developmentProductAccessToken,
        module: "track-activity",
        completed: "track-activity",
      }),
    );

    expect(screen.getByRole("link", { name: /Module completed/i })).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
  });
});
