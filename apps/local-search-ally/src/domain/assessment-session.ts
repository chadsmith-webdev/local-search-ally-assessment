import { z } from "zod/v4";
import { assessmentInputSchema, type AssessmentInput } from "./assessment";

export const assessmentStepSchema = z.enum([
  "business",
  "market",
  "visibility",
  "conversion",
  "economics",
  "goals",
  "review",
  "contact",
  "generating",
  "completed",
]);

export const answerConfidenceSchema = z.enum(["exact", "estimated", "unknown"]);
export const yesNoUnsureSchema = z.enum(["yes", "no", "unsure"]);

export const assessmentSessionStatusSchema = z.enum([
  "draft",
  "reviewed",
  "contact-captured",
  "generating",
  "completed",
  "generation-failed",
]);

const optionalUrlSchema = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : undefined))
  .pipe(z.url().optional());

const optionalTextSchema = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : undefined))
  .optional();

function optionalBoundedNumber(min = 0, max = Number.MAX_SAFE_INTEGER, message?: string) {
  return z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      return value;
    },
    z.coerce.number().min(min, message).max(max).optional(),
  );
}

const optionalNumberSchema = optionalBoundedNumber();

export const businessAnswersSchema = z.object({
  businessName: z.string().trim().min(2, "Enter the business name.").max(120),
  firstName: optionalTextSchema,
  trade: z.string().trim().min(2, "Enter the primary trade.").max(80),
  websiteUrl: optionalUrlSchema,
  googleBusinessProfileUrl: optionalUrlSchema,
  googleBusinessProfileName: optionalTextSchema,
  serviceArea: z.string().trim().min(2, "Enter the primary service area.").max(120),
  teamSize: z.enum(["solo", "2-5", "6-15", "16-50", "50-plus", "unknown"]),
});

export const marketAnswersSchema = z.object({
  primaryServices: z.string().trim().min(2, "List the primary services.").max(240),
  highestValueService: z.string().trim().min(2, "Enter the highest-value service.").max(120),
  citiesServed: z.string().trim().min(2, "Enter the cities or areas served.").max(240),
  emergencyService: yesNoUnsureSchema,
  customerFocus: z.enum(["residential", "commercial", "mixed"]),
  monthlyJobVolume: optionalNumberSchema,
});

export const visibilityAnswersSchema = z.object({
  appearsOnGoogleMaps: yesNoUnsureSchema,
  reviewCount: optionalNumberSchema,
  mostRecentReviewAge: z.enum(["30-days", "90-days", "6-months", "older", "unknown"]),
  reviewsRequestedConsistently: yesNoUnsureSchema,
  projectPhotosPublished: yesNoUnsureSchema,
  websiteRecentProjects: yesNoUnsureSchema,
  businessInfoConsistent: yesNoUnsureSchema,
  googleBusinessProfileComplete: yesNoUnsureSchema,
});

export const conversionAnswersSchema = z.object({
  qualifiedCallsPerMonth: optionalNumberSchema,
  missedCallsPerMonth: optionalNumberSchema,
  missedCallCallbacks: z.enum(["same-day", "next-day", "inconsistent", "not-tracked", "unknown"]),
  bookingRatePercent: optionalBoundedNumber(1, 100),
  clearPhoneCta: yesNoUnsureSchema,
  requestForm: yesNoUnsureSchema,
  leadsTracked: yesNoUnsureSchema,
  followUpSpeed: z.enum(["under-15-min", "same-day", "next-day", "inconsistent", "unknown"]),
  leadHandlingBottleneck: z.string().trim().min(2, "Select or describe the main bottleneck.").max(160),
});

export const economicsAnswersSchema = z.object({
  averageJobValue: optionalBoundedNumber(100, 100000, "Enter an average job value of at least $100."),
  averageJobValueConfidence: answerConfidenceSchema,
  qualifiedLeadVolume: optionalBoundedNumber(1, 2000),
  qualifiedLeadVolumeConfidence: answerConfidenceSchema,
  bookingRatePercent: optionalBoundedNumber(1, 100),
  bookingRateConfidence: answerConfidenceSchema,
  knownMissedCallCount: optionalNumberSchema,
  opportunityLossRateLowPercent: optionalBoundedNumber(1, 95),
  opportunityLossRateHighPercent: optionalBoundedNumber(1, 95),
});

export const goalsAnswersSchema = z.object({
  primaryBusinessGoal: z.string().trim().min(2, "Enter the primary business goal.").max(160),
  urgentMarketingConcern: z.string().trim().min(2, "Enter the most urgent concern.").max(160),
  desiredOutcome: z.enum(["more-calls", "better-lead-quality", "higher-booking-rate", "stronger-reputation", "consistent-job-flow"]),
  implementationTime: z.enum(["under-1-hour", "1-3-hours", "half-day", "team-can-own", "not-sure"]),
  implementer: z.enum(["owner", "office-team", "technician", "marketing-help", "not-sure"]),
  preferredFirstOutcome: z.string().trim().min(2, "Enter the preferred first outcome.").max(160),
});

