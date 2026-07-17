// Modelo de hoteles (colección `hoteles`). Port parcial de src/lib/db/models/hotel.ts
// (solo lo que necesita el frontend nuevo: listar nombres).

import { getDb } from '../config/db.js';

/**
 * @typedef {Object} Hotel
 * @property {import('mongodb').ObjectId} [_id]
 * @property {string} nombre
 */

/** @returns {Promise<import('mongodb').Collection<Hotel>>} */
async function getCollection() {
  const db = await getDb();
  return db.collection('hoteles');
}

/** @returns {Promise<Hotel[]>} */
export async function listHoteles() {
  const col = await getCollection();
  return col.find({}).sort({ nombre: 1 }).toArray();
}

/**
 * @param {string} nombre
 * @returns {Promise<Hotel|null>}
 */
export async function getHotelByNombre(nombre) {
  const col = await getCollection();
  return col.findOne({ nombre });
}
