import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { getDb } from '../../../../../lib/db/mongodb';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canViewFinancialModule')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }
  const db = await getDb();
  const col = db.collection('financial_reconciliations');
  const notEmpty = { $nin: [null, '', undefined] };
  const [hotels, banks, brands] = await Promise.all([
    col.distinct('hotelName', { hotelName: notEmpty }),
    col.distinct('bank',      { bank: notEmpty }),
    col.distinct('cardBrand', { cardBrand: notEmpty }),
  ]);
  return NextResponse.json({
    ok: true,
    hotels: (hotels as string[]).filter(Boolean).sort(),
    banks:  (banks  as string[]).filter(Boolean).sort(),
    brands: (brands as string[]).filter(Boolean).sort(),
  });
}
