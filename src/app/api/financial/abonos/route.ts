import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/session';
import { listAbonos } from '../../../../lib/bitrixAbonos';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canViewFinancialModule')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;

  try {
    const result = await listAbonos({
      hotelName: sp.get('hotelName') ?? undefined,
      bank: sp.get('bank') ?? undefined,
      search: sp.get('search') ?? undefined,
      page: sp.get('page') ? Number(sp.get('page')) : 1,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 18,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
