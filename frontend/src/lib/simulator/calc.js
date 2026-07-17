// Motor de cálculo puro del Simulador de Tarifas. Port de las funciones de cálculo de
// index.html (applySteps, getBaseRates, effectiveDiscounts) — sin mutar globals: reciben
// el `config` del hotel/tipo de habitación activos como parámetro.

/**
 * Aplica una cadena de descuentos sucesivos sobre una tarifa base.
 * @param {number} base
 * @param {number[]} discounts
 * @returns {number[]} [base, tras-descuento-1, tras-descuento-2, ...]
 */
export function applySteps(base, discounts) {
  let v = base;
  const vals = [base];
  for (const d of discounts) { v = v * (1 - d); vals.push(v); }
  return vals;
}

/**
 * Tarifas base por plan (std/nr/min2/min3/...) para un canal, a partir de la tarifa
 * pública ingresada por el usuario.
 * @param {import('./channels.js').Channel} ch
 * @param {number} input
 * @returns {Record<string, number>}
 */
export function getBaseRates(ch, input) {
  const pub = input * ch.factor;
  /** @type {Record<string, number>} */
  const rates = {};
  ch.baseKeys.forEach((key, i) => {
    if (ch.priceTravel && key === 'stdC') rates[key] = pub / 0.75;
    else if (ch.priceTravel && key === 'nrC') rates[key] = (pub * 0.88) / 0.75;
    else rates[key] = pub * /** @type {number} */ (ch.baseFactors[i]);
  });
  return rates;
}

/**
 * @typedef {Object} RoomKeyConfig
 * @property {Record<string, number>} [planPcts]   {`${secId}_${rowIdx}`: pct} para la room-key activa
 * @property {Record<string, number>} [hotelPlanPcts] fallback a nivel hotel (sin room type)
 * @property {Record<string, number>} [paisPcts]   {secId: pct} para la room-key activa
 * @property {Record<string, number>} [hotelPaisPcts] fallback a nivel hotel
 */

/**
 * Devuelve el array de descuentos "efectivo" de una fila, aplicando los overrides de
 * % de plan / % país / % noche guardados en config, igual que effectiveDiscounts() del original.
 * @param {import('./channels.js').PlanRow} row
 * @param {number} promoDisc     promoVal/100 de la sección
 * @param {import('./channels.js').Section} sec
 * @param {number} rowIdx
 * @param {RoomKeyConfig} rk
 * @returns {number[]}
 */
export function effectiveDiscounts(row, promoDisc, sec, rowIdx, rk = {}) {
  const discs = [...row.discounts];
  const idx = row.promoIdx !== undefined ? row.promoIdx : discs.length - 1;
  const key = `${sec._id}_${rowIdx}`;

  if (discs.length > 1) {
    const overridePct = rk.planPcts?.[key] ?? rk.hotelPlanPcts?.[key] ?? row.planPct ?? discs[0] * 100;
    discs[0] = overridePct / 100;
  }

  const paisAdd = row.promoAdd
    ? ((rk.paisPcts?.[sec._id] ?? rk.hotelPaisPcts?.[sec._id] ?? 5) / 100)
    : (row.promoAdd || 0);
  discs[idx] = promoDisc + paisAdd + (row.nocheAdd || 0);
  return discs;
}
