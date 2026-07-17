import { NextResponse } from "next/server";
import { assessmentInputSchema, assessmentResultSchema } from "@/domain/assessment";
import { scoreAssessment } from "@/domain/scoring";
import { composeAssessmentOpenUI } from "@/openui/compose";
import { promptOptions } from "@/openui/prompt-options";

export async function GET() {
  return NextResponse.json({
    route: "/api/generate",
    method: "POST",
    body: {
      businessName: "Triangle Home Services",
      trade: "HVAC contractor",
      market: "Raleigh, NC",
      websiteUrl: "https://example.com",
      googleBusinessProfileUrl: "https://example.com/profile",
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = assessmentInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid assessment input",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const result = assessmentResultSchema.parse(scoreAssessment(parsed.data));

  return NextResponse.json({
    result,
    response: composeAssessmentOpenUI(result),
    promptOptions,
  });
}
