import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { listRecords } from '../../../../../lib/db/models/financialReconciliation';

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
    const { data } = await listRecords({
      hotelId: sp.get('hotelId') ?? undefined,
      status: (sp.get('status') as never) ?? undefined,
      bank: sp.get('bank') ?? undefined,
      cardBrand: sp.get('cardBrand') ?? undefined,
      dateFrom: sp.get('dateFrom') ?? undefined,
      dateTo: sp.get('dateTo') ?? undefined,
      search: sp.get('search') ?? undefined,
      page: 1,
      pageSize: 10000,
    });

    const headers = [
      'Fecha', 'Hotel', 'Razón Social', 'Banco', 'Franquicia',
      'Tipo Operación', 'Nº Confirmación', 'Neto Abonar', 'Estado',
      'Duplicado', 'Inconsistencias', 'Observación',
    ];

    const rows = data.map(r => [
      r.movementDate ?? '',
      r.hotelName ?? '',
      r.companyName ?? '',
      r.bank ?? '',
      r.cardBrand ?? '',
      r.operationType ?? '',
      r.confirmationNumber ?? '',
      r.netAmount ?? '',
      r.reconciledStatus,
      r.duplicateFlag ? 'Sí' : 'No',
      r.inconsistencyFlags.join('; '),
      r.notes ?? '',
    ].map(escCsv).join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');
    const fileName = `conciliaciones_${new Date().toISOString().slice(0, 10)}.csv`;

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
