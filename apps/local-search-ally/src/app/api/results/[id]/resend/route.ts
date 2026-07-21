import { NextResponse } from "next/server";
import { validateResultAccessToken } from "@/domain/result-access";
import { getAssessmentRepository } from "@/lib/assessment-store";
import { checkRateLimit, hashRateLimitKey, rateLimitResponseMessage } from "@/lib/rate-limit";
import { sendAssessmentResultEmail } from "@/lib/transactional-email-service";

type Params = Promise<{ id: string }>;

async function tokenFromRequest(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  return typeof body?.token === "string" ? body.token : null;
}

export async function POST(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const tokenValue = await tokenFromRequest(request);
  const repository = getAssessmentRepository();
  const limit = checkRateLimit({
    bucket: "result-email-resend",
    key: hashRateLimitKey(`${id}:${tokenValue ?? "missing"}`),
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) return NextResponse.json({ error: rateLimitResponseMessage() }, { status: 429 });

  const tokens = await repository.findResultAccessTokensForResult(id);
  const access = validateResultAccessToken({ tokenValue, resultId: id, tokens });

  if (access.status !== "valid") {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  const now = new Date().toISOString();
  await repository.recordEvent({
    name: "transactional_email_resend_requested",
    resultId: id,
    idempotencyKey: `result-email-resend-requested:${id}:${now}`,
    occurredAt: now,
  });

  try {
    const job = await sendAssessmentResultEmail({ resultId: id, repository, now });
    return NextResponse.json({ status: job.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Result email resend failed." },
      { status: 500 },
    );
  }
}
