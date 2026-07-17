// Controladores de Saldos Pendientes / Checkouts (live desde el PMS).
// Port de src/app/api/financial/checkouts/*.

import { fetchAllPmsStays, enrichStaysWithPayments, getHotelsWithIp } from './lib/pmsClient.js';
import { mapPmsToCheckout } from './lib/checkoutMapper.js';
import { sendCsv } from './lib/csv.js';

/**
 * GET /api/financial/checkouts/hotels — hoteles con IP configurada (consultables).
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export function getCheckoutHotels(_req, res) {
  res.json({ ok: true, hotels: getHotelsWithIp() });
}

/**
 * Trae y arma los checkouts desde el PMS aplicando filtros. Port de fetchCheckoutsFromSource.
 * @param {{ hotelName?: string, checkoutDate?: string, search?: string, channel?: string, page: number, pageSize: number }} params
 * @returns {Promise<{ data: import('./lib/checkoutMapper.js').CheckoutBalance[], total: number }>}
 */
async function fetchCheckoutsFromSource(params) {
  const targetDate = params.checkoutDate ?? new Date().toISOString().slice(0, 10);

  const allStays = await fetchAllPmsStays({ hotelName: params.hotelName, checkoutDate: targetDate });
  const filtered = allStays.filter(({ stay }) => stay.checkOut?.startsWith(targetDate));
  const enriched = await enrichStaysWithPayments(filtered);

  let records = enriched.map(({ stay, hotelKey, valorPagado, formaPago }) =>
    mapPmsToCheckout(stay, hotelKey, valorPagado, formaPago));

  if (params.search) {
    const q = params.search.toLowerCase();
    records = records.filter((r) =>
      r.reservationId.toLowerCase().includes(q) ||
      (r.guestName ?? '').toLowerCase().includes(q) ||
      r.hotelName.toLowerCase().includes(q));
  }
  if (params.channel) {
    records = records.filter((r) => r.channel === params.channel);
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

/**
 * GET /api/financial/checkouts
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function getCheckouts(req, res) {
  const sp = req.query;
  const result = await fetchCheckoutsFromSource({
    hotelName: sp.hotelName ? String(sp.hotelName) : undefined,
    checkoutDate: sp.checkoutDate ? String(sp.checkoutDate) : undefined,
    search: sp.search ? String(sp.search) : undefined,
    channel: sp.channel ? String(sp.channel) : undefined,
    page: sp.page ? Number(sp.page) : 1,
    pageSize: sp.pageSize ? Number(sp.pageSize) : 18,
  });
  res.json({ ok: true, ...result });
}

/**
 * GET /api/financial/checkouts/stats
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function getCheckoutsStats(req, res) {
  const sp = req.query;
  const checkoutDate = sp.checkoutDate ? String(sp.checkoutDate) : new Date().toISOString().slice(0, 10);

  const allStays = await fetchAllPmsStays({
    hotelName: sp.hotelName ? String(sp.hotelName) : undefined,
    checkoutDate,
  });
  const filteredByCheckout = allStays.filter(({ stay }) => stay.checkOut?.startsWith(checkoutDate));
  const enriched = await enrichStaysWithPayments(filteredByCheckout);
  const all = enriched.map(({ stay, hotelKey, valorPagado, formaPago }) =>
    mapPmsToCheckout(stay, hotelKey, valorPagado, formaPago));

  const channels = Array.from(new Set(all.map((r) => r.channel).filter((c) => !!c))).sort();

  const channelFilter = sp.channel ? String(sp.channel) : null;
  const filtered = channelFilter ? all.filter((r) => r.channel === channelFilter) : all;

  const withBalance = filtered.filter((r) => r.pendingBalance > 0).length;
  const noBalance = filtered.length - withBalance;
  const totalPendingAmount = filtered.reduce((acc, r) => acc + r.pendingBalance, 0);
  const avgPendingAmount = withBalance > 0 ? totalPendingAmount / withBalance : 0;

  /** @type {Record<string, number>} */
  const byHotel = {};
  for (const r of filtered) {
    if (r.pendingBalance > 0) byHotel[r.hotelName] = (byHotel[r.hotelName] ?? 0) + r.pendingBalance;
  }
  const hotelWithMostBalance = Object.keys(byHotel).length > 0
    ? Object.entries(byHotel).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  res.json({
    ok: true,
    stats: {
      total: filtered.length,
      noBalance,
      withBalance,
      totalPendingAmount,
      avgPendingAmount,
      underInvestigation: 0,
      collectionRequested: 0,
      hotelWithMostBalance,
      channels,
    },
  });
}

/**
 * GET /api/financial/checkouts/export
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function exportCheckouts(req, res) {
  const sp = req.query;
  const checkoutDate = sp.checkoutDate ? String(sp.checkoutDate) : new Date().toISOString().slice(0, 10);

  const allStays = await fetchAllPmsStays({
    hotelName: sp.hotelName ? String(sp.hotelName) : undefined,
    checkoutDate,
  });
  const filtered = allStays.filter(({ stay }) => stay.checkOut?.startsWith(checkoutDate));
  const enriched = await enrichStaysWithPayments(filtered);

  let records = enriched.map(({ stay, hotelKey, valorPagado, formaPago }) =>
    mapPmsToCheckout(stay, hotelKey, valorPagado, formaPago));

  if (sp.search) {
    const q = String(sp.search).toLowerCase();
    records = records.filter((r) =>
      r.reservationId.toLowerCase().includes(q) ||
      (r.guestName ?? '').toLowerCase().includes(q) ||
      r.hotelName.toLowerCase().includes(q));
  }
  if (sp.channel) {
    records = records.filter((r) => r.channel === String(sp.channel));
  }

  const headers = [
    'Fecha Checkout', 'Hotel', 'Reserva', 'Localizador', 'Huésped',
    'Check-in', 'Valor Hospedaje', 'Valor Pagado', 'Saldo Pendiente', 'Método de Pago', 'Canal',
  ];
  const rows = records.map((r) => [
    r.checkoutDate, r.hotelName, r.reservationId, r.localizador ?? '', r.guestName ?? '',
    r.checkInDate ?? '', r.totalAmount, r.paidAmount, r.pendingBalance, r.paymentMethod ?? '', r.channel ?? '',
  ]);
  sendCsv(res, headers, rows, `saldos_pendientes_${checkoutDate}.csv`);
}
