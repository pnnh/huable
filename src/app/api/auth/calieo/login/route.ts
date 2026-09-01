// GET /api/auth/calieo/login — initiates the Calieo Authorization Code Flow + PKCE (FR-001, FR-002).
// See specs/002-calieo-oauth-login/contracts/calieo-oauth-routes.md.
import { NextRequest, NextResponse } from "next/server";
import { buildCalieoAuthorizationRequest } from "@/lib/calieo";
import { isValidLang, defaultLanguage } from "@/lib/language";

export const runtime = "nodejs";

const STATE_COOKIE_NAME = "calieo_oauth_state";
const STATE_COOKIE_MAX_AGE = 10 * 60; // 10 minutes, just enough to complete the redirect round trip

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const rawLang = searchParams.get("lang") ?? "";
  const lang = isValidLang(rawLang) ? rawLang : defaultLanguage;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin;
  const redirectUri = new URL("/api/auth/calieo/callback", baseUrl).toString();

  try {
    const { state, codeVerifier, nonce, authorizationUrl } =
      await buildCalieoAuthorizationRequest(redirectUri);

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(
      STATE_COOKIE_NAME,
      JSON.stringify({ state, codeVerifier, nonce, lang }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "lax",
        path: "/",
        maxAge: STATE_COOKIE_MAX_AGE,
      }
    );
    return response;
  } catch (err) {
    console.warn("[auth] calieo login unavailable", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(new URL(`/${lang}/signin?error=calieo_unavailable`, baseUrl));
  }
}
