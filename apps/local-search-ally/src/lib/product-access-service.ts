import {
  validateDevelopmentProductAccess,
  validateProductAccessToken,
  type ProductAccessValidationResult,
} from "@/domain/product-access";
import { contractorReviewProofProduct } from "@/domain/products";
import { getAssessmentRepository } from "./assessment-store";
import { developmentProductAccessEnabled } from "./runtime-guards";

export async function validateContractorReviewProofAccess({
  tokenValue,
  now = new Date().toISOString(),
}: {
  tokenValue: string | null | undefined;
  now?: string;
}): Promise<ProductAccessValidationResult> {
  const repository = getAssessmentRepository();
  const entitlements = await repository.findProductEntitlementsForProduct(contractorReviewProofProduct.slug);
  const tokens = await repository.findProductAccessTokensForProduct(contractorReviewProofProduct.slug);
  const persistent = validateProductAccessToken({
    tokenValue,
    productSlug: contractorReviewProofProduct.slug,
    now,
    entitlements,
    tokens,
  });
  if (persistent.status === "valid") {
    await repository.saveProductAccessToken({
      ...persistent.token,
      lastUsedAt: now,
    });
    const entitlement = await repository.findProductEntitlement(persistent.entitlement.id);
    if (entitlement) {
      await repository.saveProductEntitlement({
        ...entitlement,
        lastAccessedAt: now,
        updatedAt: now,
      });
    }
    await repository.recordEvent({
      name: "product_access_opened",
      leadId: persistent.entitlement.leadId,
      purchaseId: persistent.entitlement.purchaseId ?? undefined,
      idempotencyKey: `product-access-opened:${persistent.entitlement.id}:${now}`,
      occurredAt: now,
    });
    return persistent;
  }
  if (developmentProductAccessEnabled()) return validateDevelopmentProductAccess(tokenValue);
  return persistent;
}
