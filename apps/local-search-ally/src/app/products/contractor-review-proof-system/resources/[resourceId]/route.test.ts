import { describe, expect, it } from "vitest";
import { developmentProductAccessToken } from "@/domain/product-access";
import { GET } from "./route";

function resourceRequest(resourceId: string, token?: string) {
  const url = new URL(`http://localhost/products/contractor-review-proof-system/resources/${resourceId}`);
  if (token) url.searchParams.set("token", token);
  return GET(new Request(url), {
    params: Promise.resolve({ resourceId }),
  });
}

describe("Contractor Review and Proof System resource route", () => {
  it("blocks resource download without valid access", async () => {
    const response = await resourceRequest("core-implementation-guide");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "no-access",
    });
  });

  it("returns completed resource files with valid development access", async () => {
    const response = await resourceRequest("core-implementation-guide", developmentProductAccessToken);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("contractor-review-proof-system-guide-v1.pdf");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(1000);
  });

  it("does not expose unknown resources", async () => {
    const response = await resourceRequest("missing-resource", developmentProductAccessToken);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "resource-unavailable",
    });
  });
});
