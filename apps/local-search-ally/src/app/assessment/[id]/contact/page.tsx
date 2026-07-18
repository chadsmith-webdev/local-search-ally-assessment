import { redirect } from "next/navigation";
import { ContactCapture, UnavailableState } from "@/components/product/assessment-funnel";
import { canAccessStep, firstIncompleteStep } from "@/domain/assessment-session";
import { getAssessmentStore } from "@/lib/assessment-store";
import { captureLeadAction } from "../../actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ContactPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const store = getAssessmentStore();
  const session = await store.findSession(id);

  if (!session) {
    return <UnavailableState title="Assessment not found" message="Start a new assessment to continue." />;
  }

  if (!canAccessStep("contact", session.answers)) {
    const incomplete = firstIncompleteStep(session.answers);
    redirect(`/assessment/${id}/${incomplete ?? "business"}?error=required-prior-step`);
  }

  await store.recordEvent({
    name: "email_capture_viewed",
    assessmentId: id,
    idempotencyKey: `email-capture-viewed:${id}`,
    occurredAt: new Date().toISOString(),
  });

  return <ContactCapture session={session} error={firstParam(query.error)} action={captureLeadAction.bind(null, id)} />;
}
