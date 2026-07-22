# Launch Readiness and Production Hardening

This document tracks technical launch readiness. It does not create legal, tax, privacy, refund, or support policies.

## Customer-Journey Audit

Journey audited:

```text
Landing page -> Assessment -> Review answers -> Email capture -> Result generation
-> Secure results -> Recommended product -> Checkout -> Payment -> Entitlement
-> Product access -> Transactional emails
```

### Issues

| Severity | Issue | Current handling | Required next step |
| --- | --- | --- | --- |
| Launch blocker | Public live purchase is not approved. | Offer remains `testing`; product remains `development`; results page hides the public purchase CTA. | Owner approval for live payments, refund policy, tax handling, support policy, and public offer activation. |
| Launch blocker | Legal/tax review is not complete. | Public policy and disclosure pages use owner-approved business terms and avoid compliance claims. | Owner/legal/tax review for privacy, terms, refunds, estimate disclaimer, product disclaimer, tax handling, and any missing legal clauses. |
| Important | Sandbox checkout route existed on production when given a secure result token. | Production now hides sandbox checkout unless `ENABLE_SANDBOX_CHECKOUT_PREVIEW=true`. | Keep disabled for normal production; use only for controlled testing. |
| Important | Development fixture route existed on production. | `/assessment/dev/fixtures` now returns not found in production by default. | Keep fixture routes disabled in production. |
| Important | Development product fixture token could unlock the product page in production. | Development product access fallback is disabled in production. | Use only verified purchase entitlements in production. |
| Important | Result/product resend and PayPal endpoints had no server-side attempt throttle. | Added per-resource in-memory throttles with customer-safe `429` errors. | Consider persistent edge/rate-limit infrastructure before higher traffic. |
| Minor | Resend delivered events can arrive before sent events. | Webhook processing now prevents status downgrades. | Monitor email status ordering in production logs/events. |

No visibility score, category-score grid, generic consultation CTA, or pilot-program CTA is part of the active customer results hierarchy.

## Environment Matrix

| Environment | Persistence | PayPal | Resend | Fixture/development access | Indexing |
| --- | --- | --- | --- | --- | --- |
| Local development | `memory` allowed only when explicitly configured; `postgres` allowed. | Sandbox only. | Server-only local keys in `.env.local`. | Fixture routes and development product tokens allowed. | Local only. |
| Vercel Preview | `postgres` recommended; no memory fallback in production builds. | Sandbox only; never live. | Server-only preview keys. | Fixture routes should stay disabled unless explicitly guarded for a test deployment. | Secure/checkout/product routes no-index. |
| Vercel Production before launch | `postgres` required; no memory fallback. | Sandbox checkout preview disabled unless `ENABLE_SANDBOX_CHECKOUT_PREVIEW=true`. | Server-only production keys and webhook secret required for delivery verification. | Fixture routes and development product tokens disabled by default. | Landing page may index; secure result, checkout, and product routes no-index. |
| Vercel Production after live activation | `postgres` required. | Requires a separate approved live-payment phase; do not mix live and sandbox credentials. | Server-only production keys; webhook enabled. | Disabled. | Public landing indexable; secure and checkout-state routes no-index. |

