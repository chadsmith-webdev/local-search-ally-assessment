ALTER TABLE assessment_results
  DROP CONSTRAINT IF EXISTS assessment_results_result_email_delivery_status_check;

ALTER TABLE assessment_results
  ADD CONSTRAINT assessment_results_result_email_delivery_status_check
  CHECK (result_email_delivery_status IN ('not-queued', 'queued', 'sent', 'delivered', 'delayed', 'failed', 'bounced', 'complained'));

ALTER TABLE result_email_events
  DROP CONSTRAINT IF EXISTS result_email_events_status_check;

ALTER TABLE result_email_events
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS template_id TEXT,
  ADD COLUMN IF NOT EXISTS template_version TEXT,
  ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delayed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_code TEXT;

ALTER TABLE result_email_events
  ADD CONSTRAINT result_email_events_status_check
  CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'delayed', 'failed', 'bounced', 'complained', 'development-unsent'));

ALTER TABLE result_email_events
  DROP CONSTRAINT IF EXISTS result_email_events_provider_check;

ALTER TABLE result_email_events
  ADD CONSTRAINT result_email_events_provider_check
  CHECK (provider IS NULL OR provider IN ('resend', 'development'));

ALTER TABLE result_email_events
  DROP CONSTRAINT IF EXISTS result_email_events_template_id_check;

ALTER TABLE result_email_events
  ADD CONSTRAINT result_email_events_template_id_check
  CHECK (template_id IS NULL OR template_id IN ('assessment-results', 'contractor-review-proof-system-access'));

ALTER TABLE result_email_events
  DROP CONSTRAINT IF EXISTS result_email_events_template_version_check;

ALTER TABLE result_email_events
  ADD CONSTRAINT result_email_events_template_version_check
  CHECK (template_version IS NULL OR template_version IN ('v1'));

CREATE UNIQUE INDEX IF NOT EXISTS result_email_events_provider_message_id_uidx
  ON result_email_events(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS result_email_events_status_idx
  ON result_email_events(status);

CREATE INDEX IF NOT EXISTS result_email_events_recipient_email_idx
  ON result_email_events(recipient_email);

ALTER TABLE product_delivery_events
  DROP CONSTRAINT IF EXISTS product_delivery_events_status_check;

ALTER TABLE product_delivery_events
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS template_id TEXT,
  ADD COLUMN IF NOT EXISTS template_version TEXT,
  ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delayed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_code TEXT;

ALTER TABLE product_delivery_events
  ADD CONSTRAINT product_delivery_events_status_check
  CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'delayed', 'failed', 'bounced', 'complained', 'development-unsent'));

ALTER TABLE product_delivery_events
  DROP CONSTRAINT IF EXISTS product_delivery_events_provider_check;

ALTER TABLE product_delivery_events
  ADD CONSTRAINT product_delivery_events_provider_check
  CHECK (provider IS NULL OR provider IN ('resend', 'development'));

ALTER TABLE product_delivery_events
  DROP CONSTRAINT IF EXISTS product_delivery_events_template_id_check;

ALTER TABLE product_delivery_events
  ADD CONSTRAINT product_delivery_events_template_id_check
  CHECK (template_id IS NULL OR template_id IN ('assessment-results', 'contractor-review-proof-system-access'));

ALTER TABLE product_delivery_events
  DROP CONSTRAINT IF EXISTS product_delivery_events_template_version_check;

ALTER TABLE product_delivery_events
  ADD CONSTRAINT product_delivery_events_template_version_check
  CHECK (template_version IS NULL OR template_version IN ('v1'));

CREATE UNIQUE INDEX IF NOT EXISTS product_delivery_events_provider_message_id_uidx
  ON product_delivery_events(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS product_delivery_events_status_idx
  ON product_delivery_events(status);

CREATE INDEX IF NOT EXISTS product_delivery_events_recipient_email_idx
  ON product_delivery_events(recipient_email);

CREATE INDEX IF NOT EXISTS product_delivery_events_purchase_id_idx
  ON product_delivery_events(purchase_id);

CREATE INDEX IF NOT EXISTS product_delivery_events_entitlement_id_idx
  ON product_delivery_events(entitlement_id);

CREATE TABLE IF NOT EXISTS resend_webhook_events (
  id TEXT PRIMARY KEY,
  resend_event_id TEXT NOT NULL UNIQUE,
  provider_email_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('email.sent', 'email.delivered', 'email.delivery_delayed', 'email.failed', 'email.bounced', 'email.complained')),
  processing_status TEXT NOT NULL CHECK (processing_status IN ('received', 'processed', 'rejected', 'failed', 'ignored')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  first_received_at TIMESTAMPTZ NOT NULL,
  last_attempted_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS resend_webhook_events_provider_email_id_idx
  ON resend_webhook_events(provider_email_id);

CREATE INDEX IF NOT EXISTS resend_webhook_events_processing_status_idx
  ON resend_webhook_events(processing_status);
