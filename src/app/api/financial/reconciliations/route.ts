import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/session';
import { listRecords, insertMany, ensureIndexes } from '../../../../lib/db/models/financialReconciliation';
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
  hotel:              ['Hotel', 'Establecimiento', 'Propiedad'],
  companyName:        ['Razón social', 'Razon Social', 'Empresa'],
  movementDate:       ['Fecha del movimiento', 'Fecha Movimiento', 'Fecha'],
  netAmount:          ['Neto abonar', 'Valor Neto', 'Valor'],
  reconciledStatus:   ['Conciliado', 'Estado Conciliación', 'Estado'],
  bank:               ['Banco', 'Entidad bancaria'],
  confirmationNumber: ['Número de confirmación', 'Referencia', 'Confirmación'],
  movementName:       ['Nombre del movimiento', 'Nombre Movimiento', 'Nombre', 'Descripción'],
  operationType:      ['Tipo de operación', 'Tipo Operación', 'Tipo'],
  cardBrand:          ['Franquicia', 'Marca', 'Red'],
  transactionId:      ['ID Transacción', 'ID', 'Transacción'],
  authorizationCode:  ['Código autorización', 'Auth Code', 'Autorización'],
  purchaseValue:      ['Valor compra', 'Compra'],
  commission:         ['Comisión'],
  withholdingTax:     ['Retefuente', 'Rte Fuente'],
  reteIva:            ['ReteIVA', 'Rete IVA'],
  reteIca:            ['ReteICA', 'Rete ICA'],
  receiptUrl:         ['Comprobante', 'URL Comprobante'],
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

    const rawStatus = String(get('reconciledStatus') ?? '').trim().toLowerCase();
    const reconciledStatus = rawStatus === 'conciliado' || rawStatus === 'reconciled'
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
      movementDate: String(get('movementDate') ?? '').trim() || undefined,
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
