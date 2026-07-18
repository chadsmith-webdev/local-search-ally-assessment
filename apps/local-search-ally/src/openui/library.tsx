import { createLibrary, defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";
import {
  AssessmentHeader as AssessmentHeaderView,
  AssessmentResults as AssessmentResultsView,
  AssumptionList as AssumptionListView,
  CalculationBreakdown as CalculationBreakdownView,
  DataLimitationNotice as DataLimitationNoticeView,
  EstimateConfidence as EstimateConfidenceView,
  IncompleteAssessmentState as IncompleteAssessmentStateView,
  IncompleteOpportunityState as IncompleteOpportunityStateView,
  LostCallRisk as LostCallRiskView,
  LowTicketOfferCTA as LowTicketOfferCTAView,
  MissedCallsMetric as MissedCallsMetricView,
  MissedJobsMetric as MissedJobsMetricView,
  NextBestStep as NextBestStepView,
  OpportunityAssumption as OpportunityAssumptionView,
  OpportunityGapHero as OpportunityGapHeroView,
  PrimaryDiagnosis as PrimaryDiagnosisView,
  PriorityAction as PriorityActionView,
  QuickWin as QuickWinView,
  QuickWinChecklist as QuickWinChecklistView,
  ResultsSection as ResultsSectionView,
  StrengthSummary as StrengthSummaryView,
  SupportingFinding as SupportingFindingView,
} from "@/components/product/assessment-components";
import { prioritySchema, severitySchema, verificationSchema } from "@/domain/assessment";
import { approvedOfferSlugSchema, getOfferBySlug, isOfferReadyForPublicCheckout } from "@/domain/offers";
import {
  estimateConfidenceSchema,
  estimateEvidenceLevelSchema,
  opportunityInputSchema,
  opportunityRangeSchema,
  revenueOpportunityRangeSchema,
} from "@/domain/opportunity";
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
  description: "Explains why an incomplete assessment should not show a complete diagnosis.",
  props: z.object({
    message: z.string(),
  }),
  component: ({ props }) => <IncompleteAssessmentStateView {...props} />,
});

export const OpportunityGapHero = defineComponent({
  name: "OpportunityGapHero",
  description:
    "Shows the supplied monthly revenue opportunity range as the primary result hero without changing the supplied values.",
  props: z.object({
    monthlyRevenueOpportunity: revenueOpportunityRangeSchema,
    missedCalls: opportunityRangeSchema,
    evidenceLevel: estimateEvidenceLevelSchema,
    confidence: estimateConfidenceSchema,
    explanation: z.string(),
  }),
  component: ({ props }) => <OpportunityGapHeroView {...props} />,
});

export const MissedCallsMetric = defineComponent({
  name: "MissedCallsMetric",
  description: "Shows the supplied missed-call range and evidence level.",
  props: z.object({
    missedCalls: opportunityRangeSchema,
    evidenceLevel: estimateEvidenceLevelSchema,
  }),
  component: ({ props }) => <MissedCallsMetricView {...props} />,
});

export const MissedJobsMetric = defineComponent({
  name: "MissedJobsMetric",
  description: "Shows the supplied missed-job range and evidence level.",
  props: z.object({
    missedJobs: opportunityRangeSchema,
    evidenceLevel: estimateEvidenceLevelSchema,
  }),
  component: ({ props }) => <MissedJobsMetricView {...props} />,
});

export const EstimateConfidence = defineComponent({
  name: "EstimateConfidence",
  description: "Shows supplied evidence level, confidence, explanation, and limitations.",
  props: z.object({
    evidenceLevel: estimateEvidenceLevelSchema,
    confidence: estimateConfidenceSchema,
    explanation: z.string(),
    limitations: z.array(z.string()).max(8),
  }),
  component: ({ props }) => <EstimateConfidenceView {...props} />,
});

export const CalculationBreakdown = defineComponent({
  name: "CalculationBreakdown",
  description: "Shows supplied calculation steps in order without reconstructing formulas.",
  props: z.object({
    steps: z.array(z.string()).min(1).max(12),
  }),
  component: ({ props }) => <CalculationBreakdownView {...props} />,
});

export const OpportunityAssumption = defineComponent({
  name: "OpportunityAssumption",
  description: "Shows one supplied opportunity assumption, value, source, verification, and editability.",
  props: opportunityInputSchema,
  component: ({ props }) => <OpportunityAssumptionView input={props} />,
});

