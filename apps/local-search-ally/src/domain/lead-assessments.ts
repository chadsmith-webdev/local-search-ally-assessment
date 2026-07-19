import { z } from "zod/v4";

export const leadAssessmentSourceSchema = z.enum(["assessment-results-gate"]);

export const leadAssessmentAssociationSchema = z.object({
  id: z.string().min(1),
  leadId: z.string().min(1),
  assessmentId: z.string().min(1),
  source: leadAssessmentSourceSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type LeadAssessmentSource = z.infer<typeof leadAssessmentSourceSchema>;
export type LeadAssessmentAssociation = z.infer<typeof leadAssessmentAssociationSchema>;
