import { z } from "zod/v4";

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

export const productResourceStatusSchema = z.enum(["planned", "available"]);
export const productResourceFormatSchema = z.enum(["pdf", "docx", "xlsx", "plain-text", "checklist"]);

export const productResourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  format: productResourceFormatSchema,
  status: productResourceStatusSchema,
  downloadPath: z.string().min(1).optional(),
  requiredForLaunch: z.boolean().default(true),
});

export const lowTicketOfferSchema = z.object({
  slug: z.string().min(1),
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
  resources: z.array(productResourceSchema),
});

export type DiagnosisCategory = z.infer<typeof diagnosisCategorySchema>;
export type OfferStatus = z.infer<typeof offerStatusSchema>;
export type ApprovedOfferSlug = z.infer<typeof approvedOfferSlugSchema>;
export type ProductType = z.infer<typeof productTypeSchema>;
export type CheckoutBehavior = z.infer<typeof checkoutBehaviorSchema>;
export type FulfillmentMethod = z.infer<typeof fulfillmentMethodSchema>;
export type ProductResourceStatus = z.infer<typeof productResourceStatusSchema>;
export type ProductResourceFormat = z.infer<typeof productResourceFormatSchema>;
export type ProductResource = z.infer<typeof productResourceSchema>;
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
  resources: [
    {
      id: "core-implementation-guide",
      title: "Core PDF implementation guide",
      format: "pdf",
      status: "planned",
    },
    {
      id: "script-pack",
      title: "Editable review-request script pack",
      format: "docx",
      status: "planned",
    },
    {
      id: "job-site-photo-checklist",
      title: "Printable job-site photo checklist",
      format: "checklist",
      status: "planned",
    },
    {
      id: "review-proof-tracker",
      title: "Review and proof tracking spreadsheet",
      format: "xlsx",
      status: "planned",
    },
    {
      id: "thirty-day-action-plan",
      title: "30-day implementation plan",
      format: "pdf",
      status: "planned",
    },
    {
      id: "mobile-script-library",
      title: "Plain-text script library for mobile copying",
      format: "plain-text",
      status: "planned",
    },
  ],
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
  const requiredResourcesAvailable = offer.resources
    .filter((resource) => resource.requiredForLaunch)
    .every((resource) => resource.status === "available" && Boolean(resource.downloadPath));

  return (
    offer.status === "active" &&
    offer.checkoutBehavior === "hosted-checkout" &&
    Boolean(offer.checkoutPriceId) &&
    requiredResourcesAvailable
  );
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
