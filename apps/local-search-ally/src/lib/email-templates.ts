import { z } from "zod/v4";
import { contractorReviewProofSystem } from "@/domain/offers";
import { getBusinessPolicyConfig } from "@/domain/policies";

export const assessmentResultEmailTemplateId = "assessment-results" as const;
export const assessmentResultEmailTemplateVersion = "v1" as const;
export const productAccessEmailTemplateId = "contractor-review-proof-system-access" as const;
export const productAccessEmailTemplateVersion = "v1" as const;

export const assessmentResultEmailDataSchema = z.object({
  recipientEmail: z.email(),
  firstName: z.string().min(1).max(80).optional(),
  businessName: z.string().min(1).max(140).optional(),
  assessmentId: z.string().min(1),
  resultId: z.string().min(1),
  secureResultUrl: z.url(),
  primaryDiagnosisTitle: z.string().min(1).max(160),
  primaryDiagnosisSummary: z.string().min(1).max(520),
  opportunityRange: z
    .object({
      low: z.number().nonnegative(),
      high: z.number().nonnegative(),
      currency: z.literal("USD"),
    })
    .optional(),
  evidenceLevel: z.string().min(1).max(80),
  confidence: z.string().min(1).max(80),
});

export const productAccessEmailDataSchema = z.object({
  recipientEmail: z.email(),
  firstName: z.string().min(1).max(80).optional(),
  purchaseId: z.string().min(1),
  entitlementId: z.string().min(1),
  productName: z.string().min(1).max(180),
  productVersion: z.string().min(1).max(40),
  amountPaidCents: z.literal(4700),
  currency: z.literal("USD"),
  secureProductUrl: z.url(),
});

export type AssessmentResultEmailData = z.infer<typeof assessmentResultEmailDataSchema>;
export type ProductAccessEmailData = z.infer<typeof productAccessEmailDataSchema>;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function greeting(firstName?: string) {
  return firstName ? `Hi ${firstName},` : "Hi,";
}

function moneyRange(range: NonNullable<AssessmentResultEmailData["opportunityRange"]>) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: range.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return range.low === range.high ? formatter.format(range.low) : `${formatter.format(range.low)}-${formatter.format(range.high)}`;
}

