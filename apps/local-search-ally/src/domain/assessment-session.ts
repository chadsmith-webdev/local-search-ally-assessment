import { z } from "zod/v4";
import { assessmentInputSchema, assessmentResultSchema } from "./assessment";

export const assessmentSessionStatusSchema = z.enum([
  "answering",
  "reviewed",
  "lead-captured",
  "generating",
  "generation-failed",
  "result-ready",
]);

export const assessmentSessionSchema = z.object({
  id: z.string().min(1),
  input: assessmentInputSchema.partial(),
  status: assessmentSessionStatusSchema,
  leadId: z.string().min(1).optional(),
  resultId: z.string().min(1).optional(),
  result: assessmentResultSchema.optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type AssessmentSessionStatus = z.infer<typeof assessmentSessionStatusSchema>;
export type AssessmentSession = z.infer<typeof assessmentSessionSchema>;