export const assessmentAnswersSchema = z.object({
  business: businessAnswersSchema.partial().optional(),
  market: marketAnswersSchema.partial().optional(),
  visibility: visibilityAnswersSchema.partial().optional(),
  conversion: conversionAnswersSchema.partial().optional(),
  economics: economicsAnswersSchema.partial().optional(),
  goals: goalsAnswersSchema.partial().optional(),
});

export const assessmentSessionSchema = z.object({
  id: z.string().min(1),
  status: assessmentSessionStatusSchema,
  currentStep: assessmentStepSchema,
  answers: assessmentAnswersSchema,
  leadId: z.string().min(1).optional(),
  resultId: z.string().min(1).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().optional(),
  generationError: z.string().min(1).optional(),
});

export type AssessmentStep = z.infer<typeof assessmentStepSchema>;
export type AssessmentSessionStatus = z.infer<typeof assessmentSessionStatusSchema>;
export type AssessmentAnswers = z.infer<typeof assessmentAnswersSchema>;
export type AssessmentSession = z.infer<typeof assessmentSessionSchema>;

export const answerStepOrder = ["business", "market", "visibility", "conversion", "economics", "goals"] as const;
export type AnswerStep = (typeof answerStepOrder)[number];

export const assessmentStepLabels: Record<AnswerStep, string> = {
  business: "Business Information",
  market: "Market and Services",
  visibility: "Visibility and Proof",
  conversion: "Conversion and Lead Handling",
  economics: "Business Economics",
  goals: "Goals and Priorities",
};

export const nextStepLabels: Record<AnswerStep, string> = {
  business: "Continue to Market and Services",
  market: "Continue to Visibility and Proof",
  visibility: "Continue to Conversion",
  conversion: "Continue to Business Economics",
  economics: "Continue to Goals",
  goals: "Review My Answers",
};

export const stepSchemas = {
  business: businessAnswersSchema,
  market: marketAnswersSchema,
  visibility: visibilityAnswersSchema,
  conversion: conversionAnswersSchema,
  economics: economicsAnswersSchema,
  goals: goalsAnswersSchema,
} satisfies Record<AnswerStep, z.ZodType>;

export function nextStepFor(step: AnswerStep): AssessmentStep {
  const index = answerStepOrder.indexOf(step);
  return answerStepOrder[index + 1] ?? "review";
}

export function previousStepFor(step: AnswerStep): AssessmentStep | null {
  const index = answerStepOrder.indexOf(step);
  return index > 0 ? answerStepOrder[index - 1] : null;
}

export function isStepComplete(step: AnswerStep, answers: AssessmentAnswers) {
  return stepSchemas[step].safeParse(answers[step]).success;
}

export function firstIncompleteStep(answers: AssessmentAnswers): AnswerStep | null {
  return answerStepOrder.find((step) => !isStepComplete(step, answers)) ?? null;
}

export function canAccessStep(step: AssessmentStep, answers: AssessmentAnswers) {
  if (step === "completed") return true;
  if (step === "business") return true;
  if (step === "review" || step === "contact" || step === "generating") return firstIncompleteStep(answers) === null;
  const targetIndex = answerStepOrder.indexOf(step as AnswerStep);
  if (targetIndex < 0) return false;
  return answerStepOrder.slice(0, targetIndex).every((priorStep) => isStepComplete(priorStep, answers));
}

export function mergeStepAnswers(session: AssessmentSession, step: AnswerStep, formData: unknown, now: string): AssessmentSession {
  const parsed = stepSchemas[step].parse(formData);
  return {
    ...session,
    status: "draft",
    currentStep: nextStepFor(step),
    answers: {
      ...session.answers,
      [step]: parsed,
    },
    updatedAt: now,
  };
}

export function buildAssessmentInputFromAnswers(answers: AssessmentAnswers): AssessmentInput {
  const business = businessAnswersSchema.parse(answers.business);
  const economics = economicsAnswersSchema.parse(answers.economics);
  const conversion = conversionAnswersSchema.parse(answers.conversion);

  return assessmentInputSchema.parse({
    businessName: business.businessName,
    trade: business.trade,
    market: business.serviceArea,
    websiteUrl: business.websiteUrl,
    googleBusinessProfileUrl: business.googleBusinessProfileUrl,
    monthlyQualifiedLeads: economics.qualifiedLeadVolume ?? conversion.qualifiedCallsPerMonth,
    bookingRatePercent: economics.bookingRatePercent ?? conversion.bookingRatePercent,
    averageJobValue: economics.averageJobValue,
    missedCallsPerMonth: economics.knownMissedCallCount ?? conversion.missedCallsPerMonth,
    opportunityLossRateLowPercent: economics.opportunityLossRateLowPercent,
    opportunityLossRateHighPercent: economics.opportunityLossRateHighPercent,
  });
}

export function createEmptyAssessmentSession(id: string, now: string): AssessmentSession {
  return {
    id,
    status: "draft",
    currentStep: "business",
    answers: {},
    createdAt: now,
    updatedAt: now,
  };
}
