import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { getHotelOptions, getBankOptions } from '../../../../../lib/bitrixReconciliations';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canViewFinancialModule')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }
  return NextResponse.json({
    ok: true,
    hotels: getHotelOptions(),
    banks: getBankOptions(),
  });
}
