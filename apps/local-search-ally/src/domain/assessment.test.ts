import { describe, expect, it } from "vitest";
import { assessmentInputSchema, assessmentResultSchema } from "./assessment";
import { scoreAssessment } from "./scoring";
import { highRiskAssessmentInput, standardAssessmentInput, visualViewports } from "@/fixtures/assessment-results";

describe("assessment schemas", () => {
  it("accepts valid input and normalizes a scored result", () => {
    const input = assessmentInputSchema.parse(standardAssessmentInput);
    const result = assessmentResultSchema.parse(scoreAssessment(input));

    expect(result.status).toBe("complete");
    expect(result.categories).toHaveLength(6);
    expect(result.priorityActions.length).toBeLessThanOrEqual(3);
  });

  it("rejects malformed URLs", () => {
    expect(() =>
      assessmentInputSchema.parse({
        businessName: "Bad URL HVAC",
        trade: "HVAC contractor",
        market: "Raleigh, NC",
        websiteUrl: "not a url",
      }),
    ).toThrow();
  });

  it("represents incomplete assessments without an overall score", () => {
    const result = scoreAssessment(highRiskAssessmentInput);

    expect(result.status).toBe("incomplete");
    expect(result.overallScore).toBeNull();
    expect(result.primaryDiagnosis).toBeNull();
  });

  it("defines the requested visual fixture viewport widths", () => {
    expect(visualViewports.map((viewport) => viewport.width)).toEqual([320, 375, 768, 1024, 1440]);
  });
});
