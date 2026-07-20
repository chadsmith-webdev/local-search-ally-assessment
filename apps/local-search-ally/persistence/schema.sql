-- Supabase Postgres schema reference.
-- Executable migrations live in persistence/migrations.
--
-- Cascade behavior:
-- - Deleting an assessment removes lead-assessment links, results, result tokens, result emails, and assessment-scoped events.
-- - Deleting a lead removes lead-assessment links but is restricted while results, result tokens, or email events reference the lead.
-- - Public routes must use opaque result-access tokens, never email addresses or result IDs alone.

\i persistence/migrations/001_assessment_funnel.sql
\i persistence/migrations/002_paypal_sandbox_commerce.sql
