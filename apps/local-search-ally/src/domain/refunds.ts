import { z } from "zod/v4";
import { entitlementRevocationStatuses, refundRequestStatuses } from "./policies";

export const refundRequestStatusSchema = z.enum(refundRequestStatuses);
export const entitlementRevocationStatusSchema = z.enum(entitlementRevocationStatuses);

export const refundRequestSchema = z.object({
  id: z.string().min(1),
  purchaseId: z.string().min(1),
  leadId: z.string().min(1),
  status: refundRequestStatusSchema,
  entitlementRevocationStatus: entitlementRevocationStatusSchema,
  requestedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  reviewedAt: z.iso.datetime().optional(),
  processedAt: z.iso.datetime().optional(),
  reason: z.string().min(1).optional(),
  ownerNotes: z.string().min(1).optional(),
});

export type RefundRequest = z.infer<typeof refundRequestSchema>;

export interface RefundRequestRepository {
  createRefundRequestOnce(request: RefundRequest): Promise<RefundRequest>;
  findRefundRequestByPurchaseId(purchaseId: string): Promise<RefundRequest | null>;
  saveRefundRequest(request: RefundRequest): Promise<RefundRequest>;
}
