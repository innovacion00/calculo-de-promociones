import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/session';
import { listRecords, insertMany, ensureIndexes, deleteAll } from '../../../../lib/db/models/financialReconciliation';
import { insertAuditLog } from '../../../../lib/db/models/financialAuditLog';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canViewFinancialModule')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  try {
    const result = await listRecords({
      hotelId: sp.get('hotelId') ?? undefined,
      hotelName: sp.get('hotelName') ?? undefined,
      status: (sp.get('status') as never) ?? undefined,
      bank: sp.get('bank') ?? undefined,
      cardBrand: sp.get('cardBrand') ?? undefined,
      dateFrom: sp.get('dateFrom') ?? undefined,
      dateTo: sp.get('dateTo') ?? undefined,
      search: sp.get('search') ?? undefined,
      page: sp.get('page') ? Number(sp.get('page')) : 1,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 18,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

const COL_ALIASES: Record<string, string[]> = {
  hotel:              ['Hotel', 'Establecimiento', 'Propiedad', 'Nombre establecimiento'],
  companyName:        ['Razón social', 'Razon Social', 'Empresa', 'Razón Social'],
  movementDate:       ['Fecha del movimiento', 'Fecha Movimiento', 'Fecha', 'Fecha transacción', 'Fecha Transacción'],
  netAmount:          ['Neto abonar', 'Valor Neto', 'Valor', 'Monto', 'Importe', 'Valor a abonar'],
  reconciledStatus:   ['Conciliado', 'Estado Conciliación', 'Estado', 'Conciliacion', 'Conciliación', 'Estado conciliación', 'Reconciliado'],
  bank:               ['Banco', 'Entidad bancaria', 'Entidad Bancaria', 'Banco emisor'],
  confirmationNumber: ['Número de confirmación', 'Referencia', 'Confirmación', 'Num confirmacion', 'No. confirmación', 'No confirmación', 'Nro confirmación'],
  movementName:       ['Nombre del movimiento', 'Nombre Movimiento', 'Nombre', 'Descripción', 'Descripcion', 'Concepto'],
  operationType:      ['Tipo de operación', 'Tipo Operación', 'Tipo', 'Tipo operación', 'Tipo de pago'],
  cardBrand:          ['Franquicia', 'Marca', 'Red', 'Marca tarjeta'],
  transactionId:      ['ID Transacción', 'ID', 'Transacción', 'Cod transaccion', 'Código transacción'],
  authorizationCode:  ['Código autorización', 'Auth Code', 'Autorización', 'Cod autorizacion', 'Código de autorización'],
  purchaseValue:      ['Valor compra', 'Compra', 'Valor de compra'],
  commission:         ['Comisión', 'Comision'],
  withholdingTax:     ['Retefuente', 'Rte Fuente', 'Rte. Fuente', 'Retención en la fuente'],
  reteIva:            ['ReteIVA', 'Rete IVA', 'Rte IVA', 'Reteiva'],
  reteIca:            ['ReteICA', 'Rete ICA', 'Rte ICA', 'Reteica'],
  receiptUrl:         ['Comprobante', 'URL Comprobante', 'Link comprobante', 'Soporte'],
};

function resolveHeader(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      const idx = headers.findIndex(h => h.trim().toLowerCase() === alias.toLowerCase());
      if (idx !== -1) { map[field] = idx; break; }
    }
  }
  return map;
}

function parseMovementDate(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;

  // Already ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // mm/dd/yyyy (US format fallback)
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Excel serial number
  const serial = Number(s);
  if (!isNaN(serial) && serial > 20000 && serial < 100000) {
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.toISOString().slice(0, 10);
  }

  return s.slice(0, 10) || undefined;
}

