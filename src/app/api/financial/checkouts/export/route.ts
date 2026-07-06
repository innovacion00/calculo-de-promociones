import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { fetchAllPmsStays, enrichStaysWithPayments } from '../../../../../lib/pms/client';
import { mapPmsToCheckout } from '../route';

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
  const checkoutDate = sp.get('checkoutDate') ?? new Date().toISOString().slice(0, 10);

  try {
    const allStays = await fetchAllPmsStays({
      hotelName: sp.get('hotelName') ?? undefined,
      checkoutDate,
    });

    const filtered = allStays.filter(({ stay }) => stay.checkOut?.startsWith(checkoutDate));
    const enriched = await enrichStaysWithPayments(filtered);

    let records = enriched.map(({ stay, hotelKey, valorPagado, formaPago }) =>
      mapPmsToCheckout(stay, hotelKey, valorPagado, formaPago)
    );

    const search = sp.get('search');
    if (search) {
      const q = search.toLowerCase();
      records = records.filter(r =>
        r.reservationId.toLowerCase().includes(q) ||
        (r.guestName ?? '').toLowerCase().includes(q) ||
        r.hotelName.toLowerCase().includes(q)
      );
    }

    const channel = sp.get('channel');
    if (channel) {
      records = records.filter(r => r.channel === channel);
    }

    const headers = [
      'Fecha Checkout', 'Hotel', 'Reserva', 'Localizador', 'Huésped',
      'Check-in', 'Valor Hospedaje', 'Valor Pagado', 'Saldo Pendiente',
      'Método de Pago', 'Canal',
    ];

    const rows = records.map(r => [
      r.checkoutDate,
      r.hotelName,
      r.reservationId,
      r.localizador ?? '',
      r.guestName ?? '',
      r.checkInDate ?? '',
      r.totalAmount,
      r.paidAmount,
      r.pendingBalance,
      r.paymentMethod ?? '',
      r.channel ?? '',
    ].map(escCsv).join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');
    const fileName = `saldos_pendientes_${checkoutDate}.csv`;

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
