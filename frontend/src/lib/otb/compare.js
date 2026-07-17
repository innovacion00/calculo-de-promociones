// Comparativa OTB (modo "misma fecha de estancia"). Port de compareOTBExact +
// buildPickupRow + buildSummaryMetrics de index.html. Funciones puras: inventory y
// afterSummary se pasan por parámetro (antes venían de OTB_STATE).

/**
 * @param {number|null} pp
 * @returns {string}
 */
export function pickupStatus(pp) {
  if (pp === null || pp === undefined) return 'unknown';
  if (pp > 5) return 'strong-up';
  if (pp > 0) return 'moderate-up';
  if (pp === 0) return 'stable';
  if (pp >= -5) return 'moderate-down';
  return 'strong-down';
}

export const PICKUP_LABEL = {
  'strong-up': '⬆ Pickup fuerte', 'moderate-up': '↑ Pickup moderado', 'stable': '⚫ Estable',
  'moderate-down': '↓ Caída moderada', 'strong-down': '⬇ Caída fuerte', 'unknown': '— Sin dato',
};

/**
 * Construye una fila de pickup comparando corte base vs actual para una fecha.
 * @param {number} dayNum
 * @param {import('./parseExcel.js').OtbRow|null} bRow
 * @param {import('./parseExcel.js').OtbRow|null} aRow
 * @param {number|null} inventory
 * @param {number|null} daysBetween
 */
function buildPickupRow(dayNum, bRow, aRow, inventory, daysBetween) {
  const occB = bRow && bRow.occ !== null ? Number(bRow.occ) : null;
  const occA = aRow && aRow.occ !== null ? Number(aRow.occ) : null;
  let pickup = (occB !== null && occA !== null) ? occA - occB : null;

  const roomsB = bRow && bRow.rooms !== null ? Number(bRow.rooms)
    : (occB !== null && inventory) ? Math.round((occB / 100) * inventory) : null;
  const roomsA = aRow && aRow.rooms !== null ? Number(aRow.rooms)
    : (occA !== null && inventory) ? Math.round((occA / 100) * inventory) : null;

  const roomPickup = (roomsB !== null && roomsA !== null) ? roomsA - roomsB : null;
  if (pickup === null && roomPickup !== null && inventory) pickup = (roomPickup / inventory) * 100;

  const pctChange = (pickup !== null && occB) ? (pickup / occB) * 100 : null;
  const velocityHabs = (roomPickup !== null && daysBetween && daysBetween > 0) ? roomPickup / daysBetween : null;
  const velocityPP = (pickup !== null && daysBetween && daysBetween > 0) ? pickup / daysBetween : null;

  return {
    day: dayNum,
    stayDate: bRow ? bRow.date : (aRow ? aRow.date : ''),
    beforeDate: bRow ? bRow.date : '—',
    afterDate: aRow ? aRow.date : '—',
    occBefore: occB, occAfter: occA,
    pickup, pctChange, status: pickupStatus(pickup),
    roomsBefore: roomsB, roomsAfter: roomsA, roomPickup,
    totalesBefore: bRow ? bRow.totales : null, totalesAfter: aRow ? aRow.totales : null,
    velocityHabs, velocityPP,
    adrBefore: bRow ? bRow.adr : null, adrAfter: aRow ? aRow.adr : null,
    revparBefore: bRow ? bRow.revpar : null, revparAfter: aRow ? aRow.revpar : null,
  };
}

/**
 * Compara por fecha exacta de estancia.
 * @param {import('./parseExcel.js').OtbRow[]} before
 * @param {import('./parseExcel.js').OtbRow[]} after
 * @param {number|null} inventory
 * @param {number|null} daysBetween
 */
export function compareOTBExact(before, after, inventory, daysBetween) {
  const bMap = {}, aMap = {};
  before.forEach((r) => { if (r.date) bMap[r.date] = r; });
  after.forEach((r) => { if (r.date) aMap[r.date] = r; });
  const allDates = Object.keys({ ...bMap, ...aMap }).sort();
  return allDates.map((date, i) => buildPickupRow(i + 1, bMap[date] || null, aMap[date] || null, inventory, daysBetween));
}

/**
 * Métricas resumen a partir de las filas de comparación.
 * @param {ReturnType<typeof compareOTBExact>} rows
 * @param {{ occ?: number|null, adr?: number|null, revpar?: number|null }|null} afterSummary
 * @param {{ occ?: number|null, adr?: number|null, revpar?: number|null }|null} [beforeSummary]
 */
