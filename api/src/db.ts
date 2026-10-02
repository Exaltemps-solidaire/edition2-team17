import { Pool } from "pg";
import { readSecret } from "./secrets.ts";

let pool: Pool | undefined;

export async function getPool(): Promise<Pool> {
  if (pool) return pool;
  const creds = await readSecret("postgres");
  pool = new Pool({
    host: creds.host,
    port: Number(creds.port),
    database: creds.database,
    user: creds.user,
    password: creds.password,
  });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  return pool;
}

export async function closePool(): Promise<void> {
  await pool?.end();
}
