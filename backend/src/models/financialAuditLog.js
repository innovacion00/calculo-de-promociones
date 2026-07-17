// Bitácora de auditoría financiera (colección `financial_audit_logs`).
// Port de src/lib/db/models/financialAuditLog.ts.

import { getDb } from '../config/db.js';

/**
 * @typedef {Object} FinancialAuditLog
 * @property {import('mongodb').ObjectId} [_id]
 * @property {string} id
 * @property {string} userId
 * @property {string} userName
 * @property {'reconciliations'|'balances'|'accounts_receivable'} module
 * @property {string} entityType
 * @property {string} entityId
 * @property {string} action
 * @property {unknown} [previousValue]
 * @property {unknown} [newValue]
 * @property {string} [notes]
 * @property {string} createdAt
 */

const COL = 'financial_audit_logs';

/** @returns {Promise<import('mongodb').Collection<FinancialAuditLog>>} */
async function getCollection() {
  const db = await getDb();
  return db.collection(COL);
}

/**
 * @param {Omit<FinancialAuditLog, '_id'>} entry
 * @returns {Promise<void>}
 */
export async function insertAuditLog(entry) {
  const col = await getCollection();
  await col.insertOne(/** @type {FinancialAuditLog} */ (entry));
}

/**
 * @param {string} entityId
 * @returns {Promise<FinancialAuditLog[]>}
 */
export async function listByEntity(entityId) {
  const col = await getCollection();
  return col.find({ entityId }).sort({ createdAt: -1 }).toArray();
}
