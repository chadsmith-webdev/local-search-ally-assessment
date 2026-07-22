ALTER TABLE paypal_checkout_attempts
  ADD COLUMN IF NOT EXISTS policy_version TEXT,
  ADD COLUMN IF NOT EXISTS disclosure_version TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS policy_version TEXT,
  ADD COLUMN IF NOT EXISTS disclosure_version TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS refund_requests (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('requested', 'under-review', 'approved', 'denied', 'processed')),
  entitlement_revocation_status TEXT NOT NULL CHECK (entitlement_revocation_status IN ('not-revoked', 'revoked')),
  requested_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  reason TEXT,
  owner_notes TEXT,
  UNIQUE (purchase_id)
);

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  normalized_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('requested', 'under-review', 'approved', 'denied', 'completed')),
  requested_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reason TEXT,
  owner_notes TEXT
);

CREATE INDEX IF NOT EXISTS refund_requests_lead_id_idx
  ON refund_requests(lead_id);

CREATE INDEX IF NOT EXISTS refund_requests_status_idx
  ON refund_requests(status);

CREATE INDEX IF NOT EXISTS data_deletion_requests_lead_id_idx
  ON data_deletion_requests(lead_id);

CREATE INDEX IF NOT EXISTS data_deletion_requests_status_idx
  ON data_deletion_requests(status);

CREATE INDEX IF NOT EXISTS data_deletion_requests_normalized_email_idx
  ON data_deletion_requests(normalized_email);
