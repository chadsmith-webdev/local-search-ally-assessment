import { NextResponse } from "next/server";
import { assessmentInputSchema, assessmentResultSchema } from "@/domain/assessment";
import { scoreAssessment } from "@/domain/scoring";
import { composeAssessmentOpenUI } from "@/openui/compose";
import { promptOptions } from "@/openui/prompt-options";
import { developmentFixturesEnabled } from "@/lib/runtime-guards";

function unavailable() {
  return NextResponse.json({ error: "This development endpoint is unavailable." }, { status: 404 });
}

export async function GET() {
  if (!developmentFixturesEnabled()) return unavailable();

  return NextResponse.json({
    route: "/api/generate",
    method: "POST",
    body: {
      businessName: "Triangle Home Services",
      trade: "HVAC contractor",
      market: "Raleigh, NC",
      websiteUrl: "https://example.com",
      googleBusinessProfileUrl: "https://example.com/profile",
      monthlyQualifiedLeads: 20,
      bookingRatePercent: 50,
      averageJobValue: 1200,
    },
  });
}

export async function POST(request: Request) {
  if (!developmentFixturesEnabled()) return unavailable();

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
