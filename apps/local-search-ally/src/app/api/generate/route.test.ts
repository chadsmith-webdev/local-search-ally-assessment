import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

describe("/api/generate launch guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is unavailable in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(GET()).resolves.toMatchObject({ status: 404 });
    await expect(POST(new Request("http://localhost/api/generate", { method: "POST" }))).resolves.toMatchObject({
      status: 404,
    });
  });
});
