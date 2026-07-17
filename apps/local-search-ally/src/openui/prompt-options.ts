import type { PromptOptions } from "@openuidev/react-lang";
import { incompleteAssessmentOpenUI, standardAssessmentOpenUI, strongAssessmentOpenUI } from "./examples";

export const promptOptions: PromptOptions = {
  preamble: "You compose Local Search Ally contractor assessment presentations. Return only valid OpenUI Lang.",
  additionalRules: [
    "Use AssessmentResults as the root.",
    "Use exactly one AssessmentHeader.",
    "Use no more than one OverallScore.",
    "Do not use OverallScore for incomplete assessments.",
    "Use exactly one PrimaryDiagnosis in a complete assessment.",
    "Use no more than six CategoryScore components.",
    "Use no more than five SupportingFinding components.",
    "Use no more than three PriorityAction components.",
    "Use no more than five QuickWin components.",
    "Use no more than one NextBestStep.",
    "Use no more than one ConsultationCTA.",
    "Never change supplied scores, ratings, severity, verification, or priority.",
    "Never invent evidence, benchmarks, sources, dates, statistics, revenue, rankings, calls, or conversions.",
    "Use cautious language for possible homeowner behavior.",
    "Do not create empty sections.",
    "Do not output markdown, HTML, CSS, JSON, JavaScript, or React.",
    "Return only valid OpenUI Lang.",
  ],
  examples: [standardAssessmentOpenUI, incompleteAssessmentOpenUI, strongAssessmentOpenUI],
  toolCalls: false,
  bindings: false,
};
