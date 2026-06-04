import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import * as schema from "./schema";

let sqliteDb: BetterSQLite3Database<typeof schema> | undefined;

function ensureLocalDbDirectory(dbPath: string): void {
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const directory = path.dirname(path.resolve(dbPath));

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function getLocalDb(): BetterSQLite3Database<typeof schema> {
  if (!sqliteDb) {
    const dbPath = process.env.DB_PATH || "./.data/huable.db";
    ensureLocalDbDirectory(dbPath);
    sqliteDb = drizzleSqlite({ connection: { source: dbPath }, schema });
  }
  return sqliteDb;
}

// Returns a Drizzle database instance.
// In production (Worker), uses Cloudflare D1 via getCloudflareContext().
// In development, uses a local better-sqlite3 file.
// The return type is declared as BetterSQLite3Database so TypeScript can resolve
// query builder methods; the actual runtime value may be a DrizzleD1Database,
// which shares an identical query API.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDb(): BetterSQLite3Database<typeof schema> {
  if (process.env.NODE_ENV === "development") {
    return getLocalDb();
  }
  try {
    const { env } = getCloudflareContext();
    if (env.DB) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return drizzleD1(env.DB, { schema }) as any;
    }
  } catch {
    // Not in Worker context (e.g. build time), fall through to local SQLite
  }
  return getLocalDb();
}
