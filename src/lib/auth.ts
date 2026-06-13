// Auth: In production, reads user identity from Cloudflare Zero Trust JWT header.
// In dev, reads user_id cookie (legacy) or dev_user_email/dev_user_name cookies (set by /signin),
// falls back to DEV_USER_* env vars.

import { cookies, headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/index';
import { users, createId } from '@/db/schema';
import { parseJwtPayload } from '@/lib/jwt';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  nickname: string | null;
  bio: string | null;
  sysrole: "admin" | "normal";
}

const DEV_USER_BASE = {
  id: process.env.DEV_USER_ID ?? 'dev-user-001',
  name: process.env.DEV_USER_NAME ?? 'Dev User',
  email: process.env.DEV_USER_EMAIL ?? 'dev@local',
};

// Ensures the user row exists in the DB (dev or prod).
// For brand new users (first login), the internal id is generated via createId()
// (base58-encoded uuidv7, consistent with notes/channels/note_attachments).
// Returning users are matched by their unique email so they keep the same internal id.
async function ensureUserRow(proposedId: string, name: string, email: string): Promise<CurrentUser> {
  const db = getDb();

  // Lookup by email first (email is unique and serves as the stable identity from login provider).
  let rows = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (rows.length === 0) {
    // First time seeing this user: generate an opaque id exactly like notes etc.
    const newId = createId();
    db.insert(users)
      .values({ id: newId, name, email })
      .onConflictDoNothing()
      .run();
    rows = await db.select().from(users).where(eq(users.id, newId)).limit(1);
  }

  if (rows.length > 0) {
    const row = rows[0];
    let role = (row.sysrole as "admin" | "normal" | undefined) ?? "normal";
    if (role === "normal") {
      // Bootstrap: promote the first user who logs in if there are no admins yet.
      const existingAdmins = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.sysrole, "admin"))
        .limit(1);
      if (existingAdmins.length === 0) {
        db.update(users).set({ sysrole: "admin" }).where(eq(users.id, row.id)).run();
        role = "admin";
      }
    }
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      nickname: row.nickname ?? null,
      bio: row.bio ?? null,
      sysrole: role,
    };
  }

  // Extremely rare fallback (should not normally happen): still generate proper id.
  const fallbackId = createId();
  return { id: fallbackId, name, email, nickname: null, bio: null, sysrole: "normal" };
}

// Returns the current user for server components.
// Prod: reads CF-Access-Jwt-Assertion header set by Cloudflare Zero Trust.
// Dev: reads dev_user_email (preferred for signin) or user_id cookie, falls back to DEV_USER_*.
export async function getCurrentUser(): Promise<CurrentUser> {
  const headerStore = await headers();
  const cfJwt = headerStore.get('CF-Access-Jwt-Assertion');
  if (cfJwt) {
    const payload = parseJwtPayload(cfJwt);
    if (payload) {
      const id = payload.sub ?? payload.email ?? 'unknown';
      const email = payload.email ?? `${id}@unknown`;
      const name = payload.name ?? email;
      return ensureUserRow(id, name, email);
    }
  }

  const cookieStore = await cookies();
  // Preferred: dev sign-in via /[lang]/signin sets these (supports arbitrary email)
  const devEmail = cookieStore.get('dev_user_email')?.value;
  if (devEmail) {
    const devName = cookieStore.get('dev_user_name')?.value || devEmail.split('@')[0] || devEmail;
    return ensureUserRow(devEmail, devName, devEmail);
  }
  // Legacy cookie support (user_id as id, forces email to id@local)
  const userId = cookieStore.get('user_id')?.value;
  const base = userId
    ? { id: userId, name: userId, email: `${userId}@local` }
    : DEV_USER_BASE;
  return ensureUserRow(base.id, base.name, base.email);
}

// Returns whether the request has a real authenticated identity (JWT in prod, or dev login cookie).
// Used by console guard: in dev, absence of login cookie means redirect to /signin (instead of fallback dev user).
export async function isAuthenticated(): Promise<boolean> {
  const headerStore = await headers();
  const cfJwt = headerStore.get('CF-Access-Jwt-Assertion');
  if (cfJwt) {
    const payload = parseJwtPayload(cfJwt);
    if (payload) return true;
  }
  if (process.env.NODE_ENV === 'development') {
    const cookieStore = await cookies();
    const hasLogin = !!(cookieStore.get('user_id')?.value || cookieStore.get('dev_user_email')?.value);
    return hasLogin;
  }
  return false;
}
