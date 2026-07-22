import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/product/policy-pages";
import { getBusinessPolicyConfig } from "@/domain/policies";

const policy = getBusinessPolicyConfig();

export const metadata: Metadata = {
  title: `Product Disclaimer | ${policy.publicBusinessName}`,
  description: "Important limitations for the Contractor Review and Proof System.",
  alternates: { canonical: "/product-disclaimer" },
};

export default function ProductDisclaimerPage() {
  return (
    <PolicyPageShell title="Product Disclaimer" description="How to use the Contractor Review and Proof System responsibly.">
      <p>The product provides educational templates, systems, worksheets, and implementation guidance. It does not guarantee review volume, ratings, rankings, calls, jobs, revenue, or platform outcomes.</p>
      <p>Review requests should seek honest feedback without pressure or incentives. Customer-permission scripts are general starting points, and legal requirements may vary.</p>
      <p>The materials are not legal or tax advice. Contractors remain responsible for adapting the materials to their business, customers, platforms, and local requirements.</p>
    </PolicyPageShell>
  );
}
