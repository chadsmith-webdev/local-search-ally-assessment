import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

export const rootDir = resolve(new URL("..", import.meta.url).pathname);
export const migrationsDir = join(rootDir, "persistence", "migrations");

export function loadLocalEnv() {
  for (const file of [".env", ".env.local"]) {
    const path = join(rootDir, file);
    let contents = "";
    try {
      contents = readFileSync(path, "utf8");
    } catch {
      continue;
    }
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  }
}

export function schemaName() {
  const schema = process.env.DATABASE_SCHEMA?.trim() || "public";
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new Error("DATABASE_SCHEMA contains unsupported characters.");
  }
  return schema;
}

export function migrationFiles() {
  return readdirSync(migrationsDir)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
}

export async function connect({ createSchema = false } = {}) {
  loadLocalEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. The connection string was not printed.");
  }
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  const schema = schemaName();
  if (createSchema) await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await client.query(`SET search_path TO "${schema}"`);
  return { client, schema };
}

export async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function appliedMigrations(client, { ensure = true } = {}) {
  if (ensure) {
    await ensureMigrationsTable(client);
  } else {
    const exists = await client.query("SELECT to_regclass('app_migrations') AS table_name");
    if (!exists.rows[0]?.table_name) return new Set();
  }
  const result = await client.query("SELECT id FROM app_migrations ORDER BY id ASC");
  return new Set(result.rows.map((row) => row.id));
}
