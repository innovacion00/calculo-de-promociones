import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { fetchAllPmsStays, enrichStaysWithPayments } from '../../../../../lib/pms/client';
import { mapPmsToCheckout } from '../route';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canViewCheckoutBalances')) {
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

    const all = enriched.map(({ stay, hotelKey, valorPagado, formaPago }) =>
      mapPmsToCheckout(stay, hotelKey, valorPagado, formaPago)
    );

    const withBalance        = all.filter(r => r.pendingBalance > 0).length;
    const noBalance          = all.length - withBalance;
    const totalPendingAmount = all.reduce((acc, r) => acc + r.pendingBalance, 0);
    const avgPendingAmount   = withBalance > 0 ? totalPendingAmount / withBalance : 0;

    const byHotel: Record<string, number> = {};
    for (const r of all) {
      if (r.pendingBalance > 0) byHotel[r.hotelName] = (byHotel[r.hotelName] ?? 0) + r.pendingBalance;
    }
    const hotelWithMostBalance = Object.keys(byHotel).length > 0
      ? Object.entries(byHotel).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    return NextResponse.json({
      ok: true,
      stats: {
        total: all.length,
        noBalance,
        withBalance,
        totalPendingAmount,
        avgPendingAmount,
        underInvestigation:  0,
        collectionRequested: 0,
        hotelWithMostBalance,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
