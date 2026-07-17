// Helpers de exportación CSV compartidos por los controladores financieros.

/**
 * Escapa un valor para CSV (comillas, comas, saltos de línea).
 * @param {unknown} val
 * @returns {string}
 */
export function escCsv(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Escribe una respuesta CSV descargable.
 * @param {import('express').Response} res
 * @param {string[]} headers
 * @param {unknown[][]} rows
 * @param {string} fileName
 */
export function sendCsv(res, headers, rows, fileName) {
  const csv = [headers.join(','), ...rows.map((r) => r.map(escCsv).join(','))].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(csv);
}
