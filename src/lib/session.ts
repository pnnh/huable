// Server-side session storage backing the Calieo-authenticated `session_id` cookie.
// See specs/002-calieo-oauth-login/data-model.md.
import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { sessions, users, createId } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (FR-013)

export const SESSION_COOKIE_NAME = "session_id";
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

// Creates a new session row for the user and returns its opaque id (FR-011, FR-014).
export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  const id = createId();
  const now = Date.now();
  await db.insert(sessions)
    .values({ id, userId, createdAt: now, expiresAt: now + SESSION_TTL_MS })
    .run();
  return id;
}

// Resolves a session id to its user, ignoring (but not deleting) expired rows.
export async function getSessionUser(sessionId: string): Promise<CurrentUser | null> {
  const db = getDb();
  const rows = await db
    .select({
      expiresAt: sessions.expiresAt,
      id: users.id,
      name: users.name,
      email: users.email,
      nickname: users.nickname,
      bio: users.bio,
      sysrole: users.sysrole,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const row = rows[0];
  if (!row || row.expiresAt < Date.now()) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    nickname: row.nickname ?? null,
    bio: row.bio ?? null,
    sysrole: (row.sysrole as "admin" | "normal" | undefined) ?? "normal",
  };
}

// Deletes a single session row (logout); other sessions for the same user are unaffected (FR-010, FR-014).
export function deleteSession(sessionId: string): void {
  const db = getDb();
  db.delete(sessions).where(eq(sessions.id, sessionId)).run();
}
