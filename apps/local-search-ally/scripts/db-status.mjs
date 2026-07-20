import { appliedMigrations, connect, migrationFiles } from "./db-utils.mjs";

const requiredTables = [
  "assessment_sessions",
  "leads",
  "lead_assessments",
  "assessment_results",
  "result_access_tokens",
  "result_email_events",
  "funnel_events",
  "app_migrations",
];

const requiredIndexes = [
  "leads_normalized_email_key",
  "lead_assessments_lead_id_assessment_id_key",
  "assessment_results_assessment_id_key",
  "result_access_tokens_token_digest_key",
  "result_email_events_idempotency_key_key",
  "funnel_events_idempotency_key_key",
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
