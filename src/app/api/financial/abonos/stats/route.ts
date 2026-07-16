import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { getAbonosStats } from '../../../../../lib/bitrixAbonos';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canViewFinancialModule')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  try {
    const stats = await getAbonosStats();
    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
