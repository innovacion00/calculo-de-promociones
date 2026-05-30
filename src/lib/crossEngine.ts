import { UniversalRow, UniversalParseResult } from './universalParser';

export type DifferenceType =
  | 'IN_PRICE_NOT_GEH'
  | 'IN_GEH_NOT_PRICE'
  | 'COINCIDE'
  | 'DUPLICADO_PRICE'
  | 'DUPLICADO_GEH';

export interface CrossRecord {
  id: string;
  differenceType: DifferenceType;
  origin: 'Price' | 'GEH Suites' | 'Ambos';
  name: string;
  value: number;
  date: Date | null;
  dateStr: string;
  observations: string;
  priceRow?: UniversalRow;
  priceName?: string;
  priceValue?: number;
  priceDateStr?: string;
  gehRow?: UniversalRow;
  gehName?: string;
  gehValue?: number;
  gehDateStr?: string;
}

export interface DuplicateRecord {
  source: 'Price' | 'GEH Suites';
  id: string;
  count: number;
  rows: UniversalRow[];
  totalValue: number;
  names: string[];
}

export interface CrossSummary {
  totalPrice: number;
  totalGEH: number;
  coincidentes: number;
  enPriceNoGEH: number;
  enGEHNoPrice: number;
  duplicadosPrice: number;
  duplicadosGEH: number;
  pctCoincidencia: number;
  pctDiferencia: number;
  valorTotalDiferencias: number;
  valorEnPriceNoGEH: number;
  valorEnGEHNoPrice: number;
  valorCoincidentes: number;
  byDate: Array<{ period: string; enPriceNoGEH: number; enGEHNoPrice: number; valorDiff: number }>;
}

export interface CrossResult {
  masterTable: CrossRecord[];
  duplicates: DuplicateRecord[];
  summary: CrossSummary;
}

function groupById(rows: UniversalRow[]): Map<string, UniversalRow[]> {
  const map = new Map<string, UniversalRow[]>();
  for (const row of rows) {
    const id = row.normalizedId!;
    const existing = map.get(id);
    if (existing) existing.push(row);
    else map.set(id, [row]);
  }
  return map;
}

