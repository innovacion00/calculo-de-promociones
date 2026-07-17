// Helpers de formato compartidos por el frontend.

/**
 * Formatea un monto en pesos colombianos. Devuelve '—' si es nulo.
 * @param {number|null|undefined} v
 * @returns {string}
 */
export function fmtCop(v) {
  return v != null ? '$ ' + Math.round(v).toLocaleString('es-CO') : '—';
}

/**
 * Trunca un texto a `max` caracteres agregando '…' (para celdas largas).
 * @param {string} full
 * @param {number} [max]
 * @param {number} [keep]
 * @returns {string}
 */
export function truncate(full, max = 30, keep = 27) {
  return full.length > max ? full.slice(0, keep) + '…' : full;
}

const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * Formatea un mes "YYYY-MM" como "septiembre de 2026". Devuelve el valor original si no calza el patrón.
 * @param {string|null|undefined} ym
 * @returns {string}
 */
export function monthLabelEs(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym ?? '—';
  const [year, month] = ym.split('-');
  const idx = Number(month) - 1;
  return idx >= 0 && idx < 12 ? `${MONTHS_ES[idx]} de ${year}` : ym;
}
