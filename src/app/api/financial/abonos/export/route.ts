import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { listAbonos } from '../../../../../lib/bitrixAbonos';

function escCsv(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canExportFinancialReports')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;

  try {
    const { data } = await listAbonos({
      hotelName: sp.get('hotelName') ?? undefined,
      bank: sp.get('bank') ?? undefined,
      search: sp.get('search') ?? undefined,
      page: 1,
      pageSize: 10000,
    });

    const headers = ['Nombre', 'Hotel', 'Banco', 'Neto Abonar', 'Causa del Fallo', 'Estado'];

    const rows = data.map(r => [
      r.name ?? '',
      r.hotelName ?? '',
      r.bank ?? '',
      r.netAmount ?? '',
      r.failureReason ?? '',
      r.status ?? '',
    ].map(escCsv).join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');
    const fileName = `abonos_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
