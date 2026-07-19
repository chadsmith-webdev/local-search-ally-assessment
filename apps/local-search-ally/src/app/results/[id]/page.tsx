import { AssessmentRenderer } from "@/components/rendering/AssessmentRenderer";
import { DeterministicAssessmentFallback } from "@/components/product/assessment-components";
import { UnavailableState } from "@/components/product/assessment-funnel";
import { validateResultAccessToken } from "@/domain/result-access";
import { getPublicResultsPageOffer } from "@/domain/offers";
import { getAssessmentRepository } from "@/lib/assessment-store";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResultPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const tokenValue = firstParam(query.token);
  const store = getAssessmentRepository();
  const saved = await store.findResult(id);

  if (!saved) {
    return <UnavailableState title="Result unavailable" message="This assessment result could not be found." />;
  }

  const tokens = await store.findResultAccessTokensForResult(id);
  const access = validateResultAccessToken({
    tokenValue,
    resultId: id,
    tokens,
  });

  if (access.status !== "valid") {
    return <UnavailableState title="Secure access required" message={access.message} />;
  }

  await store.recordEvent({
    name: "results_viewed",
    assessmentId: saved.assessmentId,
    leadId: saved.leadId,
    resultId: saved.id,
    idempotencyKey: `results-viewed:${saved.id}`,
    occurredAt: new Date().toISOString(),
  });

  const publicOffer = getPublicResultsPageOffer(saved.result);
  if (publicOffer) {
    await store.recordEvent({
      name: "low_ticket_offer_viewed",
      assessmentId: saved.assessmentId,
      leadId: saved.leadId,
      resultId: saved.id,
      offerSlug: publicOffer.slug,
      idempotencyKey: `low-ticket-offer-viewed:${saved.id}:${publicOffer.slug}`,
      occurredAt: new Date().toISOString(),
    });
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      {saved.resultEmailDeliveryStatus === "failed" ? (
        <div className="mx-auto mb-5 max-w-6xl rounded-card border border-border-accent bg-carolina-dim p-4 text-sm text-text-secondary">
          Your result is available here, but the delivery email needs another try.
        </div>
      ) : null}
      {saved.rendererMode === "openui" && saved.openUIResponse ? (
        <AssessmentRenderer response={saved.openUIResponse} result={saved.result} />
      ) : (
        <DeterministicAssessmentFallback result={saved.result} />
      )}
    </main>
  );
}
