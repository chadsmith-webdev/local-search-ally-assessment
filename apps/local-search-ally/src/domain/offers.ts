import { z } from "zod/v4";
import { contractorReviewProofProduct, isProductReadyForPublicAccess, productSlugSchema } from "./products";

export const diagnosisCategorySchema = z.enum([
  "reviews",
  "reputation",
  "recent-proof",
  "project-proof",
  "trust",
  "business-info-accuracy",
  "information-accuracy",
  "website-trust",
  "website-usability",
  "conversion-readiness",
  "call-handling",
  "service-area-clarity",
  "service-area-pages",
  "gbp-completeness",
  "profile-suspension",
  "severe-reputation-damage",
  "insufficient-job-volume",
]);

export const offerStatusSchema = z.enum(["active", "inactive", "testing"]);
export const approvedOfferSlugSchema = z.enum(["contractor-review-proof-system"]);
export const productTypeSchema = z.enum(["download", "protected-content", "interactive-system", "hybrid"]);
export const checkoutBehaviorSchema = z.enum(["hosted-checkout", "manual-unavailable"]);
export const fulfillmentMethodSchema = z.enum([
  "secure-download",
  "protected-product-page",
  "email-delivery",
  "interactive-implementation-workflow",
  "protected-product-page-with-downloads",
]);

export const lowTicketOfferSchema = z.object({
  slug: z.string().min(1),
  productSlug: productSlugSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  status: offerStatusSchema,
  priceCents: z.number().int().nonnegative(),
  currency: z.literal("USD"),
  diagnosisCategories: z.array(diagnosisCategorySchema).min(1),
  excludedDiagnoses: z.array(diagnosisCategorySchema),
  problemAddressed: z.string().min(1),
  promise: z.string().min(1),
  includedDeliverables: z.array(z.string().min(1)).min(1),
  primaryCtaLabel: z.string().min(1),
  checkoutPriceId: z.string().min(1).optional(),
  checkoutBehavior: checkoutBehaviorSchema,
  productType: productTypeSchema,
  fulfillmentMethod: fulfillmentMethodSchema,
  productAccessRoute: z.string().min(1),
  deliveryEmailTemplateId: z.string().min(1),
  accessDurationDays: z.number().int().positive().optional(),
});

export type DiagnosisCategory = z.infer<typeof diagnosisCategorySchema>;
export type OfferStatus = z.infer<typeof offerStatusSchema>;
export type ApprovedOfferSlug = z.infer<typeof approvedOfferSlugSchema>;
export type ProductType = z.infer<typeof productTypeSchema>;
export type CheckoutBehavior = z.infer<typeof checkoutBehaviorSchema>;
export type FulfillmentMethod = z.infer<typeof fulfillmentMethodSchema>;
export type LowTicketOffer = z.infer<typeof lowTicketOfferSchema>;

export interface OfferRecommendationInput {
  primaryDiagnosisCategory: DiagnosisCategory;
  supportingDiagnosisCategories?: DiagnosisCategory[];
}

export interface AssessmentResultOfferInput {
  status: "complete" | "incomplete";
  primaryDiagnosisCategory: DiagnosisCategory | null;
  supportingDiagnosisCategories: DiagnosisCategory[];
  recommendedOfferSlug: string | null;
}

export const contractorReviewProofSystem = lowTicketOfferSchema.parse({
  slug: "contractor-review-proof-system",
  productSlug: contractorReviewProofProduct.slug,
  name: "Contractor Review and Proof System",
  version: "1.0",
  status: "testing",
  priceCents: 4700,
  currency: "USD",
  diagnosisCategories: ["reviews", "reputation", "recent-proof", "project-proof", "trust"],
  excludedDiagnoses: [
    "business-info-accuracy",
    "information-accuracy",
    "website-usability",
    "call-handling",
    "profile-suspension",
    "severe-reputation-damage",
    "insufficient-job-volume",
  ],
  problemAddressed: "Inconsistent review requests and insufficient recent project proof.",
  promise: "Build a repeatable process for collecting reviews and publishing recent completed-work evidence.",
  includedDeliverables: [
    "Review-request workflow",
    "SMS and email scripts",
    "Direct review-link setup",
    "Job-site photo checklist",
    "Publishing templates",
    "Review-response templates",
    "Tracking spreadsheet",
    "30-day implementation plan",
  ],
  primaryCtaLabel: "Get the System for $47",
  checkoutBehavior: "hosted-checkout",
  productType: "hybrid",
  fulfillmentMethod: "protected-product-page-with-downloads",
  productAccessRoute: "/products/contractor-review-proof-system",
  deliveryEmailTemplateId: "contractor-review-proof-system-access",
});

export const lowTicketOffers = [contractorReviewProofSystem] satisfies LowTicketOffer[];

export function getOfferBySlug(slug: string) {
  return lowTicketOffers.find((offer) => offer.slug === slug) ?? null;
}

export function formatOfferPrice(offer: Pick<LowTicketOffer, "priceCents" | "currency">) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: offer.currency,
    maximumFractionDigits: 0,
  }).format(offer.priceCents / 100);
}

export function offerMatchesDiagnosis(offer: LowTicketOffer, input: OfferRecommendationInput) {
  const categories = new Set([input.primaryDiagnosisCategory, ...(input.supportingDiagnosisCategories ?? [])]);
  const excluded = offer.excludedDiagnoses.some((diagnosis) => categories.has(diagnosis));
  if (excluded) return false;
  return offer.diagnosisCategories.includes(input.primaryDiagnosisCategory);
}

export function getOfferRecommendation(input: OfferRecommendationInput) {
  return lowTicketOffers.find((offer) => offerMatchesDiagnosis(offer, input)) ?? null;
}

export function getOfferForDiagnosis(category: DiagnosisCategory) {
  return getOfferRecommendation({ primaryDiagnosisCategory: category });
}

export function getOfferRecommendationForResult(result: AssessmentResultOfferInput) {
  if (result.status !== "complete" || !result.primaryDiagnosisCategory) return null;

  const matchedOffer = getOfferRecommendation({
    primaryDiagnosisCategory: result.primaryDiagnosisCategory,
    supportingDiagnosisCategories: result.supportingDiagnosisCategories,
  });

  if (!matchedOffer) return null;
  if (result.recommendedOfferSlug && matchedOffer.slug !== result.recommendedOfferSlug) return null;
  return matchedOffer;
}

export function isOfferReadyForPublicCheckout(offer: LowTicketOffer) {
  const product = contractorReviewProofProduct.slug === offer.productSlug ? contractorReviewProofProduct : null;

  if (offer.status !== "active") return false;
  if (offer.checkoutBehavior !== "hosted-checkout") return false;
  if (!offer.checkoutPriceId) return false;
  if (!product) return false;
  return isProductReadyForPublicAccess(product);
}

export function getPurchasableOfferForDiagnosis(category: DiagnosisCategory) {
  const offer = getOfferForDiagnosis(category);
  if (!offer) return null;
  return isOfferReadyForPublicCheckout(offer) ? offer : null;
}

export function getPublicResultsPageOffer(result: AssessmentResultOfferInput) {
  const offer = getOfferRecommendationForResult(result);
  if (!offer) return null;
  return isOfferReadyForPublicCheckout(offer) ? offer : null;
}
