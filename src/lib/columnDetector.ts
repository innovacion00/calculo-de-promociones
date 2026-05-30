export type ColumnRole = 'id' | 'name' | 'value' | 'date' | 'unknown';

export interface ColumnCandidate {
  index: number;
  header: string;
  role: ColumnRole;
  confidence: number;
}

export interface DetectedColumns {
  id: ColumnCandidate | null;
  name: ColumnCandidate | null;
  value: ColumnCandidate | null;
  date: ColumnCandidate | null;
  allColumns: ColumnCandidate[];
}

const ID_KEYWORDS = [
  'id', 'localizador', 'locator', 'codigo', 'codigo de reserva', 'booking id',
  'reservation id', 'numero de reserva', 'confirmation number', 'confirmacion',
  'reserva', 'referencia', 'folio', 'booking', 'reservation', 'no reserva',
  'nro reserva', 'numero',
];

const NAME_KEYWORDS = [
  'nombre', 'cliente', 'huesped', 'guest', 'guest name', 'passenger',
  'nombre del pasajero', 'titular', 'pasajero', 'pax',
];

const VALUE_KEYWORDS = [
  'valor', 'total', 'amount', 'price', 'tarifa', 'importe', 'revenue',
  'monto', 'valor reserva', 'valor total', 'subtotal', 'neto', 'bruto', 'costo',
];

const DATE_KEYWORDS = [
  'fecha', 'date', 'check in', 'check-in', 'checkin', 'arrival',
  'fecha llegada', 'fecha reserva', 'booking date', 'check out', 'check-out',
  'fecha entrada', 'fecha salida',
];

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function scoreHeader(header: string, keywords: string[]): number {
  const h = normalize(header);
  let best = 0;
  for (const kw of keywords) {
    if (h === kw) { best = Math.max(best, 1.0); }
    else if (h.includes(kw)) { best = Math.max(best, 0.7); }
    else if (kw.includes(h) && h.length >= 3) { best = Math.max(best, 0.4); }
  }
  return best;
}

export function detectColumns(headers: string[]): DetectedColumns {
  const roleKeywords: Record<ColumnRole, string[]> = {
    id: ID_KEYWORDS,
    name: NAME_KEYWORDS,
    value: VALUE_KEYWORDS,
    date: DATE_KEYWORDS,
    unknown: [],
  };

  const allColumns: ColumnCandidate[] = headers.map((header, index) => {
    let bestRole: ColumnRole = 'unknown';
    let bestConf = 0;
    for (const role of ['id', 'name', 'value', 'date'] as ColumnRole[]) {
      const conf = scoreHeader(header, roleKeywords[role]);
      if (conf > bestConf) {
        bestConf = conf;
        bestRole = role;
      }
    }
    return {
      index,
      header,
      role: bestConf >= 0.4 ? bestRole : 'unknown',
      confidence: bestConf,
    };
  });

  const best = (role: ColumnRole): ColumnCandidate | null => {
    const candidates = allColumns.filter((c) => c.role === role);
    if (candidates.length === 0) return null;
    return candidates.reduce((a, b) => (a.confidence >= b.confidence ? a : b));
  };

  return {
    id: best('id'),
    name: best('name'),
    value: best('value'),
    date: best('date'),
    allColumns,
  };
}
