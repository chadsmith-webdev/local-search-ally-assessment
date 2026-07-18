import { z } from "zod/v4";

export const productAccessStatusSchema = z.enum(["active", "expired", "revoked"]);

export const productAccessSchema = z.object({
  id: z.string().min(1),
  purchaseId: z.string().min(1),
  leadId: z.string().min(1),
  offerSlug: z.string().min(1),
  productVersion: z.string().min(1),
  productAccessRoute: z.string().min(1),
  accessTokenId: z.string().min(1),
  status: productAccessStatusSchema,
  grantedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().optional(),
  lastAccessedAt: z.iso.datetime().optional(),
});

export type ProductAccessStatus = z.infer<typeof productAccessStatusSchema>;
export type ProductAccess = z.infer<typeof productAccessSchema>;
