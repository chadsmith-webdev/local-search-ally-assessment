import { describe, expect, it, vi, afterEach } from "vitest";
import { createEmptyAssessmentSession } from "@/domain/assessment-session";
import { createAssessmentDeliveryConsent, createMarketingConsent } from "@/domain/consent";
import type { AssessmentLead } from "@/domain/leads";
import type { SavedAssessmentResult } from "@/domain/results";
import { scoreAssessment } from "@/domain/scoring";
import type { PayPalClient, PayPalOrder } from "./paypal-client";
import { capturePayPalOrder, createPayPalOrderForResult } from "./paypal-commerce";
import { getPayPalConfig } from "./paypal-config";
import { processPayPalWebhook } from "./paypal-webhook";
import { createMemoryAssessmentRepository } from "./assessment-store";

const now = "2026-07-20T12:00:00.000Z";

const sandboxConfig = {
  environment: "sandbox" as const,
  clientId: "paypal-sandbox-client",
  clientSecret: "paypal-sandbox-secret",
  webhookId: "paypal-sandbox-webhook",
  appBaseUrl: "https://example.test",
};

class MockPayPal implements PayPalClient {
  createOrder = vi.fn<PayPalClient["createOrder"]>(async () => createdOrder());
  getOrder = vi.fn<PayPalClient["getOrder"]>(async () => completedOrder());
  captureOrder = vi.fn<PayPalClient["captureOrder"]>(async () => completedOrder());
  verifyWebhookSignature = vi.fn<PayPalClient["verifyWebhookSignature"]>(async () => "SUCCESS");
}

function lead(assessmentId = "assessment_paypal"): AssessmentLead {
  return {
    id: "lead_paypal",
    email: "owner@example.com",
    firstName: "Taylor",
    businessName: "Triangle Home Services",
    assessmentId,
    contactSource: "assessment-results-gate",
    assessmentDeliveryConsent: createAssessmentDeliveryConsent({ grantedAt: now }),
    marketingConsent: createMarketingConsent({ granted: false }),
    createdAt: now,
    updatedAt: now,
  };
}

function savedResult(assessmentId = "assessment_paypal", leadId = "lead_paypal"): SavedAssessmentResult {
  return {
    id: "result_paypal",
    assessmentId,
    leadId,
    result: scoreAssessment({
      businessName: "Triangle Home Services",
      trade: "HVAC contractor",
      market: "Raleigh, NC",
      websiteUrl: "https://example.com",
      googleBusinessProfileUrl: "https://example.com/profile",
      monthlyQualifiedLeads: 20,
      bookingRatePercent: 50,
      averageJobValue: 1200,
      missedCallsPerMonth: 8,
      opportunityLossRateLowPercent: 40,
      opportunityLossRateHighPercent: 60,
    }),
    rendererMode: "deterministic-fallback",
    fallbackReason: "PayPal commerce test fixture.",
    resultEmailDeliveryStatus: "queued",
    createdAt: now,
    updatedAt: now,
  };
}

async function eligibleCheckoutFixture() {
  const repository = createMemoryAssessmentRepository();
  const session = createEmptyAssessmentSession("assessment_paypal", now);
  const owner = lead(session.id);
  const result = savedResult(session.id, owner.id);
  await repository.saveSession({ ...session, status: "completed", leadId: owner.id, resultId: result.id });
  await repository.saveLead(owner);
  await repository.saveResult(result);
  const access = await repository.createResultAccess(result, now);
  return { repository, result, access };
}

function createdOrder(): PayPalOrder {
  return {
    id: "PAYPAL_ORDER_123",
    status: "CREATED",
    intent: "CAPTURE",
    links: [{ rel: "approve", href: "https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL_ORDER_123", method: "GET" }],
  };
}

