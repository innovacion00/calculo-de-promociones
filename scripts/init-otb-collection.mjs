/**
 * Crea la colección otb_analyses en MongoDB con sus índices.
 * Uso: node scripts/init-otb-collection.mjs
 */
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

loadEnv();

function parseDbName(uri) {
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] ?? 'calculo-promociones';
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('❌  MONGODB_URI no definido en .env'); process.exit(1); }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(parseDbName(uri));
    console.log(`\n🔌  Conectado a "${db.databaseName}"\n`);

    // Crear colección (si ya existe, MongoDB no hace nada)
    const cols = await db.listCollections({ name: 'otb_analyses' }).toArray();
    if (cols.length === 0) {
      await db.createCollection('otb_analyses');
      console.log('✅  Colección "otb_analyses" creada.');
    } else {
      console.log('ℹ️   Colección "otb_analyses" ya existía.');
    }

    const col = db.collection('otb_analyses');

    // Índices
    await col.createIndex({ id: 1 }, { unique: true, name: 'idx_id' });
    console.log('✅  Índice único en "id"');

    await col.createIndex({ hotelId: 1, createdAt: -1 }, { name: 'idx_hotel_date' });
    console.log('✅  Índice compuesto en "hotelId + createdAt"');

    await col.createIndex({ createdBy: 1, createdAt: -1 }, { name: 'idx_user_date' });
    console.log('✅  Índice compuesto en "createdBy + createdAt"');

    await col.createIndex({ month: 1, hotelId: 1 }, { name: 'idx_month_hotel' });
    console.log('✅  Índice compuesto en "month + hotelId"');

    // Mostrar resumen
    const count = await col.countDocuments();
    const indexes = await col.indexes();
    console.log(`\n📊  Documentos actuales: ${count}`);
    console.log(`📋  Índices (${indexes.length}):`);
    indexes.forEach(idx => console.log(`     • ${idx.name}: ${JSON.stringify(idx.key)}`));
    console.log('\n✅  Inicialización completada.\n');

  } finally {
    await client.close();
  }
}

main().catch(err => { console.error('❌  Error:', err.message); process.exit(1); });
