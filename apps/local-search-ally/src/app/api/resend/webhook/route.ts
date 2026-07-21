import { NextResponse } from "next/server";
import { processResendWebhook } from "@/lib/resend-webhook";

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const result = await processResendWebhook({
      rawBody,
      headers: request.headers,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Resend webhook processing failed." },
      { status: 400 },
    );
  }
}
