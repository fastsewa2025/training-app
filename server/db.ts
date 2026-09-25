import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Managed/cloud Postgres (Neon, Supabase, Render Postgres, Railway, RDS, ...)
// requires TLS and is reached over the public internet, unlike the old local
// docker-compose db — so we enable SSL for any non-local host and give
// connections more time (serverless providers like Neon can take a moment
// to wake a suspended compute on the first query).
const isLocalDb = /(^|@)(localhost|127\.0\.0\.1)([:/]|$)/.test(
  process.env.DATABASE_URL ?? ""
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: isLocalDb ? 2000 : 10000,
  // rejectUnauthorized: false is the standard, widely-documented pattern for
  // these providers — their cert chains aren't always in Node's default CA
  // bundle. The connection is still encrypted; this only skips chain
  // verification. Set to true if your provider's certs verify cleanly and
  // you want strict verification.
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
});

pool.on("error", (err: Error) => {
  console.error("[DB] Unexpected pool error:", err);
});

export const db = drizzle(pool, { schema });
export { pool };
