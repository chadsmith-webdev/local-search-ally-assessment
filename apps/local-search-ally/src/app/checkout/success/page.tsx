import { ExternalLink } from "lucide-react";
import { Button } from "@/components/foundation/Button";
import { Card } from "@/components/foundation/Card";
import { Container, Stack } from "@/components/foundation/Layout";
import { getAssessmentRepository } from "@/lib/assessment-store";
import { PayPalRestClient } from "@/lib/paypal-client";
import { fulfillCapturedPayPalOrder } from "@/lib/paypal-commerce";
import { getPayPalConfig } from "@/lib/paypal-config";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const attemptId = firstParam(params.attempt);
  const repository = getAssessmentRepository();
  const now = new Date().toISOString();

  let title = "Order not recognized";
  let message = "We could not find a matching checkout attempt.";
  let productHref: string | null = null;

  if (attemptId) {
    const attempt = await repository.findCheckoutAttempt(attemptId);
    if (attempt?.paypalOrderId) {
      try {
        let purchase = await repository.findPurchaseByCheckoutAttemptId(attempt.id);
        let entitlement = purchase
          ? await repository.findProductEntitlementByPurchaseAndProduct(purchase.id, attempt.productSlug, attempt.productVersion)
          : null;

        if (!purchase || !entitlement) {
          const paypal = new PayPalRestClient(getPayPalConfig());
          const order = await paypal.getOrder(attempt.paypalOrderId);
          if (order.status === "COMPLETED") {
            const fulfilled = await fulfillCapturedPayPalOrder({ order, repository, now });
            purchase = fulfilled.purchase;
            entitlement = fulfilled.entitlement;
          }
        }

        if (purchase && entitlement?.status === "active") {
          const access = await repository.createProductAccess(entitlement, now);
          productHref = `/products/contractor-review-proof-system?token=${encodeURIComponent(access.tokenValue)}`;
          title = "Payment confirmed — access ready";
          message = "Your sandbox payment was verified and product access is ready.";
        } else if (purchase?.paymentStatus === "pending") {
          title = "Payment pending";
          message = "PayPal has not confirmed the capture yet. This page can be retried safely.";
        } else {
          title = "Payment completed — preparing access";
          message = "Payment verification is complete, but access is still being prepared.";
        }
      } catch {
        title = "Payment verification failed";
        message = "The order could not be verified server-side. No new entitlement was granted from this page view.";
      }
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <Container className="max-w-3xl">
        <Stack className="gap-5">
          <Card>
            <h1 className="font-display text-3xl font-semibold leading-tight">{title}</h1>
            <p className="mt-3 leading-7 text-text-secondary">{message}</p>
            {productHref ? (
              <Button asChild className="mt-6">
                <a href={productHref}>
                  Open the Contractor Review and Proof System
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
              </Button>
            ) : null}
          </Card>
        </Stack>
      </Container>
    </main>
  );
}
