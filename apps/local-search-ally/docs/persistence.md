# Assessment Persistence

This phase defines the production persistence boundary for the assessment funnel. The current runnable adapter is a deterministic in-memory adapter for local development, fixtures, and tests. It is not allowed in production.

## Adapter Selection

```text
ASSESSMENT_STORE_ADAPTER=memory
DATABASE_URL=postgres://user:password@host:5432/database
```

- `memory`: development and test only. It keeps data inside the current process and loses records on restart.
- `database`: reserved for the production adapter. The repository boundary and schema are defined, but the live database adapter is not implemented yet.

When `NODE_ENV=production`, the app must be started with a non-memory adapter. Missing `ASSESSMENT_STORE_ADAPTER` or `ASSESSMENT_STORE_ADAPTER=memory` fails safely instead of silently losing production records.

## Persisted Records

- Assessment sessions: answers, current step, status, lead association, result association, generation errors, timestamps.
- Leads: normalized email, profile fields, assessment-delivery consent, optional marketing consent, source, timestamps.
- Lead-assessment associations: one lead can own multiple assessment attempts.
- Results: normalized deterministic result, OpenUI program when valid, fallback state, offer recommendation metadata, email delivery state.
- Result access tokens: opaque token hashes only, never raw token values.
- Result email events: idempotent queue records, delivery state, provider ID, retry/error fields. Durable records store the result path and access-token record ID, not a raw token URL.
- Funnel events and idempotency keys.
- Purchases and product entitlements are part of the schema boundary for later checkout/fulfillment phases.

## Atomic Operations

The database adapter must wrap these operations in transactions or equivalent conditional writes:

- Email capture plus lead creation/update, lead-assessment association, consent preservation, and session update.
- Assessment transition into `generating`.
- Result creation, with a unique result per assessment.
- Result-access-token creation, storing only the digest.
- Result-email-event creation, with a unique idempotency key.
- Repeated generation requests, returning the existing result instead of creating duplicates.
- Duplicate email submissions, resolving by normalized email without overwriting consent history accidentally.

## Required Constraints

- Unique normalized lead email.
- Unique `(lead_id, assessment_id)` association.
- Unique result per assessment unless explicit result versioning is introduced.
- Unique active token digest.
- Unique result-email idempotency key.
- Unique funnel-event idempotency key.
- Required timestamps on persisted rows.
- Foreign keys from leads, sessions, results, access tokens, email events, purchases, and product access.
- Public routes must not use email addresses as identifiers.

## Security and Privacy Notes

- Result tokens are generated as opaque values and only token digests are persisted.
- Raw assessment answers, emails, consent fields, and tokens should not be logged by route handlers or adapters.
- Email normalization is lowercase/trimmed for lookup; deeper internationalized email policy needs legal/product review.
- Consent purposes stay separate: requested assessment delivery is independent from optional marketing follow-up.
- Retention, deletion, legal basis, consent-copy wording, and production compliance claims require legal review. This repository does not claim compliance.

## Local Development

Use the memory adapter:

```bash
ASSESSMENT_STORE_ADAPTER=memory npm run dev
```

Tests create isolated memory repositories where practical, and the app singleton exposes `reset()` for legacy fixture setup.

## Production Blockers

- No database adapter is implemented yet.
- No migration runner is configured yet.
- No checkout, payment webhook, purchase confirmation, fulfillment unlock, or email provider integration is enabled by this phase.
