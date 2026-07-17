// Modelo de análisis OTB (colección `otb_analyses`). Port de src/lib/db/models/otbAnalysis.ts.
// Guarda comparativas "on the book" por hotel/mes. Misma colección Mongo.

import { getDb } from '../config/db.js';

/**
 * @typedef {Object} OtbAnalysis
 * @property {import('mongodb').ObjectId} [_id]
 * @property {string} id
 * @property {string} hotelId       _id del hotel (o nombre si no existe en la colección)
 * @property {string} [hotelNombre] nombre denormalizado para display
 * @property {string} createdBy
 * @property {string} createdAt
 * @property {string} month
 * @property {string|null} cutoffBefore
 * @property {string|null} cutoffAfter
 * @property {string} mode
 * @property {string} sourceBefore
 * @property {string} sourceAfter
 * @property {object} metrics
 * @property {object[]|null} weeklyMetrics
 * @property {string} date
 * @property {object[]} comparison
 */

/** @returns {Promise<import('mongodb').Collection<OtbAnalysis>>} */
async function getCollection() {
  const db = await getDb();
  return db.collection('otb_analyses');
}

/**
 * @param {Omit<OtbAnalysis, '_id'>} data
 * @returns {Promise<OtbAnalysis>}
 */
export async function createOtbAnalysis(data) {
  const col = await getCollection();
  await col.insertOne(/** @type {OtbAnalysis} */ (data));
  return /** @type {OtbAnalysis} */ (data);
}

/**
 * Lista resúmenes (sin el array `comparison`, pesado). Filtra por hotel.
 * @param {string} [hotelId]
 * @param {string} [hotelNombre]
 * @param {number} [limit]
 * @returns {Promise<Omit<OtbAnalysis, '_id'|'comparison'>[]>}
 */
export async function listOtbAnalyses(hotelId, hotelNombre, limit = 50) {
  const col = await getCollection();
  /** @type {object} */
  let filter = {};
  if (hotelId && hotelNombre) {
    filter = { $or: [{ hotelId }, { hotelId: hotelNombre }, { hotelNombre }] };
  } else if (hotelId) {
    filter = { hotelId };
  } else if (hotelNombre) {
    filter = { $or: [{ hotelId: hotelNombre }, { hotelNombre }] };
  }
  const docs = await col
    .find(filter, { projection: { comparison: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(({ _id, ...rest }) => { void _id; return rest; });
}

/**
 * @param {string} id
 * @returns {Promise<OtbAnalysis|null>}
 */
export async function getOtbAnalysis(id) {
  const col = await getCollection();
  const doc = await col.findOne({ id });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  void _id;
  return /** @type {OtbAnalysis} */ (rest);
}

/**
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteOtbAnalysis(id) {
  const col = await getCollection();
  const result = await col.deleteOne({ id });
  return result.deletedCount === 1;
}
