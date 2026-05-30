import * as XLSX from 'xlsx';
import { detectColumns, DetectedColumns } from './columnDetector';

export interface ColOverrides {
  idCol?: number;
  nameCol?: number;
  valueCol?: number;
  dateCol?: number;
}

export interface UniversalRow {
  rawId: string | null;
  normalizedId: string | null;
  name: string;
  value: number;
  date: Date | null;
  dateStr: string;
  rawData: Record<string, string | number | boolean | null>;
  rowIndex: number;
  sheetName: string;
}

export interface UniversalParseResult {
  rows: UniversalRow[];
  detectedColumns: DetectedColumns;
  headers: string[];
  sheetNames: string[];
  totalRawRows: number;
  invalidRows: UniversalRow[];
}

function parseValue(cell: unknown): number {
  if (cell === null || cell === undefined) return 0;
  if (typeof cell === 'number') return cell;
  if (typeof cell === 'boolean') return cell ? 1 : 0;
  const s = String(cell).replace(/\$/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseDate(cell: unknown): Date | null {
  if (cell === null || cell === undefined) return null;
  if (cell instanceof Date) return cell;
  if (typeof cell === 'number') {
    const parsed = XLSX.SSF.parse_date_code(cell);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
    return null;
  }
  if (typeof cell === 'string') {
    const d = new Date(cell);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function castCell(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v;
  return String(v);
}

export function parseUniversalFile(buffer: ArrayBuffer, overrides?: ColOverrides): UniversalParseResult {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetNames = wb.SheetNames;
  const sheetName = sheetNames[0];
  const sheet = wb.Sheets[sheetName];

  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];

  // Find first non-empty row as headers (at least 2 non-null string cells)
  let headerRowIdx = -1;
  let headerRow: unknown[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    const nonNullStrings = row.filter((c) => c !== null && c !== undefined && typeof c === 'string' && String(c).trim() !== '');
    if (nonNullStrings.length >= 2) {
      headerRowIdx = i;
      headerRow = row;
      break;
    }
  }

  if (headerRowIdx === -1) {
    return {
      rows: [],
      detectedColumns: { id: null, name: null, value: null, date: null, allColumns: [] },
      headers: [],
      sheetNames,
      totalRawRows: 0,
      invalidRows: [],
    };
  }

  const headers = headerRow.map((h) => String(h ?? ''));
  const detectedColumns = detectColumns(headers);

  let idIdx = detectedColumns.id?.index ?? -1;
  let nameIdx = detectedColumns.name?.index ?? -1;
  let valueIdx = detectedColumns.value?.index ?? -1;
  let dateIdx = detectedColumns.date?.index ?? -1;

  if (overrides?.idCol !== undefined) idIdx = overrides.idCol;
  if (overrides?.nameCol !== undefined) nameIdx = overrides.nameCol;
  if (overrides?.valueCol !== undefined) valueIdx = overrides.valueCol;
  if (overrides?.dateCol !== undefined) dateIdx = overrides.dateCol;

  const dataRows = raw.slice(headerRowIdx + 1);
  const totalRawRows = dataRows.length;
  const rows: UniversalRow[] = [];
  const invalidRows: UniversalRow[] = [];

  dataRows.forEach((row, i) => {
    const arr = row as unknown[];
    const rawId = idIdx >= 0
      ? (String(arr[idIdx] ?? '').replace(/[\r\n\t]/g, '').trim() || null)
      : null;
    const normalizedId = rawId ? rawId.toUpperCase() : null;
    const name = nameIdx >= 0 ? String(arr[nameIdx] ?? '').trim() : '';
    const value = valueIdx >= 0 ? parseValue(arr[valueIdx]) : 0;
    const dateCell = dateIdx >= 0 ? arr[dateIdx] : null;
    const date = parseDate(dateCell);
    const dateStr = date ? date.toLocaleDateString('es-CO', { dateStyle: 'short' }) : '';

    const rawData: Record<string, string | number | boolean | null> = {};
    headers.forEach((h, hi) => {
      rawData[h] = castCell(arr[hi]);
    });

    const urow: UniversalRow = {
      rawId,
      normalizedId,
      name,
      value,
      date,
      dateStr,
      rawData,
      rowIndex: headerRowIdx + 1 + i,
      sheetName,
    };

    if (normalizedId) {
      rows.push(urow);
    } else {
      invalidRows.push(urow);
    }
  });

  return { rows, detectedColumns, headers, sheetNames, totalRawRows, invalidRows };
}