function detectInconsistencies(row: Record<string, unknown>): string[] {
  const flags: string[] = [];
  if (!row.hotelName) flags.push('no_hotel');
  if (!row.receiptUrl) flags.push('no_receipt');
  if (!row.confirmationNumber) flags.push('no_confirmation');
  if (!row.netAmount || row.netAmount === 0) flags.push('zero_amount');
  if (!row.operationType) flags.push('no_operation_type');
  return flags;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canImportReconciliations')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos de importación.' }, { status: 403 });
  }

  let body: { rows: unknown[][]; headers: string[]; sourceFileName?: string; sourceSheet?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body JSON inválido.' }, { status: 400 });
  }

  if (!Array.isArray(body.rows) || !Array.isArray(body.headers)) {
    return NextResponse.json({ ok: false, error: 'Se requieren headers y rows.' }, { status: 400 });
  }

  await ensureIndexes();

  const headerMap = resolveHeader(body.headers);
  const now = new Date().toISOString();

  const records = body.rows.map((rawRow: unknown[]) => {
    const get = (field: string) => {
      const idx = headerMap[field];
      return idx !== undefined ? rawRow[idx] : undefined;
    };

    const hotelName = String(get('hotel') ?? '').trim() || undefined;
    const confirmationNumber = String(get('confirmationNumber') ?? '').trim() || undefined;
    const receiptUrl = String(get('receiptUrl') ?? '').trim() || undefined;
    const netAmount = parseFloat(String(get('netAmount') ?? '0').replace(/[^0-9.-]/g, '')) || undefined;
    const operationType = String(get('operationType') ?? '').trim() || undefined;

    const partial = { hotelName, confirmationNumber, receiptUrl, netAmount, operationType };
    const inconsistencyFlags = detectInconsistencies(partial);

    const rawStatus = String(get('reconciledStatus') ?? '').trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, ''); // strip accents
    const RECONCILED_VALUES = new Set(['conciliado', 'reconciled', 'si', 'yes', 'x', '1', 'true', 'pagado', 'paid', 'ok']);
    const reconciledStatus = RECONCILED_VALUES.has(rawStatus)
      ? 'reconciled' as const
      : 'unreconciled' as const;

    return {
      id: randomUUID(),
      source: 'excel' as const,
      sourceFileName: body.sourceFileName,
      sourceSheet: body.sourceSheet,
      movementName: String(get('movementName') ?? '').trim() || undefined,
      hotelName,
      companyName: String(get('companyName') ?? '').trim() || undefined,
      operationType,
      movementDate: parseMovementDate(get('movementDate')),
      bank: String(get('bank') ?? '').trim() || undefined,
      confirmationNumber,
      reconciledStatus,
      netAmount,
      receiptUrl,
      transactionId: String(get('transactionId') ?? '').trim() || undefined,
      authorizationCode: String(get('authorizationCode') ?? '').trim() || undefined,
      cardBrand: String(get('cardBrand') ?? '').trim() || undefined,
      purchaseValue: parseFloat(String(get('purchaseValue') ?? '').replace(/[^0-9.-]/g, '')) || undefined,
      commission: parseFloat(String(get('commission') ?? '').replace(/[^0-9.-]/g, '')) || undefined,
      withholdingTax: parseFloat(String(get('withholdingTax') ?? '').replace(/[^0-9.-]/g, '')) || undefined,
      reteIva: parseFloat(String(get('reteIva') ?? '').replace(/[^0-9.-]/g, '')) || undefined,
      reteIca: parseFloat(String(get('reteIca') ?? '').replace(/[^0-9.-]/g, '')) || undefined,
      duplicateFlag: false,
      inconsistencyFlags,
      createdAt: now,
      updatedAt: now,
      createdBy: session.userId,
      updatedBy: session.userId,
    };
  });

  try {
    const inserted = await insertMany(records);
    await insertAuditLog({
      id: randomUUID(),
      userId: session.userId,
      userName: session.userName,
      module: 'reconciliations',
      entityType: 'batch_import',
      entityId: body.sourceFileName ?? 'unknown',
      action: 'import_excel',
      newValue: { inserted, fileName: body.sourceFileName, sheet: body.sourceSheet },
      createdAt: now,
    });
    return NextResponse.json({ ok: true, inserted });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canImportReconciliations')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }
  try {
    const deleted = await deleteAll();
    await insertAuditLog({
      id: randomUUID(),
      userId: session.userId,
      userName: session.userName,
      module: 'reconciliations',
      entityType: 'batch_delete',
      entityId: 'all',
      action: 'delete_all',
      newValue: { deleted },
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
