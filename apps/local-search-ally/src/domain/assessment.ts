import { z } from "zod/v4";
import { diagnosisCategorySchema } from "./offers";
import { opportunityEstimateSchema } from "./opportunity";

export const assessmentInputSchema = z.object({
  businessName: z.string().min(2).max(120),
  trade: z.string().min(2).max(80),
  market: z.string().min(2).max(120),
  websiteUrl: z.url().optional(),
  googleBusinessProfileUrl: z.url().optional(),
  monthlyLeadGoal: z.number().int().min(1).max(2000).optional(),
  monthlyQualifiedLeads: z.number().int().min(1).max(2000).optional(),
  bookingRatePercent: z.number().min(1).max(100).optional(),
  averageJobValue: z.number().int().min(100).max(100000).optional(),
  missedCallsPerMonth: z.number().min(0).max(2000).optional(),
  opportunityLossRateLowPercent: z.number().min(1).max(95).optional(),
  opportunityLossRateHighPercent: z.number().min(1).max(95).optional(),
});

export type AssessmentInput = z.infer<typeof assessmentInputSchema>;

export const ratingSchema = z.enum(["excellent", "good", "fair", "weak", "missing"]);
export const severitySchema = z.enum(["low", "moderate", "high", "critical"]);
export const verificationSchema = z.enum(["verified", "partially-verified", "unverified"]);
export const prioritySchema = z.enum(["first", "second", "third"]);

export type Rating = z.infer<typeof ratingSchema>;
export type Severity = z.infer<typeof severitySchema>;
export type Verification = z.infer<typeof verificationSchema>;
export type Priority = z.infer<typeof prioritySchema>;

export const categoryScoreSchema = z.object({
  id: z.string().min(2),
  label: z.string().min(2).max(80),
  score: z.number().int().min(0).max(100),
  rating: ratingSchema,
  summary: z.string().min(8).max(220),
  evidence: z.string().min(8).max(260),
  verification: verificationSchema,
});

export const supportingFindingSchema = z.object({
  title: z.string().min(4).max(110),
  evidence: z.string().min(8).max(300),
  whyItMatters: z.string().min(8).max(260),
  severity: severitySchema,
  verification: verificationSchema,
});

export const priorityActionSchema = z.object({
  priority: prioritySchema,
  title: z.string().min(4).max(110),
  rationale: z.string().min(8).max(260),
  outcome: z.string().min(8).max(220),
  effort: z.enum(["low", "medium", "high"]),
});

export const quickWinSchema = z.object({
  title: z.string().min(4).max(100),
  checklistLabel: z.string().min(4).max(130),
  impact: z.string().min(8).max(220),
  completed: z.boolean().default(false),
});

export const assessmentResultSchema = z.object({
  id: z.string().min(4),
  businessName: z.string().min(2).max(120),
  trade: z.string().min(2).max(80),
  market: z.string().min(2).max(120),
  generatedAt: z.iso.datetime(),
  status: z.enum(["complete", "incomplete"]),
  dataLimitations: z.array(z.string().min(4).max(220)).max(6),
  opportunityEstimate: opportunityEstimateSchema,
  overallScore: z.number().int().min(0).max(100).nullable(),
  headline: z.string().min(8).max(140),
  primaryDiagnosis: z.string().min(8).max(360).nullable(),
  primaryDiagnosisCategory: diagnosisCategorySchema.nullable(),
  supportingDiagnosisCategories: z.array(diagnosisCategorySchema).max(6),
  strengthSummary: z.string().min(8).max(300).nullable(),
  lostCallRisk: z.string().min(8).max(320).nullable(),
  categories: z.array(categoryScoreSchema).max(6),
  supportingFindings: z.array(supportingFindingSchema).max(5),
  priorityActions: z.array(priorityActionSchema).max(3),
  quickWins: z.array(quickWinSchema).max(5),
  nextBestStep: z.string().min(8).max(240).nullable(),
  recommendedOfferSlug: z.string().min(1).nullable(),
});

export type CategoryScoreData = z.infer<typeof categoryScoreSchema>;
export type SupportingFindingData = z.infer<typeof supportingFindingSchema>;
export type PriorityActionData = z.infer<typeof priorityActionSchema>;
export type QuickWinData = z.infer<typeof quickWinSchema>;
export type AssessmentResult = z.infer<typeof assessmentResultSchema>;
