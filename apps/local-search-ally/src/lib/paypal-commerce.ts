import { createEntityId } from "@/domain/ids";
import { contractorReviewProofSystem, getOfferRecommendationForResult } from "@/domain/offers";
import { contractorReviewProofProduct } from "@/domain/products";
import { validateResultAccessToken } from "@/domain/result-access";
import type { AssessmentRepository } from "./assessment-repository";
import { getAssessmentRepository } from "./assessment-store";
import type { PayPalClient, PayPalOrder } from "./paypal-client";
import { getPayPalConfig, type PayPalConfig } from "./paypal-config";

export const sandboxCheckoutSlug = "contractor-review-proof-system";
const sandboxProductSlug = "contractor-review-proof-system";
const expectedAmountCents = 4700;
const expectedCurrency = "USD";

export interface CheckoutEligibility {
  resultId: string;
  tokenValue: string;
  result: NonNullable<Awaited<ReturnType<AssessmentRepository["findResult"]>>>;
  lead: NonNullable<Awaited<ReturnType<AssessmentRepository["findLead"]>>>;
  offer: typeof contractorReviewProofSystem;
  product: typeof contractorReviewProofProduct;
}

function amountToCents(value: string | undefined) {
  if (!value || !/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [dollars, cents = ""] = value.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}

function approvalLink(order: PayPalOrder) {
  return order.links?.find((link) => link.rel === "approve")?.href ?? null;
}

function completedCapture(order: PayPalOrder) {
  return order.purchase_units?.flatMap((unit) => unit.payments?.captures ?? []).find((capture) => capture.status === "COMPLETED") ?? null;
}

function firstCapture(order: PayPalOrder) {
  return order.purchase_units?.flatMap((unit) => unit.payments?.captures ?? [])[0] ?? null;
}

function primaryPurchaseUnit(order: PayPalOrder) {
  return order.purchase_units?.[0] ?? null;
}

export async function loadCheckoutEligibility({
  resultId,
  tokenValue,
  repository = getAssessmentRepository(),
}: {
  resultId: string;
  tokenValue: string;
  repository?: AssessmentRepository;
}): Promise<CheckoutEligibility> {
  const result = await repository.findResult(resultId);
  if (!result) throw new Error("Assessment result was not found.");
  const tokens = await repository.findResultAccessTokensForResult(result.id);
  const access = validateResultAccessToken({ tokenValue, resultId: result.id, tokens });
  if (access.status !== "valid") throw new Error(access.message);
  const lead = await repository.findLead(result.leadId);
  if (!lead) throw new Error("Lead record was not found.");
  const offer = getOfferRecommendationForResult(result.result);
  if (!offer || offer.slug !== contractorReviewProofSystem.slug) throw new Error("This result is not eligible for the sandbox checkout preview.");
  if (offer.priceCents !== expectedAmountCents || offer.currency !== expectedCurrency) {
    throw new Error("Offer price registry mismatch.");
  }
  if (offer.productSlug !== contractorReviewProofProduct.slug || offer.version !== contractorReviewProofProduct.version) {
    throw new Error("Offer and product registry mismatch.");
  }
  const modulesComplete = contractorReviewProofProduct.modules.every((module) => module.status === "complete");
  const resourcesComplete = contractorReviewProofProduct.resources.every(
    (resource) => resource.status === "complete" && resource.downloadAvailable && Boolean(resource.storageReference),
  );
  if (!modulesComplete || !resourcesComplete) {
    throw new Error("Product resources are not complete.");
  }
  return {
    resultId,
    tokenValue,
    result,
    lead,
    offer: contractorReviewProofSystem,
    product: contractorReviewProofProduct,
  };
}

export async function createPayPalOrderForResult({
  resultId,
  tokenValue,
  repository = getAssessmentRepository(),
  paypal,
  config = getPayPalConfig(),
  now = new Date().toISOString(),
}: {
  resultId: string;
  tokenValue: string;
  repository?: AssessmentRepository;
  paypal: PayPalClient;
  config?: PayPalConfig;
  now?: string;
}) {
  if (config.environment !== "sandbox") throw new Error("Only PayPal sandbox checkout is enabled.");
  const eligibility = await loadCheckoutEligibility({ resultId, tokenValue, repository });
  const idempotencyKey = `paypal-checkout:${eligibility.result.id}:${eligibility.lead.id}:${eligibility.offer.slug}`;
  let attempt = await repository.createCheckoutAttemptOnce({
    id: createEntityId("checkout"),
    assessmentId: eligibility.result.assessmentId,
    resultId: eligibility.result.id,
    leadId: eligibility.lead.id,
    offerSlug: sandboxCheckoutSlug,
    productSlug: sandboxProductSlug,
    productVersion: eligibility.product.version,
    expectedAmountCents,
    expectedCurrency,
    idempotencyKey,
    status: "created",
    createdAt: now,
    updatedAt: now,
  });

  if (attempt.paypalOrderId && ["created", "approval-pending", "approved", "capture-pending"].includes(attempt.status)) {
    return {
      attempt,
      orderId: attempt.paypalOrderId,
      approveUrl: null,
    };
  }

  const order = await paypal.createOrder({
    requestId: attempt.idempotencyKey,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: attempt.id,
          invoice_id: attempt.id,
          custom_id: `${attempt.resultId}:${attempt.leadId}`,
          amount: {
            currency_code: expectedCurrency,
            value: "47.00",
            breakdown: {
              item_total: {
                currency_code: expectedCurrency,
                value: "47.00",
              },
            },
          },
          items: [
            {
              name: eligibility.offer.name,
              quantity: "1",
              unit_amount: {
                currency_code: expectedCurrency,
                value: "47.00",
              },
            },
          ],
        },
      ],
      application_context: {
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: `${config.appBaseUrl}/checkout/success?attempt=${encodeURIComponent(attempt.id)}`,
        cancel_url: `${config.appBaseUrl}/checkout/cancelled?attempt=${encodeURIComponent(attempt.id)}`,
      },
    },
  });

  if (!order.id) throw new Error("PayPal did not return an order ID.");
  const approveUrl = approvalLink(order);
  attempt = await repository.saveCheckoutAttempt({
    ...attempt,
    paypalOrderId: order.id,
    status: "approval-pending",
    updatedAt: now,
  });
  await repository.recordEvent({
    name: "paypal_order_created",
    assessmentId: attempt.assessmentId,
    leadId: attempt.leadId,
    resultId: attempt.resultId,
    offerSlug: attempt.offerSlug,
    idempotencyKey: `paypal-order-created:${attempt.id}`,
    occurredAt: now,
  });
  return { attempt, orderId: order.id, approveUrl };
}

