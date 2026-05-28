import * as XLSX from 'xlsx';

export interface RawRow {
  colA: string | null;
  colB: string | null; // reservation ID (sometimes empty)
  colC: string | null; // reservation ID with suffix
  colD: string | null; // hotel/type name
  colE: string | null; // client name
  colF: Date | string | null; // date
  colG: number | null; // amount
  colH: string | null; // currency
  colI: number | null; // amount (duplicate)
  rowIndex: number;
}

function cellDate(cell: XLSX.CellObject | undefined): Date | string | null {
  if (!cell) return null;
  if (cell.t === 'd' && cell.v instanceof Date) return cell.v;
  if (cell.t === 'n') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(cell.v as number);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
  }
  if (cell.t === 's') return cell.v as string;
  return null;
}

function cellNum(cell: XLSX.CellObject | undefined): number | null {
  if (!cell) return null;
  if (cell.t === 'n') return cell.v as number;
  if (cell.t === 's') {
    const n = parseFloat((cell.v as string).replace(',', '.'));
    return isNaN(n) ? null : n;
  }
  return null;
}

function cellStr(cell: XLSX.CellObject | undefined): string | null {
  if (!cell || cell.v == null) return null;
  return String(cell.v).trim() || null;
}

export function parseExcelFile(buffer: ArrayBuffer): RawRow[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const rows: RawRow[] = [];

  // Data starts at row index 6 (row 7 in 1-based)
  for (let r = 6; r <= range.e.r; r++) {
    const get = (col: number) => sheet[XLSX.utils.encode_cell({ r, c: col })];

    const hotelName = cellStr(get(3));
    if (!hotelName || hotelName === 'Hotel') continue;

    // Skip rows that look like reservation IDs appearing in col D by mistake
    if (/^\d{8,}-\d+$/.test(hotelName)) continue;

    const amount = cellNum(get(6));
    if (amount === null) continue;

    rows.push({
      colA: cellStr(get(0)),
      colB: cellStr(get(1)),
      colC: cellStr(get(2)),
      colD: hotelName,
      colE: cellStr(get(4)),
      colF: cellDate(get(5)),
      colG: amount,
      colH: cellStr(get(7)),
      colI: cellNum(get(8)),
      rowIndex: r,
    });
  }

  return rows;
}

export function detectMaxDate(rows: RawRow[]): Date | null {
  let max: Date | null = null;
  for (const row of rows) {
    const d = row.colF instanceof Date ? row.colF : row.colF ? new Date(row.colF) : null;
    if (d && !isNaN(d.getTime())) {
      if (!max || d > max) max = d;
    }
  }
  return max;
}
