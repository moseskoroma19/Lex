import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazily created so that `next build` works without a DATABASE_URL.
 * A single client is reused across hot reloads in development.
 */
const globalForDb = globalThis as unknown as { lexDb?: PostgresJsDatabase<typeof schema> };

export function db(): PostgresJsDatabase<typeof schema> {
  if (!globalForDb.lexDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const client = postgres(url, { prepare: false, max: 5 });
    globalForDb.lexDb = drizzle(client, { schema });
  }
  return globalForDb.lexDb;
}

export { schema };
