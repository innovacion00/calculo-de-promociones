// Mapea una estancia del PMS a un registro de saldo de checkout.
// Port de mapPmsToCheckout de src/app/api/financial/checkouts/route.ts.

/**
 * @typedef {Object} CheckoutBalance
 * @property {string} id
 * @property {string} [hotelId]
 * @property {string} hotelName
 * @property {string} reservationId
 * @property {string} [guestName]
 * @property {string} [checkInDate]
 * @property {string} checkoutDate
 * @property {number} totalAmount
 * @property {number} paidAmount
 * @property {number} pendingBalance
 * @property {'no_balance'|'pending_balance'} balanceStatus
 * @property {string} [paymentMethod]
 * @property {string} [channel]
 * @property {string} [localizador]
 * @property {string} [room]
 */

/**
 * @param {import('./pmsClient.js').PmsStay} stay
 * @param {string} hotelKey
 * @param {number} [valorPagado]
 * @param {string} [formaPago]
 * @returns {CheckoutBalance}
 */
export function mapPmsToCheckout(stay, hotelKey, valorPagado = 0, formaPago) {
  const valorHospedaje = stay.detalleServicios?.reduce((s, d) => s + (d.tarifa ?? 0), 0) ?? 0;
  const rawBalance = Math.max(0, Math.round(valorHospedaje - valorPagado));
  const pendingBalance = rawBalance <= 3 ? 0 : rawBalance;
  const guestName = stay.titular?.[0]?.tercero?.trim() ?? '';

  return {
    id: String(stay.folioId),
    hotelId: hotelKey,
    hotelName: stay.hotel ?? '',
    reservationId: stay.codeReserva ?? String(stay.reservaId),
    guestName: guestName || undefined,
    checkInDate: stay.checkIn?.slice(0, 10),
    checkoutDate: stay.checkOut?.slice(0, 10) ?? '',
    totalAmount: valorHospedaje,
    paidAmount: valorPagado,
    pendingBalance,
    balanceStatus: pendingBalance <= 0 ? 'no_balance' : 'pending_balance',
    channel: stay.canal || undefined,
    localizador: stay.localizador || undefined,
    paymentMethod: formaPago || undefined,
    room: stay.room || undefined,
  };
}
