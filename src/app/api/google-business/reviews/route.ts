import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '../../../../lib/googleBusiness/googleBusinessReviews';
import { listReviews } from '../../../../lib/googleBusiness/googleBusinessClient';
import { logGBPEvent } from '../../../../lib/googleBusiness/googleBusinessAudit';

// GET /api/google-business/reviews?accountId=...&locationId=...&locationName=...
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') ?? '';
  const userName = req.headers.get('x-user-name') ?? '';
  const userEmail = req.headers.get('x-user-email') ?? '';
  const params = new URL(req.url).searchParams;
  const accountId = params.get('accountId') ?? '';
  const locationId = params.get('locationId') ?? '';
  const locationName = params.get('locationName') ?? locationId;

  if (!userId) return NextResponse.json({ error: 'Missing x-user-id header' }, { status: 400 });
  if (!locationId) return NextResponse.json({ error: 'Missing locationId parameter' }, { status: 400 });
  if (!accountId) return NextResponse.json({ error: 'Missing accountId parameter' }, { status: 400 });

  try {
    const accessToken = await getValidAccessToken(userId);
    const result = await listReviews(accessToken, locationId, locationName, accountId);

    logGBPEvent('google_business_reviews_loaded', {
      userId, userName, email: userEmail, status: 'success',
      metadata: { locationId, count: result.reviews.length },
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = String(e);
    logGBPEvent('google_business_reviews_loaded', {
      userId, userName, email: userEmail, status: 'error',
      metadata: { locationId, error: msg },
    });

    if (msg.includes('NOT_CONNECTED')) {
      return NextResponse.json({ error: 'no_connection', message: 'No hay conexión activa.' }, { status: 401 });
    }
    if (msg.includes('TOKEN_EXPIRED') || msg.includes('TOKEN_REFRESH_FAILED')) {
      return NextResponse.json({ error: 'token_expired', message: 'La conexión expiró. Vuelve a conectar Google Business Profile.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'unknown', message: `Error al cargar reseñas: ${msg}` }, { status: 500 });
  }
}
