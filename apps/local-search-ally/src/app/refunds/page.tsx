import type { Metadata } from "next";
import { ContactLine, PolicyPageShell } from "@/components/product/policy-pages";
import { getBusinessPolicyConfig } from "@/domain/policies";

const policy = getBusinessPolicyConfig();

export const metadata: Metadata = {
  title: `Refund Policy | ${policy.publicBusinessName}`,
  description: "Refund request policy for the Contractor Review and Proof System.",
  alternates: { canonical: "/refunds" },
};

export default function RefundsPage() {
  return (
    <PolicyPageShell title="Refund Policy" description="How refund requests are handled for the $47 product purchase.">
      <h2>14-day request period</h2>
      <p>Customers may request a refund within {policy.refundPeriodDays} calendar days of the completed purchase by contacting <ContactLine type="refund" />.</p>
      <h2>Manual review</h2>
      <p>The business may request enough information to identify the transaction and requester. Refund abuse, duplicate purchases, chargebacks, or unclear purchase relationships may require manual review.</p>
      <h2>Access after approved refund</h2>
      <p>Approved refunds revoke product access after refund confirmation. Refund processing time may depend on PayPal and the customer’s payment method.</p>
      <h2>Other rights</h2>
      <p>This policy does not eliminate rights that may apply through PayPal or applicable law. Automatic refunds are not implemented in this phase.</p>
    </PolicyPageShell>
  );
}
