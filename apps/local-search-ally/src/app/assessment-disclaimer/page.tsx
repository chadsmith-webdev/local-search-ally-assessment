import type { Metadata } from "next";
import { PolicyPageShell } from "@/components/product/policy-pages";
import { getBusinessPolicyConfig } from "@/domain/policies";

const policy = getBusinessPolicyConfig();

export const metadata: Metadata = {
  title: `Assessment Disclaimer | ${policy.publicBusinessName}`,
  description: "Important limitations for Local Search Ally assessment estimates.",
  alternates: { canonical: "/assessment-disclaimer" },
};

export default function AssessmentDisclaimerPage() {
  return (
    <PolicyPageShell title="Assessment Disclaimer" description="How to interpret opportunity estimates and recommendations.">
      <p>Estimates depend on user-provided information, disclosed assumptions, and available signals. Inputs may be self-reported, inferred, estimated, or unavailable.</p>
      <p>Missed calls and missed jobs are estimates unless supported by verified tracking data. Opportunity-gap figures are not verified losses and are not guaranteed recoverable revenue.</p>
      <p>Results do not predict future performance. Actual results depend on market conditions, execution, competition, service quality, pricing, customer demand, platform behavior, and other factors.</p>
    </PolicyPageShell>
  );
}
