/**
 * Crea la colección hoteles en MongoDB e inserta los hoteles de la aplicación.
 * Si la colección ya existe y tiene documentos, no duplica ninguno.
 * Uso: node scripts/seed-hoteles.mjs
 */
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HOTELES = [
  'Hotel Madison Inn',
  'Hotel Windsor House',
  'Hotel Sansiraka',
  'Hotel Playa Salguero',
  'Hotel Axis Inn',
  'Hotel Rodadero Inn',
  'Hotel Aixo Suites',
  'Hotel Abi Inn',
  'Hotel Boquilla Suites',
  'Hotel Marina Suites',
  'Hotel Avexi Suites',
  'Hotel Azuan Suites',
  'Hotel El Marques',
];

function loadEnv() {
  try {
    const content = readFileSync(resolve(__dirname, '..', '.env'), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* rely on system env */ }
}

function parseDbName(uri) {
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] ?? 'calculo-promociones';
}

async function main() {
  loadEnv();

  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('❌  MONGODB_URI no definido en .env'); process.exit(1); }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(parseDbName(uri));
    console.log(`\n🔌  Conectado a "${db.databaseName}"\n`);

    // Crear colección si no existe
    const cols = await db.listCollections({ name: 'hoteles' }).toArray();
    if (cols.length === 0) {
      await db.createCollection('hoteles');
      console.log('✅  Colección "hoteles" creada.');
    } else {
      console.log('ℹ️   Colección "hoteles" ya existía.');
    }

    const col = db.collection('hoteles');

    // Crear índice único en nombre
    await col.createIndex({ nombre: 1 }, { unique: true, name: 'idx_nombre' });
    console.log('✅  Índice único en "nombre"\n');

    // Insertar hoteles (skipea duplicados por el índice único)
    let insertados = 0;
    let omitidos = 0;
    for (const nombre of HOTELES) {
      try {
        await col.insertOne({ nombre });
        console.log(`   ➕  Insertado: ${nombre}`);
        insertados++;
      } catch (e) {
        if (e.code === 11000) {
          console.log(`   ⏭   Ya existe: ${nombre}`);
          omitidos++;
        } else {
          throw e;
        }
      }
    }

    const total = await col.countDocuments();
    console.log(`\n📊  Resultado: ${insertados} insertados, ${omitidos} ya existían.`);
    console.log(`📋  Total de hoteles en la colección: ${total}`);
    console.log('\n✅  Completado.\n');

  } finally {
    await client.close();
  }
}

main().catch(err => { console.error('❌  Error:', err.message); process.exit(1); });
