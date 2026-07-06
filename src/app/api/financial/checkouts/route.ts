import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/session';
import { fetchAllPmsStays, enrichStaysWithPayments, type PmsStay } from '../../../../lib/pms/client';

export type CheckoutBalanceStatus =
  | 'no_balance'
  | 'pending_balance'
  | 'under_investigation'
  | 'collection_requested'
  | 'paid'
  | 'adjusted'
  | 'uncollectable';

export interface CheckoutBalance {
  id: string;
  hotelId?: string;
  hotelName: string;
  companyName?: string;
  reservationId: string;
  guestName?: string;
  checkInDate?: string;
  checkoutDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingBalance: number;
  balanceStatus: CheckoutBalanceStatus;
  paymentMethod?: string;
  channel?: string;
  localizador?: string;
  room?: string;
}

export function mapPmsToCheckout(
  stay: PmsStay,
  hotelKey: string,
  valorPagado: number = 0,
  formaPago?: string,
): CheckoutBalance {
  const valorHospedaje = stay.detalleServicios?.reduce((s, d) => s + (d.tarifa ?? 0), 0) ?? 0;
  const rawBalance = Math.max(0, Math.round(valorHospedaje - valorPagado));
  const pendingBalance = rawBalance <= 3 ? 0 : rawBalance;
  const guestName      = stay.titular?.[0]?.tercero?.trim() ?? '';

  return {
    id:             String(stay.folioId),
    hotelId:        hotelKey,
    hotelName:      stay.hotel ?? '',
    reservationId:  stay.codeReserva ?? String(stay.reservaId),
    guestName:      guestName || undefined,
    checkInDate:    stay.checkIn?.slice(0, 10),
    checkoutDate:   stay.checkOut?.slice(0, 10) ?? '',
    totalAmount:    valorHospedaje,
    paidAmount:     valorPagado,
    pendingBalance,
    balanceStatus:  pendingBalance <= 0 ? 'no_balance' : 'pending_balance',
    channel:        stay.canal || undefined,
    localizador:    stay.localizador || undefined,
    paymentMethod:  formaPago || undefined,
    room:           stay.room || undefined,
  };
}

async function fetchCheckoutsFromSource(params: {
  hotelName?: string;
  checkoutDate?: string;
  search?: string;
  channel?: string;
  page: number;
  pageSize: number;
}): Promise<{ data: CheckoutBalance[]; total: number }> {
  const targetDate = params.checkoutDate ?? new Date().toISOString().slice(0, 10);

  const allStays = await fetchAllPmsStays({
    hotelName:    params.hotelName,
    checkoutDate: targetDate,
  });

  // Filter by checkOut date before fetching payments to minimize API calls
  const filtered = allStays.filter(({ stay }) => stay.checkOut?.startsWith(targetDate));

  // Fetch payment data for each filtered stay
  const enriched = await enrichStaysWithPayments(filtered);

  let records = enriched.map(({ stay, hotelKey, valorPagado, formaPago }) =>
    mapPmsToCheckout(stay, hotelKey, valorPagado, formaPago)
  );

  if (params.search) {
    const q = params.search.toLowerCase();
    records = records.filter(r =>
      r.reservationId.toLowerCase().includes(q) ||
      (r.guestName ?? '').toLowerCase().includes(q) ||
      r.hotelName.toLowerCase().includes(q)
    );
  }

  if (params.channel) {
    records = records.filter(r => r.channel === params.channel);
  }

  records.sort((a, b) => {
    const numA = parseInt((a.room ?? '').match(/\d+/)?.[0] ?? '', 10);
    const numB = parseInt((b.room ?? '').match(/\d+/)?.[0] ?? '', 10);
    if (isNaN(numA) && isNaN(numB)) return (a.room ?? '').localeCompare(b.room ?? '');
    if (isNaN(numA)) return 1;
    if (isNaN(numB)) return -1;
    if (numA !== numB) return numA - numB;
    return (a.room ?? '').localeCompare(b.room ?? '');
  });

  const total = records.length;
  const start = (params.page - 1) * params.pageSize;
  return { data: records.slice(start, start + params.pageSize), total };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canViewCheckoutBalances')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  try {
    const result = await fetchCheckoutsFromSource({
      hotelName:    sp.get('hotelName')    ?? undefined,
      checkoutDate: sp.get('checkoutDate') ?? undefined,
      search:       sp.get('search')       ?? undefined,
      channel:      sp.get('channel')      ?? undefined,
      page:         sp.get('page')     ? Number(sp.get('page'))     : 1,
      pageSize:     sp.get('pageSize') ? Number(sp.get('pageSize')) : 18,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
