CREATE TABLE IF NOT EXISTS paypal_checkout_attempts (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  result_id TEXT NOT NULL REFERENCES assessment_results(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  offer_slug TEXT NOT NULL CHECK (offer_slug IN ('contractor-review-proof-system')),
  product_slug TEXT NOT NULL CHECK (product_slug IN ('contractor-review-proof-system')),
  product_version TEXT NOT NULL,
  expected_amount_cents INTEGER NOT NULL CHECK (expected_amount_cents >= 0),
  expected_currency CHAR(3) NOT NULL CHECK (expected_currency = 'USD'),
  paypal_order_id TEXT UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('created', 'approval-pending', 'approved', 'capture-pending', 'completed', 'declined', 'voided', 'cancelled', 'expired', 'failed')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  failure_reason TEXT
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  checkout_attempt_id TEXT NOT NULL UNIQUE REFERENCES paypal_checkout_attempts(id) ON DELETE RESTRICT,
  assessment_id TEXT NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  result_id TEXT NOT NULL REFERENCES assessment_results(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  offer_slug TEXT NOT NULL CHECK (offer_slug IN ('contractor-review-proof-system')),
  product_slug TEXT NOT NULL CHECK (product_slug IN ('contractor-review-proof-system')),
  product_version TEXT NOT NULL,
  payment_provider TEXT NOT NULL CHECK (payment_provider = 'paypal'),
  paypal_order_id TEXT NOT NULL UNIQUE,
  paypal_capture_id TEXT NOT NULL UNIQUE,
  paypal_payer_id TEXT,
  expected_amount_cents INTEGER NOT NULL CHECK (expected_amount_cents >= 0),
  captured_amount_cents INTEGER NOT NULL CHECK (captured_amount_cents >= 0),
  currency CHAR(3) NOT NULL CHECK (currency = 'USD'),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'denied', 'failed', 'refunded', 'partially-refunded', 'reversed')),
  fulfillment_status TEXT NOT NULL CHECK (fulfillment_status IN ('pending', 'fulfilled', 'failed', 'revoked')),
  purchaser_email TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

ALTER TABLE funnel_events
  ADD COLUMN IF NOT EXISTS purchase_id TEXT REFERENCES purchases(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS product_entitlements (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  product_slug TEXT NOT NULL CHECK (product_slug IN ('contractor-review-proof-system')),
  product_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'refunded', 'expired')),
  granted_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (purchase_id, product_slug, product_version)
);

CREATE TABLE IF NOT EXISTS product_access_tokens (
  id TEXT PRIMARY KEY,
  product_slug TEXT NOT NULL CHECK (product_slug IN ('contractor-review-proof-system')),
  entitlement_id TEXT NOT NULL REFERENCES product_entitlements(id) ON DELETE CASCADE,
  token_digest CHAR(64) NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'revoked', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS paypal_webhook_events (
  id TEXT PRIMARY KEY,
  paypal_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment = 'sandbox'),
  processing_status TEXT NOT NULL CHECK (processing_status IN ('received', 'processed', 'rejected', 'failed', 'ignored')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  first_received_at TIMESTAMPTZ NOT NULL,
  last_attempted_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  failure_reason TEXT
);

CREATE TABLE IF NOT EXISTS product_delivery_events (
  id TEXT PRIMARY KEY,
  entitlement_id TEXT NOT NULL REFERENCES product_entitlements(id) ON DELETE CASCADE,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  product_slug TEXT NOT NULL CHECK (product_slug IN ('contractor-review-proof-system')),
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'development-unsent')),
  idempotency_key TEXT NOT NULL UNIQUE,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  provider_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS paypal_checkout_attempts_assessment_id_idx
  ON paypal_checkout_attempts(assessment_id);

CREATE INDEX IF NOT EXISTS paypal_checkout_attempts_result_id_idx
  ON paypal_checkout_attempts(result_id);

CREATE INDEX IF NOT EXISTS paypal_checkout_attempts_lead_id_idx
  ON paypal_checkout_attempts(lead_id);

CREATE INDEX IF NOT EXISTS funnel_events_purchase_id_idx
  ON funnel_events(purchase_id);

CREATE INDEX IF NOT EXISTS purchases_lead_id_idx
  ON purchases(lead_id);

CREATE INDEX IF NOT EXISTS purchases_payment_status_idx
  ON purchases(payment_status);

CREATE INDEX IF NOT EXISTS product_entitlements_lead_id_idx
  ON product_entitlements(lead_id);

CREATE INDEX IF NOT EXISTS product_entitlements_status_idx
  ON product_entitlements(status);

CREATE INDEX IF NOT EXISTS paypal_webhook_events_processing_status_idx
  ON paypal_webhook_events(processing_status);