function capturedOrder(
  capture: NonNullable<NonNullable<PayPalOrder["purchase_units"]>[number]["payments"]>["captures"][number],
  referenceId = "checkout_test",
): PayPalOrder {
  return {
    id: "PAYPAL_ORDER_123",
    status: capture.status === "COMPLETED" ? "COMPLETED" : "APPROVED",
    intent: "CAPTURE",
    payer: {
      payer_id: "PAYER123",
      email_address: "buyer@example.com",
    },
    purchase_units: [
      {
        reference_id: referenceId,
        invoice_id: referenceId,
        amount: {
          currency_code: "USD",
          value: "47.00",
        },
        payments: {
          captures: [capture],
        },
      },
    ],
  };
}

function completedOrder(referenceId?: string): PayPalOrder {
  return capturedOrder(
    {
      id: "PAYPAL_CAPTURE_123",
      status: "COMPLETED",
      amount: {
        currency_code: "USD",
        value: "47.00",
      },
    },
    referenceId,
  );
}

function pendingOrder(referenceId?: string): PayPalOrder {
  return capturedOrder(
    {
      id: "PAYPAL_CAPTURE_PENDING",
      status: "PENDING",
      amount: {
        currency_code: "USD",
        value: "47.00",
      },
    },
    referenceId,
  );
}

function webhookHeaders() {
  return new Headers({
    "paypal-transmission-id": "transmission-1",
    "paypal-transmission-time": now,
    "paypal-cert-url": "https://api-m.sandbox.paypal.com/cert.pem",
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-transmission-sig": "signature",
  });
}

