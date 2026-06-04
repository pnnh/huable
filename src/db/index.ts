import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";

import * as schema from "./schema";

export interface CloudflareEnv {
  DB?: Parameters<typeof drizzleD1>[0];
}

let sqliteDb: BetterSQLite3Database<typeof schema> | undefined;

function ensureLocalDbDirectory(dbPath: string): void {
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const directory = path.dirname(path.resolve(dbPath));

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function getLocalDb() {
  if (!sqliteDb) {
    const dbPath = process.env.DB_PATH || "./.data/huable.db";
    ensureLocalDbDirectory(dbPath);
    sqliteDb = drizzleSqlite({ connection: { source: dbPath }, schema });
  }

  return sqliteDb;
}

export function getDb(): BetterSQLite3Database<typeof schema>;
export function getDb(env: CloudflareEnv): BetterSQLite3Database<typeof schema> | DrizzleD1Database<typeof schema>;
export function getDb(env?: CloudflareEnv): BetterSQLite3Database<typeof schema> | DrizzleD1Database<typeof schema> {
  if (process.env.NODE_ENV === "development" || !env?.DB) {
    return getLocalDb() as BetterSQLite3Database<typeof schema>;
  }

  return drizzleD1(env.DB, { schema }) as DrizzleD1Database<typeof schema>;
}
