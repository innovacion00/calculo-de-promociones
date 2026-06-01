import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, decodeIdToken } from '../../../../lib/googleBusiness/googleBusinessAuth';
import { saveTokens } from '../../../../lib/googleBusiness/googleBusinessTokenStorage';
import { logGBPEvent } from '../../../../lib/googleBusiness/googleBusinessAudit';

// GET /api/google-business/callback?code=...&state=...
// Handles the OAuth redirect from Google. Exchanges code for tokens and stores them.
// In production this route should redirect the user to the UI with a success/error message.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');   // encodeURIComponent(userId)
  const error = searchParams.get('error');

  const userId = state ? decodeURIComponent(state) : 'unknown';

  if (error || !code) {
    logGBPEvent('google_business_connect_failed', {
      userId, userName: '', email: '', status: 'error',
      metadata: { googleError: error },
    });
    const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
    return NextResponse.redirect(`${base}/?gbp_error=${encodeURIComponent(error ?? 'access_denied')}`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      // Google only sends refresh_token on first authorization or when prompt=consent is used.
      // If missing, the app was already authorized without refresh_token scope.
      logGBPEvent('google_business_connect_failed', {
        userId, userName: '', email: '', status: 'error',
        metadata: { reason: 'no_refresh_token' },
      });
      const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
      return NextResponse.redirect(`${base}/?gbp_error=no_refresh_token`);
    }

    const idClaims = tokens.id_token ? decodeIdToken(tokens.id_token) : {};

    saveTokens(userId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      connectedEmail: idClaims.email,
      connectedAt: new Date().toISOString(),
      scopes: tokens.scope?.split(' ') ?? [],
      userId,
    });

    logGBPEvent('google_business_connect_success', {
      userId, userName: idClaims.name ?? '', email: idClaims.email ?? '', status: 'success',
      metadata: { scopes: tokens.scope },
    });

    const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
    return NextResponse.redirect(`${base}/?gbp_connected=1`);
  } catch (e) {
    logGBPEvent('google_business_connect_failed', {
      userId, userName: '', email: '', status: 'error',
      metadata: { error: String(e) },
    });
    const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
    return NextResponse.redirect(`${base}/?gbp_error=${encodeURIComponent(String(e))}`);
  }
}
