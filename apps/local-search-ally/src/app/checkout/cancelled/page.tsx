import { Card } from "@/components/foundation/Card";
import { Container } from "@/components/foundation/Layout";
import { getAssessmentRepository } from "@/lib/assessment-store";
import { noIndexMetadata } from "@/lib/runtime-guards";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = noIndexMetadata;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CheckoutCancelledPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const attemptId = firstParam(params.attempt);
  if (attemptId) {
    const repository = getAssessmentRepository();
    const attempt = await repository.findCheckoutAttempt(attemptId);
    await repository.recordEvent({
      name: "checkout_cancelled",
      assessmentId: attempt?.assessmentId,
      leadId: attempt?.leadId,
      resultId: attempt?.resultId,
      offerSlug: attempt?.offerSlug,
      idempotencyKey: `checkout-cancelled:${attemptId}`,
      occurredAt: new Date().toISOString(),
    });
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <Container className="max-w-3xl">
        <Card>
          <h1 className="font-display text-3xl font-semibold leading-tight">Payment was not completed</h1>
          <p className="mt-3 leading-7 text-text-secondary">
            No product entitlement was granted. Your assessment result remains available, and sandbox checkout can be
            attempted again safely from a secure result link.
          </p>
        </Card>
      </Container>
    </main>
  );
}
