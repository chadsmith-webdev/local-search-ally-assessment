import { Badge } from "@/components/foundation/Badge";
import { Card } from "@/components/foundation/Card";
import { Container, Grid, Stack } from "@/components/foundation/Layout";
import { formatOfferPrice } from "@/domain/offers";
import { getBusinessPolicyConfig } from "@/domain/policies";
import { loadCheckoutEligibility } from "@/lib/paypal-commerce";
import { noIndexMetadata, sandboxCheckoutPreviewEnabled } from "@/lib/runtime-guards";
import { PayPalSandboxCheckout } from "./PayPalSandboxCheckout";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata = noIndexMetadata;

export default async function ContractorReviewProofCheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const resultId = firstParam(params.result);
  const tokenValue = firstParam(params.token);
  const publicClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const policy = getBusinessPolicyConfig();

  if (!sandboxCheckoutPreviewEnabled()) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <Container className="max-w-3xl">
          <Card>
            <h1 className="font-display text-3xl font-semibold">Checkout unavailable</h1>
            <p className="mt-3 leading-7 text-text-secondary">
              Online checkout is not available for this product yet.
            </p>
          </Card>
        </Container>
      </main>
    );
  }

  if (!resultId || !tokenValue || !publicClientId) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <Container className="max-w-3xl">
          <Card>
            <h1 className="font-display text-3xl font-semibold">Sandbox checkout unavailable</h1>
            <p className="mt-3 leading-7 text-text-secondary">
              This preview requires a secure result link and the public PayPal sandbox client ID.
            </p>
          </Card>
        </Container>
      </main>
    );
  }

  const eligibility = await loadCheckoutEligibility({ resultId, tokenValue }).catch((error) => ({
    error: error instanceof Error ? error.message : "This result is not eligible for sandbox checkout.",
  }));

  if ("error" in eligibility) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <Container className="max-w-3xl">
          <Card>
            <h1 className="font-display text-3xl font-semibold">Checkout preview unavailable</h1>
            <p className="mt-3 leading-7 text-text-secondary">{eligibility.error}</p>
          </Card>
        </Container>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <Container>
        <Stack className="gap-6">
          <header>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone="warning">Sandbox checkout</Badge>
              <Badge tone="neutral">Testing offer</Badge>
              <Badge tone="neutral">Development product</Badge>
            </div>
            <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight">
              {eligibility.offer.name}
            </h1>
            <p className="mt-3 max-w-2xl text-lg leading-8 text-text-secondary">
              One-time PayPal sandbox payment. Protected access is granted only after verified server-side capture.
            </p>
          </header>
          <Grid className="grid-cols-1 lg:grid-cols-[1fr_24rem]">
            <Card>
              <h2 className="font-display text-2xl font-semibold">Included resources</h2>
              <ul className="mt-4 grid gap-3">
                {eligibility.offer.includedDeliverables.map((item) => (
                  <li key={item} className="leading-7 text-text-secondary">
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
            <Stack className="gap-4">
              <Card>
                <p className="text-sm font-semibold text-text-tertiary">One-time payment</p>
                <p className="mt-1 font-display text-4xl font-semibold">{formatOfferPrice(eligibility.offer)}</p>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  No subscription. No public purchase CTA is active in this phase.
                </p>
                <div className="mt-4 grid gap-2 border-t border-border pt-4 text-sm leading-6 text-text-secondary">
                  <p>{policy.productAccessPolicy}</p>
                  <p>Refund requests may be sent within {policy.refundPeriodDays} calendar days of purchase.</p>
                  <p>
                    Product materials are educational implementation resources. They do not guarantee rankings, calls,
                    jobs, revenue, reviews, or platform outcomes.
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <a className="font-semibold text-carolina" href="/terms">
                      Terms
                    </a>
                    <a className="font-semibold text-carolina" href="/refunds">
                      Refund policy
                    </a>
                    <a className="font-semibold text-carolina" href="/product-disclaimer">
                      Product disclaimer
                    </a>
                    <a className="font-semibold text-carolina" href="/privacy">
                      Privacy
                    </a>
                  </div>
                </div>
              </Card>
              <PayPalSandboxCheckout resultId={resultId} tokenValue={tokenValue} publicClientId={publicClientId} />
            </Stack>
          </Grid>
        </Stack>
      </Container>
    </main>
  );
}
