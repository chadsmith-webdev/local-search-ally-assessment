import { z } from "zod/v4";

export const productSlugSchema = z.enum(["contractor-review-proof-system"]);
export const productStatusSchema = z.enum(["development", "inactive", "public"]);
export const productModuleStatusSchema = z.enum(["draft", "complete"]);
export const productResourceStatusSchema = z.enum(["draft", "complete", "unavailable"]);
export const productResourceFileTypeSchema = z.enum(["pdf", "docx", "csv", "plain-text", "checklist"]);

export const productModuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().positive(),
  purpose: z.string().min(1),
  outcome: z.string().min(1),
  estimatedEffort: z.string().min(1),
  preparation: z.array(z.string().min(1)).min(1),
  steps: z.array(z.string().min(1)).min(1),
  contractorExample: z.string().min(1),
  completionChecklist: z.array(z.string().min(1)).min(1),
  nextModuleId: z.string().min(1).nullable(),
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

const resourceBase = "product-files/contractor-review-proof-system";

function resourcePath(filename: string) {
  return `${resourceBase}/${filename}`;
}

const complete = "complete" as const;

export const contractorReviewProofProduct = productDefinitionSchema.parse({
  slug: "contractor-review-proof-system",
  name: "Contractor Review and Proof System",
  version: "1.0",
  status: "development",
  outcomeStatement:
    "Build a repeatable review and proof process that turns completed work into honest customer feedback and visible project proof.",
  fulfillmentMethod: "Protected product page with downloadable implementation resources.",
  accessRoute: "/products/contractor-review-proof-system",
  deliveryEmailTemplateId: "contractor-review-proof-system-access",
  modules: [
    {
      id: "start-here",
      title: "Start Here",
      order: 1,
      purpose: "Set up the operating model before editing scripts or publishing proof.",
      outcome: "You know the weekly routine, the order of the system, and the first decision to make.",
      estimatedEffort: "20-30 minutes",
      preparation: ["Gather the last 10 completed jobs.", "Open the Core Implementation Guide.", "Choose one responsible team member."],
      steps: [
        "Read the product overview and the ethical review-request standards.",
        "Confirm that the business has enough completed work to request honest feedback.",
        "Choose one service line or crew to use for the first 30 days.",
        "Schedule one weekly 20-minute review and proof routine.",
      ],
      contractorExample:
        "A plumbing owner starts with water-heater replacements, assigns the office manager to send requests every Friday, and reviews the tracker on Monday morning.",
      completionChecklist: [
        "First service line or crew selected.",
        "Responsible team member named.",
        "Weekly routine scheduled.",
        "Core guide reviewed.",
      ],
      nextModuleId: "build-review-process",
      status: complete,
      contentSections: [
        "The system follows one operating model: complete the job, confirm customer readiness, request honest feedback, capture project proof, record the activity, publish appropriate proof, and review weekly performance.",
        "Use this product to build a routine. Do not ask only happy customers, offer rewards for positive reviews, or tell customers what to write.",
      ],
      resourceIds: ["core-implementation-guide"],
    },
    {
      id: "build-review-process",
      title: "Build Your Review Process",
      order: 2,
      purpose: "Define which jobs qualify, when the request happens, and who owns it.",
      outcome: "You have a simple review-request standard operating procedure.",
      estimatedEffort: "30-45 minutes",
      preparation: ["List normal job completion points.", "Identify who has customer contact after completion.", "Open the worksheet."],
      steps: [
        "Define eligible completed jobs and situations that should pause a request.",
        "Choose the request timing, such as after walkthrough, invoice, or follow-up.",
        "Assign the responsible team member and backup owner.",
        "Choose the main channel and one reminder rule.",
        "Record the process in the tracker so missed handoffs can be reviewed.",
      ],
      contractorExample:
        "An HVAC shop asks after the final walkthrough for installs, sends SMS the next morning for service calls, and pauses requests when a callback is still open.",
      completionChecklist: [
        "Eligibility rule written.",
        "Request timing selected.",
        "Responsible team member assigned.",
        "Reminder rule defined.",
        "Private feedback path documented.",
      ],
      nextModuleId: "customize-scripts",
      status: complete,
      contentSections: [
        "A good process is specific enough that a new team member can follow it without guessing. Keep the rule simple and review it weekly.",
        "Private praise should be acknowledged, then the customer may be invited to share honest feedback publicly. Unresolved complaints should be handled before any review request.",
      ],
      resourceIds: ["review-process-worksheet"],
    },
    {
      id: "customize-scripts",
      title: "Customize Your Scripts",
      order: 3,
      purpose: "Turn review requests into comfortable, repeatable language for your team.",
      outcome: "You have honest-feedback scripts for the channels your customers already use.",
      estimatedEffort: "45-60 minutes",
      preparation: ["Pick the channels selected in the worksheet.", "Choose the trade examples closest to your work.", "Confirm who sends each script."],
      steps: [
        "Choose one in-person script and one written script.",
        "Replace bracketed fields with your service, team member, and review link.",
        "Remove any wording that feels unlike your team.",
        "Train the responsible team member using one practice handoff.",
        "Save the approved scripts where the team can copy them quickly.",
      ],
      contractorExample:
        "A roofing manager uses the completed-job follow-up script after the final cleanup text and keeps the reminder script for customers who agreed but forgot.",
      completionChecklist: [
        "In-person request script customized.",
        "SMS or email script customized.",
        "Reminder script approved.",
        "Team handoff note approved.",
        "Scripts stored for quick access.",
      ],
      nextModuleId: "create-review-link",
      status: complete,
      contentSections: [
        "Ask for honest customer feedback. Do not ask for a five-star review, do not reward positive reviews, and do not filter requests based on who you think will rate you best.",
        "Short, plain language usually works better than polished marketing copy. The goal is a normal customer request, not a sales pitch.",
      ],
      resourceIds: ["review-request-script-pack"],
    },
    {
      id: "create-review-link",
      title: "Create Your Review Link",
      order: 4,
      purpose: "Give customers a direct, tested path to the correct review form.",
      outcome: "Your team has one approved review link and knows where to use it.",
      estimatedEffort: "20-30 minutes",
      preparation: ["Confirm access to the business profile.", "Use a desktop and a mobile device for testing.", "Open the checklist."],
      steps: [
        "Find the current review-link option in the business profile interface.",
        "Confirm that the link points to the correct business.",
        "Test the link on desktop and mobile.",
        "Save the approved link with a readable internal label.",
        "Share the link only in approved request messages and team references.",
      ],
      contractorExample:
        "A landscaping company labels its link 'Google review link - main profile - tested July 2026' and pins it in the office manager's template folder.",
      completionChecklist: [
        "Correct profile confirmed.",
        "Desktop test completed.",
        "Mobile test completed.",
        "Internal label saved.",
        "Team access confirmed.",
      ],
      nextModuleId: "capture-project-proof",
      status: complete,
      contentSections: [
        "Platform interface labels can change. Follow the durable checklist: find the review-sharing option, confirm the profile, test the destination, and save the approved link.",
        "QR codes are optional. Use them only where a customer expects a review action, and never where they could be confused with payment or ordering.",
      ],
      resourceIds: ["direct-review-link-checklist", "qr-code-guidance-sheet"],
    },
    {
      id: "capture-project-proof",
      title: "Capture Better Project Proof",
      order: 5,
      purpose: "Collect useful photos and project details while the work is still fresh.",
      outcome: "Your team can capture publishable before, during, and completed-work proof.",
      estimatedEffort: "30 minutes to set up, then 3-5 minutes per job",
      preparation: ["Choose where photos are saved.", "Confirm permission language.", "Share the checklist with field staff."],
      steps: [
        "Capture wide, medium, and detail shots when they are safe and appropriate.",
        "Avoid private information, addresses, license plates, family items, and sensitive property details.",
        "Confirm customer permission before publishing project proof.",
        "Name files with date, general location, service, and job reference.",
        "Select only clear, useful images for publishing.",
      ],
      contractorExample:
        "An electrical contractor photographs the old panel label, the clean finished panel, and the work area after cleanup, then records permission before posting.",
      completionChecklist: [
        "Photo checklist shared with field team.",
        "Permission script approved.",
        "File-naming rule selected.",
        "Sensitive-information rule reviewed.",
        "Photo storage location selected.",
      ],
      nextModuleId: "publish-reviews-projects",
      status: complete,
      contentSections: [
        "Useful project proof is clear, recent, and specific enough to show completed work without exposing private customer information.",
        "Authentic field photos are acceptable. The standard is useful evidence, not magazine photography.",
      ],
      resourceIds: ["job-site-photo-checklist", "customer-permission-script"],
    },
    {
      id: "publish-reviews-projects",
      title: "Publish Reviews and Projects",
      order: 6,
      purpose: "Turn collected reviews and photos into recent proof homeowners can see.",
      outcome: "You have a weekly publishing routine for the business profile, website, and social channels.",
      estimatedEffort: "30-45 minutes per week",
      preparation: ["Pick one weekly publishing block.", "Collect approved photos and review highlights.", "Open the publishing templates."],
      steps: [
        "Choose one recent completed job or review theme.",
        "Write a short update using service, project type, general location, problem solved, and visible outcome.",
        "Publish where the customer permission and platform fit are clear.",
        "Record each publication date in the tracker.",
        "Review monthly for gaps by service line or location.",
      ],
      contractorExample:
        "A pest-control company posts a general city update about a completed exclusion job, uses no private address, and adds the publication date to the tracker.",
      completionChecklist: [
        "Weekly publishing time selected.",
        "First project update drafted.",
        "Private details removed.",
        "Publication recorded.",
        "Monthly proof review scheduled.",
      ],
      nextModuleId: "respond-to-reviews",
      status: complete,
      contentSections: [
        "Publishing should be sustainable. A weekly proof update is better than a daily plan the team cannot maintain.",
        "Do not claim guaranteed results, rankings, or savings. Stick to service performed, general area, problem solved, and visible outcome.",
      ],
      resourceIds: ["publishing-templates"],
    },
    {
      id: "respond-to-reviews",
      title: "Respond to Reviews",
      order: 7,
      purpose: "Reply to reviews in a way that sounds human and protects private information.",
      outcome: "You have response frameworks for common review situations and escalation rules.",
      estimatedEffort: "30-45 minutes setup, then 5 minutes per review",
      preparation: ["Choose who responds.", "Set a review-response window.", "Open the template pack."],
      steps: [
        "Respond to positive reviews with a short, specific thank-you.",
        "For neutral or mixed reviews, acknowledge the issue and invite offline follow-up when needed.",
        "For negative reviews, do not argue publicly or reveal private job details.",
        "Escalate uncertain or sensitive reviews to the owner or manager.",
        "Vary responses so they do not repeat the same template word for word.",
      ],
      contractorExample:
        "A plumbing owner responds to a mixed review by thanking the customer, acknowledging the scheduling concern, and inviting a direct call without debating the job details online.",
      completionChecklist: [
        "Response owner assigned.",
        "Timing rule selected.",
        "Positive response customized.",
        "Negative response escalation rule written.",
        "Privacy rule reviewed.",
      ],
      nextModuleId: "track-activity",
      status: complete,
      contentSections: [
        "A review response is public trust content. Keep it calm, specific, and respectful.",
        "Never share private customer information, internal notes, payment details, personal contact details, or arguments about who is right.",
      ],
      resourceIds: ["review-response-templates"],
    },
    {
      id: "track-activity",
      title: "Track Your Activity",
      order: 8,
      purpose: "Measure whether the review and proof process is actually happening.",
      outcome: "You can see requests made, reviews received, proof collected, proof published, and bottlenecks.",
      estimatedEffort: "20 minutes setup, then 10-15 minutes per week",
      preparation: ["Open the tracker.", "Choose the responsible team member.", "Decide where the weekly scorecard is stored."],
      steps: [
        "Record eligible completed jobs without unnecessary sensitive customer details.",
        "Log request date, channel, reminder date, and review received.",
        "Log photo collection, permission, and publication dates.",
        "Review weekly request rate and review conversion rate.",
        "Choose one corrective action for the next week.",
      ],
      contractorExample:
        "A roofing company finds that requests are missed when the estimator does final walkthroughs, so the office manager adds a Friday follow-up check.",
      completionChecklist: [
        "Tracker opened.",
        "Status choices reviewed.",
        "Example rows replaced or removed.",
        "Weekly scorecard reviewed.",
        "First corrective action chosen.",
      ],
      nextModuleId: "thirty-day-plan",
      status: complete,
      contentSections: [
        "The tracker is for execution, not surveillance. Store only what the team needs to run the process and avoid unnecessary sensitive details.",
        "The weekly scorecard helps separate a bad script from a missed handoff, weak permission habit, or inconsistent publishing routine.",
      ],
      resourceIds: ["review-proof-tracker", "weekly-scorecard"],
    },
    {
      id: "thirty-day-plan",
      title: "Follow the 30-Day Plan",
      order: 9,
      purpose: "Turn the system into a steady operating routine over four weeks.",
      outcome: "You have a week-by-week plan for setup, proof capture, publishing, and maintenance.",
      estimatedEffort: "15 minutes planning, then weekly execution",
      preparation: ["Choose a start date.", "Open the 30-day checklist.", "Block the weekly maintenance routine."],
      steps: [
        "Week 1: build the process, confirm the review link, customize scripts, and set up tracking.",
        "Week 2: identify recent eligible customers, send requests, organize photos, and confirm permissions.",
        "Week 3: publish recent proof, respond to reviews, and add proof to the website.",
        "Week 4: evaluate request rate, review conversion, missed handoffs, and the next monthly target.",
      ],
      contractorExample:
        "A landscaping owner uses Week 2 to contact recent patio and drainage customers, then uses Week 3 to publish two approved project summaries.",
      completionChecklist: [
        "Start date selected.",
        "Week 1 setup checked.",
        "Week 2 outreach checked.",
        "Week 3 publishing checked.",
        "Week 4 maintenance target set.",
      ],
      nextModuleId: "downloads",
      status: complete,
      contentSections: [
        "The 30-day plan keeps the work small enough to finish. Do not rebuild every process at once.",
        "At the end of Week 4, keep the weekly routine and set the next practical target instead of starting over.",
      ],
      resourceIds: ["thirty-day-implementation-checklist"],
    },
    {
      id: "downloads",
      title: "Download Resources",
      order: 10,
      purpose: "Keep every Version 1.0 product file in one protected resource library.",
      outcome: "You can download the files that support each module and return to the module when needed.",
      estimatedEffort: "5-10 minutes",
      preparation: ["Use a valid product-access link.", "Save files in a shared team folder after download."],
      steps: [
        "Download the core guide first.",
        "Download the worksheet and script files before team training.",
        "Download the tracker and scorecard before weekly reporting.",
        "Keep the files in one shared folder with the product version in the filename.",
      ],
      contractorExample:
        "An owner downloads all V1.0 files into a shared folder named 'Review and proof process' and pins the tracker for weekly review.",
      completionChecklist: [
        "Core guide downloaded.",
        "Worksheet and scripts saved.",
        "Tracker and scorecard saved.",
        "Team folder created.",
      ],
      nextModuleId: null,
      status: complete,
      contentSections: [
        "Downloads are protected by the same product-access token used for this dashboard.",
        "If a file is replaced in a later version, keep the old version until the team has moved to the updated process.",
      ],
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
      description: "The main guide for setting up the review and project-proof operating system.",
      fileType: "pdf",
      version: "1.0",
      status: complete,
      storageReference: resourcePath("contractor-review-proof-system-guide-v1.pdf"),
      plannedPath: resourcePath("contractor-review-proof-system-guide-v1.pdf"),
      relatedModuleId: "start-here",
      downloadAvailable: true,
    },
    {
      id: "review-process-worksheet",
      title: "Review-Process Worksheet",
      description: "An editable worksheet for choosing request eligibility, timing, ownership, channel, and escalation rules.",
      fileType: "docx",
      version: "1.0",
      status: complete,
      storageReference: resourcePath("review-process-worksheet-v1.docx"),
      plannedPath: resourcePath("review-process-worksheet-v1.docx"),
      relatedModuleId: "build-review-process",
      downloadAvailable: true,
    },
    {
      id: "review-request-script-pack",
      title: "Review-Request Script Pack",
      description: "Editable scripts for in-person, SMS, email, invoice, follow-up, reminder, repeat-customer, and team handoff use.",
      fileType: "docx",
      version: "1.0",
      status: complete,
      storageReference: resourcePath("review-request-script-pack-v1.docx"),
      plannedPath: resourcePath("review-request-script-pack-v1.docx"),
      relatedModuleId: "customize-scripts",
      downloadAvailable: true,
    },
    {
      id: "direct-review-link-checklist",
      title: "Direct Review-Link Checklist",
      description: "A durable checklist for finding, testing, labeling, sharing, and periodically checking the review link.",
      fileType: "pdf",
      version: "1.0",
      status: complete,
      storageReference: resourcePath("direct-review-link-checklist-v1.pdf"),
      plannedPath: resourcePath("direct-review-link-checklist-v1.pdf"),
      relatedModuleId: "create-review-link",
      downloadAvailable: true,
    },
    {
      id: "qr-code-guidance-sheet",
      title: "QR-Code Guidance Sheet",
      description: "Guidance for appropriate review QR-code use, placement, sizing, contrast, testing, and consent considerations.",
      fileType: "pdf",
      version: "1.0",
      status: complete,
      storageReference: resourcePath("qr-code-guidance-v1.pdf"),
      plannedPath: resourcePath("qr-code-guidance-v1.pdf"),
      relatedModuleId: "create-review-link",
      downloadAvailable: true,
    },
    {
      id: "job-site-photo-checklist",
      title: "Job-Site Photo Checklist",
      description: "A mobile-friendly and printable checklist for collecting publishable before, during, and completed-work photos.",
      fileType: "pdf",
      version: "1.0",
      status: complete,
      storageReference: resourcePath("job-site-photo-checklist-v1.pdf"),
      plannedPath: resourcePath("job-site-photo-checklist-v1.pdf"),
      relatedModuleId: "capture-project-proof",
      downloadAvailable: true,
    },
    {
      id: "customer-permission-script",
      title: "Customer-Permission Scripts",
      description: "Editable permission language for photographing, publishing, city mentions, testimonials, and declined permission.",
      fileType: "docx",
      version: "1.0",
      status: complete,
      storageReference: resourcePath("customer-permission-scripts-v1.docx"),
      plannedPath: resourcePath("customer-permission-scripts-v1.docx"),
      relatedModuleId: "capture-project-proof",
      downloadAvailable: true,
    },
    {
      id: "publishing-templates",
      title: "Publishing Templates",
      description: "Templates for profile updates, before-and-after posts, completed-job posts, captions, project summaries, and monthly roundups.",
      fileType: "docx",
      version: "1.0",
      status: complete,
      storageReference: resourcePath("publishing-templates-v1.docx"),
      plannedPath: resourcePath("publishing-templates-v1.docx"),
      relatedModuleId: "publish-reviews-projects",
      downloadAvailable: true,
    },
    {
      id: "review-response-templates",
      title: "Review-Response Templates",
      description: "Response frameworks for positive, neutral, mixed, negative, inaccurate, unrecognized, and updated reviews.",
      fileType: "docx",
      version: "1.0",
      status: complete,
      storageReference: resourcePath("review-response-templates-v1.docx"),
      plannedPath: resourcePath("review-response-templates-v1.docx"),
      relatedModuleId: "respond-to-reviews",
      downloadAvailable: true,
    },
    {
      id: "review-proof-tracker",
      title: "Review and Proof Tracker",
      description: "A CSV-compatible tracker for requests, reviews, photos, permissions, publishing, ownership, status, and notes.",
      fileType: "csv",
      version: "1.0",
      status: complete,
      storageReference: resourcePath("review-proof-tracker-v1.csv"),
      plannedPath: resourcePath("review-proof-tracker-v1.csv"),
      relatedModuleId: "track-activity",
      downloadAvailable: true,
    },
    {
      id: "weekly-scorecard",
      title: "Weekly Scorecard",
      description: "A CSV-compatible weekly scorecard with rate formulas written as deterministic calculation instructions.",
      fileType: "csv",
      version: "1.0",
      status: complete,
      storageReference: resourcePath("weekly-scorecard-v1.csv"),
      plannedPath: resourcePath("weekly-scorecard-v1.csv"),
      relatedModuleId: "track-activity",
      downloadAvailable: true,
    },
    {
      id: "thirty-day-implementation-checklist",
      title: "30-Day Implementation Checklist",
      description: "A practical week-by-week checklist for setup, outreach, proof publishing, and routine stabilization.",
      fileType: "pdf",
      version: "1.0",
      status: complete,
      storageReference: resourcePath("30-day-implementation-checklist-v1.pdf"),
      plannedPath: resourcePath("30-day-implementation-checklist-v1.pdf"),
      relatedModuleId: "thirty-day-plan",
      downloadAvailable: true,
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

export function getProductResource(product: ProductDefinition, resourceId: string) {
  return product.resources.find((resource) => resource.id === resourceId) ?? null;
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
