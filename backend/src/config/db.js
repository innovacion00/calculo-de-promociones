// Singleton de conexión a MongoDB (driver nativo v7).
// Port de src/lib/db/mongodb.ts — la base de datos NO cambia.
// En dev cacheamos la promesa en globalThis para no reconectar en cada reinicio de --watch.

import { MongoClient } from 'mongodb';
import { env, isProd } from './env.js';

/** @typedef {import('mongodb').Db} Db */

const uri = env.mongoUri;

/**
 * Extrae el nombre de la base de datos de la URI de conexión.
 * @param {string} connectionUri
 * @returns {string}
 */
function parseDbName(connectionUri) {
  const match = connectionUri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] ?? 'calculo-promociones';
}

/** @type {Promise<MongoClient>} */
let clientPromise;

if (!isProd) {
  const g = /** @type {{ _mongoClientPromise?: Promise<MongoClient> }} */ (globalThis);
  if (!g._mongoClientPromise) {
    const client = new MongoClient(uri);
    g._mongoClientPromise = client.connect();
    g._mongoClientPromise
      .then((c) => console.log(`[MongoDB] ✅ Conectado a "${c.db(parseDbName(uri)).databaseName}"`))
      .catch((e) => console.error(`[MongoDB] ❌ Error de conexión: ${e.message}`));
  }
  clientPromise = g._mongoClientPromise;
} else {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
  clientPromise
    .then((c) => console.log(`[MongoDB] ✅ Conectado a "${c.db(parseDbName(uri)).databaseName}"`))
    .catch((e) => console.error(`[MongoDB] ❌ Error de conexión: ${e.message}`));
}

export default clientPromise;

/**
 * Devuelve la instancia de base de datos.
 * @param {string} [dbName]
 * @returns {Promise<Db>}
 */
export async function getDb(dbName) {
  const c = await clientPromise;
  return c.db(dbName ?? parseDbName(uri));
}
