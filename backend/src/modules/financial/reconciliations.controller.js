// Controladores de Conciliaciones (live desde Bitrix, category 22).
// Port de src/app/api/financial/reconciliations/*. El import/borrado Excel es legacy
// (la pestaña ahora lee en vivo de Bitrix) pero se conserva por compatibilidad.

import { randomUUID } from 'node:crypto';
import {
  listBitrixReconciliations,
  getBitrixReconciliationById,
  getBitrixReconciliationStats,
} from './lib/bitrixReconciliations.js';
import { getHotelOptions, getBankOptions } from './lib/bitrixEnums.js';
import { sendCsv } from './lib/csv.js';
import { insertMany, ensureIndexes, deleteAll } from '../../models/financialReconciliation.js';
import { insertAuditLog } from '../../models/financialAuditLog.js';

/**
 * @param {unknown} raw
 * @returns {import('./lib/bitrixReconciliations.js').ReconciledStatus|undefined}
 */
function normalizeStatus(raw) {
  return raw === 'reconciled' || raw === 'unreconciled' ? raw : undefined;
}

/**
 * GET /api/financial/reconciliations
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function getReconciliations(req, res) {
  const sp = req.query;

  if (sp.id) {
    const record = await getBitrixReconciliationById(String(sp.id));
    res.json({ ok: true, data: record ? [record] : [], total: record ? 1 : 0 });
    return;
  }

  const result = await listBitrixReconciliations({
    hotelName: sp.hotelName ? String(sp.hotelName) : undefined,
    bank: sp.bank ? String(sp.bank) : undefined,
    status: normalizeStatus(sp.status),
    dateFrom: sp.dateFrom ? String(sp.dateFrom) : undefined,
    dateTo: sp.dateTo ? String(sp.dateTo) : undefined,
    search: sp.search ? String(sp.search) : undefined,
    page: sp.page ? Number(sp.page) : 1,
    pageSize: sp.pageSize ? Number(sp.pageSize) : 18,
  });
  res.json({ ok: true, ...result });
}

/**
 * GET /api/financial/reconciliations/stats
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export async function getReconciliationsStats(_req, res) {
  const stats = await getBitrixReconciliationStats();
  res.json({ ok: true, stats });
}

/**
 * GET /api/financial/reconciliations/distinct
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export async function getReconciliationsDistinct(_req, res) {
  res.json({ ok: true, hotels: getHotelOptions(), banks: getBankOptions() });
}

/**
 * GET /api/financial/reconciliations/export
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function exportReconciliations(req, res) {
  const sp = req.query;
  const { data } = await listBitrixReconciliations({
    hotelName: sp.hotelName ? String(sp.hotelName) : undefined,
    bank: sp.bank ? String(sp.bank) : undefined,
    status: normalizeStatus(sp.status),
    dateFrom: sp.dateFrom ? String(sp.dateFrom) : undefined,
    dateTo: sp.dateTo ? String(sp.dateTo) : undefined,
    search: sp.search ? String(sp.search) : undefined,
    page: 1,
    pageSize: 10000,
  });

  const headers = ['Fecha', 'Nombre', 'Hotel', 'Banco', 'Nº Confirmación', 'Neto Abonar', 'Estado', 'Notas'];
  const rows = data.map((r) => [
    r.movementDate ?? '',
    r.movementName ?? '',
    r.hotelName ?? '',
    r.bank ?? '',
    r.confirmationNumber ?? '',
    r.netAmount ?? '',
    r.reconciledStatus === 'reconciled' ? 'Conciliado' : 'No conciliado',
    r.notes ?? '',
  ]);
  sendCsv(res, headers, rows, `conciliaciones_${new Date().toISOString().slice(0, 10)}.csv`);
}

// ── Import/borrado Excel legacy (Mongo) ──────────────────────────────────────

/**
 * DELETE /api/financial/reconciliations
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function deleteAllReconciliations(req, res) {
  // @ts-expect-error — session la adjunta attachSession
  const session = req.session;
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
  res.json({ ok: true, deleted });
}

// El POST de import Excel se conserva en la app Next legacy; no se re-expone aquí
// porque la UI nueva lee en vivo de Bitrix. Si se necesita, se porta insertMany + ensureIndexes.
void insertMany;
void ensureIndexes;
