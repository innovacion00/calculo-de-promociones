import { RawRow } from './excelParser';
import { GEHRow } from './gehParser';
import { normalizeId } from './idNormalizer';
import { HotelMapping, normalizeHotel } from './hotelNormalizer';
import { guestMatch } from './guestMatcher';

export type ReconciliationStatus =
  | 'CONCILIADA'
  | 'PRICE_NOT_GEH'
  | 'GEH_NOT_PRICE'
  | 'DIFF_VALOR'
  | 'DIFF_HOTEL'
  | 'DIFF_FECHA'
  | 'DIFF_HUESPED'
  | 'CANCELLED_PRICE_ACTIVE_GEH'
  | 'DUPLICADO_PRICE'
  | 'DUPLICADO_GEH'
  | 'REVISION_MANUAL';

export interface ReconciliationRecord {
  id: string;
  existsInPrice: boolean;
  existsInGEH: boolean;
  priceStatus: string;
  priceHotel: string;
  priceHotelNormalized: string;
  gehHotel: string;
  priceGuest: string;
  gehGuest: string;
  priceArrival: Date | null;
  gehCheckIn: Date | null;
  gehCheckOut: Date | null;
  priceBruto: number;
  priceOverComm: number;
  priceNeto: number;
  gehAmount: number;
  valueDiff: number;
  valueDiffPct: number;
  reconciliationStatus: ReconciliationStatus;
  autoObservation: string;
  recommendation: string;
  gehNotes: string;
}

export interface ReconciliationSummary {
  totalPrice: number;
  totalGEH: number;
  conciliadas: number;
  priceNotGEH: number;
  gehNotPrice: number;
  diffValor: number;
  diffHotel: number;
  diffFecha: number;
  diffHuesped: number;
  cancelledPriceActiveGEH: number;
  duplicadosPrice: number;
  duplicadosGEH: number;
  valorDiffFavorPrice: number;
  valorDiffFavorGEH: number;
  hotelMasDiferencias: string;
  invalidIdsPrice: number;
  invalidIdsGEH: number;
}

export interface ReconciliationConfig {
  toleranciaValorCOP: number;
  toleranciaFechaDias: number;
  umbralSimilitudHuesped: number;
}

export interface ReconciliationResult {
  masterTable: ReconciliationRecord[];
  summary: ReconciliationSummary;
  invalidPriceRows: Array<{ raw: RawRow; reason: string }>;
  invalidGEHRows: GEHRow[];
}

interface PriceGroup {
  rows: RawRow[];
  effectiveRows: RawRow[];
  overCommRows: RawRow[];
  cancellationRows: RawRow[];
  priceBruto: number;
  priceOverComm: number;
  priceNeto: number;
  priceStatus: string;
  priceHotel: string;
  priceGuest: string;
  priceArrival: Date | null;
  isDuplicate: boolean;
}

function toDate(val: Date | string | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function isCancellationRow(row: RawRow): boolean {
  if (!row.colD) return false;
  return /cancelaci[oó]n/i.test(row.colD);
}

function isOverCommRow(row: RawRow): boolean {
  if (!row.colD) return false;
  return /over-commission/i.test(row.colD);
}

function isEffectiveRow(row: RawRow): boolean {
  return !isCancellationRow(row) && !isOverCommRow(row);
}

function getHotelBase(colD: string | null): string {
  if (!colD) return '';
  return colD
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\(T\)\s*/g, '')
    .trim();
}

