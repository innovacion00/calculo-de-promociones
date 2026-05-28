import { RawRow } from './excelParser';

export type ReservationStatus =
  | 'effective'
  | 'cancelled'
  | 'overCommission'
  | 'overCommissionCancellation'
  | 'modification'
  | 'duplicate'
  | 'review';

export interface ClassifiedRow extends RawRow {
  status: ReservationStatus;
  hotelBase: string;
  date: Date | null;
  amount: number;
  reservationId: string;
}

const SUFFIX_PATTERNS: { pattern: RegExp; status: ReservationStatus }[] = [
  { pattern: /\(Over-Commission\s*-\s*Cancelac/i, status: 'overCommissionCancellation' },
  { pattern: /Over-Commission/i, status: 'overCommission' },
  { pattern: /Cancelaci[oó]n/i, status: 'cancelled' },
  { pattern: /Modificaci[oó]n/i, status: 'modification' },
];

function parseHotel(colD: string): { hotelBase: string; status: ReservationStatus } {
  for (const { pattern, status } of SUFFIX_PATTERNS) {
    if (pattern.test(colD)) {
      const hotelBase = colD
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s*\(T\)\s*/g, '')
        .trim();
      return { hotelBase, status };
    }
  }
  // (T) suffix — treat as effective but flag for review
  if (/\(T\)/i.test(colD)) {
    const hotelBase = colD.replace(/\s*\(T\)\s*/g, '').trim();
    return { hotelBase, status: 'review' };
  }
  return { hotelBase: colD.trim(), status: 'effective' };
}

function toDate(raw: Date | string | null): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export function classifyReservations(rows: RawRow[]): ClassifiedRow[] {
  const classified: ClassifiedRow[] = [];

  // First pass: classify each row individually
  for (const row of rows) {
    if (!row.colD) continue;
    const { hotelBase, status } = parseHotel(row.colD);
    const reservationId = row.colC || row.colB || '';
    classified.push({
      ...row,
      status,
      hotelBase,
      date: toDate(row.colF),
      amount: row.colG ?? 0,
      reservationId,
    });
  }

  // Second pass: detect duplicates
  // Group effective rows by (reservationId, amount, date)
  const effectiveKey = new Map<string, number>();
  for (let i = 0; i < classified.length; i++) {
    const r = classified[i];
    if (r.status !== 'effective') continue;
    const dateStr = r.date ? r.date.toISOString().slice(0, 10) : '';
    const key = `${r.reservationId}|${r.amount.toFixed(2)}|${dateStr}`;
    const prev = effectiveKey.get(key);
    if (prev !== undefined) {
      classified[i].status = 'duplicate';
      // Don't mark prev as duplicate — keep first occurrence
    } else {
      effectiveKey.set(key, i);
    }
  }

  // Third pass: if a reservation ID has both effective + cancellation rows,
  // mark all effective rows for that ID as cancelled
  const cancelledIds = new Set<string>();
  for (const r of classified) {
    if (r.status === 'cancelled' && r.reservationId) {
      // Extract the base ID (without version suffix like -1, -2)
      const baseId = r.reservationId.replace(/-\d+$/, '');
      cancelledIds.add(r.reservationId);
      cancelledIds.add(baseId);
    }
  }

  // Update effective rows whose ID is in cancelled set
  for (let i = 0; i < classified.length; i++) {
    const r = classified[i];
    if (r.status !== 'effective') continue;
    const baseId = r.reservationId.replace(/-\d+$/, '');
    if (cancelledIds.has(r.reservationId) || cancelledIds.has(baseId)) {
      classified[i] = { ...classified[i], status: 'cancelled' };
    }
  }

  return classified;
}

export function getEffectiveReservations(rows: ClassifiedRow[]): ClassifiedRow[] {
  return rows.filter((r) => r.status === 'effective');
}

export function getCancelledReservations(rows: ClassifiedRow[]): ClassifiedRow[] {
  return rows.filter((r) => r.status === 'cancelled');
}

export function getOverCommissionRows(rows: ClassifiedRow[]): ClassifiedRow[] {
  return rows.filter((r) => r.status === 'overCommission');
}

export function getDuplicateRows(rows: ClassifiedRow[]): ClassifiedRow[] {
  return rows.filter((r) => r.status === 'duplicate');
}

export function getReviewRows(rows: ClassifiedRow[]): ClassifiedRow[] {
  return rows.filter((r) => r.status === 'review');
}
