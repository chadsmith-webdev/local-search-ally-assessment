import { z } from "zod/v4";

export const productSlugSchema = z.enum(["contractor-review-proof-system"]);
export const productStatusSchema = z.enum(["development", "inactive", "public"]);
export const productModuleStatusSchema = z.enum(["draft", "complete"]);
export const productResourceStatusSchema = z.enum(["draft", "complete", "unavailable"]);
export const productResourceFileTypeSchema = z.enum(["pdf", "docx", "xlsx", "plain-text", "checklist"]);

export const productModuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().positive(),
  purpose: z.string().min(1),
  outcome: z.string().min(1),
  status: productModuleStatusSchema,
  contentSections: z.array(z.string().min(1)).min(1),
  resourceIds: z.array(z.string().min(1)),
});

export const productResourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  fileType: productResourceFileTypeSchema,
  version: z.string().min(1),
  status: productResourceStatusSchema,
  storageReference: z.string().min(1).optional(),
  plannedPath: z.string().min(1),
  relatedModuleId: z.string().min(1),
  downloadAvailable: z.boolean(),
});

export const productDefinitionSchema = z.object({
  slug: productSlugSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  status: productStatusSchema,
  outcomeStatement: z.string().min(1),
  fulfillmentMethod: z.string().min(1),
  accessRoute: z.string().min(1),
  deliveryEmailTemplateId: z.string().min(1),
  modules: z.array(productModuleSchema).min(1),
  resources: z.array(productResourceSchema).min(1),
});

export type ProductSlug = z.infer<typeof productSlugSchema>;
export type ProductStatus = z.infer<typeof productStatusSchema>;
export type ProductModuleStatus = z.infer<typeof productModuleStatusSchema>;
export type ProductResourceStatus = z.infer<typeof productResourceStatusSchema>;
export type ProductResourceFileType = z.infer<typeof productResourceFileTypeSchema>;
export type ProductModule = z.infer<typeof productModuleSchema>;
export type ProductResource = z.infer<typeof productResourceSchema>;
export type ProductDefinition = z.infer<typeof productDefinitionSchema>;

const moduleSections = {
  "start-here": [
    "Editorial placeholder: define what the system helps the buyer accomplish and what it does not do.",
    "Editorial placeholder: list the estimated setup time, materials included, and first action.",
  ],
  "build-review-process": [
    "Editorial placeholder: create the review-request timing worksheet and eligibility rules.",
    "Editorial placeholder: define who asks, when they ask, and how the handoff works.",
  ],
  "customize-scripts": [
    "Editorial placeholder: draft compliant in-person, SMS, email, invoice, follow-up, and repeat-customer scripts.",
    "Editorial placeholder: add guidance against gating, incentives, and suppressing negative feedback.",
  ],
  "create-review-link": [
    "Editorial placeholder: document direct Google review-link setup and testing steps.",
    "Editorial placeholder: explain safe QR-code and short-link placement without confusing payment or ordering actions.",
  ],
  "capture-project-proof": [
    "Editorial placeholder: define before, during, and completed-work photo standards.",
    "Editorial placeholder: add customer-permission language and project-detail capture fields.",
  ],
  "publish-reviews-projects": [
    "Editorial placeholder: define the weekly publishing routine for profile photos, posts, website proof, and social captions.",
    "Editorial placeholder: include sustainable frequency guidance and monthly proof inventory review.",
  ],
  "respond-to-reviews": [
    "Editorial placeholder: draft positive, neutral, negative, and no-comment review response frameworks.",
    "Editorial placeholder: add personalization guidance so responses do not repeat a template word for word.",
  ],
  "track-activity": [
    "Editorial placeholder: define review-request, review-received, photo, publishing, and weekly scorecard tracking fields.",
    "Editorial placeholder: note that unnecessary sensitive customer details should not be stored.",
  ],
  "thirty-day-plan": [
    "Editorial placeholder: turn the product into a week-by-week setup, proof capture, publishing, and stabilization plan.",
    "Editorial placeholder: define the final progress review and next 30-day target.",
  ],
  downloads: [
    "Editorial placeholder: organize every downloadable file by module, status, and version.",
    "Editorial placeholder: show unavailable states until the real product files exist.",
  ],
} satisfies Record<string, string[]>;

