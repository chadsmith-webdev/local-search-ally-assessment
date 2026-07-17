import type { AssessmentResult, CategoryScoreData, PriorityActionData, QuickWinData, SupportingFindingData } from "@/domain/assessment";

function q(value: string) {
  return JSON.stringify(value);
}

function categoryLine(id: string, item: CategoryScoreData) {
  return `${id} = CategoryScore(${q(item.label)}, ${item.score}, ${q(item.rating)}, ${q(item.summary)}, ${q(item.evidence)}, ${q(item.verification)})`;
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

export function composeAssessmentOpenUI(result: AssessmentResult) {
  const complete = result.status === "complete";
  const rootItems = ["header"];
  const lines: string[] = [];

  if (result.dataLimitations.length) rootItems.push("notice");
  if (!complete) rootItems.push("incomplete");
  if (complete && result.overallScore !== null) rootItems.push("score");
  if (complete && result.primaryDiagnosis) rootItems.push("diagnosis");
  rootItems.push("scoreSection");
  if (complete && (result.strengthSummary || result.lostCallRisk || result.supportingFindings.length)) rootItems.push("evidenceSection");
  if (complete && (result.priorityActions.length || result.quickWins.length)) rootItems.push("actionSection");
  if (result.nextBestStep) rootItems.push("nextStep");
  if (result.ctaActionId) rootItems.push("cta");

  lines.push(`root = AssessmentResults([${rootItems.join(", ")}])`);
  lines.push(
    `header = AssessmentHeader(${q(result.businessName)}, ${q(result.trade)}, ${q(result.market)}, ${q(result.generatedAt)}, ${q(result.status)}, ${q(result.headline)})`,
  );

  if (result.dataLimitations.length) lines.push(`notice = DataLimitationNotice([${result.dataLimitations.map(q).join(", ")}])`);
  if (!complete && result.nextBestStep) lines.push(`incomplete = IncompleteAssessmentState(${q(result.nextBestStep)})`);
  if (complete && result.overallScore !== null) lines.push(`score = OverallScore(${result.overallScore}, "Overall score", ${q(result.headline)})`);
  if (complete && result.primaryDiagnosis) lines.push(`diagnosis = PrimaryDiagnosis(${q(result.primaryDiagnosis)})`);

  const categoryIds = result.categories.map((_, index) => `category${index + 1}`);
  lines.push(`scoreSection = ResultsSection(${q(complete ? "Score detail" : "Available score signals")}, [scoreGrid])`);
  lines.push(`scoreGrid = CategoryScoreGrid([${categoryIds.join(", ")}])`);
  result.categories.forEach((item, index) => lines.push(categoryLine(categoryIds[index], item)));

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
    if (evidenceItems.length) lines.push(`evidenceSection = ResultsSection("Evidence", [${evidenceItems.join(", ")}])`);
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

    if (actionItems.length) lines.push(`actionSection = ResultsSection("Actions", [${actionItems.join(", ")}])`);
  }

  if (result.nextBestStep) lines.push(`nextStep = NextBestStep(${q(result.nextBestStep)})`);
  if (result.ctaActionId) {
    lines.push(
      `cta = ConsultationCTA(${q(result.ctaActionId)}, ${q(complete ? "Talk through the assessment" : "Request an assessment review")}, "Use the assessment to decide what should be handled first.")`,
    );
  }

  return lines.join("\n");
}
