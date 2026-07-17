// Parseo del reporte Excel "rptForecastNew" para OTB.
// Port fiel de la lógica de otbLoadFile de index.html (detección de hoja, cabecera,
// extracción de filas diarias con fallback por tipo de habitación).
import * as XLSX from 'xlsx';

/** Excel serial → YYYY-MM-DD */
function excelDateToISO(serial) {
  if (!serial || isNaN(serial)) return null;
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Celda numérica tolerante a strings con comas. */
function num(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

/** Normaliza ocupación: >1 se queda, <=1 se multiplica por 100. */
function normalizeOcc(val) {
  const n = num(val);
  if (n === null) return null;
  return n > 1 ? n : n * 100;
}

/**
 * @typedef {Object} OtbRow
 * @property {string} date
 * @property {number} dayOfMonth
 * @property {string} name
 * @property {number|null} occ
 * @property {number|null} rooms
 * @property {number|null} totales
 * @property {number|null} disponibles
 * @property {number|null} adr
 * @property {number|null} revpar
 * @property {number|null} revenue
 */

/**
 * Parsea un archivo Excel/CSV de corte OTB.
 * @param {ArrayBuffer} arrayBuffer
 * @param {string} fileName
 * @param {'before'|'after'} side
 * @returns {{ rows: OtbRow[], meta: object, summary: object|null }}
 */
export function parseOtbWorkbook(arrayBuffer, fileName, side) {
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: false });

  const sheetName = wb.SheetNames.find((n) => /rptforecast/i.test(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('No se encontró ninguna hoja en el archivo');

  // Resumen de cabecera (A4=Ocupación, E4=ADR, J4=RevPAR).
  const cellNum = (addr) => {
    const cell = ws[addr];
    if (!cell) return null;
    return typeof cell.v === 'number' ? cell.v : num(cell.v);
  };
  const hOcc = cellNum('A4'), hAdr = cellNum('E4'), hRevpar = cellNum('J4');
  const headerSummary = (hOcc !== null || hAdr !== null || hRevpar !== null)
    ? { label: 'Corte ' + (side === 'before' ? 'Base' : 'Actual'), occ: hOcc !== null ? normalizeOcc(hOcc) : null, adr: hAdr, revpar: hRevpar }
    : null;

  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Detectar fila de encabezados (la que más coincide con claves conocidas).
  let headerIdx = -1;
  let headerRow = [];
  const candidateKeys = ['fecha', 'name', 'nombre', 'totales', 'reservadas', 'disponibles', 'ocupacion', 'occ', 'adr', 'revpar'];
  let bestHits = 0;
  for (let i = 0; i < Math.min(aoa.length, 25); i++) {
    const row = aoa[i].map((c) => String(c).toLowerCase().trim());
    const hits = row.filter((c) => candidateKeys.some((k) => c.indexOf(k) !== -1)).length;
    if (hits >= 2 && hits >= bestHits) { bestHits = hits; headerIdx = i; headerRow = row; }
  }
  if (headerIdx === -1) throw new Error('No se encontró una fila de encabezados. Verifique que el archivo sea rptForecastNew.');

  /** @type {Record<string, number>} */
  const colIdx = {};
  headerRow.forEach((h, ci) => {
    if (colIdx.fecha === undefined && (h.indexOf('fecha') !== -1 || h === 'date')) colIdx.fecha = ci;
    if (colIdx.name === undefined && (h.indexOf('name') !== -1 || h.indexOf('nombre') !== -1)) colIdx.name = ci;
    if (colIdx.ocupacion === undefined && (h.indexOf('ocup') !== -1 || h.indexOf('occ') !== -1)) colIdx.ocupacion = ci;
    if (colIdx.totales === undefined && h.indexOf('total') !== -1 && h.indexOf('fecha') === -1) colIdx.totales = ci;
    if (colIdx.reservadas === undefined && h.indexOf('reservada') !== -1) colIdx.reservadas = ci;
    if (colIdx.disponibles === undefined && h.indexOf('disponible') !== -1) colIdx.disponibles = ci;
    if (colIdx.adr === undefined && h === 'adr') colIdx.adr = ci;
    if (colIdx.revpar === undefined && h.indexOf('revpar') !== -1) colIdx.revpar = ci;
    if (colIdx.ingresos === undefined && (h.indexOf('ingreso') !== -1 || h.indexOf('revenue') !== -1)) colIdx.ingresos = ci;
  });

  if (colIdx.fecha === undefined) throw new Error('Columna "Fecha" no encontrada. Verifique el formato del archivo.');
  if (colIdx.reservadas === undefined && colIdx.totales === undefined) {
    throw new Error('No se encontraron columnas de Reservadas o Totales. Verifique el formato.');
  }

  const parseDate = (rawFecha) => {
    if (typeof rawFecha === 'number' && rawFecha > 40000) return excelDateToISO(rawFecha);
    if (!rawFecha) return null;
    const s = String(rawFecha).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) { const p = s.split('/'); return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`; }
    if (/^\d{1,2}-\d{1,2}-\d{4}/.test(s)) { const p = s.split('-'); return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`; }
    return null;
  };

  /** @type {OtbRow[]} */
  let rows = [];
  const roomTypes = {};
  let totalFechaCount = 0;
  const warnings = [];
  let minDate = null, maxDate = null;
  let lastDateStr = null;

  for (let ri = headerIdx + 1; ri < aoa.length; ri++) {
    const r = aoa[ri];
    if (!r || !r.length) continue;

    const rawName = colIdx.name !== undefined ? String(r[colIdx.name] || '').trim() : '';
    let dateStr = parseDate(r[colIdx.fecha]);
    if (dateStr) lastDateStr = dateStr; else dateStr = lastDateStr;
    if (!dateStr) continue;

    const totales = num(r[colIdx.totales]);
    const reservadas = num(r[colIdx.reservadas]);
    const disponibles = colIdx.disponibles !== undefined ? num(r[colIdx.disponibles]) : null;
    const adr = colIdx.adr !== undefined ? num(r[colIdx.adr]) : null;
    const revpar = colIdx.revpar !== undefined ? num(r[colIdx.revpar]) : null;
    const ingresos = colIdx.ingresos !== undefined ? num(r[colIdx.ingresos]) : null;
    if (reservadas === null && totales === null) continue;

    const isTotalFecha = /total\s*fecha/i.test(rawName) || rawName === '';
    if (!isTotalFecha && rawName) roomTypes[rawName] = (roomTypes[rawName] || 0) + 1;
    if (isTotalFecha) totalFechaCount++;

    const occFromFile = colIdx.ocupacion !== undefined ? num(r[colIdx.ocupacion]) : null;
    let occ = null;
    if (occFromFile !== null) occ = Math.min(100, Math.max(0, normalizeOcc(occFromFile)));
    else if (totales && reservadas !== null) occ = Math.min(100, Math.max(0, (reservadas / totales) * 100));

    if (isTotalFecha || colIdx.name === undefined) {
      rows.push({
        date: dateStr, dayOfMonth: new Date(dateStr + 'T12:00:00').getDate(),
        name: rawName || 'Total Fecha', occ, rooms: reservadas, totales, disponibles, adr, revpar, revenue: ingresos,
      });
      if (!minDate || dateStr < minDate) minDate = dateStr;
      if (!maxDate || dateStr > maxDate) maxDate = dateStr;
    }
  }

  // Fallback: sin filas "Total Fecha" → sumar tipos de habitación por fecha.
  if (!rows.length) {
    warnings.push('No se encontraron filas "Total Fecha". Se sumó la ocupación de todos los tipos de habitación por fecha.');
    const byDate = {}; const dateOrder = [];
    for (let ri = headerIdx + 1; ri < aoa.length; ri++) {
      const r = aoa[ri];
      if (!r || !r.length) continue;
      const dateStr = parseDate(r[colIdx.fecha]);
      if (!dateStr) continue;
      const tot = num(r[colIdx.totales]);
      const res = num(r[colIdx.reservadas]);
      if (res === null && tot === null) continue;
      const disp = colIdx.disponibles !== undefined ? num(r[colIdx.disponibles]) : null;
      const rev = colIdx.ingresos !== undefined ? num(r[colIdx.ingresos]) : null;
      if (!byDate[dateStr]) { byDate[dateStr] = { totales: 0, rooms: 0, disponibles: 0, hasDisp: false, revenue: 0, hasRev: false }; dateOrder.push(dateStr); }
      const acc = byDate[dateStr];
      if (tot !== null) acc.totales += tot;
      if (res !== null) acc.rooms += res;
      if (disp !== null) { acc.disponibles += disp; acc.hasDisp = true; }
      if (rev !== null) { acc.revenue += rev; acc.hasRev = true; }
      if (!minDate || dateStr < minDate) minDate = dateStr;
      if (!maxDate || dateStr > maxDate) maxDate = dateStr;
    }
    rows = dateOrder.map((d) => {
      const acc = byDate[d];
      const occ = acc.totales ? Math.min(100, Math.max(0, (acc.rooms / acc.totales) * 100)) : null;
      const revenue = acc.hasRev ? acc.revenue : null;
      return {
        date: d, dayOfMonth: new Date(d + 'T12:00:00').getDate(), name: 'Total', occ, rooms: acc.rooms, totales: acc.totales,
        disponibles: acc.hasDisp ? acc.disponibles : null,
        adr: (revenue !== null && acc.rooms) ? revenue / acc.rooms : null,
        revpar: (revenue !== null && acc.totales) ? revenue / acc.totales : null,
        revenue,
      };
    });
  }

  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (!rows.length) throw new Error('No se encontraron filas de datos válidas en el archivo.');

  const meta = {
    filename: fileName, sheet: sheetName, dateRange: `${minDate || '?'} → ${maxDate || '?'}`,
    roomTypes: Object.keys(roomTypes), totalFechaRows: totalFechaCount || rows.length, warnings,
  };
  return { rows, meta, summary: headerSummary };
}