export function buildSummaryMetrics(rows, afterSummary, beforeSummary) {
  const valid = rows.filter((r) => r.pickup !== null);
  const count = (s) => rows.filter((r) => r.status === s).length;
  const strongUp = count('strong-up'), modUp = count('moderate-up'), stable = count('stable'), modDown = count('moderate-down'), strongDown = count('strong-down');
  const up = strongUp + modUp;
  const down = modDown + strongDown;
  const avgPickup = valid.length ? valid.reduce((s, r) => s + r.pickup, 0) / valid.length : null;
  const bestDay = valid.length ? valid.reduce((a, b) => (b.pickup > a.pickup ? b : a)) : null;
  const worstDay = valid.length ? valid.reduce((a, b) => (b.pickup < a.pickup ? b : a)) : null;
  const totalRoomPickup = rows.reduce((s, r) => s + (r.roomPickup || 0), 0);
  const hasRooms = rows.some((r) => r.roomPickup !== null && r.roomPickup !== undefined);

  const vRows = valid.filter((r) => r.velocityHabs !== null && r.velocityHabs !== undefined);
  const avgVelocityHabs = vRows.length ? vRows.reduce((s, r) => s + r.velocityHabs, 0) / vRows.length : null;

  const roomRows = valid.filter((r) => r.roomPickup !== null && r.roomPickup !== undefined);
  const bestRoomDay = roomRows.length ? roomRows.reduce((a, b) => (b.roomPickup > a.roomPickup ? b : a)) : null;
  const worstRoomDay = roomRows.length ? roomRows.reduce((a, b) => (b.roomPickup < a.roomPickup ? b : a)) : null;

  let general;
  if (up > down && avgPickup > 0) general = 'Positivo';
  else if (down > up && avgPickup < 0) general = 'Negativo';
  else if (up > 0 && down > 0) general = 'Mixto';
  else general = 'Estable';

  const avgAfter = (key) => {
    const vals = rows.map((r) => r[key]).filter((v) => v !== null && v !== undefined);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };
  const pick = (sumKey, rowKey) => (afterSummary && afterSummary[sumKey] != null ? afterSummary[sumKey] : avgAfter(rowKey));

  // Ocupación/ADR/RevPAR del corte base, para colorear la variación frente al corte actual.
  const avgBefore = (key) => {
    const vals = rows.map((r) => r[key]).filter((v) => v !== null && v !== undefined);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };
  const pickBefore = (sumKey, rowKey) => (beforeSummary && beforeSummary[sumKey] != null ? beforeSummary[sumKey] : avgBefore(rowKey));

  return {
    total: rows.length, up, down, stable,
    strongUp, moderateUp: modUp, moderateDown: modDown, strongDown,
    avgPickup, totalRoomPickup, general,
    avgOcc: pick('occ', 'occAfter'), avgAdr: pick('adr', 'adrAfter'), avgRevpar: pick('revpar', 'revparAfter'),
    avgOccBefore: pickBefore('occ', 'occBefore'), avgAdrBefore: pickBefore('adr', 'adrBefore'), avgRevparBefore: pickBefore('revpar', 'revparBefore'),
    bestDay, worstDay,
    hasRooms, avgVelocityHabs, bestRoomDay, worstRoomDay,
  };
}

const WEEK_DEFS = [
  { key: 'week1', label: 'Semana 1 (1–7)' },
  { key: 'week2', label: 'Semana 2 (8–14)' },
  { key: 'week3', label: 'Semana 3 (15–21)' },
  { key: 'week4', label: 'Semana 4 (22–28)' },
  { key: 'week5', label: 'Semana 5 (29+)' },
];

/** Agrupa filas de un corte por semana calendario del mes (1–7, 8–14, 15–21, 22–28, 29+). */
function groupByWeek(rows) {
  const weeks = { week1: [], week2: [], week3: [], week4: [], week5: [] };
  rows.forEach((r) => {
    const day = r.dayOfMonth || (r.date ? Number(r.date.slice(8, 10)) : null);
    if (!day) return;
    if (day <= 7) weeks.week1.push(r);
    else if (day <= 14) weeks.week2.push(r);
    else if (day <= 21) weeks.week3.push(r);
    else if (day <= 28) weeks.week4.push(r);
    else weeks.week5.push(r);
  });
  return weeks;
}

