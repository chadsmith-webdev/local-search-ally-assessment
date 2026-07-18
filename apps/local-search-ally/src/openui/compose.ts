import type { AssessmentResult, PriorityActionData, QuickWinData, SupportingFindingData } from "@/domain/assessment";
import type { OpportunityInput } from "@/domain/opportunity";
import { getPublicResultsPageOffer } from "@/domain/offers";

function q(value: string) {
  return JSON.stringify(value);
}

function findingLine(id: string, item: SupportingFindingData) {
  return `${id} = SupportingFinding(${q(item.title)}, ${q(item.evidence)}, ${q(item.whyItMatters)}, ${q(item.severity)}, ${q(item.verification)})`;
}

function actionLine(id: string, item: PriorityActionData) {
  return `${id} = PriorityAction(${q(item.priority)}, ${q(item.title)}, ${q(item.rationale)}, ${q(item.outcome)}, ${q(item.effort)})`;
}

function quickWinLine(id: string, item: QuickWinData) {
  return `${id} = QuickWin(${q(item.title)}, ${q(item.checklistLabel)}, ${q(item.impact)}, ${item.completed ? "true" : "false"})`;
}

function objectValue(value: unknown) {
  return JSON.stringify(value);
}

function assumptionLine(id: string, item: OpportunityInput) {
  return `${id} = OpportunityAssumption(${q(item.key)}, ${q(item.label)}, ${item.value ?? "null"}, ${
    item.lowValue ?? "null"
  }, ${item.highValue ?? "null"}, ${q(item.unit)}, ${q(item.verification)}, ${item.sourceLabel ? q(item.sourceLabel) : "null"}, ${
    item.explanation ? q(item.explanation) : "null"
  }, ${item.editable ? "true" : "false"})`;
}

export function composeAssessmentOpenUI(result: AssessmentResult) {
  const complete = result.status === "complete";
  const publicOffer = complete ? getPublicResultsPageOffer(result) : null;
  const estimate = result.opportunityEstimate;
  const hasCompleteEstimate = Boolean(
    estimate.monthlyRevenueOpportunity && estimate.missedCalls && estimate.missedJobs && estimate.evidenceLevel !== "incomplete",
  );
  const rootItems = ["header"];
  const lines: string[] = [];

  if (result.dataLimitations.length) rootItems.push("notice");
  rootItems.push(hasCompleteEstimate ? "opportunityHero" : "incompleteOpportunity");
  if (hasCompleteEstimate) rootItems.push("metricsSection");
  rootItems.push("confidence", hasCompleteEstimate ? "calculation" : "", "assumptions");
  if (!complete) rootItems.push("incomplete");
  if (complete && result.primaryDiagnosis) rootItems.push("diagnosis");
  if (complete && (result.strengthSummary || result.lostCallRisk || result.supportingFindings.length)) rootItems.push("evidenceSection");
  if (result.nextBestStep) rootItems.push("nextStep");
  if (complete && (result.priorityActions.length || result.quickWins.length)) rootItems.push("actionSection");
  if (publicOffer) rootItems.push("offer");

  lines.push(`root = AssessmentResults([${rootItems.filter(Boolean).join(", ")}])`);
  lines.push(
    `header = AssessmentHeader(${q(result.businessName)}, ${q(result.trade)}, ${q(result.market)}, ${q(result.generatedAt)}, ${q(result.status)}, ${q(result.headline)})`,
  );

  if (result.dataLimitations.length) lines.push(`notice = DataLimitationNotice([${result.dataLimitations.map(q).join(", ")}])`);
  if (hasCompleteEstimate && estimate.monthlyRevenueOpportunity && estimate.missedCalls && estimate.missedJobs) {
    lines.push(
      `opportunityHero = OpportunityGapHero(${objectValue(estimate.monthlyRevenueOpportunity)}, ${objectValue(
        estimate.missedCalls,
      )}, ${q(estimate.evidenceLevel)}, ${q(estimate.confidence)}, ${q(estimate.explanation)})`,
    );
    lines.push(`metricsSection = ResultsSection("Missed calls and jobs", [missedCalls, missedJobs])`);
    lines.push(`missedCalls = MissedCallsMetric(${objectValue(estimate.missedCalls)}, ${q(estimate.evidenceLevel)})`);
    lines.push(`missedJobs = MissedJobsMetric(${objectValue(estimate.missedJobs)}, ${q(estimate.evidenceLevel)})`);
  } else {
    lines.push(
      `incompleteOpportunity = IncompleteOpportunityState([${estimate.inputs.map(objectValue).join(", ")}], ${q(
        estimate.explanation,
      )}, [${estimate.limitations.map(q).join(", ")}])`,
    );
  }
  lines.push(
    `confidence = EstimateConfidence(${q(estimate.evidenceLevel)}, ${q(estimate.confidence)}, ${q(estimate.explanation)}, [${estimate.limitations
      .map(q)
      .join(", ")}])`,
  );
  if (hasCompleteEstimate) {
    lines.push(`calculation = CalculationBreakdown([${estimate.calculationSteps.map(q).join(", ")}])`);
  }
  const assumptionIds = estimate.inputs.map((_, index) => `assumption${index + 1}`);
  lines.push(`assumptions = AssumptionList([${assumptionIds.join(", ")}])`);
  estimate.inputs.forEach((item, index) => lines.push(assumptionLine(assumptionIds[index], item)));
  if (!complete && result.nextBestStep) lines.push(`incomplete = IncompleteAssessmentState(${q(result.nextBestStep)})`);
  if (complete && result.primaryDiagnosis) lines.push(`diagnosis = PrimaryDiagnosis(${q(result.primaryDiagnosis)})`);

  if (complete) {
    const evidenceItems: string[] = [];
    if (result.strengthSummary) {
      evidenceItems.push("strength");
      lines.push(`strength = StrengthSummary(${q(result.strengthSummary)})`);
    }
    if (result.lostCallRisk) {
      evidenceItems.push("risk");
      lines.push(`risk = LostCallRisk(${q(result.lostCallRisk)})`);
    }
    const findingIds = result.supportingFindings.map((_, index) => `finding${index + 1}`);
    evidenceItems.push(...findingIds);
    if (evidenceItems.length) lines.push(`evidenceSection = ResultsSection("Supporting evidence and risks", [${evidenceItems.join(", ")}])`);
    result.supportingFindings.forEach((item, index) => lines.push(findingLine(findingIds[index], item)));

    const actionItems: string[] = [];
    const actionIds = result.priorityActions.map((_, index) => `action${index + 1}`);
    actionItems.push(...actionIds);
    result.priorityActions.forEach((item, index) => lines.push(actionLine(actionIds[index], item)));

    if (result.quickWins.length) {
      const winIds = result.quickWins.map((_, index) => `win${index + 1}`);
      actionItems.push("wins");
      lines.push(`wins = QuickWinChecklist([${winIds.join(", ")}])`);
      result.quickWins.forEach((item, index) => lines.push(quickWinLine(winIds[index], item)));
    }

    if (actionItems.length) lines.push(`actionSection = ResultsSection("Priority actions", [${actionItems.join(", ")}])`);
  }

  if (result.nextBestStep) lines.push(`nextStep = NextBestStep(${q(result.nextBestStep)})`);
  if (publicOffer) {
    lines.push(
      `offer = LowTicketOfferCTA(${q(publicOffer.slug)}, "Your assessment found that recent public proof and homeowner trust signals should be strengthened before broader visibility work.")`,
    );
  }

  return lines.join("\n");
}
