import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '../../../../lib/googleBusiness/googleBusinessReviews';
import { listAccounts } from '../../../../lib/googleBusiness/googleBusinessClient';
import { logGBPEvent } from '../../../../lib/googleBusiness/googleBusinessAudit';

// GET /api/google-business/accounts
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') ?? '';
  const userName = req.headers.get('x-user-name') ?? '';
  const userEmail = req.headers.get('x-user-email') ?? '';

  if (!userId) return NextResponse.json({ error: 'Missing x-user-id header' }, { status: 400 });

  try {
    const accessToken = await getValidAccessToken(userId);
    const accounts = await listAccounts(accessToken);

    logGBPEvent('google_business_accounts_loaded', {
      userId, userName, email: userEmail, status: 'success',
      metadata: { count: accounts.length },
    });

    return NextResponse.json({ accounts });
  } catch (e) {
    const msg = String(e);
    logGBPEvent('google_business_accounts_loaded', {
      userId, userName, email: userEmail, status: 'error',
      metadata: { error: msg },
    });

    if (msg.includes('NOT_CONNECTED')) {
      return NextResponse.json({ error: 'no_connection', message: 'No hay conexión activa con Google Business Profile.' }, { status: 401 });
    }
    if (msg.includes('TOKEN_EXPIRED') || msg.includes('TOKEN_REFRESH_FAILED')) {
      return NextResponse.json({ error: 'token_expired', message: 'La conexión expiró. Vuelve a conectar Google Business Profile.' }, { status: 401 });
    }
    if (msg.includes('INSUFFICIENT_PERMISSIONS')) {
      return NextResponse.json({ error: 'insufficient_permissions', message: 'Permisos insuficientes. Verifica la configuración OAuth.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'unknown', message: `Error al cargar cuentas: ${msg}` }, { status: 500 });
  }
}
