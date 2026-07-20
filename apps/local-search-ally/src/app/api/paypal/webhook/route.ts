import { NextResponse } from "next/server";
import { PayPalRestClient } from "@/lib/paypal-client";
import { getPayPalConfig } from "@/lib/paypal-config";
import { processPayPalWebhook, type PayPalWebhookPayload } from "@/lib/paypal-webhook";

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: PayPalWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PayPalWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  try {
    const result = await processPayPalWebhook({
      payload,
      headers: request.headers,
      paypal: new PayPalRestClient(getPayPalConfig()),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PayPal webhook processing failed." },
      { status: 400 },
    );
  }
}
