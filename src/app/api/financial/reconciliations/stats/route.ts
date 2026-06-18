import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { getStats } from '../../../../../lib/db/models/financialReconciliation';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canViewFinancialModule')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const hotelId = req.nextUrl.searchParams.get('hotelId') ?? undefined;
  try {
    const stats = await getStats(hotelId);
    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