function periodOf(row: UniversalRow): string {
  if (!row.date) return 'Sin fecha';
  const d = row.date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function runCrossMatch(
  priceResult: UniversalParseResult,
  gehResult: UniversalParseResult
): CrossResult {
  const priceMap = groupById(priceResult.rows);
  const gehMap = groupById(gehResult.rows);

  const duplicates: DuplicateRecord[] = [];
  const masterTable: CrossRecord[] = [];

  // Detect duplicates
  for (const [id, rows] of priceMap) {
    if (rows.length > 1) {
      duplicates.push({
        source: 'Price',
        id,
        count: rows.length,
        rows,
        totalValue: rows.reduce((s, r) => s + r.value, 0),
        names: rows.map((r) => r.name).filter(Boolean),
      });
    }
  }
  for (const [id, rows] of gehMap) {
    if (rows.length > 1) {
      duplicates.push({
        source: 'GEH Suites',
        id,
        count: rows.length,
        rows,
        totalValue: rows.reduce((s, r) => s + r.value, 0),
        names: rows.map((r) => r.name).filter(Boolean),
      });
    }
  }

  const dupPriceIds = new Set(duplicates.filter((d) => d.source === 'Price').map((d) => d.id));
  const dupGEHIds = new Set(duplicates.filter((d) => d.source === 'GEH Suites').map((d) => d.id));

  const allIds = new Set([...priceMap.keys(), ...gehMap.keys()]);

  const byDateMap = new Map<string, { enPriceNoGEH: number; enGEHNoPrice: number; valorDiff: number }>();

  for (const id of allIds) {
    const priceRows = priceMap.get(id);
    const gehRows = gehMap.get(id);
    const priceRow = priceRows?.[0];
    const gehRow = gehRows?.[0];

    let differenceType: DifferenceType;
    let origin: CrossRecord['origin'];
    let observations: string;
    let name: string;
    let value: number;
    let date: Date | null;
    let dateStr: string;

    if (dupPriceIds.has(id)) {
      differenceType = 'DUPLICADO_PRICE';
      origin = 'Price';
      observations = 'ID duplicado en archivo Price';
      name = priceRow?.name ?? '';
      value = priceRows!.reduce((s, r) => s + r.value, 0);
      date = priceRow?.date ?? null;
      dateStr = priceRow?.dateStr ?? '';
    } else if (dupGEHIds.has(id)) {
      differenceType = 'DUPLICADO_GEH';
      origin = 'GEH Suites';
      observations = 'ID duplicado en archivo GEH Suites';
      name = gehRow?.name ?? '';
      value = gehRows!.reduce((s, r) => s + r.value, 0);
      date = gehRow?.date ?? null;
      dateStr = gehRow?.dateStr ?? '';
    } else if (priceRow && gehRow) {
      differenceType = 'COINCIDE';
      origin = 'Ambos';
      observations = 'Registrado en ambos archivos';
      name = priceRow.name || gehRow.name;
      value = priceRow.value;
      date = priceRow.date;
      dateStr = priceRow.dateStr;
    } else if (priceRow && !gehRow) {
      differenceType = 'IN_PRICE_NOT_GEH';
      origin = 'Price';
      observations = 'Registrado en Price, no encontrado en GEH Suites';
      name = priceRow.name;
      value = priceRow.value;
      date = priceRow.date;
      dateStr = priceRow.dateStr;
    } else {
      differenceType = 'IN_GEH_NOT_PRICE';
      origin = 'GEH Suites';
      observations = 'Registrado en GEH Suites, no encontrado en Price';
      name = gehRow!.name;
      value = gehRow!.value;
      date = gehRow!.date;
      dateStr = gehRow!.dateStr;
    }

    masterTable.push({
      id,
      differenceType,
      origin,
      name,
      value,
      date,
      dateStr,
      observations,
      priceRow,
      priceName: priceRow?.name,
      priceValue: priceRow?.value,
      priceDateStr: priceRow?.dateStr,
      gehRow,
      gehName: gehRow?.name,
      gehValue: gehRow?.value,
      gehDateStr: gehRow?.dateStr,
    });

    // byDate
    if (differenceType === 'IN_PRICE_NOT_GEH' || differenceType === 'IN_GEH_NOT_PRICE') {
      const refRow = priceRow ?? gehRow!;
      const period = periodOf(refRow);
      const existing = byDateMap.get(period) ?? { enPriceNoGEH: 0, enGEHNoPrice: 0, valorDiff: 0 };
      if (differenceType === 'IN_PRICE_NOT_GEH') {
        existing.enPriceNoGEH += 1;
        existing.valorDiff += value;
      } else {
        existing.enGEHNoPrice += 1;
        existing.valorDiff += value;
      }
      byDateMap.set(period, existing);
    }
  }

  const coincidentes = masterTable.filter((r) => r.differenceType === 'COINCIDE').length;
  const enPriceNoGEH = masterTable.filter((r) => r.differenceType === 'IN_PRICE_NOT_GEH').length;
  const enGEHNoPrice = masterTable.filter((r) => r.differenceType === 'IN_GEH_NOT_PRICE').length;
  const duplicadosPrice = masterTable.filter((r) => r.differenceType === 'DUPLICADO_PRICE').length;
  const duplicadosGEH = masterTable.filter((r) => r.differenceType === 'DUPLICADO_GEH').length;

  const valorCoincidentes = masterTable
    .filter((r) => r.differenceType === 'COINCIDE')
    .reduce((s, r) => s + r.value, 0);
  const valorEnPriceNoGEH = masterTable
    .filter((r) => r.differenceType === 'IN_PRICE_NOT_GEH')
    .reduce((s, r) => s + r.value, 0);
  const valorEnGEHNoPrice = masterTable
    .filter((r) => r.differenceType === 'IN_GEH_NOT_PRICE')
    .reduce((s, r) => s + r.value, 0);

  const totalUnique = allIds.size;
  const pctCoincidencia = totalUnique > 0 ? (coincidentes / totalUnique) * 100 : 0;
  const pctDiferencia = 100 - pctCoincidencia;

  const byDate = Array.from(byDateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, vals]) => ({ period, ...vals }));

  const summary: CrossSummary = {
    totalPrice: priceResult.rows.length,
    totalGEH: gehResult.rows.length,
    coincidentes,
    enPriceNoGEH,
    enGEHNoPrice,
    duplicadosPrice,
    duplicadosGEH,
    pctCoincidencia,
    pctDiferencia,
    valorTotalDiferencias: valorEnPriceNoGEH + valorEnGEHNoPrice,
    valorEnPriceNoGEH,
    valorEnGEHNoPrice,
    valorCoincidentes,
    byDate,
  };

  return { masterTable, duplicates, summary };
}
