import { NextResponse } from "next/server";
import { checkRateLimit, hashRateLimitKey, rateLimitResponseMessage } from "@/lib/rate-limit";
import { generateAssessmentResult } from "@/lib/assessment-generation";

type Params = Promise<{ id: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const limit = checkRateLimit({
    bucket: "assessment-generation",
    key: hashRateLimitKey(id),
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) return NextResponse.json({ error: rateLimitResponseMessage() }, { status: 429 });

  const result = await generateAssessmentResult({
    assessmentId: id,
    origin: request.headers.get("origin") ?? undefined,
  });

  if (result.status === "failed") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    resultId: result.result.id,
    resultUrl: result.resultUrl,
  });
}
