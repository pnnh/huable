import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "./schema";

function ensureLocalDbDirectory(dbPath: string): void {
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const directory = path.dirname(path.resolve(dbPath));

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

export function runMigrations() {
  const dbPath = process.env.DB_PATH || "./.data/huable.db";
  ensureLocalDbDirectory(dbPath);

  const db = drizzle({ connection: { source: dbPath }, schema });
  migrate(db, { migrationsFolder: "./migrations" });
  console.log("Migrations applied successfully.");

  return db;
}

runMigrations();