export function verifyCompletedCapture({
  attempt,
  order,
}: {
  attempt: NonNullable<Awaited<ReturnType<AssessmentRepository["findCheckoutAttempt"]>>>;
  order: PayPalOrder;
}) {
  if (order.id !== attempt.paypalOrderId) throw new Error("PayPal order mismatch.");
  if (order.intent !== "CAPTURE") throw new Error("PayPal order intent mismatch.");
  const unit = primaryPurchaseUnit(order);
  if (!unit || unit.reference_id !== attempt.id) throw new Error("PayPal purchase unit reference mismatch.");
  if (unit.amount?.currency_code !== expectedCurrency || amountToCents(unit.amount.value) !== expectedAmountCents) {
    throw new Error("PayPal order amount mismatch.");
  }
  const capture = completedCapture(order);
  if (!capture?.id) throw new Error("PayPal capture is not completed.");
  if (capture.amount?.currency_code !== expectedCurrency || amountToCents(capture.amount.value) !== expectedAmountCents) {
    throw new Error("PayPal capture amount mismatch.");
  }
  return capture;
}

export async function fulfillCapturedPayPalOrder({
  order,
  repository = getAssessmentRepository(),
  now = new Date().toISOString(),
  webhookEventId,
}: {
  order: PayPalOrder;
  repository?: AssessmentRepository;
  now?: string;
  webhookEventId?: string;
}) {
  const attempt = order.id ? await repository.findCheckoutAttemptByPayPalOrderId(order.id) : null;
  if (!attempt) throw new Error("Checkout attempt was not found for PayPal order.");
  const capture = verifyCompletedCapture({ attempt, order });
  const result = await repository.findResult(attempt.resultId);
  const lead = await repository.findLead(attempt.leadId);
  if (!result || !lead || result.leadId !== lead.id || result.id !== attempt.resultId) {
    throw new Error("Checkout relationships could not be verified.");
  }
  const purchaserEmail = order.payer?.email_address ?? undefined;

  return repository.transaction(async (transaction) => {
    const purchase = await transaction.createPurchaseOnce({
      id: createEntityId("purchase"),
      checkoutAttemptId: attempt.id,
      assessmentId: attempt.assessmentId,
      resultId: attempt.resultId,
      leadId: attempt.leadId,
      offerSlug: attempt.offerSlug,
      productSlug: attempt.productSlug,
      productVersion: attempt.productVersion,
      paymentProvider: "paypal",
      paypalOrderId: attempt.paypalOrderId!,
      paypalCaptureId: capture.id!,
      paypalPayerId: order.payer?.payer_id,
      expectedAmountCents,
      capturedAmountCents: expectedAmountCents,
      currency: expectedCurrency,
      paymentStatus: "paid",
      fulfillmentStatus: "pending",
      purchaserEmail,
      createdAt: now,
      paidAt: now,
      updatedAt: now,
    });
    const entitlement = await transaction.createProductEntitlementOnce({
      id: createEntityId("entitlement"),
      purchaseId: purchase.id,
      leadId: purchase.leadId,
      productSlug: purchase.productSlug,
      productVersion: purchase.productVersion,
      status: "active",
      grantedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const delivery = await transaction.queueProductDeliveryEventOnce({
      id: createEntityId("event"),
      entitlementId: entitlement.id,
      purchaseId: purchase.id,
      leadId: purchase.leadId,
      productSlug: purchase.productSlug,
      recipientEmail: lead.email,
      status: "development-unsent",
      idempotencyKey: `product-delivery:${purchase.id}:${entitlement.id}`,
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const fulfilledPurchase = await transaction.savePurchase({
      ...purchase,
      fulfillmentStatus: "fulfilled",
      updatedAt: now,
    });
    await transaction.saveCheckoutAttempt({
      ...attempt,
      status: "completed",
      updatedAt: now,
    });
    if (webhookEventId) {
      const webhook = await transaction.findPayPalWebhookEvent(webhookEventId);
      if (webhook) {
        await transaction.savePayPalWebhookEvent({
          ...webhook,
          processingStatus: "processed",
          processedAt: now,
          lastAttemptedAt: now,
        });
      }
    }
    await transaction.recordEvent({
      name: "purchase_completed",
      assessmentId: attempt.assessmentId,
      leadId: attempt.leadId,
      resultId: attempt.resultId,
      offerSlug: attempt.offerSlug,
      idempotencyKey: `purchase-completed:${fulfilledPurchase.id}`,
      occurredAt: now,
    });
    await transaction.recordEvent({
      name: "product_entitlement_granted",
      assessmentId: attempt.assessmentId,
      leadId: attempt.leadId,
      resultId: attempt.resultId,
      offerSlug: attempt.offerSlug,
      idempotencyKey: `product-entitlement-granted:${entitlement.id}`,
      occurredAt: now,
    });
    return { purchase: fulfilledPurchase, entitlement, delivery };
  });
}

export async function capturePayPalOrder({
  orderId,
  repository = getAssessmentRepository(),
  paypal,
  now = new Date().toISOString(),
}: {
  orderId: string;
  repository?: AssessmentRepository;
  paypal: PayPalClient;
  now?: string;
}) {
  const attempt = await repository.findCheckoutAttemptByPayPalOrderId(orderId);
  if (!attempt) throw new Error("Checkout attempt was not found.");
  await repository.saveCheckoutAttempt({ ...attempt, status: "capture-pending", updatedAt: now });
  const order = await paypal.captureOrder({
    orderId,
    requestId: `capture:${attempt.id}`,
  });
  const capture = firstCapture(order);
  if (capture?.status === "PENDING") {
    await repository.saveCheckoutAttempt({ ...attempt, status: "capture-pending", updatedAt: now });
    return { status: "pending" as const };
  }
  if (capture?.status === "DECLINED" || capture?.status === "FAILED") {
    await repository.saveCheckoutAttempt({ ...attempt, status: "declined", updatedAt: now });
    return { status: "denied" as const };
  }
  const fulfilled = await fulfillCapturedPayPalOrder({ order, repository, now });
  return { status: "completed" as const, ...fulfilled };
}
