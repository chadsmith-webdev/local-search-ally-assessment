import { appliedMigrations, connect, migrationFiles } from "./db-utils.mjs";

const requiredTables = [
  "assessment_sessions",
  "leads",
  "lead_assessments",
  "assessment_results",
  "result_access_tokens",
  "result_email_events",
  "funnel_events",
  "paypal_checkout_attempts",
  "purchases",
  "product_entitlements",
  "product_access_tokens",
  "paypal_webhook_events",
  "product_delivery_events",
  "resend_webhook_events",
  "refund_requests",
  "data_deletion_requests",
  "app_migrations",
];

const requiredIndexes = [
  "leads_normalized_email_key",
  "lead_assessments_lead_id_assessment_id_key",
  "assessment_results_assessment_id_key",
  "result_access_tokens_token_digest_key",
  "result_email_events_idempotency_key_key",
  "result_email_events_provider_message_id_uidx",
  "result_email_events_status_idx",
  "result_email_events_recipient_email_idx",
  "funnel_events_idempotency_key_key",
  "funnel_events_purchase_id_idx",
  "paypal_checkout_attempts_paypal_order_id_key",
  "paypal_checkout_attempts_idempotency_key_key",
  "purchases_checkout_attempt_id_key",
  "purchases_paypal_order_id_key",
  "purchases_paypal_capture_id_key",
  "product_entitlements_purchase_id_product_slug_product_versi_key",
  "product_access_tokens_token_digest_key",
  "paypal_webhook_events_paypal_event_id_key",
  "product_delivery_events_idempotency_key_key",
  "product_delivery_events_provider_message_id_uidx",
  "product_delivery_events_status_idx",
  "product_delivery_events_recipient_email_idx",
  "product_delivery_events_purchase_id_idx",
  "product_delivery_events_entitlement_id_idx",
  "resend_webhook_events_resend_event_id_key",
  "resend_webhook_events_provider_email_id_idx",
  "resend_webhook_events_processing_status_idx",
  "refund_requests_purchase_id_key",
  "refund_requests_lead_id_idx",
  "refund_requests_status_idx",
  "data_deletion_requests_lead_id_idx",
  "data_deletion_requests_status_idx",
  "data_deletion_requests_normalized_email_idx",
];

let connection;

try {
  connection = await connect();
  const { client, schema } = connection;
  const applied = await appliedMigrations(client, { ensure: false });
  const files = migrationFiles();
  const pending = files.filter((file) => !applied.has(file));
  const tableRows = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = ANY($2::text[])
      ORDER BY table_name
    `,
    [schema, requiredTables],
  );
  const indexRows = await client.query(
    `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = $1 AND indexname = ANY($2::text[])
      ORDER BY indexname
    `,
    [schema, requiredIndexes],
  );
  const foreignKeys = await client.query(
    `
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = $1 AND constraint_type = 'FOREIGN KEY'
    `,
    [schema],
  );
  const checks = await client.query(
    `
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = $1 AND constraint_type = 'CHECK'
    `,
    [schema],
  );

  console.log(`Database schema: ${schema}`);
  console.log(`Migrations applied: ${applied.size}/${files.length}`);
  console.log(`Migrations pending: ${pending.length === 0 ? "none" : pending.join(", ")}`);
  console.log(`Required tables present: ${tableRows.rows.length}/${requiredTables.length}`);
  console.log(`Required unique/index constraints present: ${indexRows.rows.length}/${requiredIndexes.length}`);
  console.log(`Foreign keys present: ${foreignKeys.rows.length}`);
  console.log(`Check constraints present: ${checks.rows.length}`);

  if (pending.length > 0 || tableRows.rows.length !== requiredTables.length || indexRows.rows.length !== requiredIndexes.length) {
    process.exitCode = 1;
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "Database status check failed.";
  console.error(`Database status check failed: ${message}`);
  process.exitCode = 1;
} finally {
  await connection?.client.end();
}
