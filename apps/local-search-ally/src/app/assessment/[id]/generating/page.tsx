import { redirect } from "next/navigation";
import { UnavailableState } from "@/components/product/assessment-funnel";
import { canAccessStep, firstIncompleteStep } from "@/domain/assessment-session";
import { getAssessmentRepository } from "@/lib/assessment-store";
import { GeneratingClient } from "./GeneratingClient";

type Params = Promise<{ id: string }>;

export default async function GeneratingPage({ params }: { params: Params }) {
  const { id } = await params;
  const store = getAssessmentRepository();
  const session = await store.findSession(id);

  if (!session) {
    return <UnavailableState title="Assessment not found" message="Start a new assessment to continue." />;
  }

  if (!canAccessStep("generating", session.answers)) {
    const incomplete = firstIncompleteStep(session.answers);
    redirect(`/assessment/${id}/${incomplete ?? "business"}?error=required-prior-step`);
  }

  if (!session.leadId) {
    redirect(`/assessment/${id}/contact?error=email-required`);
  }

  return <GeneratingClient assessmentId={id} />;
}
