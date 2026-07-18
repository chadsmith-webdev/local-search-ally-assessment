import { z } from "zod/v4";
import { assessmentResultSchema } from "./assessment";

export const resultRendererModeSchema = z.enum(["openui", "deterministic-fallback"]);
export const resultEmailDeliveryStatusSchema = z.enum(["not-queued", "queued", "sent", "failed"]);

export const savedAssessmentResultSchema = z.object({
  id: z.string().min(1),
  assessmentId: z.string().min(1),
  leadId: z.string().min(1),
  result: assessmentResultSchema,
  openUIResponse: z.string().min(1).optional(),
  rendererMode: resultRendererModeSchema,
  fallbackReason: z.string().min(1).optional(),
  accessTokenId: z.string().min(1).optional(),
  resultEmailDeliveryStatus: resultEmailDeliveryStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ResultRendererMode = z.infer<typeof resultRendererModeSchema>;
export type ResultEmailDeliveryStatus = z.infer<typeof resultEmailDeliveryStatusSchema>;
export type SavedAssessmentResult = z.infer<typeof savedAssessmentResultSchema>;
