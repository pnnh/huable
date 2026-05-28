// Dev-mode auth: reads user_id from cookie, falls back to default dev user.
// In production, Cloudflare Zero Trust headers will be used instead.

import { cookies } from 'next/headers';
import { getDb } from '@/db/index';
import { users } from '@/db/schema';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

const DEV_USER: CurrentUser = {
  id: process.env.DEV_USER_ID ?? 'dev-user-001',
  name: process.env.DEV_USER_NAME ?? 'Dev User',
  email: process.env.DEV_USER_EMAIL ?? 'dev@local',
};

// Ensures the user row exists in the local SQLite DB (dev only).
async function ensureUserRow(user: CurrentUser): Promise<void> {
  const db = getDb();
  db.insert(users)
    .values({ id: user.id, name: user.name, email: user.email })
    .onConflictDoNothing()
    .run();
}

// Returns the current user for server components.
// Dev: reads user_id cookie, falls back to DEV_USER.
// Prod hook: read Cloudflare Zero Trust Cf-Access-Authenticated-User-Email header here when needed.
export async function getCurrentUser(): Promise<CurrentUser> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const user = userId ? { id: userId, name: userId, email: `${userId}@local` } : DEV_USER;
  await ensureUserRow(user);
  return user;
}
