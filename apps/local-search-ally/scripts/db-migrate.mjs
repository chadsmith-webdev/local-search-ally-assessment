import { readFileSync } from "node:fs";
import { join } from "node:path";
import { appliedMigrations, connect, ensureMigrationsTable, migrationFiles, migrationsDir } from "./db-utils.mjs";

let connection;

try {
  connection = await connect({ createSchema: true });
  const { client, schema } = connection;
  await ensureMigrationsTable(client);
  const applied = await appliedMigrations(client);
  const pending = migrationFiles().filter((file) => !applied.has(file));

  for (const file of pending) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO app_migrations (id) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`Applied migration ${file} to schema ${schema}.`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  if (pending.length === 0) console.log(`No pending migrations for schema ${schema}.`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Database migration failed.";
  console.error(`Database migration failed: ${message}`);
  process.exitCode = 1;
} finally {
  await connection?.client.end();
}
