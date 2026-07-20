CREATE TABLE IF NOT EXISTS assessment_sessions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('draft', 'reviewed', 'contact-captured', 'generating', 'completed', 'generation-failed')),
  current_step TEXT NOT NULL CHECK (current_step IN ('business', 'market', 'visibility', 'conversion', 'economics', 'goals', 'review', 'contact', 'generating', 'completed')),
  answers_json JSONB NOT NULL,
  lead_id TEXT,
  result_id TEXT,
  generation_error TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  normalized_email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  business_name TEXT,
  primary_assessment_id TEXT NOT NULL,
  contact_source TEXT NOT NULL CHECK (contact_source IN ('assessment-results-gate')),
  result_category TEXT,
  recommended_offer_slug TEXT,
  assessment_delivery_consent_json JSONB NOT NULL,
  marketing_consent_json JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT leads_assessment_delivery_consent_granted_at
    CHECK (
      assessment_delivery_consent_json->>'granted' <> 'true'
      OR assessment_delivery_consent_json ? 'grantedAt'
    ),
  CONSTRAINT leads_marketing_consent_granted_at
    CHECK (
      marketing_consent_json IS NULL
      OR marketing_consent_json->>'granted' <> 'true'
      OR marketing_consent_json ? 'grantedAt'
    )
);

CREATE TABLE IF NOT EXISTS lead_assessments (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('assessment-results-gate')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (lead_id, assessment_id)
);

CREATE TABLE IF NOT EXISTS assessment_results (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL UNIQUE REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  normalized_result_json JSONB NOT NULL,
  openui_response TEXT,
  renderer_mode TEXT NOT NULL CHECK (renderer_mode IN ('openui', 'deterministic-fallback')),
  fallback_reason TEXT,
  access_token_id TEXT,
  result_email_delivery_status TEXT NOT NULL CHECK (result_email_delivery_status IN ('not-queued', 'queued', 'sent', 'failed')),
  recommended_offer_slug TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS result_access_tokens (
  id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL REFERENCES assessment_results(id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  token_digest CHAR(64) NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS result_access_tokens_result_id_idx
  ON result_access_tokens(result_id);

CREATE TABLE IF NOT EXISTS result_email_events (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  assessment_id TEXT NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  result_id TEXT NOT NULL REFERENCES assessment_results(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  result_url_path TEXT NOT NULL,
  result_access_token_id TEXT NOT NULL REFERENCES result_access_tokens(id) ON DELETE CASCADE,
  result_category TEXT,
  recommended_offer_slug TEXT,
  assessment_delivery_consent_json JSONB NOT NULL,
  marketing_consent_json JSONB,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'development-unsent')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT result_email_assessment_delivery_consent_granted_at
    CHECK (
      assessment_delivery_consent_json->>'granted' <> 'true'
      OR assessment_delivery_consent_json ? 'grantedAt'
    ),
  CONSTRAINT result_email_marketing_consent_granted_at
    CHECK (
      marketing_consent_json IS NULL
      OR marketing_consent_json->>'granted' <> 'true'
      OR marketing_consent_json ? 'grantedAt'
    )
);

CREATE TABLE IF NOT EXISTS funnel_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  assessment_id TEXT REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  result_id TEXT REFERENCES assessment_results(id) ON DELETE CASCADE,
  offer_slug TEXT,
  purchase_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS lead_assessments_lead_id_idx
  ON lead_assessments(lead_id);

CREATE INDEX IF NOT EXISTS assessment_results_lead_id_idx
  ON assessment_results(lead_id);

CREATE INDEX IF NOT EXISTS result_email_events_result_id_idx
  ON result_email_events(result_id);

CREATE INDEX IF NOT EXISTS funnel_events_assessment_id_idx
  ON funnel_events(assessment_id);
