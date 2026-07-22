import type { Metadata } from "next";
import { ContactLine, PolicyPageShell } from "@/components/product/policy-pages";
import { getBusinessPolicyConfig } from "@/domain/policies";

const policy = getBusinessPolicyConfig();

export const metadata: Metadata = {
  title: `Privacy Policy | ${policy.publicBusinessName}`,
  description: "How Local Search Ally collects, uses, stores, and protects assessment, purchase, and email delivery information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PolicyPageShell title="Privacy Policy" description="How information is collected and used for the assessment, product access, and support.">
      <h2>Information collected</h2>
      <p>We collect business details, assessment answers, name and email address, consent choices, generated results, recommendations, opportunity-estimate inputs and assumptions, purchase and entitlement records, transactional email delivery records, security events, webhook records, and limited technical data needed to operate and protect the service.</p>
      <h2>How information is used</h2>
      <p>Information is used to save and resume assessments, generate results, deliver requested assessment emails, process purchases, grant product access, deliver product-access emails, provide support, prevent abuse and fraud, maintain reliability, and preserve records needed for accounting, disputes, fraud prevention, or applicable obligations.</p>
      <h2>Service providers</h2>
      <p>Vercel hosts the application, Supabase stores application data, PayPal provides hosted payment processing, and Resend delivers transactional emails and email event notifications.</p>
      <h2>Consent separation</h2>
      <p>Assessment-result delivery and product-access delivery are transactional. Promotional guidance or product updates require separate optional consent and are not required to receive assessment results or purchased access.</p>
      <h2>Retention</h2>
      <p>{policy.assessmentRetention} {policy.operationalEventRetention} {policy.transactionRecordRetention} Security records may be retained longer when reasonably necessary for investigation.</p>
      <h2>Access, correction, deletion, and marketing withdrawal</h2>
      <p>Requests may be sent to <ContactLine type="privacy" />. Certain transaction, security, accounting, or dispute records may need to be retained even when other information is deleted or deidentified.</p>
      <h2>Security</h2>
      <p>Access links use secure token values, and only token digests are stored. Administrative credentials and webhook secrets are kept server-side. No system can promise absolute security.</p>
    </PolicyPageShell>
  );
}