function daysDiff(a: Date, b: Date): number {
  return Math.abs((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export function runReconciliation(
  priceRows: RawRow[],
  gehRows: GEHRow[],
  hotelMapping: HotelMapping,
  config: ReconciliationConfig
): ReconciliationResult {
  const invalidPriceRows: Array<{ raw: RawRow; reason: string }> = [];
  const invalidGEHRows: GEHRow[] = gehRows.filter((r) => r.idNormalized === null);

  // Group price rows by normalized ID
  const priceGroups = new Map<string, PriceGroup>();

  for (const row of priceRows) {
    const rawId = row.colC || row.colB;
    const id = normalizeId(rawId);
    if (!id) {
      invalidPriceRows.push({ raw: row, reason: `ID inválido: ${String(rawId)}` });
      continue;
    }
    if (!priceGroups.has(id)) {
      priceGroups.set(id, {
        rows: [],
        effectiveRows: [],
        overCommRows: [],
        cancellationRows: [],
        priceBruto: 0,
        priceOverComm: 0,
        priceNeto: 0,
        priceStatus: 'active',
        priceHotel: '',
        priceGuest: '',
        priceArrival: null,
        isDuplicate: false,
      });
    }
    const grp = priceGroups.get(id)!;
    grp.rows.push(row);
    if (isCancellationRow(row)) {
      grp.cancellationRows.push(row);
    } else if (isOverCommRow(row)) {
      grp.overCommRows.push(row);
    } else if (isEffectiveRow(row)) {
      grp.effectiveRows.push(row);
    }
  }

  // Finalize price groups
  for (const [, grp] of priceGroups) {
    grp.priceBruto = grp.effectiveRows.reduce((s, r) => s + (r.colG ?? 0), 0);
    grp.priceOverComm = grp.overCommRows.reduce((s, r) => s + (r.colG ?? 0), 0);
    grp.priceNeto = grp.priceBruto + grp.priceOverComm;
    grp.priceStatus = grp.cancellationRows.length > 0 ? 'cancelled' : 'active';
    grp.isDuplicate = grp.effectiveRows.length > 1;

    const sourceRow = grp.effectiveRows[0] || grp.rows[0];
    grp.priceHotel = getHotelBase(sourceRow?.colD ?? null);
    grp.priceGuest = sourceRow?.colE ?? '';
    grp.priceArrival = sourceRow ? toDate(sourceRow.colF) : null;
  }

  // Group GEH rows by normalized ID
  const gehGroups = new Map<string, GEHRow[]>();
  for (const row of gehRows) {
    if (!row.idNormalized) continue;
    if (!gehGroups.has(row.idNormalized)) gehGroups.set(row.idNormalized, []);
    gehGroups.get(row.idNormalized)!.push(row);
  }

  // Build master ID set
  const allIds = new Set<string>([...priceGroups.keys(), ...gehGroups.keys()]);

  const masterTable: ReconciliationRecord[] = [];

  for (const id of allIds) {
    const priceGrp = priceGroups.get(id);
    const gehGrpRows = gehGroups.get(id);
    const gehRow = gehGrpRows?.[0];

    const existsInPrice = !!priceGrp;
    const existsInGEH = !!gehGrpRows && gehGrpRows.length > 0;

    const priceHotel = priceGrp?.priceHotel ?? '';
    const priceHotelNormalized = normalizeHotel(priceHotel, hotelMapping);
    const gehHotel = gehRow?.hotelInterno ?? '';
    const priceGuest = priceGrp?.priceGuest ?? '';
    const gehGuest = gehRow?.guest ?? '';
    const priceArrival = priceGrp?.priceArrival ?? null;
    const gehCheckIn = gehRow?.checkIn ?? null;
    const gehCheckOut = gehRow?.checkOut ?? null;
    const priceBruto = priceGrp?.priceBruto ?? 0;
    const priceOverComm = priceGrp?.priceOverComm ?? 0;
    const priceNeto = priceGrp?.priceNeto ?? 0;
    const gehAmount = gehGrpRows?.reduce((s, r) => s + r.amount, 0) ?? 0;
    const valueDiff = priceNeto - gehAmount;
    const valueDiffPct = gehAmount !== 0 ? (valueDiff / gehAmount) * 100 : priceNeto !== 0 ? 100 : 0;
    const gehNotes = gehRow?.notes ?? '';

    const isDuplicatePrice = priceGrp?.isDuplicate ?? false;
    const isDuplicateGEH = gehGrpRows ? gehGrpRows.length > 1 : false;

    let reconciliationStatus: ReconciliationStatus;
    let autoObservation = '';
    let recommendation = '';

    if (isDuplicatePrice) {
      reconciliationStatus = 'DUPLICADO_PRICE';
      autoObservation = `${priceGrp!.effectiveRows.length} filas efectivas en Price para el mismo ID`;
      recommendation = 'Verificar duplicados en Price y consolidar';
    } else if (isDuplicateGEH) {
      reconciliationStatus = 'DUPLICADO_GEH';
      autoObservation = `${gehGrpRows!.length} filas en GEH para el mismo ID`;
      recommendation = 'Verificar duplicados en GEH y consolidar';
    } else if (!existsInGEH) {
      reconciliationStatus = 'PRICE_NOT_GEH';
      autoObservation = 'Reserva existe en Price pero no en GEH';
      recommendation = priceGrp?.priceStatus === 'cancelled'
        ? 'Reserva cancelada en Price, verificar si aplica en GEH'
        : 'Registrar en GEH o investigar por qué no aparece';
    } else if (!existsInPrice) {
      reconciliationStatus = 'GEH_NOT_PRICE';
      autoObservation = 'Reserva existe en GEH pero no en Price';
      recommendation = 'Verificar si la reserva corresponde a Price o fue ingresada manualmente en GEH';
    } else if (priceGrp!.priceStatus === 'cancelled') {
      reconciliationStatus = 'CANCELLED_PRICE_ACTIVE_GEH';
      autoObservation = 'Reserva cancelada en Price pero activa en GEH';
      recommendation = 'Cancelar o ajustar en GEH';
    } else if (Math.abs(valueDiff) > config.toleranciaValorCOP) {
      reconciliationStatus = 'DIFF_VALOR';
      autoObservation = `Diferencia de valor: ${valueDiff.toLocaleString('es-CO')} COP (${valueDiffPct.toFixed(1)}%)`;
      recommendation = valueDiff > 0
        ? 'Price reporta más que GEH — revisar comisiones o ajustes'
        : 'GEH reporta más que Price — revisar cargos adicionales';
    } else if (
      priceHotelNormalized.toLowerCase() !== gehHotel.toLowerCase() &&
      priceHotelNormalized !== '' &&
      gehHotel !== ''
    ) {
      reconciliationStatus = 'DIFF_HOTEL';
      autoObservation = `Hotel Price: "${priceHotelNormalized}" vs GEH: "${gehHotel}"`;
      recommendation = 'Verificar asignación de hotel y actualizar mapeo si corresponde';
    } else if (
      priceArrival &&
      gehCheckIn &&
      daysDiff(priceArrival, gehCheckIn) > config.toleranciaFechaDias
    ) {
      reconciliationStatus = 'DIFF_FECHA';
      autoObservation = `Fecha entrada Price: ${priceArrival.toLocaleDateString('es-CO')} vs GEH: ${gehCheckIn.toLocaleDateString('es-CO')}`;
      recommendation = 'Verificar fechas de check-in entre sistemas';
    } else if (priceGuest && gehGuest && guestMatch(priceGuest, gehGuest) < config.umbralSimilitudHuesped) {
      reconciliationStatus = 'DIFF_HUESPED';
      autoObservation = `Huésped Price: "${priceGuest}" vs GEH: "${gehGuest}"`;
      recommendation = 'Verificar si corresponden al mismo huésped';
    } else {
      reconciliationStatus = 'CONCILIADA';
      autoObservation = 'Reserva conciliada correctamente';
      recommendation = 'Ninguna acción requerida';
    }

    masterTable.push({
      id,
      existsInPrice,
      existsInGEH,
      priceStatus: priceGrp?.priceStatus ?? '',
      priceHotel,
      priceHotelNormalized,
      gehHotel,
      priceGuest,
      gehGuest,
      priceArrival,
      gehCheckIn,
      gehCheckOut,
      priceBruto,
      priceOverComm,
      priceNeto,
      gehAmount,
      valueDiff,
      valueDiffPct,
      reconciliationStatus,
      autoObservation,
      recommendation,
      gehNotes,
    });
  }

  // Build summary
  const hotelDiffCount = new Map<string, number>();
  let valorDiffFavorPrice = 0;
  let valorDiffFavorGEH = 0;

  for (const r of masterTable) {
    if (r.reconciliationStatus !== 'CONCILIADA' && r.reconciliationStatus !== 'PRICE_NOT_GEH' && r.reconciliationStatus !== 'GEH_NOT_PRICE') {
      const hotel = r.priceHotelNormalized || r.gehHotel || 'Desconocido';
      hotelDiffCount.set(hotel, (hotelDiffCount.get(hotel) ?? 0) + 1);
    }
    if (r.valueDiff > 0) valorDiffFavorPrice += r.valueDiff;
    if (r.valueDiff < 0) valorDiffFavorGEH += Math.abs(r.valueDiff);
  }

  let hotelMasDiferencias = '';
  let maxDiff = 0;
  for (const [hotel, count] of hotelDiffCount) {
    if (count > maxDiff) { maxDiff = count; hotelMasDiferencias = hotel; }
  }

  const summary: ReconciliationSummary = {
    totalPrice: masterTable.length,
    totalGEH: gehGroups.size,
    conciliadas: masterTable.filter((r) => r.reconciliationStatus === 'CONCILIADA').length,
    priceNotGEH: masterTable.filter((r) => r.reconciliationStatus === 'PRICE_NOT_GEH').length,
    gehNotPrice: masterTable.filter((r) => r.reconciliationStatus === 'GEH_NOT_PRICE').length,
    diffValor: masterTable.filter((r) => r.reconciliationStatus === 'DIFF_VALOR').length,
    diffHotel: masterTable.filter((r) => r.reconciliationStatus === 'DIFF_HOTEL').length,
    diffFecha: masterTable.filter((r) => r.reconciliationStatus === 'DIFF_FECHA').length,
    diffHuesped: masterTable.filter((r) => r.reconciliationStatus === 'DIFF_HUESPED').length,
    cancelledPriceActiveGEH: masterTable.filter((r) => r.reconciliationStatus === 'CANCELLED_PRICE_ACTIVE_GEH').length,
    duplicadosPrice: masterTable.filter((r) => r.reconciliationStatus === 'DUPLICADO_PRICE').length,
    duplicadosGEH: masterTable.filter((r) => r.reconciliationStatus === 'DUPLICADO_GEH').length,
    valorDiffFavorPrice,
    valorDiffFavorGEH,
    hotelMasDiferencias,
    invalidIdsPrice: invalidPriceRows.length,
    invalidIdsGEH: invalidGEHRows.length,
  };

  return { masterTable, summary, invalidPriceRows, invalidGEHRows };
}
