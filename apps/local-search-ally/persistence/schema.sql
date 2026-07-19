-- Provider-neutral schema draft for the production assessment repository.
-- Adapt data types and JSON constraints to the selected database before running.

CREATE TABLE assessment_sessions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('draft', 'reviewed', 'contact-captured', 'generating', 'completed', 'generation-failed')),
  current_step TEXT NOT NULL CHECK (current_step IN ('business', 'market', 'visibility', 'conversion', 'economics', 'goals', 'review', 'contact', 'generating', 'completed')),
  answers_json JSON NOT NULL,
  lead_id TEXT,
  result_id TEXT,
  generation_error TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP
);

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  normalized_email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  business_name TEXT,
  primary_assessment_id TEXT NOT NULL,
  contact_source TEXT NOT NULL CHECK (contact_source IN ('assessment-results-gate')),
  result_category TEXT,
  recommended_offer_slug TEXT,
  assessment_delivery_consent_json JSON NOT NULL,
  marketing_consent_json JSON,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE lead_assessments (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  assessment_id TEXT NOT NULL REFERENCES assessment_sessions(id),
  source TEXT NOT NULL CHECK (source IN ('assessment-results-gate')),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE (lead_id, assessment_id)
);

CREATE TABLE assessment_results (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL UNIQUE REFERENCES assessment_sessions(id),
  lead_id TEXT NOT NULL REFERENCES leads(id),
  normalized_result_json JSON NOT NULL,
  openui_response TEXT,
  renderer_mode TEXT NOT NULL CHECK (renderer_mode IN ('openui', 'deterministic-fallback')),
  fallback_reason TEXT,
  access_token_id TEXT,
  result_email_delivery_status TEXT NOT NULL CHECK (result_email_delivery_status IN ('not-queued', 'queued', 'sent', 'failed')),
  recommended_offer_slug TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE result_access_tokens (
  id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL REFERENCES assessment_results(id),
  assessment_id TEXT NOT NULL REFERENCES assessment_sessions(id),
  lead_id TEXT NOT NULL REFERENCES leads(id),
  token_digest CHAR(64) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'revoked')),
  created_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP
);

CREATE UNIQUE INDEX result_access_tokens_active_digest_idx
  ON result_access_tokens(token_digest)
  WHERE status = 'active';

CREATE TABLE result_email_events (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  assessment_id TEXT NOT NULL REFERENCES assessment_sessions(id),
  result_id TEXT NOT NULL REFERENCES assessment_results(id),
  recipient_email TEXT NOT NULL,
  result_url_path TEXT NOT NULL,
  result_access_token_id TEXT NOT NULL REFERENCES result_access_tokens(id),
  result_category TEXT,
  recommended_offer_slug TEXT,
  assessment_delivery_consent_json JSON NOT NULL,
  marketing_consent_json JSON,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'development-unsent')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE funnel_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  assessment_id TEXT REFERENCES assessment_sessions(id),
  lead_id TEXT REFERENCES leads(id),
  result_id TEXT REFERENCES assessment_results(id),
  offer_slug TEXT,
  purchase_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  occurred_at TIMESTAMP NOT NULL
);

CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id),
  assessment_id TEXT REFERENCES assessment_sessions(id),
  result_id TEXT REFERENCES assessment_results(id),
  offer_slug TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_customer_reference TEXT,
  provider_checkout_session_id TEXT UNIQUE,
  provider_payment_reference TEXT,
  amount_cents INTEGER,
  currency TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE product_access (
  id TEXT PRIMARY KEY,
  purchase_id TEXT REFERENCES purchases(id),
  lead_id TEXT REFERENCES leads(id),
  offer_slug TEXT NOT NULL,
  access_token_digest CHAR(64),
  status TEXT NOT NULL,
  product_access_route TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP
);
