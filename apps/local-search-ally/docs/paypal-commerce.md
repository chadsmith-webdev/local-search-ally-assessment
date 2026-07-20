# PayPal Sandbox Commerce

This phase proves hosted PayPal sandbox checkout and entitlement fulfillment for the Contractor Review and Proof System.

## Boundaries

- PayPal environment is sandbox only.
- Live payments are rejected.
- The offer remains `testing`.
- The product remains `development`.
- The normal customer-facing results CTA remains disabled.
- Checkout is available through a secure sandbox preview URL only.

## Environment

```text
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
APP_BASE_URL=https://...
```

Only `NEXT_PUBLIC_PAYPAL_CLIENT_ID` may be exposed to the browser. Do not expose PayPal secrets, webhook IDs, database URLs, token hashes, or product-access tokens.

## Routes

- `/checkout/contractor-review-proof-system?result=...&token=...`
- `/checkout/success?attempt=...`
- `/checkout/cancelled?attempt=...`
- `POST /api/paypal/orders`
- `POST /api/paypal/orders/[orderId]/capture`
- `POST /api/paypal/webhook`

## Lifecycle

1. The checkout page validates the secure result token and confirms the result recommends the approved offer.
2. The server creates or reuses an internal checkout attempt.
3. The server creates a PayPal Orders API v2 order with the registry amount: `47.00 USD`.
4. The browser approves the PayPal-hosted order.
5. The server captures the PayPal order.
6. The fulfillment service verifies the order, capture status, amount, currency, product, offer, result, lead, and checkout attempt.
7. The service creates or reuses one purchase, one active entitlement, and one product-delivery event.
8. The success page may issue a short-lived product-access token after loading the persisted entitlement.

Webhook processing uses PayPal’s verify-webhook-signature endpoint with the configured webhook ID. Webhook bodies are not stored in full.

## Idempotency

- Checkout attempts are unique by checkout idempotency key.
- PayPal order IDs are unique.
- PayPal capture IDs are unique.
- One purchase is created per captured PayPal order.
- One entitlement is created per purchase, product, and product version.
- Product-delivery events are unique by idempotency key.
- PayPal webhook event IDs are unique.

## Vercel

After adding or changing PayPal environment variables, redeploy the Vercel project. The webhook URL should point to:

```text
https://your-domain.example/api/paypal/webhook
```

## Remaining Live-Release Blockers

- Switch from sandbox credentials to reviewed live credentials in a separate approved phase.
- Decide refund and entitlement-revocation policies.
- Add a live product-delivery email provider.
- Activate the public offer CTA only after live payment readiness is approved.
