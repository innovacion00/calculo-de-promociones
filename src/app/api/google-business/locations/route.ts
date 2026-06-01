import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '../../../../lib/googleBusiness/googleBusinessReviews';
import { listLocations } from '../../../../lib/googleBusiness/googleBusinessClient';
import { logGBPEvent } from '../../../../lib/googleBusiness/googleBusinessAudit';

// GET /api/google-business/locations?accountId=accounts/...
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') ?? '';
  const userName = req.headers.get('x-user-name') ?? '';
  const userEmail = req.headers.get('x-user-email') ?? '';
  const accountId = new URL(req.url).searchParams.get('accountId') ?? '';

  if (!userId) return NextResponse.json({ error: 'Missing x-user-id header' }, { status: 400 });
  if (!accountId) return NextResponse.json({ error: 'Missing accountId parameter' }, { status: 400 });

  try {
    const accessToken = await getValidAccessToken(userId);
    const locations = await listLocations(accessToken, accountId);

    logGBPEvent('google_business_locations_loaded', {
      userId, userName, email: userEmail, status: 'success',
      metadata: { accountId, count: locations.length },
    });

    return NextResponse.json({ locations });
  } catch (e) {
    const msg = String(e);
    logGBPEvent('google_business_locations_loaded', {
      userId, userName, email: userEmail, status: 'error',
      metadata: { accountId, error: msg },
    });

    if (msg.includes('NOT_CONNECTED')) {
      return NextResponse.json({ error: 'no_connection', message: 'No hay conexión activa.' }, { status: 401 });
    }
    if (msg.includes('TOKEN_EXPIRED') || msg.includes('TOKEN_REFRESH_FAILED')) {
      return NextResponse.json({ error: 'token_expired', message: 'La conexión expiró. Vuelve a conectar Google Business Profile.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'unknown', message: `Error al cargar ubicaciones: ${msg}` }, { status: 500 });
  }
}
