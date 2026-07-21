# Resend Transactional Email

Resend is the transactional email provider for assessment-result delivery and protected product-access delivery.

## Boundaries

- Resend runs server-side only through the official Node SDK.
- Resend credentials and webhook secrets must never use `NEXT_PUBLIC_` variables.
- Email delivery failure must not block result viewing or paid product access.
- Result-delivery consent and marketing consent stay separate. These templates are transactional only.
- The public low-ticket offer remains unavailable while the offer status is `testing`.

## Environment

```text
RESEND_API_KEY=...
RESEND_FROM_EMAIL=Local Search Ally <assessment@your-domain.example>
RESEND_REPLY_TO_EMAIL=support@your-domain.example
RESEND_WEBHOOK_SECRET=...
APP_BASE_URL=https://...
```

`RESEND_WEBHOOK_SECRET` is required only for verified webhook processing. After deployment, configure the Resend webhook endpoint as:

```text
https://your-domain.example/api/resend/webhook
```

Subscribe to:

```text
email.sent
email.delivered
email.delivery_delayed
email.failed
email.bounced
email.complained
```

## Templates

- `assessment-results` / `v1`: sends the secure assessment result link.
- `contractor-review-proof-system-access` / `v1`: sends the secure product access link after verified sandbox capture and entitlement creation.

Templates include HTML and plain-text bodies. They do not include internal scores, category-score grids, raw tokens outside secure URLs, marketing sequences, pilot-program content, or a public purchase CTA.

## Persistence

Email attempts are stored in the existing event tables:

- `result_email_events`
- `product_delivery_events`

Webhook processing is stored in `resend_webhook_events`, keyed by Resend/Svix event ID. Complete webhook payloads and complete email bodies are not stored.

Provider message IDs are unique when present. Webhook replays are idempotent.
