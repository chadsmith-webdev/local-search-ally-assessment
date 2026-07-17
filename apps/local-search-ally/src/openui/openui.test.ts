import { describe, expect, it } from "vitest";
import { highRiskAssessmentResult, sampleAssessmentResult, strongAssessmentResult } from "@/fixtures/assessment-results";
import { composeAssessmentOpenUI } from "./compose";
import { incompleteAssessmentOpenUI, standardAssessmentOpenUI, strongAssessmentOpenUI } from "./examples";
import { assessmentLibrary } from "./library";
import { promptOptions } from "./prompt-options";
import { attemptOpenUICorrection, validateOpenUIResponse } from "./validation";

describe("OpenUI library", () => {
  it("sets AssessmentResults as the root component", () => {
    expect(assessmentLibrary.root).toBe("AssessmentResults");
  });

  it("includes the required prompt rules and three examples", () => {
    expect(promptOptions.additionalRules).toContain("Use AssessmentResults as the root.");
    expect(promptOptions.examples).toHaveLength(3);
  });

  it.each([
    ["standard", standardAssessmentOpenUI],
    ["incomplete", incompleteAssessmentOpenUI],
    ["strong", strongAssessmentOpenUI],
  ])("parses the %s OpenUI fixture", (_, fixture) => {
    const validation = validateOpenUIResponse(fixture);

    expect(validation.ok).toBe(true);
    expect(validation.result.root?.typeName).toBe("AssessmentResults");
  });

  it("validates root and component counts", () => {
    const validation = validateOpenUIResponse(standardAssessmentOpenUI);

    expect(validation.counts.AssessmentHeader).toBe(1);
    expect(validation.counts.CategoryScore).toBeLessThanOrEqual(6);
    expect(validation.counts.PriorityAction).toBeLessThanOrEqual(3);
  });

  it("preserves supplied scores in deterministic composition", () => {
    const response = composeAssessmentOpenUI(sampleAssessmentResult);
    const validation = validateOpenUIResponse(response);

    expect(validation.ok).toBe(true);
    for (const category of sampleAssessmentResult.categories) {
      expect(response).toContain(`CategoryScore("${category.label}", ${category.score}`);
    }
    expect(response).toContain(`OverallScore(${sampleAssessmentResult.overallScore}`);
  });

  it("does not render OverallScore for incomplete assessments", () => {
    const response = composeAssessmentOpenUI(highRiskAssessmentResult);

    expect(response).not.toContain("OverallScore(");
    expect(response).toContain("IncompleteAssessmentState(");
  });

  it("supports strong-performance assessments", () => {
    const response = composeAssessmentOpenUI(strongAssessmentResult);
    const validation = validateOpenUIResponse(response);

    expect(validation.ok).toBe(true);
    expect(response).toContain("Measurement is the next leverage point");
  });

  it("corrects fenced OpenUI output once", () => {
    const corrected = attemptOpenUICorrection(`\`\`\`openui\n${standardAssessmentOpenUI}\n\`\`\``);

    expect(corrected.startsWith("root = AssessmentResults(")).toBe(true);
  });
});
