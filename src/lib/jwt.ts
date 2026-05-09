export interface JwtPayload {
  email?: string;
  sub?: string;
  aud?: string | string[];
  iss?: string;
  iat?: number;
  exp?: number;
  name?: string;
  groups?: string[];
  country?: string;
  [key: string]: unknown;
}

export function parseJwtPayload(jwt: string): JwtPayload | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}
