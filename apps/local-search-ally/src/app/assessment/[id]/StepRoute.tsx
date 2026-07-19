import { redirect } from "next/navigation";
import {
  BusinessStepForm,
  ConversionStepForm,
  EconomicsStepForm,
  GoalsStepForm,
  MarketStepForm,
  UnavailableState,
  VisibilityStepForm,
} from "@/components/product/assessment-funnel";
import {
  type AnswerStep,
  canAccessStep,
  firstIncompleteStep,
} from "@/domain/assessment-session";
import { getAssessmentRepository } from "@/lib/assessment-store";
import { saveAssessmentStepAction } from "../actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function StepRoute({
  assessmentId,
  step,
  searchParams,
}: {
  assessmentId: string;
  step: AnswerStep;
  searchParams: SearchParams;
}) {
  const store = getAssessmentRepository();
  const session = await store.findSession(assessmentId);
  const params = await searchParams;

  if (!session) {
    return <UnavailableState title="Assessment not found" message="Start a new assessment to continue." />;
  }

  if (!canAccessStep(step, session.answers)) {
    const incomplete = firstIncompleteStep(session.answers);
    redirect(`/assessment/${assessmentId}/${incomplete ?? "business"}?error=required-prior-step`);
  }

  await store.recordEvent({
    name: "assessment_step_viewed",
    assessmentId,
    idempotencyKey: `step-viewed:${assessmentId}:${step}`,
    occurredAt: new Date().toISOString(),
  });

  const action = saveAssessmentStepAction.bind(null, assessmentId, step);
  const error = firstParam(params.error);

  if (step === "business") return <BusinessStepForm session={session} error={error} action={action} />;
  if (step === "market") return <MarketStepForm session={session} error={error} action={action} />;
  if (step === "visibility") return <VisibilityStepForm session={session} error={error} action={action} />;
  if (step === "conversion") return <ConversionStepForm session={session} error={error} action={action} />;
  if (step === "economics") return <EconomicsStepForm session={session} error={error} action={action} />;
  return <GoalsStepForm session={session} error={error} action={action} />;
}
