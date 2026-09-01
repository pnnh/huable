// GET /api/auth/calieo/callback — validates the Calieo response, exchanges tokens, and
// establishes a server-side session (FR-002..FR-006, FR-009, FR-011, FR-015).
// See specs/002-calieo-oauth-login/contracts/calieo-oauth-routes.md.
import { NextRequest, NextResponse } from "next/server";
import {
  validateCalieoAuthResponse,
  requestCalieoTokens,
  extractCalieoIdentity,
  isCalieoTokenExchangeError,
} from "@/lib/calieo";
import { ensureUserRow } from "@/lib/auth";
import { createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { isValidLang, defaultLanguage } from "@/lib/language";

export const runtime = "nodejs";

const STATE_COOKIE_NAME = "calieo_oauth_state";

interface StateCookiePayload {
  state: string;
  codeVerifier: string;
  nonce: string;
  lang: string;
}

function parseStateCookie(raw: string | undefined): StateCookiePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StateCookiePayload>;
    if (!parsed.state || !parsed.codeVerifier || !parsed.nonce) return null;
    return {
      state: parsed.state,
      codeVerifier: parsed.codeVerifier,
      nonce: parsed.nonce,
      lang: typeof parsed.lang === "string" ? parsed.lang : defaultLanguage,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || url.origin;
  const payload = parseStateCookie(req.cookies.get(STATE_COOKIE_NAME)?.value);
  const lang = payload && isValidLang(payload.lang) ? payload.lang : defaultLanguage;

  function fail(errorCode: string, logMessage: string, extra?: Record<string, unknown>) {
    console.warn(`[auth] calieo callback rejected: ${logMessage}`, extra);
    const response = NextResponse.redirect(new URL(`/${lang}/signin?error=${errorCode}`, baseUrl));
    response.cookies.delete(STATE_COOKIE_NAME);
    return response;
  }

  if (url.searchParams.get("error")) {
    return fail("access_denied", "authorization denied by user", {
      error: url.searchParams.get("error"),
    });
  }

  if (!payload) {
    return fail("invalid_state", "missing or malformed oauth state cookie");
  }

  let callbackParams: URLSearchParams;
  try {
    callbackParams = await validateCalieoAuthResponse(url, payload.state);
  } catch (err) {
    return fail("invalid_state", "state/PKCE validation failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const redirectUri = new URL("/api/auth/calieo/callback", baseUrl).toString();

  let tokenResponse;
  try {
    tokenResponse = await requestCalieoTokens({
      callbackParams,
      codeVerifier: payload.codeVerifier,
      expectedNonce: payload.nonce,
      redirectUri,
    });
  } catch (err) {
    const errorCode = isCalieoTokenExchangeError(err) ? "token_exchange_failed" : "invalid_id_token";
    return fail(errorCode, "token exchange or id token validation failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  let identity;
  try {
    identity = extractCalieoIdentity(tokenResponse);
  } catch (err) {
    return fail("missing_email", "id token missing email claim", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const user = await ensureUserRow(identity.email, identity.name, identity.email);
  const sessionId = createSession(user.id);
  console.info("[auth] calieo login success", { userId: user.id, sessionId });

  const response = NextResponse.redirect(new URL(`/${lang}/console`, baseUrl));
  response.cookies.delete(STATE_COOKIE_NAME);
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
