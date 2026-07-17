import { createLibrary, defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";
import {
  AssessmentHeader as AssessmentHeaderView,
  AssessmentResults as AssessmentResultsView,
  CategoryScore as CategoryScoreView,
  CategoryScoreGrid as CategoryScoreGridView,
  ConsultationCTA as ConsultationCTAView,
  DataLimitationNotice as DataLimitationNoticeView,
  IncompleteAssessmentState as IncompleteAssessmentStateView,
  LostCallRisk as LostCallRiskView,
  NextBestStep as NextBestStepView,
  OverallScore as OverallScoreView,
  PrimaryDiagnosis as PrimaryDiagnosisView,
  PriorityAction as PriorityActionView,
  QuickWin as QuickWinView,
  QuickWinChecklist as QuickWinChecklistView,
  ResultsSection as ResultsSectionView,
  StrengthSummary as StrengthSummaryView,
  SupportingFinding as SupportingFindingView,
} from "@/components/product/assessment-components";
import { ctaActionIdSchema, prioritySchema, ratingSchema, severitySchema, verificationSchema } from "@/domain/assessment";
import { promptOptions } from "./prompt-options";

export const AssessmentHeader = defineComponent({
  name: "AssessmentHeader",
  description: "Shows the assessed contractor, market, trade, generation date, status, and supplied headline.",
  props: z.object({
    businessName: z.string(),
    trade: z.string(),
    market: z.string(),
    generatedAt: z.string(),
    status: z.enum(["complete", "incomplete"]),
    headline: z.string(),
  }),
  component: ({ props }) => <AssessmentHeaderView {...props} />,
});

export const OverallScore = defineComponent({
  name: "OverallScore",
  description: "Shows the supplied overall assessment score and summary for a complete assessment.",
  props: z.object({
    score: z.number().int().min(0).max(100),
    label: z.string(),
    summary: z.string(),
  }),
  component: ({ props }) => <OverallScoreView {...props} />,
});

export const CategoryScore = defineComponent({
  name: "CategoryScore",
  description: "Shows one supplied category score, rating, verification state, summary, and evidence.",
  props: z.object({
    label: z.string(),
    score: z.number().int().min(0).max(100),
    rating: ratingSchema,
    summary: z.string(),
    evidence: z.string(),
    verification: verificationSchema,
  }),
  component: ({ props }) => <CategoryScoreView {...props} />,
});

export const CategoryScoreGrid = defineComponent({
  name: "CategoryScoreGrid",
  description: "Groups up to six CategoryScore components.",
  props: z.object({
    categories: z.array(CategoryScore.ref).min(1).max(6),
  }),
  component: ({ props, renderNode }) => <CategoryScoreGridView>{renderNode(props.categories)}</CategoryScoreGridView>,
});

export const DataLimitationNotice = defineComponent({
  name: "DataLimitationNotice",
  description: "Lists supplied limitations that affect assessment confidence.",
  props: z.object({
    limitations: z.array(z.string()).min(1).max(6),
  }),
  component: ({ props }) => <DataLimitationNoticeView {...props} />,
});

export const IncompleteAssessmentState = defineComponent({
  name: "IncompleteAssessmentState",
  description: "Explains why an incomplete assessment should not show a complete diagnosis or overall score.",
  props: z.object({
    message: z.string(),
  }),
  component: ({ props }) => <IncompleteAssessmentStateView {...props} />,
});

export const PrimaryDiagnosis = defineComponent({
  name: "PrimaryDiagnosis",
  description: "Shows the one supplied primary diagnosis for a complete assessment.",
  props: z.object({
    diagnosis: z.string(),
  }),
  component: ({ props }) => <PrimaryDiagnosisView {...props} />,
});

export const StrengthSummary = defineComponent({
  name: "StrengthSummary",
  description: "Summarizes supplied evidence about what is already working.",
  props: z.object({
    summary: z.string(),
  }),
  component: ({ props }) => <StrengthSummaryView {...props} />,
});

export const SupportingFinding = defineComponent({
  name: "SupportingFinding",
  description: "Shows one supplied supporting finding with evidence, importance, severity, and verification.",
  props: z.object({
    title: z.string(),
    evidence: z.string(),
    whyItMatters: z.string(),
    severity: severitySchema,
    verification: verificationSchema,
  }),
  component: ({ props }) => <SupportingFindingView {...props} />,
});

export const LostCallRisk = defineComponent({
  name: "LostCallRisk",
  description: "Explains the supplied call, trust, or booked-job risk in cautious language.",
  props: z.object({
    risk: z.string(),
  }),
  component: ({ props }) => <LostCallRiskView {...props} />,
});

export const PriorityAction = defineComponent({
  name: "PriorityAction",
  description: "Shows one supplied prioritized action without changing its priority.",
  props: z.object({
    priority: prioritySchema,
    title: z.string(),
    rationale: z.string(),
    outcome: z.string(),
    effort: z.enum(["low", "medium", "high"]),
  }),
  component: ({ props }) => <PriorityActionView {...props} />,
});

export const QuickWin = defineComponent({
  name: "QuickWin",
  description: "Shows one supplied quick-win checklist item and its expected practical impact.",
  props: z.object({
    title: z.string(),
    checklistLabel: z.string(),
    impact: z.string(),
    completed: z.boolean().optional(),
  }),
  component: ({ props }) => <QuickWinView {...props} />,
});

export const QuickWinChecklist = defineComponent({
  name: "QuickWinChecklist",
  description: "Groups up to five QuickWin components.",
  props: z.object({
    wins: z.array(QuickWin.ref).min(1).max(5),
  }),
  component: ({ props, renderNode }) => <QuickWinChecklistView>{renderNode(props.wins)}</QuickWinChecklistView>,
});

export const NextBestStep = defineComponent({
  name: "NextBestStep",
  description: "Shows the supplied next best step.",
  props: z.object({
    step: z.string(),
  }),
  component: ({ props }) => <NextBestStepView {...props} />,
});

export const ConsultationCTA = defineComponent({
  name: "ConsultationCTA",
  description: "Shows a CTA that uses an approved internal actionId rather than a model-supplied URL.",
  props: z.object({
    actionId: ctaActionIdSchema,
    label: z.string(),
    summary: z.string(),
  }),
  component: ({ props }) => <ConsultationCTAView {...props} />,
});

const sectionChild = z.union([
  OverallScore.ref,
  CategoryScoreGrid.ref,
  DataLimitationNotice.ref,
  IncompleteAssessmentState.ref,
  PrimaryDiagnosis.ref,
  StrengthSummary.ref,
  SupportingFinding.ref,
  LostCallRisk.ref,
  PriorityAction.ref,
  QuickWinChecklist.ref,
  NextBestStep.ref,
  ConsultationCTA.ref,
]);

export const ResultsSection = defineComponent({
  name: "ResultsSection",
  description: "Wraps a named, non-empty section of assessment content.",
  props: z.object({
    title: z.string(),
    items: z.array(sectionChild).min(1).max(8),
  }),
  component: ({ props, renderNode }) => <ResultsSectionView title={props.title}>{renderNode(props.items)}</ResultsSectionView>,
});

const rootChild = z.union([
  AssessmentHeader.ref,
  DataLimitationNotice.ref,
  IncompleteAssessmentState.ref,
  OverallScore.ref,
  PrimaryDiagnosis.ref,
  ResultsSection.ref,
  NextBestStep.ref,
  ConsultationCTA.ref,
]);

export const AssessmentResults = defineComponent({
  name: "AssessmentResults",
  description: "Root component for one contractor assessment result.",
  props: z.object({
    content: z.array(rootChild).min(2).max(10),
  }),
  component: ({ props, renderNode }) => <AssessmentResultsView>{renderNode(props.content)}</AssessmentResultsView>,
});

export const assessmentLibrary = createLibrary({
  root: "AssessmentResults",
  components: [
    AssessmentResults,
    AssessmentHeader,
    OverallScore,
    CategoryScore,
    CategoryScoreGrid,
    DataLimitationNotice,
    IncompleteAssessmentState,
    PrimaryDiagnosis,
    StrengthSummary,
    SupportingFinding,
    LostCallRisk,
    PriorityAction,
    QuickWin,
    QuickWinChecklist,
    NextBestStep,
    ConsultationCTA,
    ResultsSection,
  ],
  componentGroups: [
    {
      name: "Assessment Structure",
      components: ["AssessmentResults", "AssessmentHeader", "ResultsSection", "IncompleteAssessmentState", "DataLimitationNotice"],
      notes: [
        "Use AssessmentResults as the root.",
        "Use exactly one AssessmentHeader.",
        "Do not create empty sections.",
      ],
    },
    {
      name: "Scores and Status",
      components: ["OverallScore", "CategoryScore", "CategoryScoreGrid"],
      notes: [
        "Use no more than one OverallScore.",
        "Do not use OverallScore for incomplete assessments.",
        "Use no more than six CategoryScore components.",
      ],
    },
    {
      name: "Diagnosis and Evidence",
      components: ["PrimaryDiagnosis", "StrengthSummary", "SupportingFinding", "LostCallRisk"],
      notes: [
        "Use exactly one PrimaryDiagnosis in a complete assessment.",
        "Use no more than five SupportingFinding components.",
        "Never invent evidence, benchmarks, sources, dates, statistics, revenue, rankings, calls, or conversions.",
      ],
    },
    {
      name: "Actions",
      components: ["PriorityAction", "QuickWin", "QuickWinChecklist", "NextBestStep", "ConsultationCTA"],
      notes: [
        "Use no more than three PriorityAction components.",
        "Use no more than five QuickWin components.",
        "Use no more than one NextBestStep and one ConsultationCTA.",
        "ConsultationCTA must use an approved actionId enum.",
      ],
    },
  ],
});

export const library = assessmentLibrary;
export { promptOptions };
