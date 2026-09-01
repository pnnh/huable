// Calieo OIDC client (Authorization Code Flow + PKCE) built on oauth4webapi.
// See specs/002-calieo-oauth-login/research.md decision 1 and contracts/calieo-oauth-routes.md.
import * as oauth from "oauth4webapi";

const CALIEO_ISSUER = new URL("https://portal.calieo.xyz");
const SCOPE = "openid email profile";

function getClient(): oauth.Client {
  const clientId = process.env.CALIEO_CLIENT_ID;
  if (!clientId) throw new Error("CALIEO_CLIENT_ID is not configured");
  return { client_id: clientId };
}

function getClientAuth(): oauth.ClientAuth {
  const clientSecret = process.env.CALIEO_CLIENT_SECRET;
  if (!clientSecret) throw new Error("CALIEO_CLIENT_SECRET is not configured");
  return oauth.ClientSecretPost(clientSecret);
}

// Discovery metadata rarely changes; cache it for the lifetime of the isolate.
let cachedAuthorizationServer: oauth.AuthorizationServer | undefined;

async function discoverCalieoIssuer(): Promise<oauth.AuthorizationServer> {
  if (cachedAuthorizationServer) return cachedAuthorizationServer;
  const response = await oauth.discoveryRequest(CALIEO_ISSUER, { algorithm: "oidc" });
  cachedAuthorizationServer = await oauth.processDiscoveryResponse(CALIEO_ISSUER, response);
  return cachedAuthorizationServer;
}

export interface CalieoAuthorizationRequest {
  state: string;
  codeVerifier: string;
  nonce: string;
  authorizationUrl: string;
}

// Builds the Calieo authorization URL and the state/PKCE/nonce values to persist until the callback (FR-001, FR-002).
export async function buildCalieoAuthorizationRequest(
  redirectUri: string
): Promise<CalieoAuthorizationRequest> {
  const as = await discoverCalieoIssuer();
  const client = getClient();
  if (!as.authorization_endpoint) {
    throw new Error("Calieo discovery metadata is missing authorization_endpoint");
  }

  const state = oauth.generateRandomState();
  const nonce = oauth.generateRandomNonce();
  const codeVerifier = oauth.generateRandomCodeVerifier();
  const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);

  const authorizationUrl = new URL(as.authorization_endpoint);
  authorizationUrl.searchParams.set("client_id", client.client_id);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", SCOPE);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("nonce", nonce);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  return { state, codeVerifier, nonce, authorizationUrl: authorizationUrl.toString() };
}

export interface CalieoIdentity {
  email: string;
  name: string;
}

// Validates the `state` parameter against the persisted value (FR-002). Throws on mismatch or an
// authorization error response (e.g. the user denied consent, FR-009).
export async function validateCalieoAuthResponse(
  callbackUrl: URL,
  expectedState: string
): Promise<URLSearchParams> {
  const as = await discoverCalieoIssuer();
  const client = getClient();
  return oauth.validateAuthResponse(as, client, callbackUrl, expectedState);
}

// Exchanges the authorization code for tokens; oauth4webapi validates the ID token as part of
// this call (signature, iss, aud, exp, nonce — FR-004).
export async function requestCalieoTokens(params: {
  callbackParams: URLSearchParams;
  codeVerifier: string;
  expectedNonce: string;
  redirectUri: string;
}): Promise<oauth.TokenEndpointResponse> {
  const as = await discoverCalieoIssuer();
  const client = getClient();
  const clientAuth = getClientAuth();

  const response = await oauth.authorizationCodeGrantRequest(
    as,
    client,
    clientAuth,
    params.callbackParams,
    params.redirectUri,
    params.codeVerifier
  );

  return oauth.processAuthorizationCodeResponse(as, client, response, {
    expectedNonce: params.expectedNonce,
    requireIdToken: true,
  });
}

// Distinguishes an OAuth-protocol-level failure (e.g. expired/already-used authorization code)
// from an ID token validation failure, so the callback route can report the right error code.
export function isCalieoTokenExchangeError(err: unknown): boolean {
  return err instanceof oauth.ResponseBodyError || err instanceof oauth.WWWAuthenticateChallengeError;
}

// Extracts the identity claims (email/name) needed to resolve/create the local user (FR-005).
// Throws if the `email` claim is missing (edge case in spec.md).
export function extractCalieoIdentity(tokenResponse: oauth.TokenEndpointResponse): CalieoIdentity {
  const claims = oauth.getValidatedIdTokenClaims(tokenResponse);
  const email = claims?.email;
  if (typeof email !== "string" || !email) {
    throw new Error("Calieo ID token is missing the email claim");
  }
  const name = typeof claims?.name === "string" && claims.name ? claims.name : email;
  return { email, name };
}

