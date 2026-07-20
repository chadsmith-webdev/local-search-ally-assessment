import { NextResponse } from "next/server";
import { getAssessmentRepository } from "@/lib/assessment-store";
import { PayPalRestClient } from "@/lib/paypal-client";
import { capturePayPalOrder } from "@/lib/paypal-commerce";
import { getPayPalConfig } from "@/lib/paypal-config";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const repository = getAssessmentRepository();
  const now = new Date().toISOString();
  try {
    const attempt = await repository.findCheckoutAttemptByPayPalOrderId(orderId);
    await repository.recordEvent({
      name: "paypal_capture_requested",
      assessmentId: attempt?.assessmentId,
      leadId: attempt?.leadId,
      resultId: attempt?.resultId,
      offerSlug: attempt?.offerSlug,
      idempotencyKey: `paypal-capture-requested:${orderId}`,
      occurredAt: now,
    });
    const result = await capturePayPalOrder({
      orderId,
      repository,
      paypal: new PayPalRestClient(getPayPalConfig()),
      now,
    });
    if (result.status === "completed") {
      await repository.recordEvent({
        name: "paypal_capture_completed",
        assessmentId: result.purchase.assessmentId,
        leadId: result.purchase.leadId,
        resultId: result.purchase.resultId,
        offerSlug: result.purchase.offerSlug,
        purchaseId: result.purchase.id,
        idempotencyKey: `paypal-capture-completed:${orderId}`,
        occurredAt: now,
      });
      return NextResponse.json({
        status: "completed",
        purchaseId: result.purchase.id,
        successUrl: `/checkout/success?attempt=${encodeURIComponent(result.purchase.checkoutAttemptId)}`,
      });
    }
    return NextResponse.json({ status: result.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PayPal capture failed." },
      { status: 400 },
    );
  }
}
