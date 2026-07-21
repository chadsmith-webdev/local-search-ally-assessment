import { describe, expect, it } from "vitest";
import { getResendConfig } from "./resend-config";

describe("Resend configuration", () => {
  it("accepts a display-name from address and plain reply-to address", () => {
    expect(
      getResendConfig({
        RESEND_API_KEY: "re_test",
        RESEND_FROM_EMAIL: "Local Search Ally <assessment@example.com>",
        RESEND_REPLY_TO_EMAIL: "support@example.com",
        APP_BASE_URL: "https://assessment.example",
      }),
    ).toMatchObject({
      fromEmail: "Local Search Ally <assessment@example.com>",
      replyToEmail: "support@example.com",
    });
  });

  it("rejects an invalid from address", () => {
    expect(() =>
      getResendConfig({
        RESEND_API_KEY: "re_test",
        RESEND_FROM_EMAIL: "not an email",
        RESEND_REPLY_TO_EMAIL: "support@example.com",
        APP_BASE_URL: "https://assessment.example",
      }),
    ).toThrow(/RESEND_FROM_EMAIL/i);
  });
});
