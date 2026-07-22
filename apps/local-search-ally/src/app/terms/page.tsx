import type { Metadata } from "next";
import { ContactLine, PolicyPageShell } from "@/components/product/policy-pages";
import { getBusinessPolicyConfig } from "@/domain/policies";

const policy = getBusinessPolicyConfig();

export const metadata: Metadata = {
  title: `Terms of Use | ${policy.publicBusinessName}`,
  description: "Terms for using the Local Search Ally assessment and Contractor Review and Proof System.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PolicyPageShell title="Terms of Use" description="Rules for using the assessment, results, checkout, and product materials.">
      <h2>Acceptance and permitted use</h2>
      <p>Use the assessment and product materials only for lawful internal business purposes. Do not interfere with the service, attempt unauthorized access, submit abusive traffic, or misuse secure links.</p>
      <h2>Assessment estimates</h2>
      <p>Assessment opportunity figures are estimates based on user-provided information, disclosed assumptions, and available signals. They are not verified losses and do not guarantee calls, jobs, rankings, reviews, revenue, or future performance.</p>
      <h2>Product license and access</h2>
      <p>Purchased product materials are licensed for personal or internal business use. Resale, redistribution, public sharing, or unauthorized transfer of files or secure access links is prohibited. {policy.productAccessPolicy}</p>
      <h2>Payments and third-party services</h2>
      <p>PayPal provides hosted payment processing. Vercel, Supabase, PayPal, and Resend support hosting, storage, payment, and email functions.</p>
      <h2>Availability and suspension</h2>
      <p>The service may be unavailable at times. Access may be suspended for abuse, security concerns, refunded purchases, or valid revocation.</p>
      <h2>Contact</h2>
      <p>Questions may be sent to <ContactLine type="support" />.</p>
    </PolicyPageShell>
  );
}
