// Dev-mode auth: reads user_id from cookie, falls back to default dev user.
// In production, Cloudflare Zero Trust headers will be used instead.

import { cookies } from 'next/headers';

export interface CurrentUser {
  id: string;
  name: string;
}

const DEV_USER: CurrentUser = {
  id: process.env.DEV_USER_ID ?? 'dev-user-001',
  name: process.env.DEV_USER_NAME ?? 'Dev User',
};

// Returns the current user for server components.
// Dev: reads user_id cookie, falls back to DEV_USER.
// Prod hook: read Cloudflare Zero Trust Cf-Access-Authenticated-User-Email header here when needed.
export async function getCurrentUser(): Promise<CurrentUser> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  if (userId) {
    return { id: userId, name: userId };
  }
  return DEV_USER;
}
