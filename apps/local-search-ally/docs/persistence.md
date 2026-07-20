# Assessment Persistence

This document covers the production persistence boundary for the assessment funnel. Supabase Postgres is the selected production database, accessed server-side through the repository interface with the `pg` SQL client and `DATABASE_URL`.

## Adapter Selection

```text
ASSESSMENT_STORE_ADAPTER=memory
ASSESSMENT_STORE_ADAPTER=postgres
DATABASE_URL=postgres://user:password@host:5432/database
DATABASE_SCHEMA=public
```

- `memory`: explicit development and unit-test only. It keeps data inside the current process and loses records on restart.
- `postgres`: production-capable Supabase Postgres persistence through `DATABASE_URL`.

When `NODE_ENV=production`, the app must use `ASSESSMENT_STORE_ADAPTER=postgres` and a configured `DATABASE_URL`. Production never silently falls back to memory.

## Supabase Setup

1. Create or select a Supabase project.
2. In Supabase, open Project Settings, then Database.
3. Copy the Postgres connection string. Prefer the server-side pooled connection string for deployed serverless environments when appropriate.
4. Store it in `.env.local` or the deployment platform secret store as `DATABASE_URL`.
5. Do not expose the database URL, Supabase service role key, or any privileged credential in browser code.

This phase does not use Supabase Auth and does not require a browser Supabase client.

## Migration Commands

```bash
npm run db:migrate
npm run db:status
npm run test:integration
```

- `db:migrate` applies pending SQL files from `persistence/migrations` and records them in `app_migrations`.
- `db:status` checks applied migrations, required tables, important unique/index constraints, foreign keys, and check constraints.
- `test:integration` creates a random isolated schema, applies the migration there, runs repository tests, and drops the schema.

Do not run migrations against a production database without explicit environment configuration and authorization. Ordinary `npm run build` does not run migrations.

## Persisted Records

- Assessment sessions: answers, current step, status, lead association, result association, generation errors, timestamps.
- Leads: normalized email, profile fields, assessment-delivery consent, optional marketing consent, source, timestamps.
- Lead-assessment associations: one lead can own multiple assessment attempts.
- Results: normalized deterministic result, OpenUI program when valid, fallback state, offer recommendation metadata, email delivery state.
- Result access tokens: opaque token hashes only, never raw token values.
- Result email events: idempotent queue records, delivery state, provider ID, retry/error fields. Durable records store the result path and access-token record ID, not a raw token URL.
- Funnel events and idempotency keys.

## Atomic Operations

The database adapter must wrap these operations in transactions or equivalent conditional writes:

- Email capture plus lead creation/update, lead-assessment association, consent preservation, and session update.
- Assessment transition into `generating`.
- Result creation, with a unique result per assessment.
- Result-access-token creation, storing only the digest.
- Result-email-event creation, with a unique idempotency key.
- Repeated generation requests, returning the existing result instead of creating duplicates.
- Duplicate email submissions, resolving by normalized email without overwriting consent history accidentally.

Postgres transactions wrap repository `transaction()` calls. Unique constraints on normalized email, lead-assessment pairs, assessment results, token digests, email idempotency keys, and event idempotency keys provide the final defense against concurrent requests.

## Required Constraints

- Unique normalized lead email.
- Unique `(lead_id, assessment_id)` association.
- Unique result per assessment unless explicit result versioning is introduced.
- Unique token digest.
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

Use the memory adapter only when explicitly configured:

```bash
ASSESSMENT_STORE_ADAPTER=memory npm run dev
```

Use Supabase Postgres locally:

```bash
ASSESSMENT_STORE_ADAPTER=postgres
DATABASE_URL=postgres://...
DATABASE_SCHEMA=public
npm run db:migrate
npm run dev
```

Tests create isolated memory repositories where practical. Postgres integration tests create and drop an isolated schema.

## Production Blockers

- Production database migrations must be explicitly applied to the intended Supabase project.
- Backup, retention, deletion, and legal review decisions remain open.
- No checkout, payment webhook, purchase confirmation, fulfillment unlock, or email provider integration is enabled by this phase.