export const contractorReviewProofProduct = productDefinitionSchema.parse({
  slug: "contractor-review-proof-system",
  name: "Contractor Review and Proof System",
  version: "1.0",
  status: "development",
  outcomeStatement:
    "Build a repeatable process for collecting customer reviews and publishing recent completed-work proof.",
  fulfillmentMethod: "Protected product page with downloadable implementation resources.",
  accessRoute: "/products/contractor-review-proof-system",
  deliveryEmailTemplateId: "contractor-review-proof-system-access",
  modules: [
    {
      id: "start-here",
      title: "Start Here",
      order: 1,
      purpose: "Orient the buyer to the implementation system and the first action to complete.",
      outcome: "The buyer knows the product scope, expected effort, and recommended order.",
      status: "draft",
      contentSections: moduleSections["start-here"],
      resourceIds: ["core-implementation-guide"],
    },
    {
      id: "build-review-process",
      title: "Build Your Review Process",
      order: 2,
      purpose: "Define exactly when, how, and by whom a review request will be made.",
      outcome: "The buyer has one repeatable review-request workflow.",
      status: "draft",
      contentSections: moduleSections["build-review-process"],
      resourceIds: ["review-process-worksheet"],
    },
    {
      id: "customize-scripts",
      title: "Customize Your Scripts",
      order: 3,
      purpose: "Remove uncertainty and discomfort from asking satisfied customers for reviews.",
      outcome: "The buyer has review-request scripts adapted to the way their team communicates.",
      status: "draft",
      contentSections: moduleSections["customize-scripts"],
      resourceIds: ["review-request-script-pack"],
    },
    {
      id: "create-review-link",
      title: "Create Your Review Link",
      order: 4,
      purpose: "Reduce friction between the customer request and the review form.",
      outcome: "The buyer has a tested direct review link and safe placement guidance.",
      status: "draft",
      contentSections: moduleSections["create-review-link"],
      resourceIds: ["direct-review-link-checklist", "qr-code-guidance-sheet"],
    },
    {
      id: "capture-project-proof",
      title: "Capture Better Project Proof",
      order: 5,
      purpose: "Create a repeatable process for collecting useful job-site photos and details.",
      outcome: "The buyer has field guidance for capturing authentic project evidence.",
      status: "draft",
      contentSections: moduleSections["capture-project-proof"],
      resourceIds: ["job-site-photo-checklist", "customer-permission-script"],
    },
    {
      id: "publish-reviews-projects",
      title: "Publish Reviews and Projects",
      order: 6,
      purpose: "Turn collected reviews and project photos into visible trust signals.",
      outcome: "The buyer has a sustainable weekly proof-publishing routine.",
      status: "draft",
      contentSections: moduleSections["publish-reviews-projects"],
      resourceIds: ["publishing-templates"],
    },
    {
      id: "respond-to-reviews",
      title: "Respond to Reviews",
      order: 7,
      purpose: "Respond to customer reviews consistently and professionally.",
      outcome: "The buyer has response frameworks for positive, neutral, negative, and no-comment reviews.",
      status: "draft",
      contentSections: moduleSections["respond-to-reviews"],
      resourceIds: ["review-response-templates"],
    },
    {
      id: "track-activity",
      title: "Track Your Activity",
      order: 8,
      purpose: "Make review and proof execution measurable without adding expensive software.",
      outcome: "The buyer can see requests, reviews, photos, publishing activity, and weekly follow-through.",
      status: "draft",
      contentSections: moduleSections["track-activity"],
      resourceIds: ["review-proof-tracker", "weekly-scorecard"],
    },
    {
      id: "thirty-day-plan",
      title: "Follow the 30-Day Plan",
      order: 9,
      purpose: "Guide the buyer from setup to a stable weekly operating routine.",
      outcome: "The buyer has a week-by-week implementation path and the next 30-day target.",
      status: "draft",
      contentSections: moduleSections["thirty-day-plan"],
      resourceIds: ["thirty-day-implementation-checklist"],
    },
    {
      id: "downloads",
      title: "Download Resources",
      order: 10,
      purpose: "Collect product files in one place when real resources are available.",
      outcome: "The buyer can see which resources are ready and which still need production.",
      status: "draft",
      contentSections: moduleSections.downloads,
      resourceIds: [
        "core-implementation-guide",
        "review-process-worksheet",
        "review-request-script-pack",
        "direct-review-link-checklist",
        "qr-code-guidance-sheet",
        "job-site-photo-checklist",
        "customer-permission-script",
        "publishing-templates",
        "review-response-templates",
        "review-proof-tracker",
        "weekly-scorecard",
        "thirty-day-implementation-checklist",
      ],
    },
  ],
  resources: [
    {
      id: "core-implementation-guide",
      title: "Core Implementation Guide",
      description: "The main PDF guide for setting up the review and project-proof operating system.",
      fileType: "pdf",
      version: "1.0-draft",
      status: "draft",
      plannedPath: "/product-files/contractor-review-proof-system/core-implementation-guide.pdf",
      relatedModuleId: "start-here",
      downloadAvailable: false,
    },
    {
      id: "review-process-worksheet",
      title: "Review-Process Worksheet",
      description: "A worksheet for choosing request timing, eligibility, responsibility, and handoff rules.",
      fileType: "pdf",
      version: "1.0-draft",
      status: "draft",
      plannedPath: "/product-files/contractor-review-proof-system/review-process-worksheet.pdf",
      relatedModuleId: "build-review-process",
      downloadAvailable: false,
    },
    {
      id: "review-request-script-pack",
      title: "Review-Request Script Pack",
      description: "Editable scripts for in-person, SMS, email, invoice, follow-up, and repeat-customer requests.",
      fileType: "docx",
      version: "1.0-draft",
      status: "draft",
      plannedPath: "/product-files/contractor-review-proof-system/review-request-script-pack.docx",
      relatedModuleId: "customize-scripts",
      downloadAvailable: false,
    },
    {
      id: "direct-review-link-checklist",
      title: "Direct Review-Link Checklist",
      description: "Setup and testing checklist for the direct Google review link.",
      fileType: "checklist",
      version: "1.0-draft",
      status: "draft",
      plannedPath: "/product-files/contractor-review-proof-system/direct-review-link-checklist.pdf",
      relatedModuleId: "create-review-link",
      downloadAvailable: false,
    },
    {
      id: "qr-code-guidance-sheet",
      title: "QR-Code Guidance Sheet",
      description: "Placement guidance for using review QR codes without confusing unrelated actions.",
      fileType: "pdf",
      version: "1.0-draft",
      status: "draft",
      plannedPath: "/product-files/contractor-review-proof-system/qr-code-guidance-sheet.pdf",
      relatedModuleId: "create-review-link",
      downloadAvailable: false,
    },
    {
      id: "job-site-photo-checklist",
      title: "Job-Site Photo Checklist",
      description: "Before, during, and completed-work photo prompts for consistent project proof.",
      fileType: "checklist",
      version: "1.0-draft",
      status: "draft",
      plannedPath: "/product-files/contractor-review-proof-system/job-site-photo-checklist.pdf",
      relatedModuleId: "capture-project-proof",
      downloadAvailable: false,
    },
    {
      id: "customer-permission-script",
      title: "Customer-Permission Script",
      description: "Language for asking permission to photograph and publish appropriate project proof.",
      fileType: "plain-text",
      version: "1.0-draft",
      status: "draft",
      plannedPath: "/product-files/contractor-review-proof-system/customer-permission-script.txt",
      relatedModuleId: "capture-project-proof",
      downloadAvailable: false,
    },
    {
      id: "publishing-templates",
      title: "Publishing Templates",
      description: "Templates for profile posts, website project entries, social captions, and review highlights.",
      fileType: "docx",
      version: "1.0-draft",
      status: "draft",
      plannedPath: "/product-files/contractor-review-proof-system/publishing-templates.docx",
      relatedModuleId: "publish-reviews-projects",
      downloadAvailable: false,
    },
    {
      id: "review-response-templates",
      title: "Review-Response Templates",
      description: "Response frameworks for positive, neutral, negative, and no-comment reviews.",
      fileType: "docx",
      version: "1.0-draft",
      status: "draft",
      plannedPath: "/product-files/contractor-review-proof-system/review-response-templates.docx",
      relatedModuleId: "respond-to-reviews",
      downloadAvailable: false,
    },
    {
      id: "review-proof-tracker",
      title: "Review and Proof Tracker",
      description: "Spreadsheet for tracking requests, reviews received, photos collected, and proof published.",
      fileType: "xlsx",
      version: "1.0-draft",
      status: "draft",
      plannedPath: "/product-files/contractor-review-proof-system/review-proof-tracker.xlsx",
      relatedModuleId: "track-activity",
      downloadAvailable: false,
    },
    {
      id: "weekly-scorecard",
      title: "Weekly Scorecard",
      description: "A weekly activity scorecard for reviewing consistency and identifying missed requests.",
      fileType: "xlsx",
      version: "1.0-draft",
      status: "draft",
      plannedPath: "/product-files/contractor-review-proof-system/weekly-scorecard.xlsx",
      relatedModuleId: "track-activity",
      downloadAvailable: false,
    },
    {
      id: "thirty-day-implementation-checklist",
      title: "30-Day Implementation Checklist",
      description: "A printable week-by-week checklist for setup, proof capture, publishing, and stabilization.",
      fileType: "pdf",
      version: "1.0-draft",
      status: "draft",
      plannedPath: "/product-files/contractor-review-proof-system/thirty-day-implementation-checklist.pdf",
      relatedModuleId: "thirty-day-plan",
      downloadAvailable: false,
    },
  ],
});

export const products = [contractorReviewProofProduct] satisfies ProductDefinition[];

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug) ?? null;
}

export function getOrderedProductModules(product: ProductDefinition) {
  return [...product.modules].sort((a, b) => a.order - b.order);
}

export function getProductModule(product: ProductDefinition, moduleId: string | null | undefined) {
  const ordered = getOrderedProductModules(product);
  if (!moduleId) return ordered[0] ?? null;
  return ordered.find((module) => module.id === moduleId) ?? null;
}

export function getResourcesForModule(product: ProductDefinition, moduleId: string) {
  return product.resources.filter((resource) => resource.relatedModuleId === moduleId);
}

export function getDownloadableResources(product: ProductDefinition) {
  return product.resources.filter((resource) => resource.status === "complete" && resource.downloadAvailable && resource.storageReference);
}

export function isProductReadyForPublicAccess(product: ProductDefinition) {
  const modulesComplete = product.modules.every((module) => module.status === "complete");
  const resourcesComplete = product.resources.every(
    (resource) => resource.status === "complete" && resource.downloadAvailable && Boolean(resource.storageReference),
  );

  return product.status === "public" && modulesComplete && resourcesComplete;
}
