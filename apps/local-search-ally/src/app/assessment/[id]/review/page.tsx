import { redirect } from "next/navigation";
import { ReviewAnswers, UnavailableState } from "@/components/product/assessment-funnel";
import { canAccessStep, firstIncompleteStep } from "@/domain/assessment-session";
import { getAssessmentRepository } from "@/lib/assessment-store";
import { completeReviewAction } from "../../actions";

type Params = Promise<{ id: string }>;

export default async function ReviewPage({ params }: { params: Params }) {
  const { id } = await params;
  const store = getAssessmentRepository();
  const session = await store.findSession(id);

  if (!session) {
    return <UnavailableState title="Assessment not found" message="Start a new assessment to continue." />;
  }

  if (!canAccessStep("review", session.answers)) {
    const incomplete = firstIncompleteStep(session.answers);
    redirect(`/assessment/${id}/${incomplete ?? "business"}?error=required-prior-step`);
  }

  await store.recordEvent({
    name: "assessment_review_viewed",
    assessmentId: id,
    idempotencyKey: `review-viewed:${id}`,
    occurredAt: new Date().toISOString(),
  });

  return <ReviewAnswers session={session} action={completeReviewAction.bind(null, id)} />;
}
