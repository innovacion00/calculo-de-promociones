import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl } from '../../../../lib/googleBusiness/googleBusinessAuth';
import { logGBPEvent } from '../../../../lib/googleBusiness/googleBusinessAudit';

// GET /api/google-business/auth-url
// Returns the OAuth authorization URL. State encodes userId for callback correlation.
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') ?? 'unknown';
  const userName = req.headers.get('x-user-name') ?? '';
  const userEmail = req.headers.get('x-user-email') ?? '';

  try {
    const url = buildAuthUrl(encodeURIComponent(userId));
    logGBPEvent('google_business_connect_started', {
      userId, userName, email: userEmail, status: 'info',
    });
    return NextResponse.json({ url });
  } catch (e) {
    logGBPEvent('google_business_connect_failed', {
      userId, userName, email: userEmail, status: 'error',
      metadata: { error: String(e) },
    });
    return NextResponse.json(
      { error: 'No se pudo generar la URL de autorización. Verifica GOOGLE_CLIENT_ID y GOOGLE_REDIRECT_URI.' },
      { status: 500 }
    );
  }
}