Only `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is intentionally exposed to the browser. Do not add `NEXT_PUBLIC_` prefixes to PayPal secrets, Resend secrets, Supabase credentials, database URLs, webhook IDs, or access-token material.

## Public Route Inventory

| Route | Classification | Launch handling |
| --- | --- | --- |
| `/` | Intended public route | Indexable landing/start route. |
| `/assessment` and `/assessment/[id]/*` | Intended public assessment flow | Public by design; stores progress server-side. |
| `/assessment/dev/fixtures` | Development-only route | Disabled in production unless explicitly enabled for controlled testing. |
| `/results/[id]?token=...` | Secure token route | Result ID alone is not authorization; page is no-index. |
| `/checkout/contractor-review-proof-system` | Secure sandbox preview route | Requires secure result token and explicit production preview flag. |
| `/checkout/success`, `/checkout/cancelled` | Checkout state routes | No-index; success verifies server-side purchase/entitlement state. |
| `/products/contractor-review-proof-system?token=...` | Secure token route | Requires product-access token and active entitlement; no-index. |
| `/products/contractor-review-proof-system/resources/[resourceId]?token=...` | Secure token route | Requires product-access token; returns `X-Robots-Tag: noindex, nofollow`. |
| `/api/assessment/[id]/generate` | Internal API route used by funnel | Rate limited by assessment ID. |
| `/api/generate` | Development-only scoring endpoint | Disabled in production by default. |
| `/api/paypal/orders`, `/api/paypal/orders/[orderId]/capture` | Internal checkout API routes | Secure context and policy acknowledgement required; sandbox only; rate limited. |
| `/api/paypal/webhook` | Webhook route | Raw body signature verification; idempotent events. |
| `/api/resend/webhook` | Webhook route | Raw body signature verification; idempotent events. |
| `/api/results/[id]/resend` | Secure token API route | Cannot send to arbitrary recipients; rate limited. |
| `/api/products/contractor-review-proof-system/resend` | Secure token API route | Requires valid product token and purchase entitlement; rate limited. |

## Authorization Boundaries

- Result IDs, purchase IDs, entitlement IDs, lead IDs, and email addresses do not authorize access by themselves.
- Result access and product access use raw one-time generated token values sent to the user and persisted only as SHA-256 digests.
- Result tokens are scoped to one result.
- Product tokens are scoped to one product entitlement.
- Revoked and expired tokens fail safely.
- Product access checks active entitlement state.
- Resend endpoints derive recipients from persisted lead/purchase records; callers cannot supply arbitrary recipients.
- Checkout uses the registry price and server-created PayPal order; browser-supplied prices are ignored.

Current token and access lifetimes:

- Result-access tokens expire 30 days after creation.
- Product-access tokens expire 30 days after creation.
- Product entitlement grants ongoing access to purchased Version 1 unless revoked or refunded.
- Active entitlement holders may request a replacement product-access link after a secure link expires.
- Future major product versions are not automatically included unless expressly stated.

Owner/legal review still needed: revocation process, data-deletion process, final policy language, and production data-access policy.

## Webhook Resilience

- PayPal and Resend webhook handlers read raw request bodies before verification.
- Missing or invalid signatures fail closed.
- Duplicate events are persisted idempotently by provider event ID.
- Resend out-of-order events cannot downgrade delivered/failed/bounced states.
- Sensitive payloads and complete webhook bodies are not stored.
- Webhook follow-up work is limited to persistence/status updates and entitlement/email state changes.

## Database Readiness

Required checks:

```bash
npm run db:status
npm run test:integration
```

Expected state before launch:

- All migrations applied.
- No pending migration.
- Required tables, indexes, foreign keys, check constraints, and idempotency constraints present.
- Sandbox PayPal purchases distinguishable by payment provider and sandbox-only PayPal configuration.
- Resend email states traceable through result/product delivery events and webhook events.

Owner decisions still required: backup cadence, deletion request operating process, disaster recovery expectations, tax handling, and production data-access policy.

## Customer-Facing Error States

Covered states include invalid or expired result/product links, result unavailable, failed email delivery while preserving access, checkout unavailable, payment cancellation, pending capture, capture failure, entitlement unavailable, missing resource, and product unavailable. Errors should remain customer-safe and must not state that payment or delivery succeeded unless server-side state confirms it.

## Accessibility, Responsive, and Performance Notes

Automated coverage exists through React Testing Library for key rendering and route states. Manual launch QA is still required for keyboard navigation, visible focus across the full funnel, mobile PayPal approval, screen-reader announcements, reduced-motion behavior, product module navigation, and download controls.

Performance watch points:

- PayPal SDK should load only on the guarded checkout page.
- Product resources are served only after token validation.
- OpenUI composition remains deterministic/fallback-safe.
- Webhook handlers should stay prompt and avoid long-running work.

## Policy and Business Decisions

| Item | Current implementation | Missing decision | Blocks launch | Review |
| --- | --- | --- | --- | --- |
| Privacy policy | Public route implemented from owner-approved phase decisions. | Legal review and final business contact values. | Yes | Legal recommended. |
| Terms of use | Public route implemented without unapproved liability, venue, arbitration, indemnification, or governing-law clauses. | Legal review for any missing legal clauses. | Yes | Legal recommended. |
| Refund policy | 14-day request window implemented in copy and manual boundary. | Manual operating procedure and legal review. | Yes before live payments | Legal/business. |
| Support policy | Public support route states two-business-day response target and support scope. | Final support email and operating process. | Yes before live payments | Business. |
| Product-access duration | Ongoing access to purchased Version 1; future major versions excluded unless stated. | Revocation operating process. | Important | Business/legal. |
| Secure-link expiration | Result and product secure links expire after 30 days. | Support workflow for replacement product-access links. | Important | Security/business. |
| Data retention/deletion | 24-month unpurchased lead/assessment retention and 12-month operational-event retention documented; deletion request boundary exists. | Legal review and manual deletion process. | Yes | Legal recommended. |
| Assessment disclaimer | Public route states estimates are not guaranteed outcomes or verified losses. | Legal review. | Yes | Legal recommended. |
| Financial-estimate disclaimer | Emails/results state estimates are not guaranteed revenue. | Legal review. | Yes | Legal recommended. |
| Customer-photo permission | Product content references ethical proof workflow. | Final permission/release guidance. | Yes | Legal recommended. |
| Product-content disclaimer | Public route states educational materials are not guarantees, legal advice, or tax advice. | Legal review. | Yes | Legal recommended. |
| Transactional email wording | Implemented for delivery/access only. | Final owner approval. | Important | Legal/brand. |
| Marketing consent wording | Consent is separate and not preselected. | Final approved wording. | Yes before marketing | Legal recommended. |
| Tax handling | Not implemented. | Sales tax responsibility/process. | Yes before live payments | Tax professional. |
| Business contact information | Required business/policy environment variables create a launch-blocking config state when missing. | Final business legal name, support, privacy, refund, mailing address, effective date. | Yes | Business. |

## Manual Launch Checklist

### Technical

- [ ] Migrations applied.
- [ ] Production database reachable.
- [ ] Vercel variables configured.
- [ ] Domain and HTTPS valid.
- [ ] PayPal live app created in a separately approved phase.
- [ ] Live PayPal webhook created in a separately approved phase.
- [ ] Resend webhook active.
- [ ] Real sender domain verified.
- [ ] Transactional email delivered.
- [ ] Error monitoring checked.
- [ ] Backup plan documented.

### Customer Experience

- [ ] Assessment completed.
- [ ] Email received.
- [ ] Result opened.
- [ ] Checkout completed in approved environment.
- [ ] Product access opened.
- [ ] Downloads validated.
- [ ] Mobile journey validated.
- [ ] Cancellation journey validated.
- [ ] Failed-email journey validated.

### Policy

- [ ] Privacy approved.
- [ ] Terms approved.
- [ ] Refund policy approved.
- [ ] Disclaimers approved.
- [ ] Support contact verified.
- [ ] Tax decision documented.
