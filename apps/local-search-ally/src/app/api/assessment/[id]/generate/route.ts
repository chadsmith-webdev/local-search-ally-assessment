import { NextResponse } from "next/server";
import { generateAssessmentResult } from "@/lib/assessment-generation";

type Params = Promise<{ id: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const { id } = await params;
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