const avgOf = (rows, key) => {
  const vals = rows.map((r) => r[key]).filter((v) => v !== null && v !== undefined);
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
};
const sumOf = (rows, key) => {
  const vals = rows.map((r) => r[key]).filter((v) => v !== null && v !== undefined);
  return vals.length ? vals.reduce((s, v) => s + v, 0) : null;
};

/**
 * Compara dos cortes agrupando por semana calendario (1–7, 8–14, 15–21, 22–28, 29+).
 * @param {import('./parseExcel.js').OtbRow[]} bRows
 * @param {import('./parseExcel.js').OtbRow[]} aRows
 */
export function compareWeekly(bRows, aRows) {
  const bWeeks = groupByWeek(bRows || []);
  const aWeeks = groupByWeek(aRows || []);
  const result = [];
  WEEK_DEFS.forEach((wd, idx) => {
    const bWk = bWeeks[wd.key] || [];
    const aWk = aWeeks[wd.key] || [];
    if (!bWk.length && !aWk.length) return;
    const beforeAvgOcc = avgOf(bWk, 'occ');
    const afterAvgOcc = avgOf(aWk, 'occ');
    const avgPickup = (beforeAvgOcc !== null && afterAvgOcc !== null) ? afterAvgOcc - beforeAvgOcc : null;
    const beforeRoomsTotal = sumOf(bWk, 'rooms');
    const afterRoomsTotal = sumOf(aWk, 'rooms');
    const roomPickupTotal = (beforeRoomsTotal !== null && afterRoomsTotal !== null) ? afterRoomsTotal - beforeRoomsTotal : null;
    result.push({
      weekLabel: wd.label, weekNum: idx + 1,
      beforeAvgOcc, afterAvgOcc, avgPickup,
      beforeRoomsTotal, afterRoomsTotal, roomPickupTotal,
      status: pickupStatus(avgPickup),
      daysCompared: Math.min(bWk.length, aWk.length),
    });
  });
  return result;
}

/**
 * Métricas resumen de la comparación semanal (mejor/peor semana, conteos).
 * @param {ReturnType<typeof compareWeekly>} weeklyRows
 */
export function buildWeeklyMetrics(weeklyRows) {
  if (!weeklyRows || !weeklyRows.length) return null;
  let positiveWeeks = 0, negativeWeeks = 0, stableWeeks = 0;
  const pickupVals = [];
  let bestWeek = null, worstWeek = null;
  weeklyRows.forEach((w) => {
    if (w.avgPickup !== null) {
      pickupVals.push(w.avgPickup);
      if (w.avgPickup > 2) positiveWeeks++;
      else if (w.avgPickup < -2) negativeWeeks++;
      else stableWeeks++;
      if (!bestWeek || w.avgPickup > bestWeek.avgPickup) bestWeek = w;
      if (!worstWeek || w.avgPickup < worstWeek.avgPickup) worstWeek = w;
    }
  });
  const avgWeeklyPickup = pickupVals.length ? pickupVals.reduce((s, v) => s + v, 0) / pickupVals.length : null;
  const general = positiveWeeks > negativeWeeks ? 'Positivo' : negativeWeeks > positiveWeeks ? 'Negativo' : 'Mixto';
  return { totalWeeks: weeklyRows.length, positiveWeeks, negativeWeeks, stableWeeks, avgWeeklyPickup, bestWeek, worstWeek, general };
}

/**
 * Días entre dos fechas de corte (YYYY-MM-DD).
 * @param {string|null} before
 * @param {string|null} after
 * @returns {number|null}
 */
export function daysBetweenCutoffs(before, after) {
  if (!before || !after) return null;
  const d = Math.abs(Math.round((new Date(after).getTime() - new Date(before).getTime()) / 86400000));
  return d === 0 ? null : d;
}

/** Mes dominante (YYYY-MM) de las fechas de estancia, para etiquetar el análisis. */
export function dominantMonth(rows) {
  const counts = {};
  rows.forEach((r) => { const m = (r.stayDate || r.afterDate || '').slice(0, 7); if (m) counts[m] = (counts[m] || 0) + 1; });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries[0][0] : new Date().toISOString().slice(0, 7);
}