describe("PayPal sandbox commerce", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires sandbox PayPal configuration and rejects live payments", () => {
    expect(
      getPayPalConfig({
        PAYPAL_ENV: "sandbox",
        PAYPAL_CLIENT_ID: "client",
        PAYPAL_CLIENT_SECRET: "secret",
        PAYPAL_WEBHOOK_ID: "webhook",
        APP_BASE_URL: "https://example.test",
      }),
    ).toMatchObject({ environment: "sandbox" });
    expect(() =>
      getPayPalConfig({
        PAYPAL_ENV: "live",
        PAYPAL_CLIENT_ID: "client",
        PAYPAL_CLIENT_SECRET: "secret",
        PAYPAL_WEBHOOK_ID: "webhook",
        APP_BASE_URL: "https://example.test",
      }),
    ).toThrow(/sandbox/i);
  });

  it("creates an idempotent PayPal order using the registry price and product", async () => {
    const { repository, result, access } = await eligibleCheckoutFixture();
    const paypal = new MockPayPal();

    const first = await createPayPalOrderForResult({
      resultId: result.id,
      tokenValue: access.tokenValue,
      repository,
      paypal,
      config: sandboxConfig,
      now,
    });
    const second = await createPayPalOrderForResult({
      resultId: result.id,
      tokenValue: access.tokenValue,
      repository,
      paypal,
      config: sandboxConfig,
      now,
    });

    expect(first.orderId).toBe("PAYPAL_ORDER_123");
    expect(second.orderId).toBe(first.orderId);
    expect(paypal.createOrder).toHaveBeenCalledTimes(1);
    expect(paypal.createOrder.mock.calls[0][0]).toMatchObject({
      requestId: expect.stringContaining("paypal-checkout:"),
      body: {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: "47.00",
              breakdown: {
                item_total: {
                  currency_code: "USD",
                  value: "47.00",
                },
              },
            },
            items: [
              {
                name: "Contractor Review and Proof System",
                quantity: "1",
                unit_amount: {
                  currency_code: "USD",
                  value: "47.00",
                },
              },
            ],
          },
        ],
      },
    });
    expect(repository.snapshot().checkoutAttempts).toHaveLength(1);
  });

  it("creates a purchase, active entitlement, and development delivery event after verified completed capture", async () => {
    const { repository, result, access } = await eligibleCheckoutFixture();
    const paypal = new MockPayPal();
    const order = await createPayPalOrderForResult({
      resultId: result.id,
      tokenValue: access.tokenValue,
      repository,
      paypal,
      config: sandboxConfig,
      now,
    });
    const attempt = await repository.findCheckoutAttemptByPayPalOrderId(order.orderId);
    paypal.captureOrder.mockResolvedValue(completedOrder(attempt?.id));

    const captured = await capturePayPalOrder({ orderId: order.orderId, repository, paypal, now });
    const repeated = await capturePayPalOrder({ orderId: order.orderId, repository, paypal, now });
    const snapshot = repository.snapshot();

    expect(captured.status).toBe("completed");
    expect(repeated.status).toBe("completed");
    expect(snapshot.purchases).toHaveLength(1);
    expect(snapshot.purchases[0]).toMatchObject({
      paymentProvider: "paypal",
      paypalOrderId: "PAYPAL_ORDER_123",
      paypalCaptureId: "PAYPAL_CAPTURE_123",
      capturedAmountCents: 4700,
      currency: "USD",
      paymentStatus: "paid",
      fulfillmentStatus: "fulfilled",
    });
    expect(snapshot.productEntitlements).toHaveLength(1);
    expect(snapshot.productEntitlements[0]).toMatchObject({ status: "active", productSlug: "contractor-review-proof-system" });
    expect(snapshot.productDeliveryEvents).toHaveLength(1);
    expect(snapshot.productDeliveryEvents[0]).toMatchObject({ status: "development-unsent" });
  });

  it("keeps pending captures pending without creating entitlement access", async () => {
    const { repository, result, access } = await eligibleCheckoutFixture();
    const paypal = new MockPayPal();
    const order = await createPayPalOrderForResult({
      resultId: result.id,
      tokenValue: access.tokenValue,
      repository,
      paypal,
      config: sandboxConfig,
      now,
    });
    const attempt = await repository.findCheckoutAttemptByPayPalOrderId(order.orderId);
    paypal.captureOrder.mockResolvedValueOnce(pendingOrder(attempt?.id));

    await expect(capturePayPalOrder({ orderId: order.orderId, repository, paypal, now })).resolves.toEqual({ status: "pending" });
    expect(repository.snapshot().purchases).toHaveLength(0);
    expect(repository.snapshot().productEntitlements).toHaveLength(0);
  });

  it("processes verified completed capture webhooks idempotently", async () => {
    vi.stubEnv("PAYPAL_ENV", "sandbox");
    vi.stubEnv("PAYPAL_CLIENT_ID", "client");
    vi.stubEnv("PAYPAL_CLIENT_SECRET", "secret");
    vi.stubEnv("PAYPAL_WEBHOOK_ID", "webhook");
    vi.stubEnv("APP_BASE_URL", "https://example.test");

    const { repository, result, access } = await eligibleCheckoutFixture();
    const paypal = new MockPayPal();
    const order = await createPayPalOrderForResult({
      resultId: result.id,
      tokenValue: access.tokenValue,
      repository,
      paypal,
      config: sandboxConfig,
      now,
    });
    const attempt = await repository.findCheckoutAttemptByPayPalOrderId(order.orderId);
    paypal.getOrder.mockResolvedValue(completedOrder(attempt?.id));
    const payload = {
      id: "WH-123",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "PAYPAL_CAPTURE_123",
        supplementary_data: {
          related_ids: {
            order_id: order.orderId,
          },
        },
      },
    };

    await expect(processPayPalWebhook({ payload, headers: webhookHeaders(), paypal, repository, now })).resolves.toMatchObject({
      status: "fulfilled",
    });
    await expect(processPayPalWebhook({ payload, headers: webhookHeaders(), paypal, repository, now })).resolves.toMatchObject({
      status: "processed",
    });

    expect(paypal.verifyWebhookSignature).toHaveBeenCalledTimes(2);
    expect(repository.snapshot().purchases).toHaveLength(1);
    expect(repository.snapshot().productEntitlements).toHaveLength(1);
    expect(repository.snapshot().paypalWebhookEvents[0]).toMatchObject({
      paypalEventId: "WH-123",
      processingStatus: "processed",
      attemptCount: 2,
    });
  });
});