export const AssumptionList = defineComponent({
  name: "AssumptionList",
  description: "Shows the supplied opportunity assumptions in reviewable form.",
  props: z.object({
    assumptions: z.array(OpportunityAssumption.ref).length(4),
  }),
  component: ({ props, renderNode }) => <AssumptionListView>{renderNode(props.assumptions)}</AssumptionListView>,
});

export const IncompleteOpportunityState = defineComponent({
  name: "IncompleteOpportunityState",
  description: "Explains which supplied opportunity inputs are missing before a defensible estimate can be calculated.",
  props: z.object({
    inputs: z.array(opportunityInputSchema).length(4),
    explanation: z.string(),
    limitations: z.array(z.string()).min(1).max(8),
  }),
  component: ({ props }) => (
    <IncompleteOpportunityStateView
      estimate={{
        evidenceLevel: "incomplete",
        confidence: "low",
        inputs: props.inputs,
        explanation: props.explanation,
        limitations: props.limitations,
        calculationSteps: [],
      }}
    />
  ),
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

export const LowTicketOfferCTA = defineComponent({
  name: "LowTicketOfferCTA",
  description:
    "Shows the approved low-ticket offer CTA for a matching diagnosis. Product name, price, deliverables, and checkout route are resolved from the offer registry.",
  props: z.object({
    offerSlug: approvedOfferSlugSchema,
    diagnosisConnection: z.string(),
  }),
  component: ({ props }) => {
    const offer = getOfferBySlug(props.offerSlug);
    if (!offer || !isOfferReadyForPublicCheckout(offer)) return null;

    return (
      <LowTicketOfferCTAView
        offer={offer}
        diagnosisConnection={props.diagnosisConnection}
        checkoutHref={`/checkout/${offer.slug}`}
      />
    );
  },
});

const sectionChild = z.union([
  OpportunityGapHero.ref,
  MissedCallsMetric.ref,
  MissedJobsMetric.ref,
  EstimateConfidence.ref,
  CalculationBreakdown.ref,
  AssumptionList.ref,
  IncompleteOpportunityState.ref,
  DataLimitationNotice.ref,
  IncompleteAssessmentState.ref,
  PrimaryDiagnosis.ref,
  StrengthSummary.ref,
  SupportingFinding.ref,
  LostCallRisk.ref,
  PriorityAction.ref,
  QuickWinChecklist.ref,
  NextBestStep.ref,
  LowTicketOfferCTA.ref,
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
  OpportunityGapHero.ref,
  MissedCallsMetric.ref,
  MissedJobsMetric.ref,
  EstimateConfidence.ref,
  CalculationBreakdown.ref,
  AssumptionList.ref,
  IncompleteOpportunityState.ref,
  IncompleteAssessmentState.ref,
  PrimaryDiagnosis.ref,
  ResultsSection.ref,
  NextBestStep.ref,
  LowTicketOfferCTA.ref,
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
    OpportunityGapHero,
    MissedCallsMetric,
    MissedJobsMetric,
    EstimateConfidence,
    CalculationBreakdown,
    OpportunityAssumption,
    AssumptionList,
    IncompleteOpportunityState,
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
    LowTicketOfferCTA,
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
      name: "Opportunity Estimate",
      components: [
        "OpportunityGapHero",
        "MissedCallsMetric",
        "MissedJobsMetric",
        "EstimateConfidence",
        "CalculationBreakdown",
        "OpportunityAssumption",
        "AssumptionList",
        "IncompleteOpportunityState",
      ],
      notes: [
        "Lead with OpportunityGapHero when a complete estimate exists.",
        "Use IncompleteOpportunityState when a complete estimate does not exist.",
        "Never change the supplied opportunity range, evidence level, confidence, or input values.",
        "Display CalculationBreakdown when a complete estimate exists.",
        "Keep assumptions and limitations visible.",
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
      components: ["PriorityAction", "QuickWin", "QuickWinChecklist", "NextBestStep", "LowTicketOfferCTA"],
      notes: [
        "Use no more than three PriorityAction components.",
        "Use no more than five QuickWin components.",
        "Use no more than one NextBestStep and one LowTicketOfferCTA.",
        "LowTicketOfferCTA must use an approved offerSlug enum.",
        "Never place offer name, price, deliverables, scarcity, checkout URL, or product bonuses in model-written text.",
        "Do not create an offer substitute when no eligible active offer exists.",
      ],
    },
  ],
});

export const library = assessmentLibrary;
export { promptOptions };
