// Modelo de conciliaciones financieras (colección `financial_reconciliations`).
// Port de src/lib/db/models/financialReconciliation.ts. Usado por el import/borrado
// legacy (la pestaña Conciliaciones ahora lee en vivo de Bitrix). Misma colección Mongo.

import { getDb } from '../config/db.js';

/**
 * @typedef {'reconciled'|'unreconciled'|'pending_review'|'probable_duplicate'|'requires_support'|'no_hotel'|'under_investigation'|'adjusted'} ReconciliationStatus
 */

/**
 * @typedef {Object} ReconciliationRecord
 * @property {import('mongodb').ObjectId} [_id]
 * @property {string} id
 * @property {'excel'|'api'} source
 * @property {ReconciliationStatus} reconciledStatus
 * @property {boolean} duplicateFlag
 * @property {string[]} inconsistencyFlags
 * @property {number} [netAmount]
 * @property {string} [hotelName]
 * @property {string} [movementDate]
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} createdBy
 * @property {string} updatedBy
 * @property {any} [key]
 */

const COL = 'financial_reconciliations';

/** @returns {Promise<import('mongodb').Collection<ReconciliationRecord>>} */
async function getCollection() {
  const db = await getDb();
  return db.collection(COL);
}

/** @returns {Promise<void>} */
export async function ensureIndexes() {
  const col = await getCollection();
  await col.createIndex({ id: 1 }, { unique: true });
  await col.createIndex({ hotelId: 1 });
  await col.createIndex({ movementDate: -1 });
  await col.createIndex({ reconciledStatus: 1 });
  await col.createIndex({ bank: 1 });
  await col.createIndex({ confirmationNumber: 1 });
}

/**
 * @param {Omit<ReconciliationRecord, '_id'>[]} records
 * @returns {Promise<number>}
 */
export async function insertMany(records) {
  if (records.length === 0) return 0;
  const col = await getCollection();
  const result = await col.insertMany(/** @type {ReconciliationRecord[]} */ (records));
  return result.insertedCount;
}

/** @returns {Promise<number>} */
export async function deleteAll() {
  const col = await getCollection();
  const result = await col.deleteMany({});
  return result.deletedCount;
}

/**
 * @param {string} id
 * @returns {Promise<ReconciliationRecord|null>}
 */
export async function findById(id) {
  const col = await getCollection();
  return col.findOne({ id });
}

/**
 * @param {string} id
 * @param {Partial<ReconciliationRecord>} updates
 * @param {string} updatedBy
 * @returns {Promise<ReconciliationRecord|null>}
 */
export async function updateRecord(id, updates, updatedBy) {
  const col = await getCollection();
  const { _id, ...safe } = /** @type {ReconciliationRecord} */ (updates);
  void _id;
  return col.findOneAndUpdate(
    { id },
    { $set: { ...safe, updatedAt: new Date().toISOString(), updatedBy } },
    { returnDocument: 'after' },
  );
}
