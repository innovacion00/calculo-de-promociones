// Modelo de configuración de tarifas (colección `rate_configs`). Port de src/lib/db/models/rateConfig.ts.
// Un documento por hotel: guarda el estado editable completo del Simulador de Tarifas
// (inputs base, % de plan/país, promociones, secciones extra, overrides de canal, orden, etc.)

import { getDb } from '../config/db.js';

/**
 * @typedef {Object} RateConfig
 * @property {import('mongodb').ObjectId} [_id]
 * @property {string} hotelId
 * @property {string} [hotelNombre]
 * @property {string} updatedAt
 * @property {string} updatedBy
 * @property {Record<string, Record<string, number>>} rawBaseInputs
 * @property {Record<string, Record<string, number>>} rawPlanPcts
 * @property {Record<string, Record<string, number>>} rawPaisPcts
 * @property {Record<string, Record<string, number>>} promoVals
 * @property {Record<string, string>} titleOverrides
 * @property {Record<string, string>} labelOverrides
 * @property {Record<string, object[]>} extraSections
 * @property {Record<string, string[]>} deletedSectionIds
 * @property {Record<string, Record<string, number>>} channelOverrides
 * @property {Record<string, string[]>} [sectionOrder]
 * @property {Record<string, object[]>} [sectionRows]
 */

/** @returns {Promise<import('mongodb').Collection<RateConfig>>} */
async function getCollection() {
  const db = await getDb();
  return db.collection('rate_configs');
}

/**
 * @param {string} hotelId
 * @returns {Promise<RateConfig|null>}
 */
export async function getRateConfig(hotelId) {
  const col = await getCollection();
  const doc = await col.findOne({ hotelId });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  void _id;
  return /** @type {RateConfig} */ (rest);
}

/**
 * Upsert por hotelId. Busca por ObjectId o por nombre (compat. registros legado
 * guardados con el nombre como hotelId) y actualiza por _id si ya existe.
 * @param {Omit<RateConfig, '_id'>} data
 * @returns {Promise<void>}
 */
export async function upsertRateConfig(data) {
  const col = await getCollection();

  const nameFilter = data.hotelNombre && data.hotelNombre !== data.hotelId
    ? { $or: [{ hotelId: data.hotelId }, { hotelId: data.hotelNombre }] }
    : { hotelId: data.hotelId };

  const existing = await col.findOne(/** @type {object} */ (nameFilter), { projection: { _id: 1 } });

  if (existing) {
    await col.updateOne({ _id: existing._id }, { $set: data });
  } else {
    await col.insertOne(/** @type {RateConfig} */ (data));
  }
}
