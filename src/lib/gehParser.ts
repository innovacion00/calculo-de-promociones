import * as XLSX from 'xlsx';
import { normalizeId } from './idNormalizer';

export interface GEHRow {
  id: string | null;
  idNormalized: string | null;
  guest: string;
  checkIn: Date | null;
  checkOut: Date | null;
  amount: number;
  notes: string;
  hotelInterno: string;
  rowIndex: number;
  sheetName: string;
}

export interface GEHParseResult {
  rows: GEHRow[];
  sheets: string[];
  invalidRows: GEHRow[];
}

const SKIP_SHEETS = ['TOTAL', 'RESUMEN', 'DASHBOARD', 'CONSOLIDADO'];

function shouldSkipSheet(name: string): boolean {
  return SKIP_SHEETS.includes(name.trim().toUpperCase());
}

function cellStr(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v == null) return '';
  return String(cell.v).trim();
}

function cellDate(cell: XLSX.CellObject | undefined): Date | null {
  if (!cell) return null;
  if (cell.t === 'd' && cell.v instanceof Date) return cell.v;
  if (cell.t === 'n') {
    const date = XLSX.SSF.parse_date_code(cell.v as number);
    if (date) return new Date(date.y, date.m - 1, date.d);
  }
  if (cell.t === 's') {
    const d = new Date(cell.v as string);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function cellNum(cell: XLSX.CellObject | undefined): number {
  if (!cell) return 0;
  if (cell.t === 'n') return cell.v as number;
  if (cell.t === 's') {
    const n = parseFloat((cell.v as string).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function findHeaderRow(
  sheet: XLSX.WorkSheet,
  range: XLSX.Range
): { headerRow: number; colIndices: Record<string, number> } | null {
  for (let r = 0; r <= Math.min(19, range.e.r); r++) {
    const colIndices: Record<string, number> = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell) continue;
      const val = String(cell.v ?? '')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
      if (val === 'CODIGO' || val === 'CÓDIGO' || val.startsWith('CODIGO') || val.startsWith('CÓDIGO')) {
        colIndices['CODIGO'] = c;
      } else if (val === 'TITULAR' || val.includes('TITULAR')) {
        colIndices['TITULAR'] = c;
      } else if (val.includes('CHECK IN') || val === 'CHECKIN' || val === 'FECHA IN' || val === 'ENTRADA') {
        colIndices['CHECKIN'] = c;
      } else if (val.includes('CHECK OUT') || val === 'CHECKOUT' || val === 'FECHA OUT' || val === 'SALIDA') {
        colIndices['CHECKOUT'] = c;
      } else if (val === 'VALOR' || val === 'MONTO' || val === 'IMPORTE' || val === 'TOTAL' || val === 'AMOUNT') {
        colIndices['VALOR'] = c;
      } else if (val === 'OBSERVACIONES' || val === 'NOTAS' || val === 'NOTES' || val.includes('OBS')) {
        colIndices['NOTAS'] = c;
      }
    }
    if ('CODIGO' in colIndices && 'TITULAR' in colIndices) {
      return { headerRow: r, colIndices };
    }
  }
  return null;
}

export function parseGEHFile(buffer: ArrayBuffer): GEHParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const rows: GEHRow[] = [];
  const invalidRows: GEHRow[] = [];
  const sheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (shouldSkipSheet(sheetName)) continue;
    sheets.push(sheetName);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet['!ref']) continue;

    const range = XLSX.utils.decode_range(sheet['!ref']);
    const header = findHeaderRow(sheet, range);
    if (!header) continue;

    const { headerRow, colIndices } = header;

    for (let r = headerRow + 1; r <= range.e.r; r++) {
      const get = (col: number) => sheet[XLSX.utils.encode_cell({ r, c: col })];
      const rawId = colIndices['CODIGO'] !== undefined ? cellStr(get(colIndices['CODIGO'])) : '';
      if (!rawId) continue;

      const id = rawId || null;
      const idNormalized = normalizeId(rawId);
      const guest = colIndices['TITULAR'] !== undefined ? cellStr(get(colIndices['TITULAR'])) : '';
      const checkIn = colIndices['CHECKIN'] !== undefined ? cellDate(get(colIndices['CHECKIN'])) : null;
      const checkOut = colIndices['CHECKOUT'] !== undefined ? cellDate(get(colIndices['CHECKOUT'])) : null;
      const amount = colIndices['VALOR'] !== undefined ? cellNum(get(colIndices['VALOR'])) : 0;
      const notes = colIndices['NOTAS'] !== undefined ? cellStr(get(colIndices['NOTAS'])) : '';

      const row: GEHRow = {
        id,
        idNormalized,
        guest,
        checkIn,
        checkOut,
        amount,
        notes,
        hotelInterno: sheetName,
        rowIndex: r,
        sheetName,
      };

      if (idNormalized === null) {
        invalidRows.push(row);
      } else {
        rows.push(row);
      }
    }
  }

  return { rows, sheets, invalidRows };
}