function emailShell({ heading, body }: { heading: string; body: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7f9;color:#14213d;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #dde3ea;">
            <tr>
              <td style="padding:24px 28px 12px 28px;border-bottom:1px solid #e8edf2;">
                <div style="font-size:13px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#2474a6;">Local Search Ally</div>
                <h1 style="margin:10px 0 0 0;font-size:26px;line-height:1.25;color:#14213d;">${escapeHtml(heading)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 28px 28px;font-size:16px;line-height:1.6;color:#223047;">
                ${body}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function policyUrl(fromUrl: string, path: string) {
  return new URL(path, fromUrl).toString();
}

export function renderAssessmentResultEmail(input: AssessmentResultEmailData) {
  const data = assessmentResultEmailDataSchema.parse(input);
  const policy = getBusinessPolicyConfig();
  const privacyUrl = policyUrl(data.secureResultUrl, "/privacy");
  const disclaimerUrl = policyUrl(data.secureResultUrl, "/assessment-disclaimer");
  const supportUrl = policyUrl(data.secureResultUrl, "/support");
  const name = escapeHtml(greeting(data.firstName));
  const business = data.businessName ? `<strong>${escapeHtml(data.businessName)}</strong>` : "your business";
  const opportunity = data.opportunityRange
    ? `<p style="margin:16px 0;">Estimated monthly opportunity range: <strong>${moneyRange(data.opportunityRange)}</strong>. This is an estimate, not guaranteed revenue.</p>`
    : `<p style="margin:16px 0;">The estimate is incomplete because the assessment needs more business data before showing a defensible revenue range.</p>`;
  const html = emailShell({
    heading: "Your Local Search Opportunity Assessment Is Ready",
    body: `
      <p style="margin:0 0 16px 0;">${name}</p>
      <p style="margin:0 0 16px 0;">Your personalized assessment for ${business} is ready.</p>
      <p style="margin:0 0 16px 0;"><strong>${escapeHtml(data.primaryDiagnosisTitle)}</strong></p>
      <p style="margin:0 0 16px 0;">${escapeHtml(data.primaryDiagnosisSummary)}</p>
      ${opportunity}
      <p style="margin:16px 0;">Evidence level: <strong>${escapeHtml(data.evidenceLevel)}</strong>. Confidence: <strong>${escapeHtml(data.confidence)}</strong>.</p>
      <p style="margin:24px 0;"><a href="${escapeHtml(data.secureResultUrl)}" style="display:inline-block;background:#2474a6;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 18px;">Open your assessment</a></p>
      <p style="margin:16px 0;font-size:14px;color:#536173;">Fallback URL:<br><span style="word-break:break-all;">${escapeHtml(data.secureResultUrl)}</span></p>
      <p style="margin:16px 0;font-size:14px;color:#536173;">This secure link is intended for you and expires after ${policy.secureLinkExpirationDays} days. Reply to this email if you need help accessing the assessment.</p>
      <p style="margin:16px 0 0 0;font-size:13px;color:#536173;"><a href="${escapeHtml(privacyUrl)}">Privacy</a> · <a href="${escapeHtml(disclaimerUrl)}">Assessment disclaimer</a> · <a href="${escapeHtml(supportUrl)}">Support</a></p>
    `,
  });
  const text = [
    "Local Search Ally",
    "",
    "Your Local Search Opportunity Assessment Is Ready",
    "",
    greeting(data.firstName),
    "",
    `Your personalized assessment${data.businessName ? ` for ${data.businessName}` : ""} is ready.`,
    "",
    data.primaryDiagnosisTitle,
    data.primaryDiagnosisSummary,
    "",
    data.opportunityRange
      ? `Estimated monthly opportunity range: ${moneyRange(data.opportunityRange)}. This is an estimate, not guaranteed revenue.`
      : "The estimate is incomplete because the assessment needs more business data before showing a defensible revenue range.",
    `Evidence level: ${data.evidenceLevel}. Confidence: ${data.confidence}.`,
    "",
    `Open your assessment: ${data.secureResultUrl}`,
    "",
    `This secure link is intended for you and expires after ${policy.secureLinkExpirationDays} days. Reply to this email if you need help accessing the assessment.`,
    "",
    `Privacy: ${privacyUrl}`,
    `Assessment disclaimer: ${disclaimerUrl}`,
    `Support: ${supportUrl}`,
  ].join("\n");
  return {
    subject: "Your Local Search Opportunity Assessment Is Ready",
    html,
    text,
  };
}

export function renderProductAccessEmail(input: ProductAccessEmailData) {
  const data = productAccessEmailDataSchema.parse(input);
  const policy = getBusinessPolicyConfig();
  const supportUrl = policyUrl(data.secureProductUrl, "/support");
  const refundsUrl = policyUrl(data.secureProductUrl, "/refunds");
  const productDisclaimerUrl = policyUrl(data.secureProductUrl, "/product-disclaimer");
  const termsUrl = policyUrl(data.secureProductUrl, "/terms");
  const privacyUrl = policyUrl(data.secureProductUrl, "/privacy");
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: contractorReviewProofSystem.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(contractorReviewProofSystem.priceCents / 100);
  const html = emailShell({
    heading: "Your Contractor Review and Proof System Is Ready",
    body: `
      <p style="margin:0 0 16px 0;">${escapeHtml(greeting(data.firstName))}</p>
      <p style="margin:0 0 16px 0;">Your purchase is confirmed. Protected access to <strong>${escapeHtml(data.productName)}</strong> is ready.</p>
      <p style="margin:0 0 16px 0;">Amount paid: <strong>${escapeHtml(price)} USD</strong>.</p>
      <p style="margin:0 0 16px 0;">Start with the <strong>Start Here</strong> module, then work through the review-request and project-proof steps in order.</p>
      <p style="margin:24px 0;"><a href="${escapeHtml(data.secureProductUrl)}" style="display:inline-block;background:#2474a6;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 18px;">Open the system</a></p>
      <p style="margin:16px 0;font-size:14px;color:#536173;">Fallback URL:<br><span style="word-break:break-all;">${escapeHtml(data.secureProductUrl)}</span></p>
      <p style="margin:16px 0;font-size:14px;color:#536173;">Do not forward this secure access link. It expires after ${policy.secureLinkExpirationDays} days, but active entitlement holders may request a replacement access link.</p>
      <p style="margin:16px 0;font-size:14px;color:#536173;">${escapeHtml(policy.productAccessPolicy)}</p>
      <p style="margin:16px 0 0 0;font-size:13px;color:#536173;"><a href="${escapeHtml(supportUrl)}">Support</a> · <a href="${escapeHtml(refundsUrl)}">Refund Policy</a> · <a href="${escapeHtml(productDisclaimerUrl)}">Product Disclaimer</a> · <a href="${escapeHtml(termsUrl)}">Terms</a> · <a href="${escapeHtml(privacyUrl)}">Privacy</a></p>
    `,
  });
  const text = [
    "Local Search Ally",
    "",
    "Your Contractor Review and Proof System Is Ready",
    "",
    greeting(data.firstName),
    "",
    `Your purchase is confirmed. Protected access to ${data.productName} is ready.`,
    `Amount paid: ${price} USD.`,
    "Start with the Start Here module, then work through the review-request and project-proof steps in order.",
    "",
    `Open the system: ${data.secureProductUrl}`,
    "",
    `Do not forward this secure access link. It expires after ${policy.secureLinkExpirationDays} days, but active entitlement holders may request a replacement access link.`,
    policy.productAccessPolicy,
    "",
    `Support: ${supportUrl}`,
    `Refund Policy: ${refundsUrl}`,
    `Product Disclaimer: ${productDisclaimerUrl}`,
    `Terms: ${termsUrl}`,
    `Privacy: ${privacyUrl}`,
  ].join("\n");
  return {
    subject: "Your Contractor Review and Proof System Is Ready",
    html,
    text,
  };
}
