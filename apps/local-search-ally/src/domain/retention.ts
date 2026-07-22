import { z } from "zod/v4";
import { deletionRequestStatuses } from "./policies";

export const dataDeletionRequestStatusSchema = z.enum(deletionRequestStatuses);

export const dataDeletionRequestSchema = z.object({
  id: z.string().min(1),
  leadId: z.string().min(1).optional(),
  email: z.email(),
  status: dataDeletionRequestStatusSchema,
  requestedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  reviewedAt: z.iso.datetime().optional(),
  completedAt: z.iso.datetime().optional(),
  reason: z.string().min(1).optional(),
  ownerNotes: z.string().min(1).optional(),
});

export type DataDeletionRequest = z.infer<typeof dataDeletionRequestSchema>;

export interface RetentionRepository {
  createDataDeletionRequest(request: DataDeletionRequest): Promise<DataDeletionRequest>;
  findDataDeletionRequestsByEmail(email: string): Promise<DataDeletionRequest[]>;
  saveDataDeletionRequest(request: DataDeletionRequest): Promise<DataDeletionRequest>;
}
