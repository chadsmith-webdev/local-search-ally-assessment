import { NextResponse } from "next/server";
import { getAssessmentRepository } from "@/lib/assessment-store";
import { PayPalRestClient } from "@/lib/paypal-client";
import { createPayPalOrderForResult } from "@/lib/paypal-commerce";
import { getPayPalConfig } from "@/lib/paypal-config";
import { checkRateLimit, hashRateLimitKey, rateLimitResponseMessage } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const repository = getAssessmentRepository();
  const now = new Date().toISOString();
  try {
    const body = (await request.json()) as { resultId?: string; token?: string };
    if (!body.resultId || !body.token) {
      return NextResponse.json({ error: "Secure result context is required." }, { status: 400 });
    }
    const limit = checkRateLimit({
      bucket: "paypal-order",
      key: hashRateLimitKey(body.resultId),
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });
    if (!limit.allowed) return NextResponse.json({ error: rateLimitResponseMessage() }, { status: 429 });

    await repository.recordEvent({
      name: "paypal_order_requested",
      resultId: body.resultId,
      idempotencyKey: `paypal-order-requested:${body.resultId}:${now}`,
      occurredAt: now,
    });
    const config = getPayPalConfig();
    const paypal = new PayPalRestClient(config);
    const order = await createPayPalOrderForResult({
      resultId: body.resultId,
      tokenValue: body.token,
      repository,
      paypal,
      config,
      now,
    });
    return NextResponse.json({
      orderId: order.orderId,
      attemptId: order.attempt.id,
    });
  } catch (error) {
    await repository.recordEvent({
      name: "paypal_order_creation_failed",
      idempotencyKey: `paypal-order-creation-failed:${now}`,
      occurredAt: now,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PayPal order creation failed." },
      { status: 400 },
    );
  }
}
