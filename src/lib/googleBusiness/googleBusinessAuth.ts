/**
 * googleBusinessAuth.ts
 *
 * OAuth 2.0 helpers for Google Business Profile.
 * Server-side only — never import from frontend bundles.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET      ← never exposed to frontend
 *   GOOGLE_REDIRECT_URI       ← must match Google Cloud Console config
 */

const SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'openid',
  'email',
  'profile',
];

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

export interface OAuthError {
  error: string;
  error_description?: string;
}

/**
 * Builds the Google OAuth 2.0 authorization URL.
 * The user is redirected here to grant access.
 */
export function buildAuthUrl(state?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not configured');
  if (!redirectUri) throw new Error('GOOGLE_REDIRECT_URI is not configured');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',      // required to get refresh_token
    prompt: 'consent',           // force consent screen to always get refresh_token
    include_granted_scopes: 'true',
  });
  if (state) params.set('state', state);

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access + refresh tokens.
 * Must be called server-side only.
 */
export async function exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!res.ok) {
    const err: OAuthError = await res.json().catch(() => ({ error: 'unknown' }));
    throw new Error(err.error_description ?? err.error ?? `Token exchange failed (${res.status})`);
  }

  return res.json();
}

/**
 * Refreshes an expired access token using the stored refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!res.ok) {
    const err: OAuthError = await res.json().catch(() => ({ error: 'unknown' }));
    throw new Error(err.error_description ?? err.error ?? `Token refresh failed (${res.status})`);
  }

  return res.json();
}

/**
 * Decodes the id_token (JWT) to extract user email without verifying signature.
 * Acceptable for extracting non-sensitive display data; do NOT use for auth decisions.
 */
export function decodeIdToken(idToken: string): { email?: string; name?: string } {
  try {
    const payload = idToken.split('.')[1];
    const json = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return {};
  }
}
