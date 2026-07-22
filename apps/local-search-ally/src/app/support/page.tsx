import type { Metadata } from "next";
import { ContactLine, PolicyPageShell } from "@/components/product/policy-pages";
import { getBusinessPolicyConfig } from "@/domain/policies";

const policy = getBusinessPolicyConfig();

export const metadata: Metadata = {
  title: `Support | ${policy.publicBusinessName}`,
  description: "Support scope for assessment access and the Contractor Review and Proof System.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <PolicyPageShell title="Support" description="What help is included with product access.">
      <h2>Contact</h2>
      <p>Support requests may be sent to <ContactLine type="support" />. {policy.supportResponseTarget}</p>
      <h2>Included support</h2>
      <p>The $47 purchase includes reasonable email assistance for access problems, download problems, technical issues with the product dashboard, and clarification about using included worksheets, scripts, and templates.</p>
      <h2>Not included</h2>
      <p>The purchase does not include custom marketing consulting, done-for-you implementation, Google Business Profile management, website redesign, account management, legal advice, tax advice, or guaranteed results.</p>
    </PolicyPageShell>
  );
}
